"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function HomeAnalyzeForm() {
  const router = useRouter();
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const v = wallet.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      setError("Enter a valid EVM address (0x + 40 hex characters).");
      return;
    }
    router.push(`/dashboard?address=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-3">
      <label className="text-sm text-white/70" htmlFor="wallet">
        Wallet address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="wallet"
          name="wallet"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg/40 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/35 focus:border-white/30"
          placeholder="0x…"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white hover:opacity-95"
        >
          Analyze
        </button>
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <p className="text-xs text-white/45">
          Connects to YieldMind API routes (OKX wallet portfolio + DEX market +
          security scoring).
        </p>
      )}
    </form>
  );
}
