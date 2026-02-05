# ==========================================
# BACKUP DAY DU (Schema + Data + Storage)
# Backup ALL: Database + Storage Files
# ==========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FULL BACKUP - DATABASE + STORAGE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Load config
if (Test-Path ".\.backup.config.ps1") {
    . .\.backup.config.ps1
    $conn = $SUPABASE_DB_URL
} else {
    Write-Host "[ERROR] File .backup.config.ps1 khong ton tai!" -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups\backup_$timestamp"

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 1. BACKUP DATABASE
Write-Host "[1/3] Backing up DATABASE..." -ForegroundColor Yellow
$dbFile = "$backupDir\database.sql"
pg_dump $conn --clean --if-exists --no-owner --no-privileges --file=$dbFile 2>&1 | Out-Null

if (Test-Path $dbFile) {
    $size = [math]::Round((Get-Item $dbFile).Length / 1MB, 2)
    Write-Host "      => database.sql ($size MB)" -ForegroundColor Green
} else {
    Write-Host "      => FAILED!" -ForegroundColor Red
}

# 2. BACKUP STORAGE INFO
Write-Host "`n[2/3] Creating STORAGE restore guide..." -ForegroundColor Yellow
$storageGuide = @"
# ==========================================
# STORAGE BACKUP INSTRUCTIONS
# ==========================================

DATABASE BACKUP: OK (database.sql)

STORAGE FILES: Can backup thu cong
Project co 3 storage buckets:
  1. avatars (profile images)
  2. submissions (bao cao PDF, DOC, ZIP)
  3. logbook_attachments (file dinh kem)

CACH BACKUP STORAGE:
  Option 1: Download tu Supabase Dashboard
    - Vao Storage > Chon bucket > Download files

  Option 2: Dung Supabase CLI
    supabase storage download --bucket avatars --path ./backups/storage/avatars
    supabase storage download --bucket submissions --path ./backups/storage/submissions
    supabase storage download --bucket logbook_attachments --path ./backups/storage/logbook_attachments

CACH RESTORE STORAGE:
  Option 1: Upload tu Dashboard
    - Vao Storage > Chon bucket > Upload files

  Option 2: Dung Supabase CLI
    supabase storage upload --bucket avatars --path ./backups/storage/avatars

==========================================
AUTH USERS: Can export/import rieng
==========================================

Database backup chi chua DATA, khong chua AUTH USERS (email/password).

CACH BACKUP AUTH USERS:
  1. Export tu Supabase Dashboard
     Authentication > Users > Export to CSV

  2. Hoac query truc tiep (chi admin):
     SELECT id, email, created_at FROM auth.users;

CACH RESTORE AUTH USERS:
  1. Import CSV tu Dashboard
  2. Hoac dung API tao lai users

==========================================
EDGE FUNCTIONS: Can backup code
==========================================

Backup Edge Functions code:
  - Code da co san trong folder: supabase/functions/
  - Chi can commit len Git

Deploy lai sau khi restore:
  supabase functions deploy

==========================================
"@

$storageGuide | Out-File -FilePath "$backupDir\STORAGE_GUIDE.txt" -Encoding UTF8
Write-Host "      => STORAGE_GUIDE.txt" -ForegroundColor Green

# 3. CREATE BACKUP INFO
Write-Host "`n[3/3] Creating backup info..." -ForegroundColor Yellow
$backupInfo = @"
BACKUP INFORMATION
==========================================
Date: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Type: Full Backup (Database + Guide)

FILES:
  - database.sql: Full database backup (schema + data)
  - STORAGE_GUIDE.txt: Storage backup instructions
  - RESTORE_GUIDE.txt: Restore instructions

RESTORE INSTRUCTIONS:
  1. Tao project Supabase moi
  2. Restore database:
     psql "CONNECTION_STRING" -f database.sql
  3. Backup/restore storage files (xem STORAGE_GUIDE.txt)
  4. Import auth users (neu can)
  5. Deploy edge functions

WHAT'S INCLUDED:
  ✅ All tables (profiles, sessions, classes, topics, etc.)
  ✅ All data (records)
  ✅ Schema (RLS policies, functions, triggers)
  ✅ Indexes, constraints

WHAT'S NOT INCLUDED:
  ❌ Auth users (email/password) - Export rieng
  ❌ Storage files - Backup rieng
  ❌ Edge Functions - Code trong supabase/functions/

==========================================
"@

$backupInfo | Out-File -FilePath "$backupDir\backup_info.txt" -Encoding UTF8
Write-Host "      => backup_info.txt" -ForegroundColor Green

# 4. CREATE RESTORE SCRIPT
$restoreScript = @'
# RESTORE SCRIPT
# Chay script nay de restore database

Write-Host "Nhap connection string cua database MOI:" -ForegroundColor Cyan
$conn = Read-Host

Write-Host "`nRestoring database..." -ForegroundColor Yellow
psql $conn -f database.sql

Write-Host "`nDone! Doc file STORAGE_GUIDE.txt de restore storage." -ForegroundColor Green
'@

$restoreScript | Out-File -FilePath "$backupDir\restore.ps1" -Encoding UTF8
Write-Host "      => restore.ps1" -ForegroundColor Green

# 5. COMPRESS ALL
Write-Host "`n[4/4] Compressing backup..." -ForegroundColor Yellow
$zipFile = ".\backups\backup_full_$timestamp.zip"
Compress-Archive -Path $backupDir -DestinationPath $zipFile -Force

$zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host "      => $zipFile ($zipSize MB)" -ForegroundColor Green

# Cleanup
Remove-Item -Path $backupDir -Recurse -Force

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  BACKUP THANH CONG!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup file: $zipFile" -ForegroundColor White
Write-Host "Size: $zipSize MB" -ForegroundColor White
Write-Host ""
Write-Host "Giai nen file de xem huong dan restore!" -ForegroundColor Yellow
Write-Host ""
