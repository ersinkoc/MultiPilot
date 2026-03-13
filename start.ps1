#!/usr/bin/env pwsh
# MultiPilot Development Startup Script for Windows
# Usage: .\start.ps1 [command]
# Commands: setup, build, dev, test, clean, help

param(
    [Parameter(Position=0)]
    [string]$Command = "menu"
)

$ErrorActionPreference = "Stop"

# Colors
$esc = [char]27
$Green = "$esc[32m"
$Red = "$esc[31m"
$Yellow = "$esc[33m"
$Blue = "$esc[34m"
$Cyan = "$esc[36m"
$Reset = "$esc[0m"

# Script directory
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = Get-Location }

function Write-Header($text) {
    Write-Host ""
    Write-Host "$Blue========================================$Reset"
    Write-Host "$Blue  $text$Reset"
    Write-Host "$Blue========================================$Reset"
    Write-Host ""
}

function Write-Success($text) {
    Write-Host "$Green[OK] $text$Reset"
}

function Write-Error($text) {
    Write-Host "$Red[ERR] $text$Reset"
}

function Write-Warning($text) {
    Write-Host "$Yellow[WARN] $text$Reset"
}

function Write-Info($text) {
    Write-Host "$Cyan[INFO] $text$Reset"
}

function Test-Command($cmd) {
    return [bool](Get-Command -Name $cmd -ErrorAction SilentlyContinue)
}

function Get-Version($cmd) {
    try {
        $output = & $cmd --version 2>&1 | Select-Object -First 1
        return $output
    } catch {
        return "unknown"
    }
}

function Show-DepsStatus() {
    Write-Header "Dependency Check"

    $deps = @(
        @{ Name = "Node.js"; Cmd = "node" },
        @{ Name = "npm"; Cmd = "npm" },
        @{ Name = "Rust"; Cmd = "rustc" },
        @{ Name = "Cargo"; Cmd = "cargo" },
        @{ Name = "Git"; Cmd = "git" }
    )

    $allOk = $true
    foreach ($dep in $deps) {
        if (Test-Command $dep.Cmd) {
            $version = Get-Version $dep.Cmd
            Write-Success "$($dep.Name): $version"
        } else {
            Write-Error "$($dep.Name): Not found"
            $allOk = $false
        }
    }

    if (-not $allOk) {
        Write-Host ""
        Write-Host "${Red}Please install missing dependencies:${Reset}"
        Write-Host "  - Node.js: https://nodejs.org/"
        Write-Host "  - Rust: https://rustup.rs/"
        Write-Host "  - Git: https://git-scm.com/"
        return $false
    }
    return $true
}

function Install-Dependencies() {
    Write-Header "Installing Dependencies"

    # Root dependencies
    if (-not (Test-Path "$ScriptDir\node_modules")) {
        Write-Info "Installing root npm dependencies..."
        Set-Location $ScriptDir
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Success "Root dependencies installed"
    } else {
        Write-Success "Root dependencies already installed"
    }

    # Sidecar dependencies
    if (-not (Test-Path "$ScriptDir\sidecar\node_modules")) {
        Write-Info "Installing sidecar npm dependencies..."
        Set-Location "$ScriptDir\sidecar"
        npm install
        if ($LASTEXITCODE -ne 0) { throw "sidecar npm install failed" }
        Write-Success "Sidecar dependencies installed"
    } else {
        Write-Success "Sidecar dependencies already installed"
    }

    Set-Location $ScriptDir
}

function Build-Project() {
    Write-Header "Building MultiPilot (Debug)"

    # Build frontend
    Write-Info "Building frontend..."
    Set-Location $ScriptDir
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Success "Frontend built"

    Set-Location $ScriptDir
}

function Build-Production() {
    Write-Header "Building MultiPilot (Production)"

    # Build sidecar first
    Build-Sidecar

    # Build Tauri production
    Write-Info "Building Tauri production bundle..."
    Set-Location $ScriptDir
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "Production build failed" }

    Write-Success "Production build complete"
    Write-Info "Output: src-tauri/target/release/bundle/"

    Set-Location $ScriptDir
}

function Build-Sidecar() {
    Write-Header "Building Sidecar"
    Set-Location "$ScriptDir\sidecar"

    if (-not (Test-Path "node_modules\esbuild\bin\esbuild")) {
        Write-Info "Installing sidecar dependencies first..."
        npm install
    }

    Write-Info "Bundling sidecar with esbuild..."
    npm run build:bundle
    if ($LASTEXITCODE -ne 0) { throw "Sidecar bundle failed" }

    Write-Success "Sidecar bundled to sidecar/dist/"
    Set-Location $ScriptDir
}

function Start-Dev() {
    Write-Header "Starting Development Server"

    Install-Dependencies

    Write-Info "Starting Tauri development server..."
    Write-Host "${Cyan}Press Ctrl+C to stop${Reset}"
    Write-Host ""

    Set-Location $ScriptDir
    npm run tauri:dev
}

