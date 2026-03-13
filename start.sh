#!/bin/bash
# MultiPilot Development Startup Script for Linux/macOS
# Usage: ./start.sh [command]
# Commands: setup, build, dev, test, clean, help

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Flags
SKIP_CHECKS=false
VERBOSE=false

# Parse arguments
COMMAND="${1:-menu}"
shift || true

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks) SKIP_CHECKS=true ;;
        --verbose) VERBOSE=true ;;
        -h|--help) COMMAND="help" ;;
        *) echo "Unknown option: $1" ;;
    esac
    shift
done

# Helper functions
header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "${CYAN}→ $1${NC}"; }

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_version() {
    local cmd="$1"
    local args="${2:---version}"
    if command_exists "$cmd"; then
        "$cmd" $args 2>&1 | head -1 || echo "unknown"
    else
        echo "not found"
    fi
}

check_deps() {
    header "Dependency Check"
    local all_ok=true

    # Node.js
    if command_exists node; then
        success "Node.js: $(get_version node)"
    else
        error "Node.js: Not found"
        all_ok=false
    fi

    # npm
    if command_exists npm; then
        success "npm: $(get_version npm)"
    else
        error "npm: Not found"
        all_ok=false
    fi

    # Rust
    if command_exists rustc; then
        success "Rust: $(get_version rustc)"
    else
        error "Rust: Not found"
        all_ok=false
    fi

    # Cargo
    if command_exists cargo; then
        success "Cargo: $(get_version cargo)"
    else
        error "Cargo: Not found"
        all_ok=false
    fi

    # Git
    if command_exists git; then
        success "Git: $(get_version git)"
    else
        error "Git: Not found"
        all_ok=false
    fi

    # Tauri CLI (optional)
    echo ""
    if command_exists cargo-tauri || cargo tauri --version >/dev/null 2>&1; then
        success "Tauri CLI: Installed"
    else
        warning "Tauri CLI: Not found (will be installed via npm)"
    fi

    $all_ok
}

install_deps() {
    header "Installing Dependencies"

    # Root dependencies
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        info "Installing root npm dependencies..."
        cd "$SCRIPT_DIR"
        npm install
        success "Root dependencies installed"
    else
        success "Root dependencies already installed"
    fi

    # Sidecar dependencies
    if [ ! -d "$SCRIPT_DIR/sidecar/node_modules" ]; then
        info "Installing sidecar npm dependencies..."
        cd "$SCRIPT_DIR/sidecar"
        npm install
        success "Sidecar dependencies installed"
    else
        success "Sidecar dependencies already installed"
    fi

    cd "$SCRIPT_DIR"
}

build_project() {
    header "Building MultiPilot (Debug)"

    # Build frontend
    info "Building frontend..."
    cd "$SCRIPT_DIR"
    npm run build
    success "Frontend built"

    cd "$SCRIPT_DIR"
}

build_production() {
    header "Building MultiPilot (Production)"

    # Build sidecar first
    build_sidecar

    # Build Tauri production
    info "Building Tauri production bundle..."
    cd "$SCRIPT_DIR"
    npm run tauri:build
    success "Production build complete"
    info "Output: src-tauri/target/release/bundle/"

    cd "$SCRIPT_DIR"
}

build_sidecar() {
    header "Building Sidecar"
    cd "$SCRIPT_DIR/sidecar"

    if [ ! -d "node_modules/esbuild" ]; then
        info "Installing sidecar dependencies first..."
        npm install
    fi

    info "Bundling sidecar with esbuild..."
    npm run build:bundle
    success "Sidecar built (bundle only, binary requires pkg)"
    cd "$SCRIPT_DIR"
}

start_dev() {
    header "Starting Development Server"

    # Check if already running
    local running_procs=$(pgrep -f "tauri|multipilot" | head -5 || true)
    if [ -n "$running_procs" ]; then
        warning "Some processes are already running:"
        echo "$running_procs"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    install_deps

    info "Starting Tauri development server..."
    echo -e "${CYAN}Press Ctrl+C to stop${NC}\n"

    cd "$SCRIPT_DIR"
    npm run tauri:dev
}

run_tests() {
    header "Running Tests"

    # Frontend tests
    info "Running frontend tests..."
    cd "$SCRIPT_DIR"
    if npm run test:run; then
        success "Frontend tests passed"
    else
        error "Frontend tests failed"
    fi

    # Rust tests
    info "Running Rust tests..."
    cd "$SCRIPT_DIR/src-tauri"
    if cargo test; then
        success "Rust tests passed"
    else
        error "Rust tests failed"
    fi

    cd "$SCRIPT_DIR"
}

