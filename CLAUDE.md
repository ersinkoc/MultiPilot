# MultiPilot

A unified desktop application for managing multiple AI coding agents simultaneously. Built with Tauri v2, React 19, and TypeScript.

## Quick Start

### Using Startup Scripts (Recommended)

Cross-platform startup scripts handle everything automatically:

```bash
# Windows
.\start.ps1              # Interactive menu
.\start.ps1 dev          # Start development
.\start.ps1 release      # Build production bundle

# Linux/macOS
./start.sh               # Interactive menu
./start.sh dev           # Start development
./start.sh release       # Build production bundle
```

### Manual Setup

```bash
# Install dependencies
npm install
cd sidecar && npm install && cd ..

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Architecture

### Frontend (React + TypeScript)
- **UI Components**: Located in `src/components/`
- **State Management**: Zustand stores in `src/stores/`
- **IPC Bridge**: Tauri commands in `src/lib/ipc.ts`
- **Styling**: Tailwind CSS 4 with custom dark theme

### Backend (Rust + Tauri)
- **Process Management**: Agent spawning and control via `src-tauri/src/agent.rs`
- **File Operations**: Direct file system access
- **Git Operations**: Integration with sidecar for git commands

### Sidecar (Node.js)
- **File Manager**: File watching and operations
- **Git Manager**: Git operations via simple-git
- **HTTP/WS Server**: Communication channel for ACP SDK

## Key Features

1. **Multi-Agent Grid**: Spawn and monitor multiple AI agents
2. **Project Management**: Organize work by projects
3. **File Manager**: Browse and edit with syntax highlighting
4. **Git Integration**: Stage, commit, push operations
5. **Approval Queue**: Centralized permission handling

## Development Patterns

### Adding a New Component
1. Create component in appropriate folder under `src/components/`
2. Use existing components as templates
3. Import from `@/` alias for project files

### Adding a New Store
1. Create store in `src/stores/`
2. Use Zustand with persist middleware for state that should survive reloads
3. Follow naming convention: `useXxxStore`

### Adding IPC Commands
1. Add command handler in `src-tauri/src/commands.rs`
2. Register in `main.rs` invoke_handler
3. Add TypeScript wrapper in `src/lib/ipc.ts`

## Configuration

Default agent profiles are defined in `src/stores/profileStore.ts`. You can add custom profiles through the UI or by modifying the store.

## Keyboard Shortcuts

- `Ctrl+Shift+N`: Spawn new agent
- `Ctrl+Shift+K`: Kill selected agent
- `Ctrl+1-4`: Switch view modes
- `Ctrl+S`: Save file
- `Escape`: Close modals

## File Structure

See README.md for complete file structure.
