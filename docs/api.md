# Kretz Platform — Backend API Specification & Integration Guide

**Document Version:** 1.0.0  
**API Specification:** REST / JSON  
**Base URL:** `/api/v1` (Default in unified dev environment)  
**Production Base URL:** Configurable via `VITE_API_BASE_URL` (e.g. `https://api.kretz.eu/api/v1`)  
**Client Wrapper Reference:** `src/lib/api.ts`

---

## 1. Architectural Overview

The Kretz platform is partitioned into three independent components communicating over authenticated, versioned HTTPS endpoints:

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│        Customer Frontend        │        │           Admin Panel           │
│  (Public Portal, Marketplace,   │        │   (Back-office, KYC, Approval   │
│   Investor Dashboard, Portfolio)│        │   Queues, Ledger Audit, Config) │
└────────────────┬────────────────┘        └────────────────┬────────────────┘
                 │                                          │
                 │  JWT Bearer (Role: investor)             │  JWT Bearer (Role: admin)
                 ▼                                          ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                    Kretz Backend Server                      │
   │      Authentication • Authorization • Business Validation    │
   │      Atomic Investment Engine • Payment & Ledger Invariants  │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  Database & Immutable Ledger                 │
   │     Users • Properties • Investments • Transaction Ledger    │
   └──────────────────────────────────────────────────────────────┘
```

---

## 2. General Conventions & Protocol Standards

### 2.1 Request Headers

Every request to a protected endpoint must supply:

| Header | Type | Description |
| :--- | :--- | :--- |
| `Content-Type` | `string` | `application/json` (unless uploading `multipart/form-data`) |
| `Authorization` | `string` | `Bearer <JWT_TOKEN>` |
| `Accept` | `string` | `application/json` |
| `X-Request-Id` | `string` | *(Optional)* Client-generated UUID for distributed request tracing |

### 2.2 Standard Success Response Envelope

All API endpoints return JSON conforming to the `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully.",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### 2.3 Standard Error Response Envelope

When an error occurs, the server responds with an appropriate HTTP 4xx or 5xx code and structured error body:

```json
{
  "success": false,
  "error": "The requested property has insufficient tokens remaining.",
  "code": "TOKENS_EXCEEDED",
  "status": 400,
  "details": {
    "available": 12,
    "requested": 25
  }
}
```

### 2.4 HTTP Status Codes

| Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Success | GET, PUT, PATCH, and operational POST actions |
| `201 Created` | Resource Created | Registration, creating orders, records |
| `400 Bad Request` | Validation Error | Missing parameters, validation failure, insufficient balance |
| `401 Unauthorized` | Authentication Failure | Missing or invalid JWT bearer token |
| `403 Forbidden` | Access Denied | Authenticated user lacks `admin` permission |
| `404 Not Found` | Resource Missing | Property, user, or transaction ID not found |
| `408 Request Timeout`| Aborted / Timeout | Client or server timeout exceeded |
| `409 Conflict` | Duplicate State | Email already registered, or duplicate transaction reference |
| `429 Too Many Requests`| Rate Limited | Exceeded endpoint rate limit |
| `500 Server Error` | Internal Failure | Uncaught exception or database connection issue |

---

## 3. System & Health Endpoints

### 3.1 Health Check
Inspect the status and latency of the backend service.

- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Auth Required:** No

#### Response `200 OK`
```json
{
  "status": "healthy",
  "platform": "Kretz API",
  "version": "1.0.0",
  "timestamp": "2026-10-15T20:30:00.000Z"
}
```

---

## 4. Authentication Endpoints (`/api/v1/auth`)

### 4.1 Register Customer Account
Creates a new investor account on the platform with initial KYC state `unverified`.

- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/register`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "investor@example.com",
  "pass": "SecurePassword123!",
  "fullName": "Jean Dupont",
  "role": "investor"
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_998124",
      "email": "investor@example.com",
      "fullName": "Jean Dupont",
      "role": "investor",
      "kycStatus": "unverified",
      "walletBalance": 0,
      "investedBalance": 0,
      "totalEarned": 0,
      "createdAt": "2026-10-15T20:30:00.000Z"
    }
  },
  "message": "Account registered successfully."
}
```

