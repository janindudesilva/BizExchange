# BizExchange Database Upgrade Guide: Upgrading Legacy Databases (Pre-V5 to V9)

## Overview
This document provides instructions for safely upgrading legacy BizExchange databases running schema version **V4 or earlier** to schema version **V9**, while retaining full data preservation for duplicate inquiries and their message history.

---

## The Problem in Historical V5
Historical Flyway migration script `V5__Add_Token_Version_And_Inquiry_Unique_Index.sql` establishes a partial unique index on inquiries:
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

Moreover, **already-applied Flyway migration files cannot be modified on disk**, because altering V5 changes its checksum and breaks Flyway startup validation (`spring.flyway.validate-on-migrate=true`) on all existing environments.

---

## Documented Protection Procedure (Pre-V5 Upgrade)

For any legacy database currently at version **V4 or earlier**, run the following data protection procedure **BEFORE** applying V5 migrations:

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

A standalone script is provided in:
- `scripts/pre_v5_inquiry_data_protection.sql`
- `Backend/src/main/resources/db/upgrade/pre_v5_inquiry_data_protection.sql`

### How It Works
1. Any older duplicate open inquiry (`PENDING_APPROVAL` or `ACTIVE`) is updated to `CLOSED`.
2. The newest inquiry for each `(buyer_id, business_id)` remains open in its current status.
3. Because older inquiries now have status `CLOSED`, V5's `DELETE ... WHERE status IN ('PENDING_APPROVAL', 'ACTIVE')` matches **zero** rows.
4. All inquiry records and all associated message rows are 100% preserved.
5. The partial unique index `uk_open_inquiry_buyer_business` is created cleanly.
6. Flyway migrations V5 through V9 execute with full validation enabled and zero checksum mismatches.

---

## Step-by-Step Upgrade Steps

1. **Verify Current Schema Version**:
   ```sql
   SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1;
   ```
   If the current version is `4` (or earlier):

2. **Execute the Protection Procedure**:
   ```bash
   psql -h localhost -U postgres -d BizExchange -f scripts/pre_v5_inquiry_data_protection.sql
   ```

3. **Run Flyway Migrations (or start Spring Boot)**:
   ```bash
   cd Backend
   ./mvnw compile spring-boot:run
   ```
   Or via Maven Flyway:
   ```bash
   ./mvnw flyway:migrate
   ```

4. **Verify Outcome**:
   ```sql
   -- Verify all inquiries exist and only one open inquiry per buyer & business
   SELECT id, business_id, buyer_id, status FROM inquiries ORDER BY id;
   
   -- Verify all messages are preserved
   SELECT id, inquiry_id, sender_id, message FROM messages ORDER BY id;
   ```

---

## Automated Verification & Regression Testing

This protection procedure is automated and continuously regression-tested in:
`Backend/src/test/java/com/businessexchange/migration/PostgreSqlFlywayMigrationIntegrationTest.java`:
- Method: `testPreV5UpgradeDataPreservationWithProtectionProcedure()`
- Validates that on a V4 database with duplicate `PENDING_APPROVAL` and `ACTIVE` inquiries each with messages:
  1. The protection procedure runs before V5.
  2. Flyway migrates V5..V9 with validation enabled.
  3. Every inquiry ID and message ID still exists.
  4. Exactly one inquiry remains open, while duplicates are non-destructively closed.
