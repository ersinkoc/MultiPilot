# MultiPilot

A unified desktop application for managing multiple AI coding agents (Claude Code, Codex CLI, Gemini CLI, Aider, etc.) simultaneously. Built with Tauri v2, React 19, TypeScript, and Tailwind CSS.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/tauri-v2-FFC131?logo=tauri)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react)

## Features

- 🎯 **Multi-Agent Grid**: Spawn and monitor multiple AI agents in an auto-fitting grid layout
- 📁 **Project Management**: Organize agents by projects with file tree and git integration
- ✅ **Approval Queue**: Centralized permission handling across all agents
- 📝 **File Manager**: Browse, view, and edit files with syntax highlighting
- 🌿 **Git Integration**: Stage, commit, push, and view diffs directly in the app
- 🎨 **Themes**: Multiple themes including Dark, Light, Midnight, and Dracula
- ⌨️ **Keyboard Shortcuts**: Efficient navigation with customizable shortcuts
- 🔒 **Secure**: Local-first architecture with optional approval workflows

## Screenshots

*Coming soon*

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- Git

### 🚀 One-Command Start (Recommended)

We provide cross-platform startup scripts that handle everything automatically:

**Windows (PowerShell):**
```powershell
# Show interactive menu
.\start.ps1

# Or run directly:
.\start.ps1 dev     # Start development server
.\start.ps1 setup   # Install dependencies
.\start.ps1 build   # Build project
.\start.ps1 test    # Run tests
.\start.ps1 clean   # Clean build artifacts
```

**Linux/macOS (Bash):**
```bash
# Show interactive menu
./start.sh

# Or run directly:
./start.sh dev      # Start development server
./start.sh setup    # Install dependencies
./start.sh build    # Build project
./start.sh test     # Run tests
./start.sh clean    # Clean build artifacts
```

### Available Commands

| Command | Description |
|---------|-------------|
| `menu` | Show interactive menu (default) |
| `setup` | Install all npm dependencies (root + sidecar) |
| `build` | Build frontend (debug) |
| `release` | Build production bundle (.msi/.exe/.dmg/.app/.deb/.rpm/.AppImage) |
| `dev` | Start Tauri development server |
| `test` | Run all tests (frontend + Rust) |
| `clean` | Remove build artifacts (dist, target, etc.) |
| `clean-all` | Remove everything including node_modules |
| `check` | Verify all dependencies are installed |
| `sidecar` | Build sidecar only |

### What Each Script Does

The scripts handle the entire development workflow:

1. **Dependency Check**: Verifies Node.js, npm, Rust, and Git are installed
2. **Auto-Install**: Runs `npm install` in both root and sidecar directories
3. **Build**: Compiles frontend and/or creates production bundles
4. **Clean**: Removes build artifacts with confirmation

### Manual Installation

If you prefer manual setup:

```bash
# Clone the repository
git clone https://github.com/yourusername/multipilot.git
cd multipilot

# Install frontend dependencies
npm install

# Install sidecar dependencies
cd sidecar && npm install && cd ..

# Run in development mode
npm run tauri:dev
```

### Building for Production

```bash
# Build the application
npm run tauri:build

# Output will be in src-tauri/target/release/bundle/
```

## Project Structure

```
multipilot/
├── src/                          # React frontend
│   ├── components/              # UI components
│   │   ├── Layout/             # Sidebar, MainArea, StatusBar
│   │   ├── AgentGrid/          # Agent cards and grid
│   │   ├── Workspace/          # FileManager, GitPanel, Settings
│   │   ├── Spawn/              # Spawn dialog
│   │   ├── ApprovalQueue/      # Permission approval UI
│   │   ├── Profiles/           # Profile management
│   │   └── ACP/                # ACP content components
│   ├── stores/                 # Zustand stores
│   │   ├── agentStore.ts       # Agent instances
│   │   ├── projectStore.ts     # Projects and files
│   │   ├── profileStore.ts     # Agent profiles
│   │   └── approvalStore.ts    # Approval queue
│   ├── lib/                    # Utilities and types
│   │   ├── types.ts            # TypeScript definitions
│   │   ├── ipc.ts              # Tauri IPC bridge
│   │   ├── themes.ts           # Theme definitions
│   │   └── utils.ts            # Helper functions
│   ├── hooks/                  # React hooks
│   │   └── useKeyboardShortcuts.ts
│   └── styles/                 # Global CSS
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── agent.rs            # Agent process management
│   │   ├── commands.rs         # IPC commands
│   │   └── types.rs            # Rust types
│   └── capabilities/           # Tauri permissions
├── sidecar/                     # Node.js sidecar
│   └── src/
│       ├── index.ts            # HTTP/WS server
│       ├── FileManager.ts      # File operations
│       └── GitManager.ts       # Git operations
└── docs/                        # Documentation
    ├── API.md                  # API reference
    └── TROUBLESHOOTING.md      # Common issues
```