---

### 4.2 Login
Authenticates an investor or administrator, issuing a JWT bearer token.

- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "investor@example.com",
  "pass": "SecurePassword123!"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_998124",
      "email": "investor@example.com",
      "fullName": "Jean Dupont",
      "role": "investor",
      "kycStatus": "verified",
      "walletBalance": 15000.00,
      "investedBalance": 50000.00,
      "totalEarned": 3840.50,
      "createdAt": "2026-01-10T14:22:00.000Z"
    }
  }
}
```

---

### 4.3 Get Authenticated Profile (`/me`)
Retrieves the session state, current balances, KYC status, and preferences of the logged-in user.

- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_998124",
      "email": "investor@example.com",
      "fullName": "Jean Dupont",
      "role": "investor",
      "kycStatus": "verified",
      "walletBalance": 15000.00,
      "investedBalance": 50000.00,
      "totalEarned": 3840.50,
      "country": "France",
      "phoneNumber": "+33 6 12 34 56 78",
      "cryptoDepositAddress": "0x71C...a19F",
      "createdAt": "2026-01-10T14:22:00.000Z"
    }
  }
}
```

---

### 4.4 Logout
Invalidates the current session token on the backend server.

- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/logout`
- **Auth Required:** Yes

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### 4.5 Forgot Password
Sends a password recovery link with an expiring reset token to the given email address.

- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/forgot-password`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "investor@example.com"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "If an account with that email exists, password reset instructions have been dispatched."
}
```

---

### 4.6 Update Password
Changes the authenticated user's password.

- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/update-password`
- **Auth Required:** Yes

