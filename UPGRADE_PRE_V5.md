# BizExchange Database Upgrade Guide: Upgrading Legacy Databases (Pre-V5 to V9)

## Overview
This document provides standard operating procedures for safely upgrading legacy BizExchange databases running schema version **V4 or earlier** to schema version **V9**, while retaining full data preservation for duplicate inquiries and their message history.

---

## 1. Safety Prerequisites & Upgrade Policies

Before executing any upgrade steps on a production or legacy environment:

1. **Mandatory Database Backup**:
   A complete database backup must be created and verified before running any upgrade procedures.
   ```bash
   pg_dump -h localhost -U postgres -d BizExchange -F c -b -v -f "bizexchange_pre_v5_backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
   Or plain SQL backup:
   ```bash
   pg_dump -h localhost -U postgres -d BizExchange -F p -v -f "bizexchange_pre_v5_backup_$(date +%Y%m%d_%H%M%S).sql"
   ```

2. **Stop All Application Instances and Writers**:
   Stop all backend application instances, background worker jobs, and API gateways before running the protection procedure. No writes may occur against the database during the upgrade window.

3. **Keep Writes Stopped Until Migration Finishes**:
   Writes must remain stopped until the protection script AND all Flyway migrations (V5 through V9) complete successfully.

4. **Flyway Validation Must Remain Enabled**:
   Do not disable Flyway validation (`spring.flyway.validate-on-migrate=true` must remain `true`).
   Already-applied migrations (V1 through V8) must **never** be edited on disk or checksum-repaired, as doing so breaks checksum validation across distributed nodes and existing databases.

---

## 2. The Problem in Historical V5

Historical Flyway migration script `V5__Add_Token_Version_And_Inquiry_Unique_Index.sql` establishes a partial unique index on open inquiries:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uk_open_inquiry_buyer_business
ON inquiries (buyer_id, business_id)
WHERE status IN ('PENDING_APPROVAL', 'ACTIVE');
```

To guarantee that the index creation succeeded during initial schema setup if duplicate open inquiries existed, historical V5 included:
```sql
DELETE FROM inquiries i1
USING inquiries i2
WHERE i1.buyer_id = i2.buyer_id
  AND i1.business_id = i2.business_id
  AND i1.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i2.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i1.id < i2.id;
```
Because `messages.inquiry_id` has `ON DELETE CASCADE`, executing V5 without prior reconciliation would permanently delete older duplicate inquiry records and cascade-delete their message rows.

Because already-applied Flyway migration files cannot be modified on disk without invalidating checksums, the shipped non-destructive protection script reconciles pre-existing duplicates **before** V5 is invoked.

---

## 3. Shipped Data Protection Procedure

The protection procedure script is provided at:
- `scripts/pre_v5_inquiry_data_protection.sql`
- `Backend/src/main/resources/db/upgrade/pre_v5_inquiry_data_protection.sql`

```sql
BEGIN;

-- Transition older duplicate open inquiries to 'CLOSED'
-- Preserves all inquiry rows and prevents V5 DELETE from matching them
UPDATE inquiries i1
SET status = 'CLOSED'
FROM inquiries i2
WHERE i1.buyer_id = i2.buyer_id
  AND i1.business_id = i2.business_id
  AND i1.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i2.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i1.id < i2.id;

COMMIT;
```

### How It Works
1. Any older duplicate open inquiry (`PENDING_APPROVAL` or `ACTIVE`) for the same `(buyer_id, business_id)` pair is updated to `CLOSED`.
2. The newest inquiry for each pair remains open in its current status.
3. Because older inquiries now have status `CLOSED`, V5's subsequent `DELETE ... WHERE status IN ('PENDING_APPROVAL', 'ACTIVE')` matches **zero** rows.
4. All inquiry records and all associated message rows are 100% preserved.
5. The partial unique index `uk_open_inquiry_buyer_business` is created cleanly.
6. Flyway migrations V5 through V9 execute with full validation enabled and zero checksum mismatches.

---

## 4. Step-by-Step Upgrade Execution

### Step 1: Confirm Active Connections & Stop Application Writers
Confirm that no client application connections are writing to the database:
```sql
SELECT pid, usename, client_addr, state, query 
FROM pg_stat_activity 
WHERE datname = 'BizExchange' AND pid <> pg_backend_pid();
```
Shut down all running Spring Boot instances and background workers.

### Step 2: Verify Current Database Schema Version
```sql
SELECT version, description, success, installed_on 
FROM flyway_schema_history 
ORDER BY installed_rank DESC LIMIT 1;
```
If the current version is `4` (or earlier), proceed with Step 3.

### Step 3: Run the Protection Script with `ON_ERROR_STOP=1`
Run `psql` with `-v ON_ERROR_STOP=1` so that any error stops execution immediately and rolls back the transaction:
```bash
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d BizExchange -f scripts/pre_v5_inquiry_data_protection.sql
```
If `psql` returns a non-zero exit code, do **NOT** proceed. Investigate the database error before running migrations.

### Step 4: Apply Migrations V5 Through V9
Run Flyway migrations with validation enabled:
```bash
cd Backend
./mvnw flyway:migrate
```
Or start the application with Flyway enabled:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### Step 5: Post-Upgrade Verification
Before opening the database to application traffic, execute the following verification checks:

1. **Verify Flyway Schema History reached version 9**:
   ```sql
   SELECT version, description, success FROM flyway_schema_history WHERE version IN ('5', '6', '7', '8', '9') ORDER BY installed_rank;
   ```
   All versions 5 through 9 must show `success = true`.

2. **Verify No Duplicate Open Inquiries Exist**:
   ```sql
   SELECT buyer_id, business_id, COUNT(*) 
   FROM inquiries 
   WHERE status IN ('PENDING_APPROVAL', 'ACTIVE') 
   GROUP BY buyer_id, business_id 
   HAVING COUNT(*) > 1;
   ```
   Must return **0 rows**.

3. **Verify Preserved Inquiries and Messages**:
   ```sql
   SELECT status, COUNT(*) FROM inquiries GROUP BY status;
   SELECT COUNT(*) AS total_messages FROM messages;
   ```
   Confirm that all inquiries and messages remain present in the database.

### Step 6: Safe Restart
Once all verification checks pass and Flyway validation confirms 0 checksum mismatches, restart the application instances and re-enable write traffic.

---

## 5. Automated Regression Test Coverage

The upgrade and preservation procedure is continuously regression-tested in:
`Backend/src/test/java/com/businessexchange/migration/PostgreSqlFlywayMigrationIntegrationTest.java`

- Method: `testPreV5UpgradeDataPreservationWithProtectionProcedure()`
- Execution: Directly reads and executes the shipped SQL file (`Backend/src/main/resources/db/upgrade/pre_v5_inquiry_data_protection.sql`) instead of maintaining a hardcoded copy of its logic.
- Verifications:
  1. Creates an isolated PostgreSQL test database migrated only to V4.
  2. Seeds duplicate `PENDING_APPROVAL` and `ACTIVE` inquiries with linked messages.
  3. Executes the shipped protection SQL script.
  4. Applies Flyway V5 through V9 with validation enabled.
  5. Asserts every inquiry ID and message ID still exists.
  6. Asserts exactly one inquiry remains open while older duplicates are preserved as `CLOSED`.
