import { NextResponse } from "next/server";
import { analyzeWallet, assertWalletAddress } from "@/lib/yieldmind/analyze";

export const dynamic = "force-dynamic";

/**
 * okx-security — token risk scores + portfolio health derived from OKX signals
 * (portfolio risk flags, DEX market metadata, liquidity hints).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) {
      return NextResponse.json(
        { ok: false, error: "Missing ?address=0x…" },
        { status: 400 }
      );
    }
    const normalized = assertWalletAddress(address);
    const full = await analyzeWallet(normalized);
    return NextResponse.json({
      ok: true,
      data: {
        portfolioHealth: full.portfolioHealth,
        tokens: full.tokens.map((t) => ({
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          riskScore: t.riskScore,
          tier: t.tier,
          isRiskToken: t.isRiskToken,
          usdValue: t.usdValue
        }))
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const missingCreds = message.includes("Missing OKX credentials");
    const badInput = message.includes("valid 0x");
    return NextResponse.json(
      { ok: false, error: message },
      { status: missingCreds ? 500 : badInput ? 400 : 502 }
    );
  }
}
