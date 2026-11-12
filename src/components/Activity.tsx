import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, Clock, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { glass, shortAddress, timeAgo } from '@/lib/ui'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_CHAIN_ID } from '@/lib/usdc'
import { formatUsdc } from '@/onchain-money'

export function Activity({ onOpen }: { onOpen: (id: string) => void }) {
  const { address } = useAccount()
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', address],
    queryFn: () => api.listInvoices(address as string),
    enabled: Boolean(address),
    refetchInterval: 5000,
  })

  const received = (data ?? []).filter((i) => i.status === 'paid')
  const total = received.reduce((sum, i) => sum + BigInt(i.amountRaw), 0n)

  return (
    <section className="mt-3 rounded-3xl p-5" style={glass.card}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Received through Arc Pay
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="display text-2xl font-bold tabular-nums">
              {address ? formatUsdc(total) : '--'}
            </span>
            <span className="text-sm" style={{ color: 'var(--subtle)' }}>
              USDC
            </span>
          </div>
        </div>
        {address && (
          <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
            {received.length} paid · {(data?.length ?? 0) - received.length} open
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {!address && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Connect your wallet to see the requests you created and the payments they received.
          </p>
        )}
        {address && isLoading && <div className="h-14 animate-pulse rounded-2xl bg-white/50" />}
        {address && !isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No requests yet. Create a payment link above and pay it to see it land here.
          </p>
        )}
        {(data ?? []).map((i) => (
          <div key={i.id} className="flex items-center gap-3 rounded-2xl p-3" style={glass.inner}>
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: i.status === 'paid' ? 'rgba(26,128,71,0.12)' : 'rgba(18,45,69,0.07)' }}
            >
              {i.status === 'paid' ? (
                <ArrowDownLeft className="size-4" style={{ color: 'var(--success)' }} />
              ) : (
                <Clock className="size-4" style={{ color: 'var(--muted)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{i.memo || `Request ${i.id}`}</div>
              <div className="truncate text-xs" style={{ color: 'var(--subtle)' }}>
                {i.status === 'paid' && i.payer
                  ? `From ${shortAddress(i.payer)} · ${timeAgo(i.paidAt ?? i.createdAt)}`
                  : `Waiting for payment · ${timeAgo(i.createdAt)}`}
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-sm font-semibold tabular-nums"
                style={{ color: i.status === 'paid' ? 'var(--success)' : 'var(--ink)' }}
              >
                {i.status === 'paid' ? '+' : ''}
                {i.amount}
              </div>
              {i.status === 'paid' && i.txHash ? (
                <a
                  href={buildTxExplorerUrl(ARC_CHAIN_ID, i.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[11px]"
                  style={{ color: 'var(--accent-hover)' }}
                >
                  Receipt <ExternalLink className="size-3" />
                </a>
              ) : (
                <button onClick={() => onOpen(i.id)} className="text-[11px]" style={{ color: 'var(--accent-hover)' }}>
                  Open
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
