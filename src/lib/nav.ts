import { useCallback, useEffect, useState } from 'react'

const read = () => new URLSearchParams(window.location.search).get('pay')

/** Tiny query-string router: `/?pay=<invoiceId>` shows the payer view. */
export function usePayParam() {
  const [id, setId] = useState<string | null>(read)

  useEffect(() => {
    const onPop = () => setId(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((next: string | null) => {
    window.history.pushState({}, '', next ? `/?pay=${encodeURIComponent(next)}` : '/')
    setId(next)
  }, [])

  return [id, go] as const
}
