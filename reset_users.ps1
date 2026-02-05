#!/usr/bin/env pwsh
# ===================================================
# RESET DATABASE - Xóa sạch sinh viên & giảng viên
# ===================================================
# Sử dụng: .\reset_users.ps1
# Lưu ý: KHÔNG THỂ UNDO! Backup trước nếu cần.

param(
    [switch]$SkipBackup,
    [switch]$DeleteClasses,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESET DATABASE - Xóa Users & Data" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if .backup.config.ps1 exists
if (-not (Test-Path ".\.backup.config.ps1")) {
    Write-Host "❌ Lỗi: Không tìm thấy file .backup.config.ps1" -ForegroundColor Red
    Write-Host "   Tạo file này với connection string của bạn." -ForegroundColor Yellow
    exit 1
}

# Load connection string
. .\.backup.config.ps1

if (-not $SUPABASE_DB_URL) {
    Write-Host "❌ Lỗi: Connection string không hợp lệ" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Connection: $($SUPABASE_DB_URL.Split('@')[1].Split(':')[0])" -ForegroundColor Gray
Write-Host ""

# Warning
Write-Host "CANH BAO: Script nay se XOA:" -ForegroundColor Red
Write-Host "   - Tat ca sinh vien (students)" -ForegroundColor Yellow
Write-Host "   - Tat ca giang vien (teachers)" -ForegroundColor Yellow
Write-Host "   - Tat ca grades, reviews, logbooks, reports" -ForegroundColor Yellow
Write-Host "   - Tat ca auth users (tru admin)" -ForegroundColor Yellow
if ($DeleteClasses) {
    Write-Host "   - Tat ca classes (da chon -DeleteClasses)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "GIU LAI (KHONG XOA):" -ForegroundColor Green
Write-Host "   - Admin accounts" -ForegroundColor Gray
Write-Host "   - Sessions (dot do an)" -ForegroundColor Gray
if (-not $DeleteClasses) {
    Write-Host "   - Classes structure" -ForegroundColor Gray
}
Write-Host ""

# Confirmation
if (-not $Force) {
    $confirm = Read-Host "Bạn có chắc chắn muốn tiếp tục? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Đã hủy bởi người dùng." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Backup first (unless skipped)
if (-not $SkipBackup) {
    Write-Host "📦 Tạo backup trước khi reset..." -ForegroundColor Cyan
    try {
        & .\backup_quick.ps1
        Write-Host "✅ Backup hoàn tất" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "⚠️  Backup thất bại: $($_.Exception.Message)" -ForegroundColor Yellow
        $continue = Read-Host "Vẫn tiếp tục reset? (yes/no)"
        if ($continue -ne "yes") {
            Write-Host "❌ Đã hủy." -ForegroundColor Yellow
            exit 0
        }
    }
}

# Prepare SQL script
$scriptPath = "supabase\migrations\037_reset_users_data.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Lỗi: Không tìm thấy migration file: $scriptPath" -ForegroundColor Red
    exit 1
}

# Add DELETE classes if requested
if ($DeleteClasses) {
    Write-Host "Them lenh xoa classes..." -ForegroundColor Yellow
    $scriptContent = Get-Content $scriptPath -Raw
    $scriptContent = $scriptContent -replace "-- DELETE FROM classes;", "DELETE FROM classes;"
    $tempScript = "supabase\migrations\_temp_reset.sql"
    $scriptContent | Out-File -FilePath $tempScript -Encoding UTF8
    $scriptPath = $tempScript
}

# Execute migration
Write-Host "Dang chay reset script..." -ForegroundColor Cyan

try {
    $result = psql $SUPABASE_DB_URL -f $scriptPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Reset database thanh cong!" -ForegroundColor Green
        Write-Host ""
        Write-Host $result
    } else {
        Write-Host "Reset that bai!" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
} catch {
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup temp script
    if ($DeleteClasses -and (Test-Path "supabase\migrations\_temp_reset.sql")) {
        Remove-Item "supabase\migrations\_temp_reset.sql"
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RESET HOAN TAT" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RESET HOAN TAT" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Buoc tiep theo:" -ForegroundColor Cyan
Write-Host "   1. Xoa auth users (neu can) trong Dashboard SQL Editor" -ForegroundColor White
Write-Host "   2. Xoa Storage files (neu can)" -ForegroundColor White
Write-Host "   3. Test import lai" -ForegroundColor White
Write-Host ""