function Run-Tests() {
    Write-Header "Running Tests"
    Set-Location $ScriptDir

    # Frontend tests
    Write-Info "Running frontend tests..."
    npm run test:run
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend tests failed"
    } else {
        Write-Success "Frontend tests passed"
    }

    Set-Location $ScriptDir
}

function Clear-Build() {
    Write-Header "Cleaning Build Artifacts"

    $paths = @(
        "dist",
        "src-tauri\target",
        "sidecar\dist",
        ".vite"
    )

    foreach ($path in $paths) {
        $fullPath = Join-Path $ScriptDir $path
        if (Test-Path $fullPath) {
            Write-Info "Removing $path..."
            Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
        }
    }

    Write-Success "Clean complete"
}

function Clear-All() {
    Clear-Build

    if (Test-Path "$ScriptDir\node_modules") {
        Write-Info "Removing root node_modules..."
        Remove-Item -Recurse -Force "$ScriptDir\node_modules" -ErrorAction SilentlyContinue
    }

    if (Test-Path "$ScriptDir\sidecar\node_modules") {
        Write-Info "Removing sidecar node_modules..."
        Remove-Item -Recurse -Force "$ScriptDir\sidecar\node_modules" -ErrorAction SilentlyContinue
    }

    Write-Success "Full clean complete"
}

function Show-Menu() {
    Clear-Host
    Write-Host ""
    Write-Host "$Blue========================================$Reset"
    Write-Host "$Blue  MultiPilot Development Script$Reset"
    Write-Host "$Blue========================================$Reset"
    Write-Host ""

    Write-Host "Select an option:"
    Write-Host ""
    Write-Host "  [1] Setup    - Install all dependencies"
    Write-Host "  [2] Build    - Build frontend (debug)"
    Write-Host "  [3] Release  - Build production bundle"
    Write-Host "  [4] Dev      - Start development server"
    Write-Host "  [5] Test     - Run all tests"
    Write-Host "  [6] Clean    - Remove build artifacts"
    Write-Host "  [7] Clean All- Remove everything"
    Write-Host "  [8] Check    - Verify dependencies"
    Write-Host "  [0] Exit"
    Write-Host ""

    $choice = Read-Host "Enter choice (0-8)"

    switch ($choice) {
        '1' { Install-Dependencies }
        '2' { Build-Project }
        '3' { Build-Production }
        '4' { Start-Dev }
        '5' { Run-Tests }
        '6' { Clear-Build }
        '7' { Clear-All }
        '8' { Show-DepsStatus | Out-Null }
        '0' { exit 0 }
        default { Write-Error "Invalid choice"; Start-Sleep 2; Show-Menu }
    }

    Write-Host ""
    Read-Host "Press Enter to return to menu"
    Show-Menu
}

function Show-Help() {
    Write-Host ""
    Write-Host "MultiPilot Development Startup Script"
    Write-Host ""
    Write-Host "Usage: .\start.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  setup       Install all dependencies"
    Write-Host "  build       Build frontend (debug)"
    Write-Host "  release     Build production bundle (.msi/.exe/.dmg/.app)"
    Write-Host "  dev         Start development server (default)"
    Write-Host "  test        Run all tests"
    Write-Host "  clean       Remove build artifacts"
    Write-Host "  clean-all   Remove everything including node_modules"
    Write-Host "  check       Verify dependencies"
    Write-Host "  sidecar     Build sidecar only"
    Write-Host "  menu        Show interactive menu"
    Write-Host "  help        Show this help"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\start.ps1              # Show menu"
    Write-Host "  .\start.ps1 dev          # Start dev server"
    Write-Host "  .\start.ps1 setup        # Install dependencies"
    Write-Host "  .\start.ps1 release      # Build for distribution"
    Write-Host ""
    Write-Host "Requirements:"
    Write-Host "  - Node.js >= 18"
    Write-Host "  - Rust (latest stable)"
    Write-Host "  - Git"
}

# Main execution
try {
    switch ($Command.ToLower()) {
        'setup' { Install-Dependencies }
        'build' {
            Show-DepsStatus | Out-Null
            Install-Dependencies
            Build-Project
        }
        'release' {
            Show-DepsStatus | Out-Null
            Install-Dependencies
            Build-Production
        }
        'sidecar' { Build-Sidecar }
        'dev' {
            Show-DepsStatus | Out-Null
            Start-Dev
        }
        'test' { Run-Tests }
        'clean' { Clear-Build }
        'clean-all' { Clear-All }
        'check' { Show-DepsStatus | Out-Null }
        'menu' { Show-Menu }
        'help' { Show-Help }
        default {
            Write-Error "Unknown command: $Command"
            Show-Help
            exit 1
        }
    }
} catch {
    Write-Error "Script failed: $_"
    exit 1
}
