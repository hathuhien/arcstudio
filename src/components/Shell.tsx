import type { ReactNode } from 'react'
import { ConnectKitButton } from 'connectkit'
import { TokenUSDC } from '@web3icons/react'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #f9f9fc 0%, #fffcf7 52%, #fbf7f2 100%)' }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '5%',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(133,177,237,0.22) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            right: '8%',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,205,131,0.20) 0%, transparent 70%)',
            filter: 'blur(58px)',
          }}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TokenUSDC variant="branded" size={26} />
            <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
              Arc Pay
            </span>
          </div>
          <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress }) => (
              <button
                onClick={show}
                className="min-h-11 rounded-full px-4 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
                style={{ background: 'var(--accent)' }}
              >
                {isConnected ? truncatedAddress : 'Connect wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
        </header>
        {children}
      </div>
    </div>
  )
}
