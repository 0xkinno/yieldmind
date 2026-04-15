import {
  buildActions,
  type AgentAction,
  type AnalyzedToken
} from "@/lib/yieldmind/token-model";
import type { SwapQuoteSuggestion } from "@/lib/yieldmind/dex-swap";
import type { DefiProductRow } from "@/lib/yieldmind/defi-invest";

function formatApy(rate: string | undefined, rateType: string | undefined) {
  if (!rate) return "";
  const pct = (Number(rate) * 100).toFixed(2);
  return rateType === "1" ? `${pct}% APR` : `${pct}% APY`;
}

export function composeAgentActions(params: {
  wallet: string;
  chainId: string;
  tokens: AnalyzedToken[];
  swaps: SwapQuoteSuggestion[];
  defiProducts: DefiProductRow[];
  defiNetwork: string;
}): AgentAction[] {
  const out: AgentAction[] = [];

  const goodSwaps = params.swaps.filter((s) => !s.error);
  for (const s of goodSwaps.slice(0, 6)) {
    const impact =
      s.priceImpactPercent !== undefined
        ? ` Price impact ~${s.priceImpactPercent}%.`
        : "";
    const fee =
      s.tradeFeeUsd !== undefined ? ` Est. network fee ~$${s.tradeFeeUsd}.` : "";
    out.push({
      id: `swap-live-${s.symbol}`,
      title: `OKX DEX quote: swap ${s.symbol} → USDC`,
      detail: `Sell amount (min units): ${s.amountIn}.${impact}${fee} Route: ${s.router ?? "aggregated (incl. Uniswap where routed)"}. Execute via okx-dex-swap / aggregator swap tx from wallet ${params.wallet.slice(0, 10)}…`
    });
  }

  const failedSwaps = params.swaps.filter((s) => s.error);
  if (failedSwaps.length && !goodSwaps.length) {
    out.push({
      id: "swap-partial",
      title: "DEX quotes unavailable for some assets",
      detail: failedSwaps
        .slice(0, 4)
        .map((s) => `${s.symbol}: ${s.error}`)
        .join(" · ")
    });
  }

  const holdings = new Set(
    params.tokens.map((t) => t.symbol.toUpperCase())
  );
  const matched = params.defiProducts.filter((p) =>
    (p.underlyingToken ?? []).some((u) =>
      holdings.has((u.tokenSymbol ?? "").toUpperCase())
    )
  );

  const picks = (matched.length ? matched : params.defiProducts).slice(0, 8);
  for (const p of picks) {
    const syms =
      p.underlyingToken?.map((u) => u.tokenSymbol).filter(Boolean) ?? [];
    out.push({
      id: `defi-${p.investmentId ?? p.investmentName}`,
      title: `DeFi earn: ${p.investmentName ?? "Pool"} (${p.platformName ?? "protocol"})`,
      detail: `okx-defi-invest · ${params.defiNetwork} · ${formatApy(p.rate, p.rateType)} · TVL ${p.tvl ?? "—"} · Underlying: ${syms.join(", ") || "—"}`
    });
  }

  const baseline = buildActions(
    params.tokens,
    params.wallet,
    params.chainId
  ).filter((a) => a.id !== "swap-risk");
  out.push(...baseline);

  return out;
}
