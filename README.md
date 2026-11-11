# L'Agence | Fractional Real Estate Investment Platform

L'Agence is an institutional-grade, full-stack fractional real estate investment platform. It enables retail and institutional investors to acquire tokenized shares of vetted European luxury real estate assets starting from €100, collect automated monthly/daily rental yields, and monitor their portfolio with double-entry ledger verification.

---

## Project Monorepo Architecture

```
L’Agence/
├── apps/
│   ├── web/                      Public site + investor dashboard
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── public/       Home, Properties, Property detail, About, FAQ, Contact
│   │       │   ├── auth/         Login, Register, Reset password
│   │       │   └── client/       Investor dashboard
│   │       │       ├── Overview
│   │       │       ├── Properties, Portfolio, Income
│   │       │       ├── Deposit, Withdraw, Transactions
│   │       │       └── Verification, Support, Profile
│   │       ├── components/       Cards, tables, forms, sidebar
│   │       └── lib/              API client, auth helpers
│   │
│   ├── admin/                    Admin panel
│   │   └── src/
│   │       ├── nav/              Grouped sidebar config
│   │       └── pages/
│   │           ├── Dashboard     Action queue
│   │           ├── money/        Deposits, Withdrawals, Wallets, Ledger
│   │           ├── investors/    Users, KYC, Proof vault, Club Privé
│   │           ├── properties/   SPV portfolio, Issuance, Dividends, Restore
│   │           ├── tokenization/ TokenizationAdmin + CSS
│   │           ├── support/      Tickets, Reports
│   │           ├── website/      Pages, Sections, Templates
│   │           ├── settings/     Email, SMS, SEO, GDPR, Holiday
│   │           ├── security/     Audit trail, Admin security
│   │           └── system/       API logs, Error buffer, Cache
│   │
│   └── api/                      Express & Cloudflare Hono worker
│       └── src/
│           ├── index.ts          Mounts all routes
│           ├── middleware/       requireAdmin, requireClient
│           └── routes/
│               ├── auth.ts
│               ├── client/       Portfolio, deposits, withdrawals, tickets
│               ├── admin/        Users, deposits, withdrawals, kyc, tickets
│               └── tokenization.ts
│
├── packages/
│   ├── ui/                       Shared buttons, cards, tables
│   ├── database/                 DB client and types
│   ├── auth/                     Sessions, roles (admin / client)
│   └── validation/               Shared zod schemas
│
├── infra/
│   ├── schema.sql
│   └── migrations/
│       └── 001_tokenization.sql
│
├── .env.example                  Variable names template (no real keys)
├── .gitignore                    Git exclusions
├── wrangler.toml                 Cloudflare worker deployment config
└── README.md
```

---

## 1. Features & Architectural Capabilities

- **Design Language**: Custom architectural tokens, geometric typography, dark green aesthetic (`#182D2A`, accent `#B7E36A`), responsive navigation, zero-pill metadata discipline, and high-fidelity asset photography.
- **Double-Entry Auditable Ledger**:
  - ACID atomic transaction processing.
  - Concurrency locking preventing double withdrawals, race conditions, and unauthorized balance mutations.
  - Cryptographic transaction hashing linking every investment and dividend distribution.
- **Real Estate Assets Directory**:
  - Institutional SPV listings: *Valencia Ruzafa Smart Living*, *Madrid Chamberí Coliving*, *Malaga Coastline Beachfront*, and *Brickell Miami Bay Suites*.
  - Independent RICS appraisals, cadastral references, and downloadable legal SPV documentation.
- **Interactive Investment Return Simulator**:
  - Real-time estimated monthly rental cashflow, multi-year compounding returns, and projected capital gains.
- **Investor Dashboard**:
  - Total portfolio value, liquid available cash, invested capital, and realized earnings.
  - Active property holdings with downloadable ownership certificates.
  - Transaction ledger with status badges and audit hashes.
- **Administrative Control Panel (`/admin`)**:
  - Structured 11-group sidebar navigation (Overview, Money, Investors, Properties, Plans & Referrals, Support & Reports, Marketing, Website, Site Settings, Compliance & Security, System).
  - Executive command center hero banner & live action queue cards.
  - SPV portfolio funding velocity bars with Solana SPL token integration.

---

## 2. Quick Start & Execution

```bash
# Install dependencies
bun install

# Start full-stack dev server (port 3000)
npm run dev

# Run TypeScript compilation and linter
npm run lint

# Run automated test suites (56 test suites)
npm test

# Build production bundle
npm run build
```
