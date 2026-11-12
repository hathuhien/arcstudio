import { useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { toast } from 'sonner'
import { api, type Invoice } from '@/lib/api'
import { glass, parseOnchainError, shortAddress, spectral } from '@/lib/ui'
import { ARC_CHAIN, ARC_CHAIN_ID, USDC_ADDRESS, useUsdcBalance } from '@/lib/usdc'
import { buildTxExplorerUrl } from '@/onchain-facts'

type Step = 'idle' | 'wallet' | 'confirming' | 'verifying'

export function PayInvoice({ id, onBack }: { id: string; onBack: () => void }) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID })
  const queryClient = useQueryClient()
  const balance = useUsdcBalance()
  const [step, setStep] = useState<Step>('idle')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: invoice, isLoading, error: loadError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.getInvoice(id),
    refetchInterval: (q) => (q.state.data?.status === 'paid' ? false : 4000),
    retry: false,
  })

  const verify = async (inv: Invoice, hash: `0x${string}`) => {
    setStep('verifying')
    try {
      const paid = await api.confirmPayment(inv.id, hash)
      queryClient.setQueryData(['invoice', inv.id], paid)
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void balance.refetch()
      setPendingHash(null)
      toast.success('Payment confirmed')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStep('idle')
    }
  }

  const pay = async (inv: Invoice) => {
    setError(null)
    try {
      if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID })
      setStep('wallet')
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [inv.to as `0x${string}`, BigInt(inv.amountRaw)],
        chainId: ARC_CHAIN_ID,
      })
      setPendingHash(hash)
      setStep('confirming')
      await publicClient?.waitForTransactionReceipt({ hash })
      await verify(inv, hash)
    } catch (e) {
      setStep('idle')
      const msg = parseOnchainError(e)
      if (msg !== 'Payment cancelled.') setError(msg)
    }
  }

  const back = (
    <button onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
      <ArrowLeft className="size-3.5" /> Back to dashboard
    </button>
  )

  if (isLoading) return <div className="h-72 animate-pulse rounded-3xl bg-white/50" />

  if (loadError || !invoice) {
    return (
      <>
        {back}
        <section className="rounded-3xl p-5" style={glass.card}>
          <div className="text-sm font-semibold">Payment request not found</div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            The link may be incomplete or the request no longer exists.
          </p>
        </section>
      </>
    )
  }

  const busy = step !== 'idle'
  const insufficient = balance.raw !== undefined && balance.raw < BigInt(invoice.amountRaw)
  const paid = invoice.status === 'paid'

  return (
    <>
      {back}
      <section className="overflow-hidden rounded-3xl" style={glass.card}>
        <div className="h-1" style={{ background: paid ? 'var(--success)' : spectral }} />
        <div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
            {paid ? 'Paid' : 'Payment request'}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="display text-5xl font-bold tabular-nums">{invoice.amount}</span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
              USDC
            </span>
          </div>
          {invoice.memo && (
            <p className="mt-2 text-pretty text-sm" style={{ color: 'var(--ink-2)' }}>
              {invoice.memo}
            </p>
          )}

          <div className="mt-4 space-y-2 rounded-2xl p-3 text-sm" style={glass.inner}>
            <Row label="Pay to" value={<span className="mono text-xs">{shortAddress(invoice.to)}</span>} />
            <Row label="Network" value={ARC_CHAIN.name} />
            {isConnected && (
              <Row
                label="Your balance"
                value={<span className="tabular-nums">{balance.formatted ?? '...'} USDC</span>}
              />
            )}
          </div>

          {paid ? (
            <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(26,128,71,0.1)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
                <CheckCircle2 className="size-4" /> Payment confirmed
              </div>
              {invoice.payer && (
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  Paid by {shortAddress(invoice.payer)}
                </p>
              )}
              {invoice.txHash && (
                <a
                  href={buildTxExplorerUrl(ARC_CHAIN_ID, invoice.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--accent-hover)' }}
                >
                  View receipt on explorer <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          ) : !isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  className="mt-4 min-h-12 w-full rounded-2xl text-sm font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Connect wallet to pay
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : pendingHash && step === 'idle' ? (
            <button
              onClick={() => void verify(invoice, pendingHash)}
              className="mt-4 min-h-12 w-full rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Retry confirmation
            </button>
          ) : (
            <button
              onClick={() => void pay(invoice)}
              disabled={busy || insufficient || !address}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {step === 'wallet'
                ? 'Confirm in wallet...'
                : step === 'confirming'
                  ? 'Confirming onchain...'
                  : step === 'verifying'
                    ? 'Verifying payment...'
                    : chainId !== ARC_CHAIN_ID
                      ? `Switch to ${ARC_CHAIN.name} and pay`
                      : `Pay ${invoice.amount} USDC`}
            </button>
          )}

          {insufficient && !paid && isConnected && (
            <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
              Balance is below this amount. Use "Get test USDC" in the sidebar to top up.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </div>
      </section>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
