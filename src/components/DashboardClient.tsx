"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import { composeAgentActions } from "@/lib/yieldmind/agent-actions";
import type {
  AgentAction,
  AnalyzedToken,
  PortfolioTokenAsset
} from "@/lib/yieldmind/token-model";
import type { SwapQuoteSuggestion } from "@/lib/yieldmind/dex-swap";
import type { DefiProductRow } from "@/lib/yieldmind/defi-invest";

type RiskTier = AnalyzedToken["tier"];

function tierColor(tier: RiskTier) {
  if (tier === "safe") return "text-safe border-safe/40 bg-safe/10";
  if (tier === "caution") return "text-caution border-caution/40 bg-caution/10";
  return "text-danger border-danger/40 bg-danger/10";
}

function tierLabel(tier: RiskTier) {
  if (tier === "safe") return "Safe";
  if (tier === "caution") return "Caution";
  return "Danger";
}

type DashboardBundle = {
  chainId: string;
  tokenAssets: PortfolioTokenAsset[];
  tokens: AnalyzedToken[];
  portfolioHealth: number;
  performanceDayPct: number;
  quotes: SwapQuoteSuggestion[];
  opportunities: DefiProductRow[];
  defiNetwork: string;
  actions: AgentAction[];
  fetchedAt: string;
};

