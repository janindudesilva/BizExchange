-- =============================================================================
-- BizExchange Database Upgrade Protection Procedure: Pre-V5 Inquiry Reconciliation
-- =============================================================================
-- Purpose:
--   Before applying Flyway migration V5 on legacy databases currently at V4 or earlier,
--   run this script to protect all existing inquiries and messages from deletion.
--
-- Background:
--   Historical migration V5 adds the partial unique index:
--     uk_open_inquiry_buyer_business ON inquiries (buyer_id, business_id)
--     WHERE status IN ('PENDING_APPROVAL', 'ACTIVE');
--   To ensure index creation succeeds on databases with legacy duplicate open inquiries,
--   V5 contains a historical DELETE statement for older duplicates.
--   Running this protection procedure BEFORE V5 marks all older open duplicates as
--   'CLOSED', ensuring:
--     1. Exactly one newest inquiry remains in open status ('PENDING_APPROVAL' or 'ACTIVE').
--     2. All older duplicate inquiries are preserved (transitioned to 'CLOSED').
--     3. All messages linked to all inquiries are 100% preserved.
--     4. V5's subsequent DELETE statement affects 0 rows, preventing any data loss.
--     5. Migration files V1..V9 remain untouched, preserving Flyway checksum validation.
--
-- Execution:
--   psql -U postgres -d BizExchange -f pre_v5_inquiry_data_protection.sql
-- =============================================================================

BEGIN;

UPDATE inquiries i1
SET status = 'CLOSED'
FROM inquiries i2
WHERE i1.buyer_id = i2.buyer_id
  AND i1.business_id = i2.business_id
  AND i1.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i2.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i1.id < i2.id;

COMMIT;
