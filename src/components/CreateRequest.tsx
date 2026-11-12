import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Invoice } from '@/lib/api'
import { buildShareLink } from '@/lib/share'
import { cleanAmountInput, glass, shortAddress } from '@/lib/ui'

const CHIPS = ['0.10', '0.50', '1.00', '5.00']

export function CreateRequest({ onOpen }: { onOpen: (id: string) => void }) {
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [created, setCreated] = useState<Invoice | null>(null)
  const [share, setShare] = useState<{ id: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const to = recipient || address || ''
  const validTo = isAddress(to)
  const validAmount = Number(amount) > 0

  const createdId = created?.id
  useEffect(() => {
    if (!createdId) return
    let live = true
    void buildShareLink(`/?pay=${createdId}`).then((url) => live && setShare({ id: createdId, url }))
    return () => {
      live = false
    }
  }, [createdId])
  const link = share && share.id === createdId ? share.url : null

  const create = useMutation({
    mutationFn: () => api.createInvoice({ to, amount, memo }),
    onSuccess: (invoice) => {
      setCreated(invoice)
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const reset = () => {
    setCreated(null)
    setAmount('')
    setMemo('')
    setCopied(false)
  }

  if (created) {
    return (
      <section className="overflow-hidden rounded-3xl" style={glass.card}>
        <div className="h-1" style={{ background: 'var(--success)' }} />
        <div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--success)' }}>
            Payment request ready
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="display text-4xl font-bold tabular-nums">{created.amount}</span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
              USDC
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            To {shortAddress(created.to)}
            {created.memo ? ` · ${created.memo}` : ''}
          </p>

          <div className="mono mt-4 break-all rounded-2xl p-3 text-[11px]" style={{ ...glass.inner, color: 'var(--ink-2)' }}>
            {link ?? 'Preparing link...'}
          </div>

          <button
            onClick={() => void copy()}
            disabled={!link}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy payment link'}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpen(created.id)}
              className="min-h-11 rounded-2xl text-sm font-semibold"
              style={{ ...glass.pill, color: 'var(--ink)' }}
            >
              Try as payer
            </button>
            <button onClick={reset} className="min-h-11 rounded-2xl text-sm font-semibold" style={{ ...glass.pill, color: 'var(--ink)' }}>
              New request
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl p-5" style={glass.card}>
      <div className="mb-3 flex items-center gap-1.5">
        <Link2 className="size-3.5" style={{ color: 'var(--muted)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Request a payment
        </span>
      </div>

      <div className="rounded-2xl p-4" style={glass.inner}>
        <div className="flex items-baseline gap-2">
          <input
            inputMode="decimal"
            aria-label="Amount in USDC"
            value={amount}
            onChange={(e) => setAmount(cleanAmountInput(e.target.value))}
            placeholder="0.00"
            className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
            style={{ color: 'var(--ink)' }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setAmount(c)}
              className="min-h-9 rounded-full px-3 text-xs font-semibold tabular-nums"
              style={{ ...glass.pill, color: 'var(--ink)' }}
            >
              ${c}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Pay to
        </span>
        <input
          value={to}
          onChange={(e) => setRecipient(e.target.value.trim())}
          placeholder="Connect a wallet or paste an address"
          spellCheck={false}
          className="mono mt-1 min-h-11 w-full rounded-2xl px-3 text-xs outline-none"
          style={{ ...glass.inner, color: 'var(--ink)' }}
        />
        {to && !validTo && (
          <span className="mt-1 block text-xs" style={{ color: 'var(--danger)' }}>
            Enter a valid 0x address.
          </span>
        )}
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          What is it for? (optional)
        </span>
        <input
          value={memo}
          maxLength={140}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Order #1042, coffee, invoice..."
          className="mt-1 min-h-11 w-full rounded-2xl px-3 text-sm outline-none"
          style={{ ...glass.inner, color: 'var(--ink)' }}
        />
      </label>

      <button
        onClick={() => create.mutate()}
        disabled={!validTo || !validAmount || create.isPending}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--accent)' }}
      >
        {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Create payment link
      </button>
    </section>
  )
}
