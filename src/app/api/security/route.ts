import { NextResponse } from "next/server";
import { X_LAYER_CHAIN_INDEX } from "@/lib/okx/config";
import {
  assertWalletAddress,
  buildSecurityFromTokenAssets,
  fetchPortfolioTokenAssets
} from "@/lib/yieldmind/analyze";
import type { PortfolioTokenAsset } from "@/lib/yieldmind/token-model";

export const dynamic = "force-dynamic";

/** okx-security: risk scores + 24h perf from portfolio tokens */
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
    const { tokenAssets } = await fetchPortfolioTokenAssets(
      normalized,
      chainId
    );
    const snapshot = await buildSecurityFromTokenAssets(
      tokenAssets,
      chainId
    );

    return NextResponse.json({
      ok: true,
      chainId,
      address: normalized,
      ...snapshot
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

export async function POST(req: Request) {
  try {
    let body: {
      chainId?: string;
      tokenAssets?: PortfolioTokenAsset[];
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const chainId = body.chainId ?? X_LAYER_CHAIN_INDEX;
    if (!Array.isArray(body.tokenAssets)) {
      return NextResponse.json(
        { ok: false, error: "Body must include tokenAssets: []" },
        { status: 400 }
      );
    }

    const snapshot = await buildSecurityFromTokenAssets(
      body.tokenAssets,
      chainId
    );

    return NextResponse.json({
      ok: true,
      chainId,
      ...snapshot
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
