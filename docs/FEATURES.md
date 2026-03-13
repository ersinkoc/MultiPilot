# MultiPilot Features

## Core Features

### Multi-Agent Management
- **Agent Grid**: NxM auto-fit grid layout for monitoring multiple agents
- **Agent Cards**: Real-time status, output, and task progress per agent
- **Maximize Mode**: Full-screen view with tabs for output, updates, and plans
- **Quick Actions**: Kill, restart, and message agents directly from the UI

### Agent Profiles
- **Predefined Profiles**: Claude (Free/Pro/Team), OpenAI Codex, Google Gemini, Aider
- **Custom Profiles**: Create and configure custom agent profiles
- **Security Modes**: Safe, Cautious, Dangerous, and Full Auto modes
- **Settings Files**: Per-profile configuration with visual editor
- **Auto-Discovery**: Automatically detect installed agents

### Task & Plan Management
- **Task Creation**: Create tasks with step-by-step execution plans
- **Progress Tracking**: Visual progress bars and step completion status
- **Task Logs**: Detailed logging of all task activities
- **Global Task Manager**: View and manage all tasks across agents
- **Plan Viewer**: Claude Code-style execution plan visualization

### Approval Queue
- **Centralized Approvals**: Single queue for all agent permission requests
- **Diff Preview**: Preview file changes before approval
- **Bulk Actions**: Approve/reject multiple requests
- **Keyboard Shortcuts**: Quick approve/reject with Ctrl+Shift+A/R

### File Management
- **File Tree**: Collapsible directory tree with context menu
- **Syntax Highlighting**: Support for multiple programming languages
- **Tabbed Interface**: Multiple files open simultaneously
- **File Watching**: Real-time file change detection

### Git Integration
- **Git Panel**: Stage, commit, push, and pull operations
- **Branch Management**: Switch and create branches
- **Diff Viewer**: Visual diff for staged/unstaged changes
- **Commit History**: View recent commits with details
- **Status Indicators**: Ahead/behind, modified, staged counts

### Activity & Monitoring
- **Global Dashboard**: Overview of all agents, tasks, and activity
- **Activity Feed**: Real-time log of all system events
- **Status Bar**: Quick stats on agents, tasks, and pending approvals
- **Notifications**: Unread indicators for activity and approvals

## ACP (Agent Communication Protocol)

### Real-time Communication
- **WebSocket**: Bidirectional communication between agents and UI
- **Output Streaming**: Real-time agent output in the terminal
- **Status Updates**: Live agent status changes
- **Message Passing**: Send prompts and receive responses

### Supported Message Types
- Task management (start, complete, steps)
- Plan updates with progress
- Tool execution reporting
- Permission requests
- Error reporting
- Output streaming

### SDK
- **@multipilot/acp-sdk**: Official SDK for agent integration
- **TypeScript**: Full TypeScript support
- **Auto-reconnect**: Resilient connection handling
- **Event-driven**: Subscribe to specific message types

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Shift + N | Spawn new agent |
| Ctrl/Cmd + Shift + K | Kill selected agent |
| Ctrl/Cmd + Shift + D | Open global dashboard |
| Ctrl/Cmd + Shift + T | Open task manager |
| Ctrl/Cmd + Shift + A | Approve first pending request |
| Ctrl/Cmd + Shift + R | Reject first pending request |
| Ctrl/Cmd + 1 | Switch to Agents view |
| Ctrl/Cmd + 2 | Switch to Files view |
| Ctrl/Cmd + 3 | Switch to Git view |
| Ctrl/Cmd + 4 | Switch to Settings view |
| Ctrl/Cmd + W | Close active tab |
| Ctrl/Cmd + S | Save file |
| Escape | Close modals |

## Project Isolation

- **Environment Variables**: `MULTIPILOT_ISOLATED=1` and `MULTIPILOT_PROJECT_ID`
- **Per-Project Agents**: Agents confined to their projects
- **Separate Workspaces**: Each project has its own file tree and git state

## Customization

### Themes
- Dark mode (default)
- Custom accent colors per profile
- Terminal themes

### Settings Files
- **Claude**: `~/.claude/settings.json`
- **Aider**: `.aider.conf.yml`
- **Visual Editor**: Form-based and raw JSON editing
- **Import/Export**: Share configurations between systems

## Architecture

### Frontend (React + TypeScript)
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with custom dark theme
- **Components**: Modular, reusable components
- **Hooks**: Custom hooks for ACP, keyboard shortcuts

### Backend (Rust + Tauri)
- **Process Management**: Spawn and control agent processes
- **File Operations**: Secure file system access
- **IPC Bridge**: TypeScript-Rust communication

### Sidecar (Node.js)
- **File Manager**: File watching and operations
- **Git Manager**: Git operations via simple-git
- **ACP Server**: WebSocket and HTTP server for agent communication

## Security Levels

### Safe Mode
- All tool calls require approval
- Read-only operations auto-approved
- User confirmation for all changes

### Cautious Mode
- Read operations auto-approved
- Write operations require approval
- Git operations require approval

### Dangerous Mode
- Skip all permission checks
- Full agent autonomy
- Use with caution

### Full Auto Mode
- Auto-approve with git commits
- Automatic commit messages
- Designed for CI/CD workflows
