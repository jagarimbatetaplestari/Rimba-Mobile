# PowerShell Script untuk Generate Production Keystore Rimba Android
# Gunakan skrip ini untuk membuat file keystore yang akan digunakan menandatangani rilis Google Play Store.

param(
    [string]$KeystoreFile = "rimba-release.keystore",
    [string]$Alias = "rimba",
    [string]$ValidityDays = "10000"
)

Write-Host "🌲 Rimba Android Release Keystore Generator" -ForegroundColor Green
Write-Host "------------------------------------------------"

# Cari lokasi keytool di sistem
$keytoolPath = $null

if (Get-Command "keytool" -ErrorAction SilentlyContinue) {
    $keytoolPath = "keytool"
} else {
    # Cek folder umum Android Studio / JDK
    $candidates = @(
        "$env:JAVA_HOME\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jre\bin\keytool.exe",
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Java\jdk*\bin\keytool.exe"
    )

    foreach ($pattern in $candidates) {
        $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $keytoolPath = $found.FullName
            break
        }
    }
}

if (-not $keytoolPath) {
    Write-Host "⚠️ keytool tidak ditemukan otomatis di PATH." -ForegroundColor Yellow
    Write-Host "Pastikan Android Studio atau Java JDK 17+ telah terpasang di komputer Anda."
    Write-Host ""
    Write-Host "Alternatif: Anda dapat menjalankan perintah manual berikut di terminal dengan Java/Android Studio:" -ForegroundColor Cyan
    Write-Host "keytool -genkey -v -keystore $KeystoreFile -alias $Alias -keyalg RSA -keysize 2048 -validity $ValidityDays" -ForegroundColor White
    exit 1
}

Write-Host "Ditemukan keytool: $keytoolPath" -ForegroundColor Cyan
Write-Host "Membuat keystore: $KeystoreFile (Alias: $Alias, Masa Berlaku: $ValidityDays hari)..."

& "$keytoolPath" -genkeypair -v -keystore $KeystoreFile -alias $Alias -keyalg RSA -keysize 2048 -validity $ValidityDays -storetype PKCS12

if (Test-Path $KeystoreFile) {
    Write-Host ""
    Write-Host "✅ Keystore berhasil dibuat: $KeystoreFile" -ForegroundColor Green
    Write-Host "🔒 SIMPAN FILE INI DENGAN AMAN DAN JANGAN HILANGKAN PASSWORD!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Untuk GitHub Actions CI/CD:" -ForegroundColor Cyan
    Write-Host "1. Konversi ke Base64 dengan perintah:"
    Write-Host "   [Convert]::ToBase64String([IO.File]::ReadAllBytes('$KeystoreFile')) | Set-Clipboard" -ForegroundColor White
    Write-Host "2. Masukkan ke GitHub Repository Secrets:"
    Write-Host "   - ANDROID_KEYSTORE_BASE64 (dari clipboard)"
    Write-Host "   - ANDROID_KEYSTORE_PASSWORD"
    Write-Host "   - ANDROID_KEY_ALIAS (default: $Alias)"
    Write-Host "   - ANDROID_KEY_PASSWORD"
}