## Default Agent Profiles

The app includes default profiles for:

| Profile | Command | Provider |
|---------|---------|----------|
| Claude Code | `claude` | Anthropic |
| OpenAI Codex | `codex` | OpenAI |
| Gemini CLI | `gemini` | Google |
| Aider | `aider` | Aider |

You can add custom profiles through Settings > Agent Profiles.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+N` | Spawn new agent |
| `Ctrl+Shift+K` | Kill selected agent |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+1` | Switch to Agents view |
| `Ctrl+2` | Switch to Files view |
| `Ctrl+3` | Switch to Git view |
| `Ctrl+4` | Switch to Settings |
| `Ctrl+S` | Save current file |
| `Escape` | Close modals |

## Architecture

### Frontend (React + TypeScript)

The frontend uses a modern React stack:
- **React 19** with TypeScript
- **Vite 6** for fast development
- **Tailwind CSS 4** for styling
- **Zustand 5** for state management
- **Lucide React** for icons

### Backend (Rust + Tauri)

Tauri provides:
- Native window management
- Secure file system access
- Process spawning for agents
- Store for persistent settings

### Sidecar (Node.js)

The Node.js sidecar provides:
- File watching with chokidar
- Git operations via simple-git
- HTTP/WebSocket API for ACP integration

## Development

### Adding a New Component

1. Create the component file in the appropriate folder
2. Export it from the folder's index file
3. Add types to `src/lib/types.ts` if needed

Example:
```tsx
// src/components/MyComponent/MyComponent.tsx
export function MyComponent() {
  return <div>My Component</div>;
}
```

### Adding IPC Commands

1. Add command in `src-tauri/src/commands.rs`
2. Register in `src-tauri/src/main.rs`
3. Add TypeScript wrapper in `src/lib/ipc.ts`

Example:
```rust
#[tauri::command]
pub async fn my_command(param: String) -> Result<String, String> {
  Ok(format!("Hello {}", param))
}
```

```typescript
export async function myCommand(param: string): Promise<string> {
  return invoke('my_command', { param });
}
```

## Configuration

User configuration is stored in:
- **Windows**: `%APPDATA%/com.multipilot.app/`
- **macOS**: `~/Library/Application Support/com.multipilot.app/`
- **Linux**: `~/.config/com.multipilot.app/`

## Roadmap

### Phase 1: Foundation ✅
- [x] Tauri v2 + React 19 setup
- [x] Dark theme implementation
- [x] Basic agent spawning
- [x] Multi-project support

### Phase 2: Workspace ✅
- [x] File manager with syntax highlighting
- [x] Git integration
- [x] File tabs
- [x] Approval queue

### Phase 3: Polish ✅
- [x] Profile editor
- [x] Settings panel
- [x] Keyboard shortcuts
- [x] Theme system

### Phase 4: Advanced (Planned)
- [ ] Remote server mode
- [ ] Mobile-responsive UI
- [ ] Plugin system
- [ ] Advanced ACP features

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues and solutions.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Tauri](https://tauri.app/) for the amazing framework
- [shadcn/ui](https://ui.shadcn.com/) for UI component patterns
- [xterm.js](https://xtermjs.org/) for terminal emulation
- All the AI CLI tools that make this project possible
