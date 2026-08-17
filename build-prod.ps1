<#
Build de producción para la VM ARM64 (Oracle Cloud tier gratuito - Ampere).

Que hace:
  1. pnpm build en frontend/          -> frontend/dist
  2. Copia frontend/dist/* a backend/web/ (limpiando lo anterior)
  3. Compila el binario Go con GOOS=linux GOARCH=arm64 CGO_ENABLED=0,
     con el frontend ya embebido via web.FS (backend/web/embed.go)

Uso:
  .\build-prod.ps1

Salida:
  dist-server\server   (binario Linux ARM64 listo para subir a la VM, ej. via scp)

En la VM, el servicio systemd debe definir APP_ENV=production (el binario
no trae el entorno hardcodeado, lo respeta desde la variable de entorno).
#>

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$webDir = Join-Path $backendDir "web"
$outDir = Join-Path $root "dist-server"
$binPath = Join-Path $outDir "server"

Write-Host "== 1/3: build frontend (pnpm build) ==" -ForegroundColor Cyan
Push-Location $frontendDir
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "pnpm build fallo con codigo $LASTEXITCODE" }
} finally {
    Pop-Location
}

$distDir = Join-Path $frontendDir "dist"
if (-not (Test-Path $distDir) -or -not (Get-ChildItem $distDir -ErrorAction SilentlyContinue)) {
    throw "frontend/dist no existe o esta vacio tras pnpm build"
}

Write-Host "== 2/3: copiar frontend/dist a backend/web (embed) ==" -ForegroundColor Cyan
Get-ChildItem $webDir -Force |
    Where-Object { $_.Name -notin @(".gitkeep", "embed.go") } |
    Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $distDir "*") -Destination $webDir -Recurse -Force

Write-Host "== 3/3: compilar binario Go (linux/arm64, CGO_ENABLED=0) ==" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Push-Location $backendDir
try {
    $env:GOOS = "linux"
    $env:GOARCH = "arm64"
    $env:CGO_ENABLED = "0"
    go build -trimpath -ldflags "-s -w" -o $binPath ./cmd/server
    if ($LASTEXITCODE -ne 0) { throw "go build fallo con codigo $LASTEXITCODE" }
} finally {
    Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
    Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue
    Remove-Item Env:\CGO_ENABLED -ErrorAction SilentlyContinue
    Pop-Location
}

Write-Host ""
Write-Host "Listo. Binario Linux ARM64 con frontend embebido en:" -ForegroundColor Green
Write-Host "  $binPath"
Write-Host ""
Write-Host "Subir a la VM, ej.:" -ForegroundColor Yellow
Write-Host "  scp `"$binPath`" usuario@vm-ip:/ruta/destino/server"
Write-Host "En la VM: chmod +x server, y correrlo con APP_ENV=production definido"
Write-Host "en el servicio systemd (no va hardcodeado en el binario)."
