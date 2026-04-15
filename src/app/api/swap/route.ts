import { NextResponse } from "next/server";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import { quoteRiskyTokenSwap } from "@/lib/yieldmind/dex-swap";
import type { AnalyzedToken } from "@/lib/yieldmind/token-model";

export const dynamic = "force-dynamic";

/** okx-dex-swap: aggregator quotes toward USDC for risky positions */
export async function POST(req: Request) {
  try {
    let body: {
      chainId?: string;
      walletAddress?: string;
      tokens?: AnalyzedToken[];
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const chainId = body.chainId ?? X_LAYER_CHAIN_INDEX;
    const tokens = Array.isArray(body.tokens) ? body.tokens : [];

    const risky = tokens.filter(
      (t) => t.tier === "danger" || t.tier === "caution"
    );

    const quotes = [];
    for (const t of risky.slice(0, 8)) {
      quotes.push(
        await quoteRiskyTokenSwap({
          chainIndex: chainId,
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          balance: t.balance
        })
      );
    }

    return NextResponse.json({
      ok: true,
      chainId,
      walletAddress: body.walletAddress ?? null,
      quotes
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const missingCreds = message.includes("Missing OKX credentials");
    return NextResponse.json(
      { ok: false, error: message },
      { status: missingCreds ? 500 : 502 }
    );
  }
}
