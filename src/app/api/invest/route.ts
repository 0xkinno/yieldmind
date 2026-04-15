import { NextResponse } from "next/server";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import { fetchDefiProducts } from "@/lib/yieldmind/defi-invest";

export const dynamic = "force-dynamic";

/** okx-defi-invest: DeFi earn product list for chain */
export async function POST(req: Request) {
  try {
    let body: {
      chainId?: string;
      limit?: string;
      walletAddress?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const chainId = body.chainId ?? X_LAYER_CHAIN_INDEX;
    const { network, investments, total } = await fetchDefiProducts({
      chainId,
      limit: body.limit ?? "20"
    });

    return NextResponse.json({
      ok: true,
      chainId,
      walletAddress: body.walletAddress ?? null,
      network,
      opportunities: investments,
      total
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
