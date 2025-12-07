# PowerShell script to generate PWA icons using ImageMagick or online tool
# Install ImageMagick first: winget install ImageMagick.ImageMagick

param(
    [string]$SourceImage = "src/public/images/logo.png"
)

$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
$outputDir = "src/public/images"

Write-Host "Generating PWA icons from $SourceImage..." -ForegroundColor Green

# Check if ImageMagick is installed
$magick = Get-Command magick -ErrorAction SilentlyContinue

if ($null -eq $magick) {
    Write-Host "`nImageMagick not found!" -ForegroundColor Red
    Write-Host "Please install ImageMagick or use online tool:" -ForegroundColor Yellow
    Write-Host "1. Go to https://realfavicongenerator.net/" -ForegroundColor Cyan
    Write-Host "2. Upload your logo.png" -ForegroundColor Cyan
    Write-Host "3. Download and extract icons to $outputDir" -ForegroundColor Cyan
    Write-Host "`nOr install ImageMagick:" -ForegroundColor Yellow
    Write-Host "winget install ImageMagick.ImageMagick" -ForegroundColor Cyan
    exit 1
}

# Generate icons
foreach ($size in $sizes) {
    $outputFile = Join-Path $outputDir "icon-${size}x${size}.png"
    Write-Host "Generating ${size}x${size}..." -ForegroundColor Cyan
    
    & magick convert $SourceImage -resize "${size}x${size}" $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created: $outputFile" -ForegroundColor Green
    } else {
        Write-Host "  Failed to create: $outputFile" -ForegroundColor Red
    }
}

Write-Host "`nAll icons generated successfully!" -ForegroundColor Green
Write-Host "Icons location: $outputDir" -ForegroundColor Cyan
