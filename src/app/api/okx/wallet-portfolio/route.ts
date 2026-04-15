import { NextResponse } from "next/server";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import { okxGet } from "@/lib/okx/web3-client";
import { assertWalletAddress } from "@/lib/yieldmind/analyze";

export const dynamic = "force-dynamic";

/**
 * Proxies OKX Web3 Wallet API — total token balances by address (X Layer).
 * Docs: okx-wallet-portfolio / all-token-balances-by-address
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
    const path =
      `/api/v5/wallet/asset/all-token-balances-by-address?` +
      new URLSearchParams({
        address: normalized.toLowerCase(),
        chains: X_LAYER_CHAIN_INDEX,
        filter: "1"
      }).toString();

    const raw = await okxGet<{ code: string; msg?: string; data?: unknown }>(
      path
    );
    return NextResponse.json({ ok: true, raw });
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
