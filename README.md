# BizExchange Platform

BizExchange is a full-stack platform for listing, verifying, and acquiring small-to-medium businesses.

The system features:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS design system.
- **Backend**: Spring Boot 3.3.4, Java 17, Spring Security 6 (JWT authentication), JPA/Hibernate.
- **Database**: PostgreSQL with automated Flyway database migrations (`V1` through `V9`).

---

## Prerequisites

1. **Java Development Kit (JDK)**: Version 17 or higher
2. **Node.js**: Version 18.x or 20.x+ with npm
3. **PostgreSQL**: Version 14 or higher (or Docker)
4. **Maven**: Bundled Maven Wrapper (`./mvnw` or `mvnw.cmd` included in `Backend/`)

> **Linux / macOS Note on Maven Wrapper Permissions**:
> The repository preserves executable Git file mode (`100755`) and LF line endings for `Backend/mvnw`. If extracted from a ZIP tool that strips file permission attributes, restore executable permissions before running:
> ```bash
> chmod +x Backend/mvnw
> ```

---

## Architecture & Security Overview

### Role-Based Access Control
- `BUYER`: Browses published marketplace businesses, submits inquiries, exchanges messages with sellers, leaves reviews.
- `SELLER`: Submits seller verification KYC, creates business listings with attachments, reviews buyer inquiries, negotiates via messages.
- `VERIFICATION_OFFICER`: Audits seller KYC profiles and business verification documents, approves verification or requests more info. Officer approval marks listings as verified, leaving them pending administrator publication approval.
- `ADMIN`: Publishes verified listings, manages categories and staff, assigns and escalates support tickets, oversees platform audit logs.
- `SUPPORT_AGENT`: Responds to user helpdesk support tickets.

### Security Enforcements
- **Verification Ownership**: Only listing owners or platform administrators can submit listings for verification audit.
- **Two-Phase Publication Lifecycle**: Officer verification approves business legitimacy; administrator publication approval is strictly required before any listing becomes visible on the public marketplace.
- **Re-Review State Safeguards**: When a published listing legitimately enters re-review (e.g. officer requests more information or rejects), public visibility is immediately revoked and publication metadata is cleared. Any subsequent officer approval requires a fresh administrator publication review before the listing can go live again.
- **Explicit Identifier Routing**: Separate, unambiguous contracts for business IDs vs. verification request IDs.
- **Confidential Document Protection**: Private financial reports, ownership deeds, and unapproved listings require authenticated bearer token access with owner/officer/admin authorization. Anonymous and unrelated buyer access is strictly forbidden (HTTP 401/403).
- **Atomic OTP Lockout**: Failed verification attempts increment and commit immediately (`Propagation.REQUIRES_NEW`), preventing brute-force bypass across transactional rollbacks.
- **Session Revocation**: Password changes and resets increment `tokenVersion`, instantly invalidating previously issued JWT tokens.
- **Inquiry Integrity**: Only published & verified businesses accept inquiries; duplicate concurrent open inquiries are prevented via atomic database constraints while permitting new inquiries after closure.
- **Isolated Test Mailbox Protection**: Test mailbox endpoints (`/api/test/mailbox/**`) are strictly guarded by `@Profile({"dev", "local", "test"})` and `@ConditionalOnProperty(name = "app.test-mailbox.enabled", havingValue = "true")`. They are completely disabled by default in production.

---

## Quick Start & Local Setup

### 1. Database Setup

Create a PostgreSQL database named `BizExchange`:

```sql
CREATE DATABASE "BizExchange";
```

Alternatively using Docker:
```bash
docker run --name bizexchange-postgres -e POSTGRES_DB=BizExchange -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

### 2. Backend Setup & Configuration

Navigate to the `Backend` directory:
```bash
cd Backend
```

Copy the example configuration:
```bash
cp src/main/resources/application.properties.example src/main/resources/application-local.properties
```

Update `application-local.properties` with your database credentials and secret key:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/BizExchange
spring.datasource.username=postgres
spring.datasource.password=your_db_password

jwt.secret=your-256-bit-secret-key-change-this-in-production-min-32-chars
jwt.expiration=86400000

app.admin.email=admin@bizexchange.local
app.admin.password=YourStrongAdminPassword123!
```

> **Note on Test Mailbox for E2E Automation**:
> If running automated end-to-end tests or browser verification scripts locally, enable the test mailbox property in `application-local.properties`:
> ```properties
> app.test-mailbox.enabled=true
> ```
> Keep this property `false` (the default) in production environments.

Start the backend activating the `local` profile:
```bash
# On Windows (PowerShell):
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# On Linux / macOS:
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

The backend server starts on `http://localhost:8080`.

### 3. Frontend Setup & Configuration

Navigate to the `Frontend` directory:
```bash
cd ../Frontend
```

Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Install dependencies:
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

The frontend application starts on `http://localhost:3000`.

---

## Building and Testing

