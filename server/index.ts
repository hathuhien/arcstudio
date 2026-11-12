import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { createPublicClient, defineChain, erc20Abi, http, isAddress, isHash, parseEventLogs } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '../src/onchain-facts'
import { AmountError, formatUsdc, parseUsdc } from '../src/onchain-money'
import { findByTxHash, getInvoice, listInvoicesFor, saveInvoice, type Invoice } from './store'

const PORT = 3001
const CHAIN_KEY = 'Arc_Testnet'
const MAX_AMOUNT_RAW = parseUsdc('10000')

const chainFact = requireChain(arcTestnet.id)
const usdc = getUsdc(arcTestnet.id)
if (!usdc) throw new Error('USDC is not registered for Arc Testnet')
const USDC_ADDRESS = usdc.address.toLowerCase()

// RPC: use the provisioned proxy when it covers this chain, else the public RPC from the facts registry.
const proxyChains = (process.env.RPC_PROXY_CHAINS || '').split(',')
const rpcUrl =
  process.env.RPC_PROXY_BASE_URL && proxyChains.indexOf(CHAIN_KEY) !== -1
    ? `${process.env.RPC_PROXY_BASE_URL}/api/rpc/${CHAIN_KEY}?_rpc_token=${process.env.RPC_PROXY_TOKEN}`
    : chainFact.rpcUrls[0]

const client = createPublicClient({
  chain: defineChain({ ...arcTestnet, rpcUrls: { default: { http: [rpcUrl] } } }),
  transport: http(rpcUrl),
})

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = chunk as Buffer
    size += buf.length
    if (size > 10_000) throw new HttpError(413, 'Request too large')
    chunks.push(buf)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object')
    return parsed as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }
}

function publicInvoice(i: Invoice) {
  return { ...i, amount: formatUsdc(BigInt(i.amountRaw)) }
}

function createInvoice(body: Record<string, unknown>): Invoice {
  const to = typeof body.to === 'string' ? body.to : ''
  const amount = typeof body.amount === 'string' ? body.amount.trim() : ''
  const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 140) : ''
  if (!isAddress(to)) throw new HttpError(400, 'Recipient must be a valid address')
  let raw: bigint
  try {
    raw = parseUsdc(amount)
  } catch (error) {
    throw new HttpError(400, error instanceof AmountError ? error.message : 'Invalid amount')
  }
  if (raw <= 0n) throw new HttpError(400, 'Amount must be greater than zero')
  if (raw > MAX_AMOUNT_RAW) throw new HttpError(400, 'Amount is above the 10,000 USDC limit')
  const invoice: Invoice = {
    id: randomBytes(6).toString('hex'),
    to,
    amountRaw: raw.toString(),
    memo,
    createdAt: Date.now(),
    status: 'open',
  }
  saveInvoice(invoice)
  return invoice
}

/** Confirm on Arc Testnet that txHash really moved the invoiced USDC to the recipient, then mark it paid. */
async function confirmPayment(id: string, body: Record<string, unknown>): Promise<Invoice> {
  const invoice = getInvoice(id)
  if (!invoice) throw new HttpError(404, 'Invoice not found')
  if (invoice.status === 'paid') return invoice
  const txHash = typeof body.txHash === 'string' ? body.txHash : ''
  if (!isHash(txHash)) throw new HttpError(400, 'Invalid transaction hash')
  const used = findByTxHash(txHash)
  if (used && used.id !== invoice.id) throw new HttpError(409, 'That transaction already paid another invoice')

  const receipt = await client
    .waitForTransactionReceipt({ hash: txHash, timeout: 30_000 })
    .catch(() => null)
  if (!receipt) throw new HttpError(504, 'Transaction not confirmed yet, try again shortly')
  if (receipt.status !== 'success') throw new HttpError(422, 'Transaction failed onchain')

  const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs })
  const match = transfers.find(
    (log) =>
      log.address.toLowerCase() === USDC_ADDRESS &&
      log.args.to.toLowerCase() === invoice.to.toLowerCase() &&
      log.args.value >= BigInt(invoice.amountRaw),
  )
  if (!match) throw new HttpError(422, 'No matching USDC transfer to the recipient in that transaction')

  const paid: Invoice = {
    ...invoice,
    status: 'paid',
    payer: match.args.from,
    txHash,
    paidAt: Date.now(),
  }
  saveInvoice(paid)
  return paid
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const method = req.method ?? 'GET'

  if (method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, chainId: arcTestnet.id })

  if (method === 'POST' && url.pathname === '/invoices') {
    return send(res, 201, publicInvoice(createInvoice(await readJson(req))))
  }

  if (method === 'GET' && url.pathname === '/invoices') {
    const to = url.searchParams.get('to') ?? ''
    if (!isAddress(to)) throw new HttpError(400, 'Query "to" must be a valid address')
    return send(res, 200, listInvoicesFor(to).map(publicInvoice))
  }

  if (parts[0] === 'invoices' && parts[1]) {
    const id = parts[1]
    if (method === 'GET' && parts.length === 2) {
      const invoice = getInvoice(id)
      if (!invoice) throw new HttpError(404, 'Invoice not found')
      return send(res, 200, publicInvoice(invoice))
    }
    if (method === 'POST' && parts[2] === 'confirm') {
      return send(res, 200, publicInvoice(await confirmPayment(id, await readJson(req))))
    }
  }

  throw new HttpError(404, 'Not found')
}

createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message })
    console.error(error)
    send(res, 500, { error: 'Internal error' })
  })
}).listen(PORT, () => {
  console.log(`Arc Pay API listening on :${PORT} (rpc: ${rpcUrl.split('?')[0]})`)
})
