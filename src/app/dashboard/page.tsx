import { Suspense } from "react";
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h2>
          <p className="text-sm text-white/60">
            Live X Layer balances via OKX wallet portfolio, risk scoring (okx-security
            heuristics + DEX market data), and agent recommendations.
          </p>
        </div>

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-panel/60 p-8 text-white/60">
                Loading dashboard…
              </div>
            }
          >
            <DashboardClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

