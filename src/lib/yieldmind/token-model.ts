export type RiskTier = "safe" | "caution" | "danger";

export type PortfolioTokenAsset = {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  isRiskToken?: boolean;
};

export type AnalyzedToken = {
  chainIndex: string;
  symbol: string;
  tokenAddress: string;
  balance: string;
  priceUsd: number;
  usdValue: number;
  isRiskToken: boolean;
  communityRecognized: boolean | null;
  riskScore: number;
  tier: RiskTier;
  pctDayApprox: number | null;
};

export type AgentAction = {
  id: string;
  title: string;
  detail: string;
};

export function buildActions(
  tokens: AnalyzedToken[],
  wallet: string,
  chainIndex: string
): AgentAction[] {
  const actions: AgentAction[] = [];
  const danger = tokens.filter((t) => t.tier === "danger");
  const caution = tokens.filter((t) => t.tier === "caution");

  if (danger.length) {
    actions.push({
      id: "swap-risk",
      title: "Reduce high-risk exposure (OKX DEX + Uniswap routing)",
      detail: `YieldMind recommends swapping ${danger
        .slice(0, 5)
        .map((t) => t.symbol)
        .join(", ")} into a safer reserve asset (USDC / OKB) using okx-dex-swap quotes on chain ${chainIndex}. Wallet: ${wallet.slice(0, 10)}…`
    });
  }

  if (caution.length) {
    actions.push({
      id: "watch-caution",
      title: "Tighten monitoring on caution-tier tokens",
      detail: `Tokens: ${caution
        .slice(0, 6)
        .map((t) => `${t.symbol} (${t.riskScore})`)
        .join(", ")}. Consider smaller size until liquidity/verification improves.`
    });
  }

  const stableSyms = new Set(["USDC", "USDT", "DAI", "USDT0", "USDG"]);
  const idleStables = tokens.filter(
    (t) => stableSyms.has(t.symbol.toUpperCase()) && t.usdValue >= 25
  );
  if (idleStables.length) {
    actions.push({
      id: "aave-supply",
      title: "Deploy idle stables into Aave V3 on X Layer",
      detail: `Detected idle stable exposure (${idleStables
        .map((t) => t.symbol)
        .join(
          ", "
        )}). YieldMind suggests routing surplus into Aave V3 via okx-defi-invest on X Layer (self-custodial execution).`
    });
  }

  if (!actions.length) {
    actions.push({
      id: "no-action",
      title: "Portfolio within tolerance",
      detail:
        "No automatic de-risking required right now. YieldMind will keep scanning new balances on refresh."
    });
  }

  return actions;
}
