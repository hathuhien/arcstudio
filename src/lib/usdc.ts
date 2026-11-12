import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

export const ARC_CHAIN_ID = arcTestnet.id
export const ARC_CHAIN = requireChain(ARC_CHAIN_ID)

const usdcFact = getUsdc(ARC_CHAIN_ID)
if (!usdcFact) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdcFact.address as `0x${string}`

/** Single USDC balance from the ERC-20 view (on Arc the native gas balance is the same pool). */
export function useUsdcBalance() {
  const { address } = useAccount()
  const query = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  })
  const raw = query.data
  const formatted =
    raw !== undefined ? Amount.fromRaw(raw, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2) : undefined
  return { raw, formatted, isLoading: query.isLoading, refetch: query.refetch }
}
