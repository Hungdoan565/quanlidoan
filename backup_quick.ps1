# ==========================================
# QUICK BACKUP - Chi can chay script nay!
# Connection string da luu trong .backup.config.ps1
# ==========================================

# Load config
if (Test-Path ".\.backup.config.ps1") {
    . .\.backup.config.ps1
    $conn = $SUPABASE_DB_URL
} else {
    Write-Host "[ERROR] File .backup.config.ps1 khong ton tai!" -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SUPABASE BACKUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[...] Backing up database..." -ForegroundColor Yellow

# Full backup
$file = ".\backups\backup_full_$timestamp.sql"
pg_dump $conn --clean --if-exists --no-owner --no-privileges --file=$file 2>&1 | Out-Null

if (Test-Path $file) {
    $size = [math]::Round((Get-Item $file).Length / 1MB, 2)
    Write-Host "[OK] Backup: $file" -ForegroundColor Green
    Write-Host "     Size: $size MB" -ForegroundColor Gray
    
    # Compress
    Write-Host "`n[...] Compressing..." -ForegroundColor Yellow
    Compress-Archive -Path $file -DestinationPath "$file.zip" -Force
    
    $zipSize = [math]::Round((Get-Item "$file.zip").Length / 1MB, 2)
    $saved = [math]::Round($size - $zipSize, 2)
    
    Write-Host "[OK] Compressed: $file.zip" -ForegroundColor Green
    Write-Host "     Size: $zipSize MB (saved $saved MB)" -ForegroundColor Gray
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    
} else {
    Write-Host "`n[ERROR] Backup failed!" -ForegroundColor Red
    exit 1
}