#### Request Body
```json
{
  "password": "NewUltraSecurePassword456!"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

---

## 5. Properties Endpoints (`/api/v1/properties`)

### 5.1 List Properties
Returns catalog listings with real-time token availability, funding progress, and financial models.

- **Method:** `GET`
- **Endpoint:** `/api/v1/properties`
- **Auth Required:** No (Public)
- **Query Parameters:**
  - `type` *(optional)*: `Residential` | `Villa` | `Apartment` | `Château` | `Commercial` | etc.
  - `status` *(optional)*: `funding` | `funded` | `completed` | `upcoming`
  - `search` *(optional)*: Search query (matched against title, city, reference)

#### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "prop_lux_01",
      "slug": "haussmann-trocadero-paris-16",
      "title": "Haussmannien Classique — Trocadéro",
      "location": "Avenue Paul Doumer, 75016 Paris",
      "city": "Paris",
      "country": "France",
      "type": "Apartment",
      "status": "funding",
      "images": [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
      ],
      "bannerImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
      "targetAmount": 1250000,
      "fundedAmount": 875000,
      "tokenPrice": 100,
      "totalTokens": 12500,
      "availableTokens": 3750,
      "estimatedAnnualYield": 10.8,
      "capitalAppreciationYield": 4.5,
      "totalEstimatedReturn": 15.3,
      "durationMonths": 36,
      "minimumInvestment": 750,
      "distributionFrequency": "Monthly",
      "tokenTicker": "KRETZ-TRC01",
      "blockchainNetwork": "Polygon POS",
      "tokenContractAddress": "0x39aB478...C2f1",
      "description": "Prestigious Haussmannian apartment in the 16th arrondissement...",
      "surfaceAreaM2": 185,
      "bedrooms": 4,
      "bathrooms": 3,
      "energyRating": "B",
      "investorCount": 84,
      "createdAt": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Get Property by ID or Slug
Retrieves full details including financial breakdown, fee structure, payment schedule, timeline, and legal documents.

- **Method:** `GET`
- **Endpoint:** `/api/v1/properties/:idOrSlug`
- **Auth Required:** No (Public)

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "prop_lux_01",
    "slug": "haussmann-trocadero-paris-16",
    "title": "Haussmannien Classique — Trocadéro",
    "location": "Avenue Paul Doumer, 75016 Paris",
    "city": "Paris",
    "country": "France",
    "type": "Apartment",
    "status": "funding",
    "tokenPrice": 100,
    "availableTokens": 3750,
    "minimumInvestment": 750,
    "financialBreakdown": {
      "propertyPrice": 1050000,
      "refurbishmentBudget": 95000,
      "legalAndClosingCosts": 65000,
      "operatingReserve": 40000,
      "totalProjectCost": 1250000,
      "projectedAnnualGrossRent": 168000,
      "estimatedOperatingExpenses": 33000,
      "projectedAnnualNetRent": 135000,
      "estimatedNetYield": 10.8,
      "estimatedCapitalGainYield": 4.5,
      "totalEstimatedYield": 15.3
    },
    "feeStructure": {
      "structuringFee": "3.5% (Included in target capitalization)",
      "managementFee": "9% of monthly rental income",
      "withdrawalFee": "0%",
      "exitFee": "0%"
    },
    "paymentSchedule": {
      "distributionFrequency": "Monthly",
      "payoutDate": "1st business day of each month",
      "annualReconciliation": "Audit statement issued annually in Q1",
      "maturityTerms": "Principal and capital gain distributed at project completion"
    },
    "documents": [
      {
        "id": "doc_01",
        "name": "SPV Articles of Association & Offering Memorandum",
        "category": "Legal",
        "size": "2.4 MB",
        "url": "/docs/offering_spv_01.pdf",
        "updatedAt": "2026-01-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 6. Investments & Portfolio Endpoints (`/api/v1/investments`)

### 6.1 Get User Investments (`/my`)
Retrieves all token holdings, active dividend streams, and contract certificates for the authenticated investor.

- **Method:** `GET`
- **Endpoint:** `/api/v1/investments/my`
- **Auth Required:** Yes (`Bearer <token>`)

#### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_88291",
      "userId": "usr_998124",
      "propertyId": "prop_lux_01",
      "propertyTitle": "Haussmannien Classique — Trocadéro",
      "propertyLocation": "Avenue Paul Doumer, 75016 Paris",
      "propertyImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
      "tokensPurchased": 25,
      "tokenPrice": 100,
      "totalAmountInvested": 2500.00,
      "purchasedAt": "2026-03-01T11:45:00.000Z",
      "estimatedAnnualYield": 10.8,
      "projectedMonthlyIncome": 22.50,
      "totalDividendsReceived": 67.50,
      "status": "active",
      "transactionHash": "0x5f8b91a27e...",
      "certificateId": "CERT-2026-TRC-0829"
    }
  ]
}
```

---

### 6.2 Execute Token Investment
Executes an atomic token investment. Verifies minimum investment (€750 / token threshold), deducts available balance, reduces available tokens on the property, and mints an ownership certificate.

- **Method:** `POST`
- **Endpoint:** `/api/v1/investments/execute`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body
```json
{
  "propertyId": "prop_lux_01",
  "tokensCount": 10,
  "paymentMethod": "wallet"
}
```

#### Validation Rules:
1. `tokensCount * tokenPrice` must satisfy `minimumInvestment` (€750 minimum).
2. User's available wallet balance must be $\ge$ total investment cost.
3. Property must be in `funding` status with `availableTokens >= tokensCount`.
4. User's KYC status must be `verified`.

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "investment": {
      "id": "inv_99310",
      "propertyId": "prop_lux_01",
      "tokensPurchased": 10,
      "totalAmountInvested": 1000.00,
      "certificateId": "CERT-2026-TRC-9931",
      "status": "active"
    },
    "remainingWalletBalance": 14000.00,
    "transactionId": "tx_inv_9931"
  },
  "message": "Investment completed successfully."
}
```

#### Error Response: Insufficient Balance `400 Bad Request`
```json
{
  "success": false,
  "error": "Insufficient wallet balance. Please deposit funds before investing.",
  "code": "INSUFFICIENT_FUNDS",
  "status": 400,
  "details": {
    "required": 1000.00,
    "available": 250.00
  }
}
```

---

## 7. Wallet & Balance Endpoints (`/api/v1/wallet`)

### 7.1 Get Balance
Returns available cash balance, actively invested capital, and lifetime yields.

- **Method:** `GET`
- **Endpoint:** `/api/v1/wallet/balance`
- **Auth Required:** Yes

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "balance": 15000.00,
    "investedBalance": 50000.00,
    "totalEarned": 3840.50,
    "currency": "EUR"
  }
}
```

