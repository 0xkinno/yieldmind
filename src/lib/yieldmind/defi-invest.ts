import { okxGet, okxPost } from "@/lib/okx/web3-client";

export type DefiProductRow = {
  investmentId?: string;
  investmentName?: string;
  chainId?: string;
  rate?: string;
  investType?: string;
  platformName?: string;
  platformId?: string;
  rateType?: string;
  tvl?: string;
  underlyingToken?: Array<{
    tokenSymbol?: string;
    tokenAddress?: string;
    tokenContract?: string;
    isBaseToken?: boolean;
  }>;
};

const FALLBACK_NETWORK_LABELS: Record<string, string> = {
  "196": "X Layer"
};

export async function resolveDefiNetworkName(chainId: string): Promise<string> {
  const fallback = FALLBACK_NETWORK_LABELS[chainId];
  try {
    const res = await okxGet<{
      code: string | number;
      data?: Array<{ symbol?: string; chainId?: string }>;
    }>(`/api/v5/defi/explore/network-list?chainId=${encodeURIComponent(chainId)}`);

    const rows = res.data ?? [];
    const hit = rows.find((r) => r.chainId === chainId);
    if (hit?.symbol) return hit.symbol;
  } catch {
    /* use fallback */
  }
  return fallback ?? `chain-${chainId}`;
}

export async function fetchDefiProducts(params: {
  chainId: string;
  limit?: string;
}): Promise<{ network: string; investments: DefiProductRow[]; total: string }> {
  const network = await resolveDefiNetworkName(params.chainId);
  const body: Record<string, unknown> = {
    network,
    chainId: params.chainId,
    simplifyInvestType: "101",
    offset: "0",
    limit: params.limit ?? "20",
    sort: {
      orders: [{ direction: "DESC", property: "RATE" }]
    }
  };

  try {
    const res = await okxPost<{
      code: string | number;
      data?: { investments?: DefiProductRow[]; total?: string };
    }>("/api/v5/defi/explore/product/list", body);

    return {
      network,
      investments: res.data?.investments ?? [],
      total: res.data?.total ?? "0"
    };
  } catch {
    const minimal = {
      network,
      chainId: params.chainId,
      simplifyInvestType: "101",
      offset: "0",
      limit: params.limit ?? "20"
    };
    const res = await okxPost<{
      code: string | number;
      data?: { investments?: DefiProductRow[]; total?: string };
    }>("/api/v5/defi/explore/product/list", minimal);

    return {
      network,
      investments: res.data?.investments ?? [],
      total: res.data?.total ?? "0"
    };
  }
}
