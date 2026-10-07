# BizExchange Platform

BizExchange is a full-stack platform for listing, verifying, and acquiring small-to-medium businesses.

The system features:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS design system.
- **Backend**: Spring Boot 3.4, Java 17, Spring Security 6 (JWT authentication), JPA/Hibernate.
- **Database**: PostgreSQL with automated Flyway database migrations (`V1` to `V5`).

---

## Prerequisites

1. **Java Development Kit (JDK)**: Version 17 or higher
2. **Node.js**: Version 18.x or 20.x+ with npm
3. **PostgreSQL**: Version 14 or higher (or Docker)
4. **Maven**: Optional (bundled Maven Wrapper `./mvnw` or `mvnw.cmd` included in `Backend/`)

---

## Architecture & Security Overview

### Role-Based Access Control
- `BUYER`: Browses published marketplace businesses, submits inquiries, exchanges messages with sellers, leaves reviews.
- `SELLER`: Submits seller verification KYC, creates business listings with attachments, reviews buyer inquiries, negotiates via messages.
- `VERIFICATION_OFFICER`: Audits seller KYC profiles and business verification documents, approves or requests more info.
- `ADMIN`: Publishes verified listings, manages categories and staff, assigns and escalates support tickets, oversees platform audit logs.
- `SUPPORT_AGENT`: Responds to user helpdesk support tickets.

### Security Enforcements
- **Verification Ownership**: Only listing owners or platform administrators can submit listings for verification audit.
- **Explicit Identifier Routing**: Separate, unambiguous contracts for business IDs vs. verification request IDs.
- **Confidential Document Protection**: Private financial reports, ownership deeds, and unapproved listings require authenticated bearer token access with owner/officer/admin authorization.
- **Atomic OTP Lockout**: Failed verification attempts increment and commit immediately (`Propagation.REQUIRES_NEW`), preventing brute-force bypass across transactional rollbacks.
- **Session Revocation**: Password changes and resets increment `tokenVersion`, instantly invalidating previously issued JWT tokens.
- **Inquiry Integrity**: Only published & verified businesses accept inquiries; duplicate concurrent inquiries are prevented via atomic database constraints while permitting new inquiries after closure.

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

Run Flyway migrations and start the backend (explicitly activating the `local` profile to load `application-local.properties`):
```bash
# On Windows (PowerShell / Command Prompt):
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# On Linux/macOS:
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Alternatively, set the environment variable:
# Windows PowerShell: $env:SPRING_PROFILES_ACTIVE="local"; .\mvnw.cmd spring-boot:run
# Windows CMD:        set SPRING_PROFILES_ACTIVE=local && mvnw.cmd spring-boot:run
# Linux/macOS:        SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
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

### Backend Tests
All tests run against an isolated in-memory H2 database with zero mutations to production:
```bash
cd Backend
mvn test
```
*Current test suite: 48 automated regression & integration tests passing cleanly.*

### Frontend Checks & Production Build
```bash
cd Frontend

# Run ESLint validation:
npm run lint

# Run Next.js production build:
npm run build
```
*Builds 39 static and dynamic routes successfully.*

---

## Database Migrations

Migrations are automatically executed by Flyway on startup (`Backend/src/main/resources/db/migration`):
- `V1__Initial_Schema.sql`: Complete DDL schema creation with tables, enums, and foreign keys.
- `V2__Add_Performance_Indexes.sql`: Performance indexes on foreign keys and search filters.
- `V3__Performance_And_Composite_Indexes.sql`: Composite search and status indexes.
- `V4__Add_Security_And_Performance_Indexes_And_Constraints.sql`: Optimistic locking versions and audit logging tables.
- `V5__Add_Token_Version_And_Inquiry_Unique_Index.sql`: Token version for session revocation and partial unique index on open inquiries.
- `V6__Reconcile_Email_Verification_Tokens_Schema.sql`: Reconciles `email_verification_tokens` timestamps and `reviews.updated_at`.
- `V7__Make_Review_Deal_Id_Nullable.sql`: Makes legacy `deal_id` on `reviews` nullable.
- `V8__Drop_Legacy_Not_Null_Constraints_On_Reviews.sql`: Drops NOT NULL constraints on legacy columns on `reviews` to support seller reviews.

---

## End-to-End Workflow Verification

A comprehensive, reusable end-to-end verification script is located at `scripts/verify_e2e_workflow.mjs`.

### What It Verifies
1. **Admin Authentication & Categories**: Validates JWT login and ensures business categories exist.
2. **Staff Provisioning**: Provisions and authenticates a Verification Officer.
3. **Seller Flow**: Registers seller, auto-verifies email, verifies seller identity via Officer.
4. **Listing Creation & Validation**: Creates listings and enforces input constraints.
5. **Upload Robustness**: Asserts rejection of disallowed files without creating duplicate listings.
6. **Distinct Document & Photo Uploads**: Uploads PDF documents and image photos, confirming distinct IDs, proper MIME types (`application/pdf`, `image/png`), and verifying downloaded binary byte integrity.
7. **Listing Edit & Optional-Field Clearing**: Tests field updates and explicit clearing of optional attributes (such as `reasonForSelling`) while preserving other fields.
8. **Officer Review**: Officer previews, downloads files, and marks listing verified.
9. **Admin Publication**: Admin publishes listing to public marketplace.
10. **Buyer Inquiry & Reviews**: Buyer registers, submits inquiry, seller accepts, and buyer rates seller.

### Running the E2E Script
Ensure both PostgreSQL and the Spring Boot backend (`http://localhost:8080`) are running:

```bash
# With default local credentials:
node scripts/verify_e2e_workflow.mjs

# Or with custom environment variables:
BASE_URL="http://localhost:8080/api" \
ADMIN_EMAIL="admin@bizexchange.local" \
ADMIN_PASSWORD="YourAdminPassword123!" \
node scripts/verify_e2e_workflow.mjs
```