---

### 7.2 Get Transaction History
Returns ledger audit entries for deposits, withdrawals, token purchases, and rental yield credits.

- **Method:** `GET`
- **Endpoint:** `/api/v1/wallet/transactions`
- **Auth Required:** Yes
- **Query Parameters:**
  - `limit` *(optional, default: 20)*
  - `offset` *(optional, default: 0)*

#### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "tx_dep_4401",
      "userId": "usr_998124",
      "type": "deposit",
      "amount": 5000.00,
      "currency": "EUR",
      "status": "completed",
      "description": "SEPA Instant Transfer Credit",
      "reference": "DEP-2026-9981",
      "paymentMethod": "SEPA Instant",
      "balanceAfter": 15000.00,
      "createdAt": "2026-10-12T09:14:00.000Z"
    },
    {
      "id": "tx_yield_1002",
      "userId": "usr_998124",
      "type": "distribution",
      "amount": 187.50,
      "currency": "EUR",
      "status": "completed",
      "description": "Monthly Yield Distribution — Haussmannien Trocadéro",
      "reference": "YLD-OCT26-TRC",
      "balanceAfter": 10000.00,
      "createdAt": "2026-10-01T00:00:00.000Z"
    }
  ]
}
```

---

### 7.3 Submit Deposit Request
Registers a pending deposit slip (for crypto hash confirmation or incoming wire transfer).

- **Method:** `POST`
- **Endpoint:** `/api/v1/wallet/deposit`
- **Auth Required:** Yes

#### Request Body
```json
{
  "amount": 5000.00,
  "currency": "USDT",
  "method": "crypto",
  "txHash": "0x7a83b4c9e88d..."
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_dep_8829",
    "status": "pending",
    "amount": 5000.00,
    "currency": "USDT",
    "reference": "DEP-CRYPTO-8829"
  },
  "message": "Deposit receipt logged and queued for automatic / administrative confirmation."
}
```

---

### 7.4 Request Withdrawal
Creates an outward withdrawal request to a bank IBAN or crypto destination address. Locks user balance until processed.

- **Method:** `POST`
- **Endpoint:** `/api/v1/wallet/withdraw`
- **Auth Required:** Yes

#### Request Body
```json
{
  "amount": 2500.00,
  "destination": "FR76 3000 4005 5001 2345 6789 012",
  "method": "sepa"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_wdr_1294",
    "status": "processing",
    "amount": 2500.00,
    "remainingBalance": 12500.00,
    "reference": "WDR-SEPA-1294"
  },
  "message": "Withdrawal request submitted. Funds reserved from available balance."
}
```

---

## 8. Payment Gateway & Banking Configuration (`/api/v1/payments`)

### 8.1 Get Public Payment Instructions
Provides customers with validated destination addresses and SEPA account coordinates for top-ups. Sensitive internal vault balances are stripped.

- **Method:** `GET`
- **Endpoint:** `/api/v1/payments/config`
- **Auth Required:** No

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "traditional": {
      "beneficiary": "KRETZ LUXURY TOKENIZATION SAS",
      "iban": "FR76 3000 6000 0112 3456 7890 189",
      "bicSwift": "BNPAFRPPXXX",
      "bankName": "BNP Paribas Banque Privée",
      "bankAddress": "16 Boulevard des Italiens, 75009 Paris, France"
    },
    "cryptoNetworks": [
      {
        "id": "polygon-usdt",
        "currency": "USDT",
        "networkName": "Polygon (PoS)",
        "depositAddress": "0x4aB12A8143997f7D88b14eBe7014Db741eC53F62",
        "confirmationsRequired": 128
      },
      {
        "id": "ethereum-usdc",
        "currency": "USDC",
        "networkName": "Ethereum ERC-20",
        "depositAddress": "0x4aB12A8143997f7D88b14eBe7014Db741eC53F62",
        "confirmationsRequired": 32
      }
    ]
  }
}
```

