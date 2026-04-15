import {
  EVM_NATIVE_PLACEHOLDER,
  X_LAYER_CHAIN_INDEX
} from "@/lib/okx/config";
import { okxGet, okxPost } from "@/lib/okx/web3-client";
import {
  buildActions,
  type AgentAction,
  type AnalyzedToken,
  type PortfolioTokenAsset,
  type RiskTier
} from "@/lib/yieldmind/token-model";

export type {
  AgentAction,
  AnalyzedToken,
  PortfolioTokenAsset,
  RiskTier
} from "@/lib/yieldmind/token-model";

export type AnalyzeResult = {
  address: string;
  chainIndex: string;
  portfolioHealth: number;
  performanceDayPct: number;
  tokens: AnalyzedToken[];
  actions: AgentAction[];
  meta: {
    tokenCount: number;
    fetchedAt: string;
  };
};

type BasicInfoRow = {
  chainIndex: string;
  tokenContractAddress: string;
  tagList?: { communityRecognized?: boolean };
  decimal?: string;
};

type PriceRow = {
  chainIndex: string;
  tokenContractAddress: string;
  price?: string;
};

type PriceInfoRow = {
  chainIndex: string;
  tokenContractAddress: string;
  price?: string;
  liquidity?: string;
  maxPrice?: string;
  minPrice?: string;
  changePercent24H?: string;
  priceChangePercent24H?: string;
};

function isEthAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

