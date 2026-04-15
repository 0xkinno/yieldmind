# YieldMind

Autonomous DeFi agent dashboard for the OKX Build X Hackathon (X Layer).

Live Demo: https://aesthetic-rolypoly-63f207.netlify.app/

## Setup

1) Install Node.js 20+.
2) Install deps:

```bash
npm install
```

3) Create `.env.local`:

```bash
copy .env.local.example .env.local
```

Fill:

- `OKX_API_KEY`
- `OKX_SECRET_KEY`
- `OKX_PASSPHRASE`

4) Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

Live Demo: https://aesthetic-rolypoly-63f207.netlify.app/

## Architecture

- UI calls only **Next.js API routes**
- API routes call OKX endpoints (portfolio, security, market, swap, invest)
- Dashboard computes a portfolio health score and suggested agent actions

