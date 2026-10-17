# Rental-log | Fractional Real Estate Investment Platform

Rental-log is an institutional-grade, full-stack fractional real estate investment platform inspired by the structure of [Reental](https://www.reental.co/en). It enables retail and institutional investors to acquire tokenized shares of vetted European and global real estate assets starting from €100, collect automated monthly rental yields, and monitor their portfolio with auditable blockchain verification.

---

## 1. System Architecture & Features

- **Exact Brand & Design System**: Custom tokens, geometric typography, dark green aesthetic (`#182D2A`, accent `#B7E36A`), responsive navigation, zero-pill metadata discipline, and high-fidelity architectural photography.
- **Double-Entry Auditable Ledger**:
  - ACID atomic transaction processing.
  - Concurrency locking preventing double withdrawals, race conditions, and unauthorized balance mutations.
  - Cryptographic transaction hashing linking every investment and dividend distribution.
- **Real Estate Assets Directory**:
  - Pre-seeded with institutional assets: *Valencia Ruzafa Smart Living* (11.4% yield), *Madrid Chamberí Coliving* (12.8% yield), *Malaga Coastline Beachfront* (13.5% yield), and *Brickell Miami Bay Suites* (10.2% yield).
  - Independent RICS appraisals, cadastral references, and downloadable legal SPV documentation.
- **Interactive Investment Return Simulator**:
  - Calculates real-time estimated monthly rental cashflow, multi-year returns, and projected capital gains based on token quantities.
- **Investor Dashboard**:
  - Total portfolio value, liquid available cash, invested capital, and realized historical earnings.
  - Active property holdings with downloadable ownership certificates.
  - Full transaction ledger table with status badges and audit hashes.
- **Deposit & Withdrawal Engine**:
  - SEPA bank wire instructions with personalized reference code concepts.
  - Crypto stablecoin (USDT/USDC on Polygon POS) deposit address generator.
  - Withdrawal flow with automatic balance escrow lock and admin review queue.
- **Administrative Control Panel (`/admin`)**:
  - Publish and manage property offerings (status cycling: funding / funded / upcoming).
  - Review and approve/decline withdrawal requests with automatic refund logic.
  - Identity verification (KYC AML5/6) review queue.
  - System-wide audit log monitor.

---

## 2. Relational Database Models

In production with PostgreSQL or Cloud SQL, the database follows this schema:

1. **Users (`users`)**:
   - `id`, `email`, `full_name`, `role` (`investor` | `admin`), `kyc_status`, `wallet_balance`, `created_at`.
2. **Properties (`properties`)**:
   - `id`, `slug`, `title`, `location`, `city`, `country`, `type`, `status`, `target_amount`, `funded_amount`, `token_price`, `total_tokens`, `available_tokens`, `estimated_annual_yield`, `duration_months`.
3. **Investments (`investments`)**:
   - `id`, `user_id`, `property_id`, `tokens_purchased`, `token_price`, `total_amount_invested`, `status`, `tx_hash`, `certificate_id`.
4. **Transactions & Ledger (`transactions` / `ledger_entries`)**:
   - `id`, `user_id`, `type` (`deposit` | `withdrawal` | `investment` | `distribution`), `amount`, `currency`, `status`, `reference`, `tx_hash`, `balance_after`.
5. **Property Documents (`property_documents`)**:
   - `id`, `property_id`, `name`, `category`, `size`, `url`.
6. **Audit Logs (`audit_logs`)**:
   - `id`, `admin_id`, `admin_email`, `action`, `details`, `timestamp`.

---

## 3. Production Deployment & External Requirements

To deploy Rental-log in a live commercial production environment, the following external accounts and regulatory items are required:

1. **Regulatory Approval**:
   - Registration as an authorised Crowdfunding Service Provider (ECSPR under EU Regulation 2020/1503) or licensed participatory SPV debt issuer with local securities commissions (e.g., CNMV in Spain).
2. **Payment Service Provider**:
   - Integration with a regulated European payment institution (e.g., Lemonway, Mangopay, or Stripe Treasury) for client-segregated escrow accounts and automated SEPA Credit Transfers.
3. **Identity Verification (KYC/AML)**:
   - Integration with an automated identity provider (e.g., Sumsub, Onfido, or Veriff) for passport OCR and liveness biometric checks.
4. **Blockchain RPC Provider**:
   - Polygon POS RPC provider (e.g., Alchemy or Infura) and deployer wallet private key for smart contract interaction.

---

## 4. Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript compiler check
npm run lint

# Build for production
npm run build
```
