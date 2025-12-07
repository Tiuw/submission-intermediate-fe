# Icon Generator Helper Script

Write-Host "📱 Icon Generator untuk PWA Story Map" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aplikasi PWA membutuhkan icon dengan berbagai ukuran." -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Ukuran icon yang dibutuhkan:" -ForegroundColor White
Write-Host "   - icon-72x72.png"
Write-Host "   - icon-96x96.png"
Write-Host "   - icon-128x128.png"
Write-Host "   - icon-144x144.png"
Write-Host "   - icon-152x152.png"
Write-Host "   - icon-192x192.png"
Write-Host "   - icon-384x384.png"
Write-Host "   - icon-512x512.png"
Write-Host ""
Write-Host "📸 Screenshot yang dibutuhkan:" -ForegroundColor White
Write-Host "   - screenshot-desktop.png (1280x720)"
Write-Host "   - screenshot-mobile.png (540x720)"
Write-Host ""
Write-Host "🎨 Cara membuat icons:" -ForegroundColor Green
Write-Host ""
Write-Host "Opsi 1: Manual dengan image editor" -ForegroundColor Yellow
Write-Host "   1. Buat icon 512x512 dengan desain Story Map"
Write-Host "   2. Resize ke ukuran-ukuran yang dibutuhkan"
Write-Host "   3. Simpan semua di folder: src/public/images/"
Write-Host ""
Write-Host "Opsi 2: Online Generator (Recommended)" -ForegroundColor Yellow
Write-Host "   1. Buat icon 512x512"
Write-Host "   2. Upload ke: https://realfavicongenerator.net/"
Write-Host "   3. Download generated icons"
Write-Host "   4. Extract ke: src/public/images/"
Write-Host ""
Write-Host "Opsi 3: PWA Builder" -ForegroundColor Yellow
Write-Host "   1. Buka: https://www.pwabuilder.com/imageGenerator"
Write-Host "   2. Upload base image (min 512x512)"
Write-Host "   3. Generate icons untuk semua platform"
Write-Host "   4. Download dan extract ke: src/public/images/"
Write-Host ""
Write-Host "📁 Target folder: src/public/images/" -ForegroundColor Cyan
Write-Host ""

$targetDir = "src\public\images"

if (-not (Test-Path $targetDir)) {
    Write-Host "✅ Membuat folder: $targetDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
} else {
    Write-Host "✅ Folder sudah ada: $targetDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Generate icons menggunakan salah satu opsi di atas"
Write-Host "   2. Simpan semua icons ke: $targetDir"
Write-Host "   3. Ambil screenshot aplikasi untuk manifest"
Write-Host "   4. Test PWA dengan: npm run build && npm run preview"
Write-Host ""
Write-Host "💡 Tips: Gunakan logo atau emoji 📖 untuk quick testing" -ForegroundColor Yellow
Write-Host ""
