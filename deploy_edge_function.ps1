#!/usr/bin/env pwsh
# ===================================================
# DEPLOY EDGE FUNCTION - create-students
# ===================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Deploy Edge Function" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI chưa được cài đặt!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cài đặt bằng Scoop:" -ForegroundColor Yellow
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Gray
    Write-Host "  scoop install supabase" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI: $(supabase --version)" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "🔐 Kiểm tra đăng nhập..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Chưa đăng nhập Supabase CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Đăng nhập bằng:" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Đã đăng nhập" -ForegroundColor Green
Write-Host ""

# Link project if not linked
Write-Host "🔗 Kiểm tra project link..." -ForegroundColor Cyan
if (-not (Test-Path ".supabase/config.toml")) {
    Write-Host "⚠️  Project chưa được link" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Link project với ID: sksjrrtowhyberlpnxeu" -ForegroundColor Cyan
    
    $confirm = Read-Host "Link project ngay? (yes/no)"
    if ($confirm -eq "yes") {
        supabase link --project-ref sksjrrtowhyberlpnxeu
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Link project thất bại!" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Project đã được link" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Cần link project để deploy function" -ForegroundColor Red
        exit 0
    }
}

Write-Host "✅ Project đã linked" -ForegroundColor Green
Write-Host ""

# Deploy function
Write-Host "📦 Deploying create-students function..." -ForegroundColor Cyan
Write-Host ""

supabase functions deploy create-students

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  ✅ DEPLOY THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Tối ưu đã áp dụng:" -ForegroundColor Cyan
    Write-Host "   • Parallel batch processing (15 students/batch)" -ForegroundColor White
    Write-Host "   • Giảm retry từ 3 → 2 lần" -ForegroundColor White
    Write-Host "   • Giảm delay từ 500ms → 200ms" -ForegroundColor White
    Write-Host "   • Batch delay giảm xuống 100ms" -ForegroundColor White
    Write-Host ""
    Write-Host "⚡ Kỳ vọng tăng tốc: 3-5x nhanh hơn!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deploy thất bại!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Debug:" -ForegroundColor Yellow
    Write-Host "  1. Check function logs: supabase functions logs create-students" -ForegroundColor Gray
    Write-Host "  2. Test local: supabase functions serve create-students" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
