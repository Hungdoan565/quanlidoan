# ==========================================
# RESTORE DATABASE TU FILE BACKUP
# Su dung khi tao project Supabase moi
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESTORE SUPABASE DATABASE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# List available backups
Write-Host "Danh sach backup co san:" -ForegroundColor Yellow
Write-Host ""

$backupFiles = Get-ChildItem ".\backups" -Filter "*.sql" | Sort-Object LastWriteTime -Descending

if ($backupFiles.Count -eq 0) {
    Write-Host "[ERROR] Khong tim thay file backup nao!" -ForegroundColor Red
    exit 1
}

for ($i = 0; $i -lt $backupFiles.Count; $i++) {
    $file = $backupFiles[$i]
    $size = [math]::Round($file.Length / 1MB, 2)
    $date = $file.LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss")
    Write-Host "  $($i + 1). $($file.Name)" -ForegroundColor White
    Write-Host "     Size: $size MB | Date: $date" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Chon file backup (1-$($backupFiles.Count)):" -ForegroundColor Cyan
$selection = Read-Host

if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $backupFiles.Count) {
    $backupFile = $backupFiles[[int]$selection - 1].FullName
} else {
    Write-Host "[ERROR] Lua chon khong hop le!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "File backup: $backupFile" -ForegroundColor Green
Write-Host ""

# Get new database connection string
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LAY CONNECTION STRING CUA DATABASE MOI" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Buoc 1: Tao project Supabase moi (neu chua co)" -ForegroundColor White
Write-Host "Buoc 2: Vao Settings > Database > Connection string > URI" -ForegroundColor White
Write-Host "Buoc 3: Copy connection string" -ForegroundColor White
Write-Host ""
Write-Host "Nhap connection string cua DATABASE MOI:" -ForegroundColor Cyan
$newConn = Read-Host

if ([string]::IsNullOrWhiteSpace($newConn)) {
    Write-Host "[ERROR] Connection string khong duoc de trong!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  CANH BAO!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Restore se:" -ForegroundColor Yellow
Write-Host "  - XOA tat ca tables hien co trong database moi" -ForegroundColor Yellow
Write-Host "  - TAO LAI tables tu backup" -ForegroundColor Yellow
Write-Host "  - IMPORT tat ca data tu backup" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ban co chac chan muon restore? (yes/no)" -ForegroundColor Red
$confirm = Read-Host

if ($confirm -ne "yes") {
    Write-Host "`n[CANCELLED] Da huy restore." -ForegroundColor Yellow
    exit 0
}

# Restore
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DANG RESTORE..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Use psql to restore
    $env:PGPASSWORD = ""
    psql $newConn -f $backupFile 2>&1 | Out-String -Stream | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "CREATE|ALTER|INSERT") {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RESTORE THANH CONG!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database moi da duoc restore day du tu backup!" -ForegroundColor White
    Write-Host ""
    Write-Host "LUU Y QUAN TRONG:" -ForegroundColor Yellow
    Write-Host "  1. Auth users (email/password) CHUA duoc restore" -ForegroundColor Yellow
    Write-Host "     => Can tao lai users hoac import tu Dashboard" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Storage files (avatar, PDF, images) CHUA duoc restore" -ForegroundColor Yellow
    Write-Host "     => Can upload lai files" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Edge Functions code CHUA duoc deploy" -ForegroundColor Yellow
    Write-Host "     => Can deploy lai: supabase functions deploy" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Restore that bai: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Kiem tra:" -ForegroundColor Yellow
    Write-Host "  1. psql da duoc cai dat? (chay: psql --version)" -ForegroundColor Gray
    Write-Host "  2. Connection string dung chua?" -ForegroundColor Gray
    Write-Host "  3. Co quyen truy cap database?" -ForegroundColor Gray
    exit 1
}
