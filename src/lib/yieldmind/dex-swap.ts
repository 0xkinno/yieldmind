import { X_LAYER_USDC } from "@/lib/okx/config";
import { okxGet, okxPost } from "@/lib/okx/web3-client";
import { toMarketAddress } from "@/lib/yieldmind/analyze";

export type SwapQuoteSuggestion = {
  symbol: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amountIn: string;
  decimals: string;
  toTokenAmount?: string;
  priceImpactPercent?: string;
  router?: string;
  tradeFeeUsd?: string;
  error?: string;
};

function normalizeAddr(a: string): string {
  return a.startsWith("0x") ? a.toLowerCase() : a;
}

/** ~10% of balance in minimal units, at least 1 unit */
export function balanceToSwapAmount(
  balanceHuman: string,
  decimals: number
): string {
  const dec = Math.min(36, Math.max(0, decimals));
  const bal = Number(balanceHuman);
  if (!Number.isFinite(bal) || bal <= 0) return "0";
  const portion = bal * 0.1;
  const scaled = portion * 10 ** dec;
  let n = BigInt(Math.floor(Math.max(scaled, 1)));
  if (n <= 0n) n = 1n;
  return n.toString();
}

async function fetchDecimals(
  chainIndex: string,
  tokenContractAddress: string
): Promise<string> {
  const body = [{ chainIndex, tokenContractAddress }];
  const res = await okxPost<{
    code: string | number;
    data?: Array<{ decimal?: string }>;
  }>("/api/v6/dex/market/token/basic-info", body);
  const d = res.data?.[0]?.decimal;
  return d && /^\d+$/.test(d) ? d : "18";
}

export async function quoteRiskyTokenSwap(params: {
  chainIndex: string;
  symbol: string;
  tokenAddress: string;
  balance: string;
}): Promise<SwapQuoteSuggestion> {
  const fromAddr = normalizeAddr(toMarketAddress(params.tokenAddress));
  const toAddr = normalizeAddr(X_LAYER_USDC);

  if (fromAddr === toAddr) {
    return {
      symbol: params.symbol,
      fromTokenAddress: fromAddr,
      toTokenAddress: toAddr,
      amountIn: "0",
      decimals: "6",
      error: "Already USDC; no swap needed."
    };
  }

  try {
    const decimals = await fetchDecimals(params.chainIndex, fromAddr);
    const amountIn = balanceToSwapAmount(params.balance, Number(decimals));
    if (amountIn === "0") {
      throw new Error("Zero swap amount");
    }

    const qs = new URLSearchParams({
      chainIndex: params.chainIndex,
      fromTokenAddress: fromAddr,
      toTokenAddress: toAddr,
      amount: amountIn,
      swapMode: "exactIn"
    });

    const quote = await okxGet<{
      code: string | number;
      data?: Array<{
        toTokenAmount?: string;
        priceImpactPercent?: string;
        router?: string;
        tradeFee?: string;
      }>;
    }>(`/api/v6/dex/aggregator/quote?${qs.toString()}`);

    const row = quote.data?.[0];
    return {
      symbol: params.symbol,
      fromTokenAddress: fromAddr,
      toTokenAddress: toAddr,
      amountIn,
      decimals,
      toTokenAmount: row?.toTokenAmount,
      priceImpactPercent: row?.priceImpactPercent,
      router: row?.router,
      tradeFeeUsd: row?.tradeFee
    };
  } catch (e) {
    return {
      symbol: params.symbol,
      fromTokenAddress: fromAddr,
      toTokenAddress: toAddr,
      amountIn: "0",
      decimals: "18",
      error: e instanceof Error ? e.message : "Quote failed"
    };
  }
}
