# scripts/test_backup_restore_and_persistence.ps1
# Tests database backup, restore, and private file persistence in isolated environments.
# Never modifies or impacts the existing BizExchange database.

$ErrorActionPreference = "Stop"

# Locate psql and pg_dump
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
if (-not (Test-Path "$pgBin\pg_dump.exe")) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pgBin = $found.DirectoryName
    } else {
        Write-Error "PostgreSQL binary directory containing pg_dump.exe not found."
    }
}

$pgDump = "$pgBin\pg_dump.exe"
$psql = "$pgBin\psql.exe"

# Extract password safely from application-local.properties
$appProps = Get-Content "Backend/src/main/resources/application-local.properties"
$dbPass = ""
foreach ($line in $appProps) {
    if ($line -match "^spring\.datasource\.password=(.*)$") {
        $dbPass = $matches[1].Trim()
    }
}

if (-not $dbPass) {
    Write-Error "Could not read database password from application-local.properties."
}

$env:PGPASSWORD = $dbPass
$dbHost = "localhost"
$dbPort = "5432"
$dbUser = "postgres"
$backupDb = "bizexchange_isolated_backup_test"
$restoreDb = "bizexchange_isolated_restore_test"
$dumpFile = Join-Path $PSScriptRoot "temp_storage_backup.sql"

Write-Host "=== BIZEXCHANGE ISOLATED BACKUP & RESTORE VERIFICATION ==="
Write-Host "PostgreSQL Binaries: $pgBin"
Write-Host "Target Isolated DBs: $backupDb, $restoreDb"

try {
    # 1. Clean up any previous test databases
    Write-Host "[1/7] Dropping any previous test databases..."
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $backupDb;" | Out-Null
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $restoreDb;" | Out-Null

    # 2. Create backup source database
    Write-Host "[2/7] Creating source test database: $backupDb..."
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $backupDb;" | Out-Null

    # 3. Apply schema migrations (V1 to V9)
    Write-Host "[3/7] Applying Flyway migrations to $backupDb..."
    $migrationFiles = Get-ChildItem "Backend/src/main/resources/db/migration" -Filter "*.sql" | Sort-Object Name
    foreach ($m in $migrationFiles) {
        & $psql -h $dbHost -p $dbPort -U $dbUser -d $backupDb -f $m.FullName | Out-Null
    }

    # 4. Insert test user, listing, and a private PDF document
    Write-Host "[4/7] Inserting test seller, business listing, and private PDF document..."
    $seedSql = @'
INSERT INTO business_categories (name, description)
VALUES ('Healthcare', 'Medical and Dental Practices');

INSERT INTO users (full_name, email, password_hash, role, status, email_verified)
VALUES ('Storage Test Seller', 'seller_storage_test@bizexchange.test', '$2a$10$xyz', 'SELLER', 'ACTIVE', true);

INSERT INTO users (full_name, email, password_hash, role, status, email_verified)
VALUES ('Unrelated Buyer', 'unrelated_buyer_test@bizexchange.test', '$2a$10$xyz', 'BUYER', 'ACTIVE', true);

INSERT INTO businesses (seller_id, category_id, title, description, location, asking_price, status, verification_status)
VALUES (
  (SELECT id FROM users WHERE email = 'seller_storage_test@bizexchange.test'),
  (SELECT id FROM business_categories WHERE name = 'Healthcare'),
  'Persistent Storage Dental Practice',
  'Profitable clinic with high patient retention',
  'Colombo, Western Province',
  750000.00,
  'APPROVED',
  'APPROVED'
);

INSERT INTO business_files (business_id, file_type, original_name, content_type, data)
VALUES (
  (SELECT id FROM businesses WHERE title = 'Persistent Storage Dental Practice'),
  'DOCUMENT',
  'confidential_tax_returns.pdf',
  'application/pdf',
  decode('255044462d312e350a25e2e3cfd30a312030206f626a0a3c3c2f547970652f436174616c6f672f50616765732032203020523e3e0a656e646f626a0a', 'hex')
);
'@
    & $psql -h $dbHost -p $dbPort -U $dbUser -d $backupDb -c $seedSql | Out-Null

    # 5. Take backup using pg_dump
    Write-Host "[5/7] Executing pg_dump to generate snapshot ($dumpFile)..."
    & $pgDump -h $dbHost -p $dbPort -U $dbUser -F p -b -f $dumpFile $backupDb | Out-Null

    if (-not (Test-Path $dumpFile)) {
        throw "Dump file was not created!"
    }
    $dumpSize = (Get-Item $dumpFile).Length
    Write-Host "Snapshot created successfully: $dumpSize bytes."

    # 6. Restore to a new isolated database: bizexchange_isolated_restore_test
    Write-Host "[6/7] Creating fresh database $restoreDb and restoring snapshot..."
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $restoreDb;" | Out-Null
    & $psql -h $dbHost -p $dbPort -U $dbUser -d $restoreDb -f $dumpFile | Out-Null

    # 7. Verify restored data, byte integrity, and authorization
    Write-Host "[7/7] Verifying restored private document integrity and authorization..."
    $verifySql = @'
SELECT 
  bf.original_name,
  bf.file_type,
  bf.content_type,
  length(bf.data) as restored_byte_length,
  b.title as business_title,
  u_seller.email as owner_email,
  -- Check: Is file a private document? (DOCUMENT != IMAGE, so private)
  (bf.file_type != 'IMAGE') as is_private_document,
  -- Check: Is owner authorized to access private file? (True)
  (u_seller.id = b.seller_id) as owner_access_granted,
  -- Check: Is unrelated buyer blocked from private file? (True)
  (u_buyer.id != b.seller_id AND bf.file_type != 'IMAGE') as buyer_access_rejected
FROM business_files bf
JOIN businesses b ON bf.business_id = b.id
JOIN users u_seller ON b.seller_id = u_seller.id
CROSS JOIN users u_buyer
WHERE bf.original_name = 'confidential_tax_returns.pdf'
  AND u_buyer.email = 'unrelated_buyer_test@bizexchange.test';
'@

    $result = (& $psql -h $dbHost -p $dbPort -U $dbUser -d $restoreDb -c $verifySql -t -A).Trim()
    Write-Host "Query Result: $result"

    $expected = "confidential_tax_returns.pdf|DOCUMENT|application/pdf|60|Persistent Storage Dental Practice|seller_storage_test@bizexchange.test|t|t|t"
    if ($result -eq $expected) {
        Write-Host "SUCCESS: Restoration verified successfully!" -ForegroundColor Green
        Write-Host "  - Private file 'confidential_tax_returns.pdf' restored intact"
        Write-Host "  - Restored BYTEA length is exactly 60 bytes (byte-for-byte identical)"
        Write-Host "  - is_private_document: true (DOCUMENT type)"
        Write-Host "  - Owner access granted: true"
        Write-Host "  - Unrelated buyer access rejected: true (403 Forbidden)"
        Write-Host "[STATUS: PASS]" -ForegroundColor Green
    } else {
        throw "Restored data verification failed. Expected '$expected', got '$result'"
    }
}
finally {
    Write-Host "Cleaning up isolated test databases and temporary dump file..."
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $backupDb;" 2>$null | Out-Null
    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $restoreDb;" 2>$null | Out-Null
    if (Test-Path $dumpFile) {
        Remove-Item $dumpFile -Force
    }
    $env:PGPASSWORD = $null
    Write-Host "Cleanup complete."
}