### Backend Unit & Standard Integration Tests (In-Memory H2)
Standard backend service and controller tests execute against an isolated in-memory H2 database without requiring PostgreSQL:
```bash
cd Backend
# Windows
.\mvnw.cmd test

# Linux / macOS
./mvnw test
```

### PostgreSQL Migration & Schema Tests (Live PostgreSQL Environment)
Integration test `PostgreSqlFlywayMigrationIntegrationTest` verifies Flyway migrations and data preservation against a real PostgreSQL instance:
```bash
# Windows
.\mvnw.cmd test -Dtest=PostgreSqlFlywayMigrationIntegrationTest

# Linux / macOS
./mvnw test -Dtest=PostgreSqlFlywayMigrationIntegrationTest
```

> **PostgreSQL Test Databases Notice**:
> These migration tests dynamically create and drop isolated test databases on PostgreSQL:
> - `bizexchange_fresh_test`: Fresh migration lifecycle from V1 through V9.
> - `bizexchange_inquiry_test`: Inquiry constraint and duplicate prevention tests.
> - `bizexchange_upgrade_test`: Representative V8 to V9 upgrade compatibility with Flyway validation retained.
> - `bizexchange_prev5_test`: Pre-V5 data preservation regression testing duplicate open inquiries and messages.
> - `bizexchange_hist_test`: Historical V5 deduplication verification.
>
> Run these tests in an isolated development/test PostgreSQL instance where the test user has permissions to create and drop databases. The primary `BizExchange` application database is never modified by these automated tests.

### Frontend Checks & Production Build
```bash
cd Frontend

# Run ESLint validation:
npm run lint

# Run Next.js production build:
npm run build
```

---

## Database Migrations

Database migrations are located in `Backend/src/main/resources/db/migration` and executed automatically by Flyway on startup:

- `V1__Initial_Schema.sql`: Complete DDL schema creation with tables, enums, and foreign keys.
- `V2__Add_Password_Change_Otp_Table.sql`: Table for password change verification OTPs.
- `V3__Add_Password_Reset_Otp_Table.sql`: Table for password reset tokens.
- `V4__Add_Security_And_Performance_Indexes_And_Constraints.sql`: Performance indexes, audit log table, and optimistic locking versions.
- `V5__Add_Token_Version_And_Inquiry_Unique_Index.sql`: Token version for session revocation and partial unique index on open inquiries (`buyer_id`, `business_id`).
- `V6__Reconcile_Email_Verification_Tokens_Schema.sql`: Reconciles `email_verification_tokens` table columns and constraints.
- `V7__Make_Review_Deal_Id_Nullable.sql`: Makes legacy `deal_id` on `reviews` nullable to permit seller reviews without closed deals.
- `V8__Drop_Legacy_Not_Null_Constraints_On_Reviews.sql`: Drops legacy NOT NULL constraints on `transaction_value` and `verified_purchase` on `reviews`.
- `V9__Restore_And_Scope_Review_Constraints.sql`: Restores and scopes integrity constraints on reviews (rating 1..5 check constraint, foreign keys, and valid associations).

For instructions on safely upgrading legacy databases running schema version V4 or earlier without data loss, see [UPGRADE_PRE_V5.md](UPGRADE_PRE_V5.md).

---

## End-to-End & Browser Verification

### 1. API End-to-End Workflow Verification
Located at `scripts/verify_e2e_workflow.mjs`:
```bash
node scripts/verify_e2e_workflow.mjs
```
Verifies full platform API workflows: admin setup, officer KYC verification, seller listing creation, file uploads, inquiry negotiations, and seller ratings.

### 2. Browser Verification Flows (Puppeteer)
Located at `scripts/verify_browser_flows.mjs`:
```bash
node scripts/verify_browser_flows.mjs
```

**Browser Test Environment & Dependencies**:
- Requires Chromium/Chrome. By default, it auto-detects system Chrome or can be configured via environment variables:
  ```bash
  CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
  # or
  PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"
  ```
- Environment variables:
  - `FRONTEND_URL` (default: `http://localhost:3000`)
  - `BACKEND_URL` (default: `http://localhost:8080/api`)
  - `ADMIN_EMAIL` (default: `admin@bizexchange.local`)
  - `ADMIN_PASSWORD` (default: `YourStrongAdminPassword123!`)
- Automatic fixture cleanup: All temporary upload files and browser contexts are isolated and cleaned up automatically upon test completion.
- Verifies:
  - Flow E: Email verification in browser, invalid token rejection, real mailbox token verification, token reuse rejection.
  - Flow A: Listing creation, forced file upload failure (HTTP 500), UI error display, and retry control.
  - Flow B: Persisted business updates and optional field clearing across page reloads.
  - Flow C: Officer private document inspection in a real browser tab with a valid PDF fixture, strict denial of anonymous and unrelated buyer access, and officer verification approval.
  - Flow D: Admin publication approval and anonymous marketplace visibility.
