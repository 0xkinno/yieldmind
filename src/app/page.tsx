import Link from "next/link";
import { HomeAnalyzeForm } from "@/components/HomeAnalyzeForm";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="rounded-2xl border border-border bg-panel/60 p-8 shadow-glow">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel2/60 px-3 py-1 text-sm text-white/80">
                <span className="h-2 w-2 rounded-full bg-accent" />
                OKX Build X Hackathon · X Layer
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                YieldMind
              </h1>
              <p className="mt-2 max-w-2xl text-white/70">
                An autonomous DeFi agent that monitors your X Layer portfolio, risk-scores
                tokens, and suggests swaps + yield strategies.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border bg-panel2/70 px-4 py-2 text-sm text-white hover:bg-panel2"
            >
              Open dashboard
            </Link>
          </div>

          <HomeAnalyzeForm />
        </div>
      </div>
    </main>
  );
}

