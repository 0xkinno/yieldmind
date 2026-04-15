import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YieldMind",
  description: "Autonomous DeFi agent on X Layer (OKX Build X Hackathon)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