clean_build() {
    header "Cleaning Build Artifacts"

    local paths=(
        "dist"
        "src-tauri/target"
        "sidecar/dist"
        ".vite"
    )

    for path in "${paths[@]}"; do
        if [ -d "$SCRIPT_DIR/$path" ]; then
            info "Removing $path..."
            rm -rf "$SCRIPT_DIR/$path"
        fi
    done

    success "Clean complete"
}

clean_all() {
    header "Cleaning All (including node_modules)"

    clean_build

    if [ -d "$SCRIPT_DIR/node_modules" ]; then
        info "Removing root node_modules..."
        rm -rf "$SCRIPT_DIR/node_modules"
    fi

    if [ -d "$SCRIPT_DIR/sidecar/node_modules" ]; then
        info "Removing sidecar node_modules..."
        rm -rf "$SCRIPT_DIR/sidecar/node_modules"
    fi

    success "Full clean complete"
}

show_menu() {
    clear
    echo -e ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}███╗   ███╗██╗   ██╗██╗  ████████╗██╗${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}████╗ ████║██║   ██║██║  ╚══██╔══╝██║${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██╔████╔██║██║   ██║██║     ██║   ██║${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██║╚██╔╝██║██║   ██║██║     ██║   ██║${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}                                            ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  Development Startup Script              ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo -e ""

    echo -e "${YELLOW} Select an option:${NC}\n"
    echo -e "  ${GREEN}[1]${NC} Setup    - Install all dependencies"
    echo -e "  ${GREEN}[2]${NC} Build    - Build frontend (debug)"
    echo -e "  ${GREEN}[3]${NC} Release  - Build production bundle"
    echo -e "  ${Green}[4]${NC} Dev      - Start development server"
    echo -e "  ${Green}[5]${NC} Test     - Run all tests"
    echo -e "  ${Green}[6]${NC} Clean    - Remove build artifacts"
    echo -e "  ${Green}[7]${NC} Clean All- Remove everything"
    echo -e "  ${Green}[8]${NC} Check    - Verify dependencies"
    echo -e "  ${Green}[0]${NC} Exit\n"

    read -p "Enter choice (0-8): " choice

    case $choice in
        1) install_deps ;;
        2) build_project ;;
        3) build_production ;;
        4) start_dev ;;
        5) run_tests ;;
        6) clean_build ;;
        7) clean_all ;;
        8) check_deps ;;
        0) exit 0 ;;
        *) error "Invalid choice" ; sleep 2 ; show_menu ;;
    esac

    echo ""
    read -p "Press Enter to return to menu"
    show_menu
}

show_help() {
    cat << EOF
MultiPilot Development Startup Script

Usage: ./start.sh [command] [options]

Commands:
  setup       Install all dependencies
  build       Build frontend (debug)
  release     Build production bundle (.deb/.rpm/.AppImage/.dmg/.app)
  dev         Start development server (default)
  test        Run all tests
  clean       Remove build artifacts
  clean-all   Remove everything including node_modules
  check       Verify dependencies
  sidecar     Build sidecar only
  menu        Show interactive menu
  help        Show this help

Options:
  --skip-checks  Skip dependency checks
  --verbose      Enable verbose output

Examples:
  ./start.sh              # Show menu
  ./start.sh dev          # Start dev server
  ./start.sh setup        # Install dependencies
  ./start.sh release      # Build for distribution

Requirements:
  - Node.js >= 18
  - Rust >= 1.70
  - Git

For Windows, use: .\\start.ps1
EOF
}

# Main execution
case "${COMMAND,,}" in
    setup)
        install_deps
        ;;
    build)
        if [ "$SKIP_CHECKS" = false ]; then
            check_deps || exit 1
        fi
        install_deps
        build_project
        ;;
    release)
        if [ "$SKIP_CHECKS" = false ]; then
            check_deps || exit 1
        fi
        install_deps
        build_production
        ;;
    dev)
        if [ "$SKIP_CHECKS" = false ]; then
            check_deps || exit 1
        fi
        start_dev
        ;;
    test)
        run_tests
        ;;
    clean)
        clean_build
        ;;
    clean-all)
        clean_all
        ;;
    check)
        check_deps
        ;;
    sidecar)
        build_sidecar
        ;;
    menu)
        show_menu
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
