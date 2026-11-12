import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Invoice {
  id: string
  to: string
  /** USDC amount in raw 6-decimal units, as a decimal string. */
  amountRaw: string
  memo: string
  createdAt: number
  status: 'open' | 'paid'
  payer?: string
  txHash?: string
  paidAt?: number
}

const FILE = fileURLToPath(new URL('./data/invoices.json', import.meta.url))

let cache: Record<string, Invoice> | null = null

function load(): Record<string, Invoice> {
  if (cache) return cache
  if (!existsSync(FILE)) {
    cache = {}
    return cache
  }
  try {
    cache = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Invoice>
  } catch {
    cache = {}
  }
  return cache
}

function persist(): void {
  const data = load()
  mkdirSync(dirname(FILE), { recursive: true })
  const tmp = `${FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  renameSync(tmp, FILE)
}

export function getInvoice(id: string): Invoice | undefined {
  return load()[id]
}

export function saveInvoice(invoice: Invoice): void {
  load()[invoice.id] = invoice
  persist()
}

export function listInvoicesFor(to: string): Invoice[] {
  const lower = to.toLowerCase()
  return Object.values(load())
    .filter((i) => i.to.toLowerCase() === lower)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function findByTxHash(txHash: string): Invoice | undefined {
  const lower = txHash.toLowerCase()
  return Object.values(load()).find((i) => i.txHash?.toLowerCase() === lower)
}