export function toMarketAddress(tokenAddress: string): string {
  const t = tokenAddress.trim();
  if (!t) return EVM_NATIVE_PLACEHOLDER;
  return t;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function parseNum(v: string | undefined): number {
  if (v === undefined || v === null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function tierFromScore(score: number): RiskTier {
  if (score >= 72) return "safe";
  if (score >= 42) return "caution";
  return "danger";
}

export async function fetchPortfolioTokenAssets(
  address: string,
  chainId: string
): Promise<{
  raw: { code: string | number; msg?: string; data?: unknown };
  tokenAssets: PortfolioTokenAsset[];
}> {
  const path =
    `/api/v5/wallet/asset/all-token-balances-by-address?` +
    new URLSearchParams({
      address: address.toLowerCase(),
      chains: chainId,
      filter: "1"
    }).toString();

  const portfolio = await okxGet<{
    code: string | number;
    msg?: string;
    data?: Array<{ tokenAssets?: PortfolioTokenAsset[] }>;
  }>(path);

  const tokenAssets = portfolio.data?.[0]?.tokenAssets ?? [];
  return { raw: portfolio, tokenAssets };
}

export async function buildSecurityFromTokenAssets(
  tokenAssets: PortfolioTokenAsset[],
  chainIndex: string
): Promise<{
  tokens: AnalyzedToken[];
  portfolioHealth: number;
  performanceDayPct: number;
}> {
  const nonzero = tokenAssets.filter((t) => {
    const b = parseNum(t.balance);
    return Number.isFinite(b) && b > 0;
  });

  const sorted = [...nonzero].sort((a, b) => {
    const pa = parseNum(a.tokenPrice) * (parseNum(a.balance) || 0);
    const pb = parseNum(b.tokenPrice) * (parseNum(b.balance) || 0);
    return pb - pa;
  });

  const limited = sorted.slice(0, 60);

  const keys = limited.map((t) => ({
    chainIndex,
    tokenContractAddress: toMarketAddress(t.tokenAddress ?? "")
  }));

  const basicMap = new Map<string, BasicInfoRow>();
  const priceMap = new Map<string, PriceRow>();
  const priceInfoMap = new Map<string, PriceInfoRow>();

  for (const batch of chunk(keys, 20)) {
    try {
      const basic = await okxPost<{
        code: string | number;
        data?: BasicInfoRow[];
      }>("/api/v6/dex/market/token/basic-info", batch);
      for (const row of basic.data ?? []) {
        const k = `${row.chainIndex}:${row.tokenContractAddress.toLowerCase()}`;
        basicMap.set(k, row);
      }
    } catch {
      /* optional */
    }

    try {
      const px = await okxPost<{ code: string | number; data?: PriceRow[] }>(
        "/api/v6/dex/market/price",
        batch
      );
      for (const row of px.data ?? []) {
        const k = `${row.chainIndex}:${row.tokenContractAddress.toLowerCase()}`;
        priceMap.set(k, row);
      }
    } catch {
      /* optional */
    }

    try {
      const pi = await okxPost<{ code: string | number; data?: PriceInfoRow[] }>(
        "/api/v6/dex/market/price-info",
        batch
      );
      for (const row of pi.data ?? []) {
        const k = `${row.chainIndex}:${row.tokenContractAddress.toLowerCase()}`;
        priceInfoMap.set(k, row);
      }
    } catch {
      /* optional */
    }
  }

  const analyzed: AnalyzedToken[] = [];

  for (const t of limited) {
    const marketAddr = toMarketAddress(t.tokenAddress ?? "");
    const mapKey = `${chainIndex}:${marketAddr.toLowerCase()}`;

    const basic = basicMap.get(mapKey);
    const px = priceMap.get(mapKey);
    const pi = priceInfoMap.get(mapKey);

    const portfolioPrice = parseNum(t.tokenPrice);
    const dexPrice = parseNum(px?.price);
    const priceUsd =
      Number.isFinite(dexPrice) && dexPrice > 0
        ? dexPrice
        : Number.isFinite(portfolioPrice) && portfolioPrice > 0
          ? portfolioPrice
          : 0;

    const bal = parseNum(t.balance) || 0;
    const usdValue = bal * priceUsd;

    const communityRecognized =
      basic?.tagList?.communityRecognized === undefined
        ? null
        : Boolean(basic.tagList.communityRecognized);

    const liquidityUsd = parseNum(pi?.liquidity);

    let riskScore = 100;
    if (t.isRiskToken) riskScore -= 45;
    if (!priceUsd || priceUsd <= 0) riskScore -= 28;
    if (communityRecognized === false) riskScore -= 14;
    if (Number.isFinite(liquidityUsd) && liquidityUsd < 5_000) riskScore -= 12;

    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    const chgRaw =
      pi?.changePercent24H ??
      pi?.priceChangePercent24H ??
      (() => {
        const p = parseNum(pi?.price);
        const hi = parseNum(pi?.maxPrice);
        const lo = parseNum(pi?.minPrice);
        if (
          !Number.isFinite(p) ||
          p <= 0 ||
          !Number.isFinite(hi) ||
          !Number.isFinite(lo)
        ) {
          return undefined;
        }
        const mid = (hi + lo) / 2;
        return String((((p - mid) / mid) * 100).toFixed(4));
      })();

    const chgPct = parseNum(chgRaw);

    analyzed.push({
      chainIndex,
      symbol: t.symbol,
      tokenAddress: t.tokenAddress ?? "",
      balance: t.balance,
      priceUsd,
      usdValue,
      isRiskToken: Boolean(t.isRiskToken),
      communityRecognized,
      riskScore,
      tier: tierFromScore(riskScore),
      pctDayApprox: Number.isFinite(chgPct) ? chgPct : null
    });
  }

  const totalUsd = analyzed.reduce((a, t) => a + t.usdValue, 0);

  const portfolioHealth =
    totalUsd > 0
      ? Math.round(
          analyzed.reduce((a, t) => a + (t.usdValue * t.riskScore) / totalUsd, 0)
        )
      : analyzed.length
        ? Math.round(
            analyzed.reduce((a, t) => a + t.riskScore, 0) / analyzed.length
          )
        : 100;

  const wPerf = analyzed.filter(
    (t) => t.usdValue > 0 && t.pctDayApprox !== null
  );
  const performanceDayPct =
    totalUsd > 0 && wPerf.length
      ? wPerf.reduce(
          (a, t) => a + (t.usdValue * (t.pctDayApprox ?? 0)) / totalUsd,
          0
        )
      : 0;

  return {
    tokens: analyzed.sort((a, b) => b.usdValue - a.usdValue),
    portfolioHealth,
    performanceDayPct: Number(performanceDayPct.toFixed(2))
  };
}

export async function analyzeWallet(address: string): Promise<AnalyzeResult> {
  const chainIndex = X_LAYER_CHAIN_INDEX;
  const { tokenAssets } = await fetchPortfolioTokenAssets(address, chainIndex);
  const { tokens, portfolioHealth, performanceDayPct } =
    await buildSecurityFromTokenAssets(tokenAssets, chainIndex);
  const actions = buildActions(tokens, address, chainIndex);

  return {
    address,
    chainIndex,
    portfolioHealth,
    performanceDayPct,
    tokens,
    actions,
    meta: {
      tokenCount: tokens.length,
      fetchedAt: new Date().toISOString()
    }
  };
}

export function assertWalletAddress(raw: string): string {
  const v = raw.trim();
  if (!isEthAddress(v)) {
    throw new Error("Enter a valid 0x-prefixed EVM address (42 characters).");
  }
  return v;
}