---

## 9. Administrative Endpoints (`/api/v1/admin`)

> **Security Rule:** All endpoints under `/api/v1/admin` require a valid JWT with `role === 'admin'`. Non-admin requests will be rejected immediately with `403 Forbidden`.

### 9.1 Platform Statistics
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/stats`
- **Auth Required:** Yes (Admin)

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "totalVolume": 14500000.00,
    "activeInvestors": 1240,
    "propertiesCount": 18,
    "fundedProperties": 14,
    "pendingDeposits": 3,
    "pendingWithdrawals": 1,
    "pendingKycReviews": 6
  }
}
```

---

### 9.2 User Governance & KYC Management
#### List Users
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/users`

#### Update User KYC
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/users/:userId/kyc`
- **Request Body:**
```json
{
  "kycStatus": "verified",
  "notes": "Passport and proof of address verified against AML database."
}
```

#### Credit User Balance (Manual Ledger Adjustment)
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/users/:userId/credit`
- **Request Body:**
```json
{
  "amount": 2500.00,
  "currency": "EUR",
  "method": "Manual Credit",
  "reference": "ADJ-2026-004",
  "notes": "Verified manual bank wire receipt via BNP Paribas wire #88129"
}
```

---

### 9.3 Deposit Approvals
#### List Pending Deposits
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/deposits`

#### Approve Deposit
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/deposits/:transactionId/approve`
- **Request Body:**
```json
{
  "notes": "Bank wire matched statement line #44910."
}
```

#### Reject Deposit
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/deposits/:transactionId/reject`
- **Request Body:**
```json
{
  "reason": "Payment reference missing or sender name mismatch with KYC records."
}
```

---

### 9.4 Withdrawal Approvals
#### List Pending Withdrawals
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/withdrawals`

#### Approve Withdrawal
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/withdrawals/:transactionId/approve`
- **Request Body:**
```json
{
  "txHash": "0x789b...c014",
  "notes": "Wire executed via banking portal transaction ID #8911"
}
```

#### Reject Withdrawal
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/withdrawals/:transactionId/reject`
- **Request Body:**
```json
{
  "reason": "Invalid IBAN checksum provided by investor."
}
```

---

### 9.5 Property Administration
#### Create New Property Listing
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/properties`
- **Request Body:** Complete `Property` object payload (title, type, pricing, token count, documents, yields).

#### Update Property Listing
- **Method:** `PUT`
- **Endpoint:** `/api/v1/admin/properties/:propertyId`
- **Request Body:** Partial or updated `Property` object.

---

### 9.6 Ledger Audit Logs
Returns immutable audit logs tracking administrative interventions, approvals, fund movements, and privilege escalations.

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/audit-logs`
- **Query Parameters:** `limit` *(default: 50)*
- **Auth Required:** Yes (Admin)

#### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "audit_881",
      "adminEmail": "admin@kretz.eu",
      "action": "DEPOSIT_APPROVED",
      "targetUserId": "usr_998124",
      "amount": 5000.00,
      "reference": "DEP-2026-9981",
      "timestamp": "2026-10-15T19:30:00.000Z",
      "notes": "Confirmed bank receipt"
    }
  ]
}
```

---

## 10. Frontend Client Integration Patterns

All components in the React application should import the typed API wrapper from `src/lib/api.ts` rather than making raw `fetch` calls:

```typescript
import { propertiesApi, walletApi, investmentsApi, ApiError } from '@/lib/api';

// Example: Fetch properties in a React component
try {
  const properties = await propertiesApi.getAll({ status: 'funding' });
  console.log('Available properties:', properties);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status} [${error.code}]:`, error.message);
  }
}

