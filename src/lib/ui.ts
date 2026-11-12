import type { CSSProperties } from 'react'

export const glass = {
  card: {
    background: 'rgba(255,255,255,0.64)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.68)',
    boxShadow: '0 8px 32px rgba(18,45,69,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
  } satisfies CSSProperties,
  inner: {
    background: 'rgba(255,255,255,0.46)',
    border: '1px solid rgba(255,255,255,0.56)',
  } satisfies CSSProperties,
  pill: {
    background: 'rgba(255,255,255,0.58)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.66)',
  } satisfies CSSProperties,
}

export const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Strip anything that is not a plain decimal amount. */
export function cleanAmountInput(value: string): string {
  const v = value.replace(/[^0-9.]/g, '')
  return /^\d*\.?\d{0,6}$/.test(v) ? v : v.slice(0, -1)
}

export function parseOnchainError(error: unknown): string {
  const e = error as { message?: string; code?: number } | null
  const message = (e?.message ?? '').toLowerCase()
  if (message.includes('user rejected') || e?.code === 4001) return 'Payment cancelled.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance'))
    return 'Insufficient balance. Add test USDC and try again.'
  if (message.includes('reverted')) return 'Transaction failed. Please try again.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
