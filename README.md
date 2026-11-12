# Arc Pay

Create USDC payment links, share them, and get paid on Arc Testnet. Payers connect a wallet and pay in one tap, and each payment is confirmed onchain and shown as a receipt on your dashboard.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit
- Small Bun HTTP API that stores payment requests and confirms payments onchain
- Arc Testnet with USDC

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run server   # API on :3001
bun run dev      # app on :5173 (proxies /api to the API)
```

Other scripts: `bun run check` (lint and typecheck).

### Environment variables

- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: optional outside Arc Studio. When set, the API uses them to reach Arc Testnet; otherwise it falls back to the public RPC.
