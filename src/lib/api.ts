export interface Invoice {
  id: string
  to: string
  amountRaw: string
  /** Human readable USDC amount, e.g. "12.5". */
  amount: string
  memo: string
  createdAt: number
  status: 'open' | 'paid'
  payer?: string
  txHash?: string
  paidAt?: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body as T
}

export const api = {
  createInvoice: (input: { to: string; amount: string; memo: string }) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(input) }),
  getInvoice: (id: string) => request<Invoice>(`/invoices/${encodeURIComponent(id)}`),
  listInvoices: (to: string) => request<Invoice[]>(`/invoices?to=${encodeURIComponent(to)}`),
  confirmPayment: (id: string, txHash: string) =>
    request<Invoice>(`/invoices/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }),
}
