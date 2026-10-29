# Script de compilation de l'APK Debug Tâches Ménagères
$ErrorActionPreference = "Stop"

$rootDir = $PSScriptRoot
$androidDir = Join-Path $rootDir "android"
$webDir = Join-Path $rootDir "web"
$assetsDir = Join-Path $androidDir "app\src\main\assets"
$distDir = Join-Path $rootDir "dist"

Write-Host "=== Synchronisation des assets Web vers Android ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
Copy-Item (Join-Path $webDir "*") -Destination $assetsDir -Force

Write-Host "=== Compilation de l'APK via Gradle ===" -ForegroundColor Cyan
Set-Location $androidDir
.\gradlew.bat assembleDebug

$apkSource = Get-ChildItem -Path (Join-Path $androidDir "app\build\outputs\apk\debug\*.apk") | Select-Object -First 1
if (-not $apkSource) {
    throw "APK non trouvé après compilation Gradle."
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$targetApk = Join-Path $distDir "taches-menageres-debug.apk"
Copy-Item $apkSource.FullName -Destination $targetApk -Force

Write-Host "=== APK généré avec succès dans $targetApk ===" -ForegroundColor Green
Get-Item $targetApk | Select-Object Name, Length, LastWriteTime | Format-Table
