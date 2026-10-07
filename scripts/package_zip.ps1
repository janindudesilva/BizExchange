$ErrorActionPreference = 'Stop'

$sourceDir = 'd:\bizexchange'
$zipDestinations = @('d:\bizexchange\bizexchange26.zip', 'd:\bizexchange\bizexchange-reviewed.zip')

$excludeSubstrings = @(
    '\.git\',
    '\node_modules\',
    '\.next\',
    '\target\',
    '\uploads\',
    '\.idea\',
    '\.vscode\'
)

$excludeFileNames = @(
    'bizexchange25.zip',
    'bizexchange26.zip',
    'bizexchange-reviewed.zip',
    'bizexchange-reviewed-patch.zip',
    'application-local.properties',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
)

$stagingDir = Join-Path $env:TEMP ('bizexchange_stage_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    $allFiles = Get-ChildItem -Path $sourceDir -Recurse -File

    $includedFiles = @()
    foreach ($file in $allFiles) {
        $fullPath = $file.FullName
        $fileName = $file.Name

        if ($excludeFileNames -contains $fileName) {
            continue
        }

        $isExcluded = $false
        foreach ($sub in $excludeSubstrings) {
            if ($fullPath.Contains($sub)) {
                $isExcluded = $true
                break
            }
        }

        if (-not $isExcluded) {
            $includedFiles += $file
        }
    }

    Write-Host "Staging $($includedFiles.Count) files..."

    foreach ($file in $includedFiles) {
        $relPath = $file.FullName.Substring($sourceDir.Length + 1)
        $destPath = Join-Path $stagingDir $relPath
        $destParent = Split-Path $destPath -Parent

        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }

        Copy-Item -Path $file.FullName -Destination $destPath -Force
    }

    foreach ($dest in $zipDestinations) {
        if (Test-Path $dest) {
            Remove-Item $dest -Force
        }
        Write-Host "Compressing staged files to $dest..."
        Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $dest -CompressionLevel Optimal
        $item = Get-Item $dest
        Write-Host "ZIP created: $($item.FullName) ($([math]::Round($item.Length / 1MB, 2)) MB)"
    }
} finally {
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