export function DashboardClient() {
  const params = useSearchParams();
  const address = params.get("address");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardBundle | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const chainId = X_LAYER_CHAIN_INDEX;

    try {
      const pRes = await fetch(
        `/api/portfolio?address=${encodeURIComponent(address)}&chainId=${chainId}`,
        { cache: "no-store" }
      );
      const pJson = (await pRes.json()) as {
        ok: boolean;
        error?: string;
        tokenAssets?: PortfolioTokenAsset[];
      };
      if (!pRes.ok || !pJson.ok || !pJson.tokenAssets) {
        throw new Error(pJson.error || `Portfolio failed (${pRes.status})`);
      }

      const sRes = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          tokenAssets: pJson.tokenAssets
        }),
        cache: "no-store"
      });
      const sJson = (await sRes.json()) as {
        ok: boolean;
        error?: string;
        tokens?: AnalyzedToken[];
        portfolioHealth?: number;
        performanceDayPct?: number;
      };
      if (!sRes.ok || !sJson.ok || !sJson.tokens) {
        throw new Error(sJson.error || `Security failed (${sRes.status})`);
      }

      const swRes = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          walletAddress: address,
          tokens: sJson.tokens
        }),
        cache: "no-store"
      });
      const swJson = (await swRes.json()) as {
        ok: boolean;
        quotes?: SwapQuoteSuggestion[];
        error?: string;
      };
      const quotes = swJson.ok && swJson.quotes ? swJson.quotes : [];

      let opportunities: DefiProductRow[] = [];
      let defiNetwork = "";
      try {
        const iRes = await fetch("/api/invest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chainId, walletAddress: address }),
          cache: "no-store"
        });
        const iJson = (await iRes.json()) as {
          ok: boolean;
          opportunities?: DefiProductRow[];
          network?: string;
        };
        if (iJson.ok && iJson.opportunities) {
          opportunities = iJson.opportunities;
          defiNetwork = iJson.network ?? "";
        }
      } catch {
        /* DeFi optional */
      }

      const actions = composeAgentActions({
        wallet: address,
        chainId,
        tokens: sJson.tokens,
        swaps: quotes,
        defiProducts: opportunities,
        defiNetwork: defiNetwork || `chain ${chainId}`
      });

      setData({
        chainId,
        tokenAssets: pJson.tokenAssets,
        tokens: sJson.tokens,
        portfolioHealth: sJson.portfolioHealth ?? 0,
        performanceDayPct: sJson.performanceDayPct ?? 0,
        quotes,
        opportunities,
        defiNetwork,
        actions,
        fetchedAt: new Date().toISOString()
      });
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!address) {
    return (
      <div className="rounded-2xl border border-border bg-panel/60 p-8 text-white/70">
        <p>No wallet provided.</p>
        <Link href="/" className="mt-4 inline-block text-accent hover:underline">
          ← Back to enter an address
        </Link>
      </div>
    );
  }

  const perf = data?.performanceDayPct ?? 0;
  const perfStr =
    perf >= 0 ? `+${perf.toFixed(2)}%` : `${perf.toFixed(2)}%`;
  const perfClass = perf >= 0 ? "text-safe" : "text-danger";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/45">
            Wallet · chainId {X_LAYER_CHAIN_INDEX}
          </p>
          <p className="mt-1 font-mono text-sm text-white/90">{address}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-border bg-panel2/70 px-4 py-2 text-sm text-white hover:bg-panel2 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Home
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-panel/60 p-6">
          <div className="text-sm text-white/60">Portfolio Health Score</div>
          <div className="mt-2 text-4xl font-semibold text-white">
            {loading ? "…" : data ? data.portfolioHealth : "—"}
          </div>
          <p className="mt-2 text-xs text-white/45">
            From /api/security (USD-weighted risk scores per token).
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-panel/60 p-6">
          <div className="text-sm text-white/60">Performance</div>
          <div className="mt-2 text-lg font-medium text-white">
            YieldMind grew your portfolio{" "}
            <span className={loading ? "text-white/40" : perfClass}>
              {loading ? "…" : perfStr}
            </span>{" "}
            today
          </div>
          <p className="mt-1 text-xs text-white/45">
            From DEX market price-info (24h) in the security pass.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-panel/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-white">Tokens</div>
          {data ? (
            <span className="text-xs text-white/45">
              {data.tokens.length} scored · {data.tokenAssets.length} from
              portfolio API
            </span>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-white/50">
                <th className="py-2 pr-4 font-medium">Asset</th>
                <th className="py-2 pr-4 font-medium">Balance</th>
                <th className="py-2 pr-4 font-medium">Value (USD)</th>
                <th className="py-2 pr-4 font-medium">Risk</th>
                <th className="py-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={5} className="py-8 text-white/45">
                    Loading /api/portfolio → /api/security → /api/swap →
                    /api/invest…
                  </td>
                </tr>
              ) : null}
              {data?.tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-white/45">
                    No balances on X Layer for this address (or all zero).
                  </td>
                </tr>
              ) : null}
              {data?.tokens.map((t) => (
                <tr
                  key={`${t.symbol}-${t.tokenAddress}`}
                  className="border-b border-border/60"
                >
                  <td className="py-3 pr-4 font-medium text-white">{t.symbol}</td>
                  <td className="py-3 pr-4 font-mono text-white/80">
                    {Number(t.balance).toLocaleString(undefined, {
                      maximumFractionDigits: 8
                    })}
                  </td>
                  <td className="py-3 pr-4 text-white/85">
                    $
                    {t.usdValue.toLocaleString(undefined, {
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-3 pr-4 text-white/80">{t.riskScore}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierColor(t.tier)}`}
                    >
                      {tierLabel(t.tier)}
                    </span>
                    {t.isRiskToken ? (
                      <span className="ml-2 text-xs text-danger">
                        airdrop risk
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data && data.quotes.filter((q) => !q.error).length > 0 ? (
        <section className="rounded-2xl border border-border bg-panel/60 p-6">
          <div className="text-sm font-medium text-white">
            Live swap quotes (OKX DEX aggregator)
          </div>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {data.quotes
              .filter((q) => !q.error)
              .map((q) => (
                <li key={q.symbol} className="font-mono text-xs">
                  {q.symbol}: in {q.amountIn} min units → ~{q.toTokenAmount ?? "?"}{" "}
                  USDC min units · impact {q.priceImpactPercent ?? "—"}%
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-panel/60 p-6">
        <div className="text-sm font-medium text-white">Agent Actions</div>
        <ul className="mt-4 space-y-4">
          {loading && !data ? (
            <li className="text-sm text-white/45">Loading recommendations…</li>
          ) : null}
          {data?.actions.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-border/80 bg-panel2/40 p-4"
            >
              <div className="font-medium text-white">{a.title}</div>
              <p className="mt-1 text-sm text-white/65">{a.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {data ? (
        <p className="text-center text-xs text-white/35">
          Last updated {new Date(data.fetchedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