// Example: Execute an investment
try {
  const result = await investmentsApi.executeInvestment({
    propertyId: 'prop_lux_01',
    tokensCount: 10,
    paymentMethod: 'wallet',
  });
  console.log('Investment succeeded:', result.investment);
} catch (error) {
  if (error instanceof ApiError) {
    alert(error.message);
  }
}
```

---

## 11. Security & Production Checklist

1. **JWT Secret:** Set a cryptographically secure 256-bit string in `JWT_SECRET` in production `.env`.
2. **CORS:** Restrict `Access-Control-Allow-Origin` to the specific customer and admin domain origins in production environments.
3. **Rate Limiting:** Protect `/api/v1/auth/login` and `/api/v1/investments` against automated abuse using sliding window rate limiters.
4. **Idempotency:** Re-submission of investment or withdrawal requests with identical idempotency keys returns existing records without duplicate balance deduction.
5. **No Database Direct Connections:** Neither the Customer Frontend nor the Admin Panel browser bundle carries database credentials. All mutations run on the server.

---

## 12. Structured Server Logging, System Monitoring & Database Architecture

### 12.1 Log Categories & Events

The server categorizes all operational events into 9 structured channels:

| Category | Description | Sample Event Type |
| :--- | :--- | :--- |
| `access` | HTTP traffic, methods, routes, status codes, duration | `HTTP_REQUEST_COMPLETED` |
| `auth` | User login, registration, session check, password reset | `USER_LOGIN_SUCCESS`, `LOGIN_FAILED` |
| `admin` | Administrative overrides, KYC approvals, manual ledger credits | `KYC_STATUS_UPDATED`, `ADMIN_MANUAL_CREDIT` |
| `api` | Uncaught exceptions, validation errors, bad requests | `API_EXCEPTION_CAPTURED` |
| `marketplace` | Offerings viewed, published, updated, or tokens bought | `MARKETPLACE_LISTINGS_FETCHED`, `PROPERTY_LISTED` |
| `payments` | Deposit intent, withdrawals, payment provider webhooks | `DEPOSIT_INITIATED`, `WEBHOOK_PROCESSED` |
| `database` | Service connectivity, persistence checks, queries | `DATABASE_CONNECTED` |
| `security` | Rate-limit triggers, unauthorized attempts, log injection guards | `RATE_LIMIT_TRIGGERED`, `UNAUTHORIZED_ACCESS_ATTEMPT` |
| `system` | Server boot, shutdown, health diagnostic probes | `SYSTEM_BOOT`, `HEALTH_CHECK_AUDIT` |

### 12.2 Security & Data Redaction Invariants

- **Zero-Secret Logging:** Sensitive attributes (`password`, `pass`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `privateKey`, `cvv`, `cardNumber`) are recursively stripped or replaced with `[REDACTED]`.
- **Log Injection Guard:** All string inputs are stripped of newline (`\r\n`) control characters to prevent log forgery.
- **Request Tracing:** All incoming and outgoing requests pass through `X-Request-Id` for end-to-end tracing across client, backend, and admin panels.

### 12.3 Admin Monitoring Endpoints

- `GET /api/v1/admin/system-health` — Real-time CPU/memory stats, uptime, error rates, and subsystem diagnostics.
- `GET /api/v1/admin/logs` — Search, query by category, severity, route, date range, or Request ID.
- `GET /api/v1/admin/logs/export?format=json|csv` — Export sanitized audit logs.

### 12.4 Current Database Status & Production Roadmap

- **Current State:** Active in-memory immutable ledger journal with Supabase Auth integration bridge and instant mock persistence.
- **Production Implementation Plan:** The application schemas (`users`, `properties`, `investments`, `transactions`, `audit_logs`) are modeled as relational entities. To connect a dedicated PostgreSQL or Cloud SQL database, configure `DATABASE_URL` and run the Drizzle migrations defined in the project architecture.

