#!/usr/bin/env pwsh
# Reset Database - Simple version
param([switch]$Force)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.backup.config.ps1")) {
    Write-Host "Khong tim thay file .backup.config.ps1" -Fore Yellow
    exit 1
}

. .\.backup.config.ps1

if (-not $Force) {
    Write-Host "CANH BAO: Script nay se xoa tat ca students va teachers!" -Fore Red
    $confirm = Read-Host "Tiep tuc? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Da huy." -Fore Yellow
        exit 0
    }
}

Write-Host "Dang reset database..." -Fore Cyan
Write-Host "Script: supabase/migrations/037_reset_users_data.sql" -Fore Gray
Write-Host ""

try {
    $output = psql $SUPABASE_DB_URL -f supabase/migrations/037_reset_users_data.sql 2>&1
    $exitCode = $LASTEXITCODE
    
    Write-Host "Exit code: $exitCode" -Fore Gray
    Write-Host ""
    Write-Host $output
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-Host "================================================" -Fore Green
        Write-Host "  RESET THANH CONG!" -Fore Green
        Write-Host "================================================" -Fore Green
        Write-Host ""
        Write-Host "Import lai sinh vien qua UI ngay bay gio!" -Fore Cyan
    } else {
        Write-Host "Loi khi reset!" -Fore Red
        exit 1
    }
} catch {
    Write-Host "Exception: $($_.Exception.Message)" -Fore Red
    exit 1
}
