import { NextResponse } from "next/server";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import {
  assertWalletAddress,
  fetchPortfolioTokenAssets
} from "@/lib/yieldmind/analyze";

export const dynamic = "force-dynamic";

/** okx-wallet-portfolio: X Layer balances by address */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId =
      searchParams.get("chainId") ?? X_LAYER_CHAIN_INDEX;

    if (!address) {
      return NextResponse.json(
        { ok: false, error: "Missing ?address=0x…" },
        { status: 400 }
      );
    }

    const normalized = assertWalletAddress(address);
    const { raw, tokenAssets } = await fetchPortfolioTokenAssets(
      normalized,
      chainId
    );

    return NextResponse.json({
      ok: true,
      chainId,
      address: normalized,
      tokenAssets,
      raw
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
