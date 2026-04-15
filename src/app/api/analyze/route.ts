import { NextResponse } from "next/server";
import { analyzeWallet, assertWalletAddress } from "@/lib/yieldmind/analyze";

export const dynamic = "force-dynamic";

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
    const data = await analyzeWallet(normalized);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const missingCreds = message.includes("Missing OKX credentials");
    const badInput =
      message.includes("valid 0x") || message.includes("Missing ?address");
    return NextResponse.json(
      { ok: false, error: message },
      { status: missingCreds ? 500 : badInput ? 400 : 502 }
    );
  }
}
