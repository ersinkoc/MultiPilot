# MultiPilot — SPECIFICATION

## One Screen to Rule All AI Coding Agents

**Repo:** github.com/MultiPilot
**Domain:** MultiPilot.dev
**License:** MIT

---

## 1. Vision

MultiPilot, birden fazla projede birden fazla AI coding agent'ı (Claude Code, Codex CLI, Gemini CLI, vb.) aynı anda çalıştırıp tek ekrandan izleme, kontrol etme ve etkileşime geçme uygulamasıdır.

### Ne Değil
- Full IDE/editor değil (kod yazmak için değil, ama dosyaları görmek ve git yönetimi için yeterli)
- Agent framework değil (LangChain, CrewAI gibi)
- Config sync aracı değil (agents CLI gibi)

### Ne
- **Mission Control** — tüm AI agent'larının tek kontrol merkezi
- Birden fazla proje dizininde birden fazla agent'ı paralel çalıştır
- Her agent'ın akışını canlı izle (mesajlar, tool call'lar, diff'ler)
- Tüm agent'lardan gelen soruları/onayları tek kuyrukta topla ve cevapla
- Agent'ları profil sistemiyle yapılandır (aynı CLI, farklı API provider)
- **Workspace** — agent'ların çalıştığı projeleri tam yönet:
  - File manager: Dosya ağacı, aç/oluştur/sil/taşı, dosya içeriğini görüntüle
  - Git paneli: Branch, commit history, stage/unstage, diff, push/pull
  - Proje yönetimi: Birden fazla proje dizini, hızlı geçiş, son projeler

### Kullanım Senaryosu
```
Ersin masaüstünde MultiPilot'u açıyor.

Sol sidebar'da 2 proje görünüyor:
  📁 my-saas (3 branch: main, feat/payments, fix/auth)
  📁 mobile-app (2 branch: main, feat/login)

Proje 1: ~/projects/my-saas
  → Claude Code (Anthropic, Opus) — "Add payment integration"
  → Codex CLI — "Write tests for auth module"

Proje 2: ~/projects/mobile-app
  → Claude Code (Kimi backend) — "Fix the login screen"
  → Gemini CLI — "Refactor the API layer"

Dashboard'da 4 agent'ı grid'de görüyor.
Claude (Kimi) bir soru soruyor: "Edit auth.ts? [Allow/Reject]"
Approval queue'da butona tıklıyor → agent devam ediyor.

Agent dosya değiştirdi → File Manager'da değişen dosyalar sarı vurgulanıyor.
Git panelinde 3 modified file görünüyor → review edip commit atıyor.
my-saas projesinde feat/payments branch'ine push yapıyor.

Bu sırada Codex testleri yazmaya devam ediyor.
Ersin telefondayken bile web üzerinden approval verebiliyor.
```

---

## 2. Core Concepts

### Agent = CLI Binary + Profile
```
Agent Instance = {
  profile: AgentProfile,     // hangi CLI, hangi ayarlar
  project: ProjectConfig,    // hangi dizinde çalışıyor
  sessions: ACP Session[],   // aktif konuşmalar
  status: running | waiting | idle | exited
}
```

### Profile = CLI + Config + Provider
Aynı CLI (örn. `claude`) farklı settings dosyaları ve env var'larla farklı LLM backend'lerine bağlanabiliyor:
```
claude --settings ~/.claude/kimi.json          → Kimi/Moonshot API
claude --settings ~/.claude/minimax.json       → MiniMax API
claude --settings ~/.claude/alibaba-qwen.json  → Alibaba Qwen API
claude --dangerously-skip-permissions          → Default Anthropic API
```
Her biri ayrı bir "profil" — MultiPilot bunları yönetir.

### ACP (Agent Client Protocol)
Zed + JetBrains'in geliştirdiği standart JSON-RPC 2.0 protokolü. Agent'lar subprocess olarak spawn edilir, stdin/stdout üzerinden structured mesajlaşma yapılır. Regex/ANSI parsing yok.

30+ agent ACP destekliyor: Claude Code, Codex CLI, Gemini CLI, GitHub Copilot, Cursor, Cline, Augment Code, Qwen Code, Kiro CLI, OpenCode, Goose, OpenHands...

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     MultiPilot Desktop App                       │
│                     (Tauri v2 + React 19)                        │
│                                                                  │
│  ┌────────────────────────────────────────┐  ┌───────────────┐  │
│  │          Agent Grid (auto-fit NxM)     │  │ Approval Queue│  │
│  │                                        │  │               │  │
│  │  ┌──────────┐  ┌──────────┐           │  │ All pending   │  │
│  │  │ 🟣 Claude │  │ 🌙 Claude │  ...     │  │ permissions   │  │
│  │  │ Anthropic │  │ Kimi     │           │  │ from ALL      │  │
│  │  │ my-saas   │  │ mobile   │           │  │ agents,       │  │
│  │  │           │  │          │           │  │ one click     │  │
│  │  │ messages  │  │ messages │           │  │ to respond    │  │
│  │  │ diffs     │  │ diffs    │           │  │               │  │
│  │  │ progress  │  │ progress │           │  │               │  │
│  │  └──────────┘  └──────────┘           │  └───────────────┘  │
│  │                                        │                     │
│  │  ┌──────────┐  ┌──────────┐           │                     │
│  │  │ 🟢 Codex  │  │ 💎 Gemini│           │                     │
│  │  │ my-saas   │  │ mobile   │           │                     │
│  │  │           │  │          │           │                     │
│  │  └──────────┘  └──────────┘           │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ File Changes: app.ts (+15) Claude/Kimi 3s │ ...          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Status: 4 agents │ 1 waiting │ 2 projects │ 47 files     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

                              │
                              │ (Tauri IPC / internal)
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                    Rust + Node.js Backend                         │
│                    (Tauri sidecar)                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AgentManager                                               │ │
│  │                                                             │ │
│  │  ┌─────────────────┐ ┌─────────────────┐                   │ │
│  │  │ ManagedAgent 1  │ │ ManagedAgent 2  │ ...               │ │
│  │  │ Claude/Anthropic│ │ Claude/Kimi     │                   │ │
│  │  │ ~/my-saas       │ │ ~/mobile-app    │                   │ │
│  │  │                 │ │                 │                   │ │
│  │  │ child_process   │ │ child_process   │                   │ │
│  │  │ ↕ stdio         │ │ ↕ stdio         │                   │ │
│  │  │ ClientSide      │ │ ClientSide      │                   │ │
│  │  │ Connection      │ │ Connection      │                   │ │
│  │  │ (@acp/sdk)      │ │ (@acp/sdk)      │                   │ │
│  │  └────────┬────────┘ └────────┬────────┘                   │ │
│  │           │                   │                             │ │
│  │     ┌─────┴─────┐      ┌─────┴─────┐                      │ │
│  │     │ claude    │      │ claude    │                       │ │
│  │     │ -code-acp │      │ -code-acp │                       │ │
│  │     └───────────┘      └───────────┘                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ ProfileManager  │  │ FileWatcher     │                       │
│  │ CRUD profiles   │  │ chokidar per    │                       │
│  │ auto-discover   │  │ project dir     │                       │
│  │ settings files  │  │                 │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ RemoteServer    │  ← Phase 5: Mobile/remote access           │
│  │ (optional)      │    HTTPS + WS, auth token                  │
│  │ port 3847       │                                            │
│  └─────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Profile

```typescript
interface AgentProfile {
  id: string;                    // "claude-anthropic", "claude-kimi", "codex-default"
  name: string;                  // "Claude (Kimi)"
  icon: string;                  // "🌙"
  color: string;                 // "#6366F1"
  description?: string;          // "Kimi API üzerinden Claude Code"
  provider?: string;             // "Kimi / Moonshot"

  // ACP spawn command
  acpCommand: string;            // "npx"
  acpArgs: string[];             // ["@zed-industries/claude-code-acp@latest"]

  // Extra CLI flags (settings, skip-permissions, model override, vb.)
  extraArgs: string[];           // ["--dangerously-skip-permissions", "--settings", "~/.claude/kimi.json"]

  // Environment variables
  env: Record<string, string>;   // { ANTHROPIC_BASE_URL: "...", ANTHROPIC_AUTH_TOKEN: "..." }

  // Defaults
  defaultCwd?: string;           // Varsayılan çalışma dizini
}
```

### Preset Profiles (built-in, kullanıcı düzenleyebilir)

```json
[
  {
    "id": "claude-anthropic",
    "name": "Claude Code",
    "icon": "🟣",
    "color": "#D97706",
    "provider": "Anthropic",
    "acpCommand": "npx",
    "acpArgs": ["@zed-industries/claude-code-acp@latest"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "codex",
    "name": "Codex CLI",
    "icon": "🟢",
    "color": "#10B981",
    "provider": "OpenAI",
    "acpCommand": "npx",
    "acpArgs": ["@zed-industries/codex-acp@latest"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "gemini",
    "name": "Gemini CLI",
    "icon": "💎",
    "color": "#3B82F6",
    "provider": "Google",
    "acpCommand": "npx",
    "acpArgs": ["@google/gemini-cli@latest", "--experimental-acp"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "copilot",
    "name": "GitHub Copilot",
    "icon": "🐙",
    "color": "#8B5CF6",
    "provider": "GitHub",
    "acpCommand": "npx",
    "acpArgs": ["@github/copilot-language-server@latest", "--acp"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "qwen-code",
    "name": "Qwen Code",
    "icon": "☁️",
    "color": "#F97316",
    "provider": "Alibaba",
    "acpCommand": "npx",
    "acpArgs": ["@qwen-code/qwen-code@latest", "--acp"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "augment",
    "name": "Augment Code",
    "icon": "⚡",
    "color": "#EF4444",
    "provider": "Augment",
    "acpCommand": "npx",
    "acpArgs": ["@augmentcode/auggie@latest", "--acp"],
    "extraArgs": [],
    "env": {}
  },
  {
    "id": "opencode",
    "name": "OpenCode",
    "icon": "📦",
    "color": "#14B8A6",
    "provider": "OpenCode",
    "acpCommand": "npx",
    "acpArgs": ["opencode-ai@latest", "acp"],
    "extraArgs": [],
    "env": {}
  }
]
```

### Custom Profile Example (Ersin'in kimi.json setup'ı)

```json
{
  "id": "claude-kimi",
  "name": "Claude (Kimi)",
  "icon": "🌙",
  "color": "#6366F1",
  "provider": "Kimi / Moonshot",
  "acpCommand": "npx",
  "acpArgs": ["@zed-industries/claude-code-acp@latest"],
  "extraArgs": ["--dangerously-skip-permissions", "--settings", "~/.claude/kimi.json"],
  "env": {}
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;           // "my-saas", "mobile-app"
  path: string;           // "~/projects/my-saas"
  agents: AgentInstance[]; // Bu projede çalışan agent'lar
}
```

### Agent Instance

```typescript
interface AgentInstance {
  id: string;                    // runtime UUID
  profileId: string;             // hangi profil ile başlatıldı
  projectId: string;             // hangi projede çalışıyor
  status: AgentStatus;           // 'running' | 'waiting_input' | 'idle' | 'exited'
  sessionId: string | null;      // ACP session ID
  spawnedAt: number;
  updates: SessionUpdate[];      // mesajlar, tool calls, vb.
  pendingPermission: PermissionRequest | null;
}

type AgentStatus = 'starting' | 'running' | 'waiting_input' | 'idle' | 'exited' | 'error';
```

### Approval Queue Item

```typescript
interface ApprovalQueueItem {
  id: string;                    // queue item ID
  agentId: string;               // hangi agent soruyor
  agentName: string;             // "Claude (Kimi)"
  agentIcon: string;             // "🌙"
  projectName: string;           // "mobile-app"
  permission: {
    toolCallTitle: string;       // "Edit src/auth.ts"
    toolCallKind: string;        // "edit", "execute", "delete"
    options: PermissionOption[]; // [Allow once, Allow always, Reject]
    content?: ToolCallContent[]; // diff preview, terminal output
  };
  timestamp: number;
}
```

```

### Workspace: File System

```typescript
interface FileNode {
  name: string;
  path: string;                  // absolute path
  type: 'file' | 'directory';
  children?: FileNode[];         // only for directories
  size?: number;
  modifiedAt?: number;
  // Agent change tracking
  changedBy?: string;            // agentId that last modified this file
  changeType?: 'added' | 'modified' | 'deleted';
}

interface FileViewerState {
  openFiles: OpenFile[];         // açık dosya tab'ları
  activeFileIndex: number;
}

interface OpenFile {
  path: string;
  content: string;
  language: string;              // syntax highlight için
  dirty: boolean;                // unsaved changes
  readonly: boolean;             // sadece görüntüleme (default: true, agent dosyalarını izliyoruz)
}
```

### Workspace: Git

```typescript
interface GitState {
  projectPath: string;
  currentBranch: string;
  branches: GitBranch[];
  status: GitFileStatus[];       // modified, added, deleted files
  recentCommits: GitCommit[];    // son N commit (log)
  remotes: GitRemote[];
  hasUnpushedCommits: boolean;
  hasUncommittedChanges: boolean;
}

interface GitBranch {
  name: string;                  // "main", "feat/payments"
  current: boolean;
  remote?: string;               // "origin/main"
  ahead: number;                 // commits ahead of remote
  behind: number;                // commits behind remote
}

interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  diff?: string;                 // unified diff content
  changedBy?: string;            // hangi agent değiştirdi (file watcher'dan)
}

interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: number;
  files: number;                 // changed file count
}

interface GitRemote {
  name: string;                  // "origin"
  url: string;
}
```

### Workspace: Project (Enhanced)

```typescript
interface Project {
  id: string;
  name: string;                  // "my-saas"
  path: string;                  // "~/projects/my-saas"
  agents: AgentInstance[];       // Bu projede çalışan agent'lar
  git: GitState | null;          // Git bilgisi (git repo ise)
  fileTree: FileNode | null;     // Dosya ağacı (lazy-loaded)
  isGitRepo: boolean;
}
```

---

## 4b. Workspace Backend

### GitManager (per project)

```typescript
import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

class GitManager {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  /** Git repo mu kontrol et */
  async isRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch { return false; }
  }

  /** Tam git durumu */
  async getStatus(): Promise<GitState> {
    const [status, branches, log, remotes] = await Promise.all([
      this.git.status(),
      this.git.branch(),
      this.git.log({ maxCount: 30 }),
      this.git.getRemotes(true),
    ]);

    return {
      projectPath: this.projectPath,
      currentBranch: branches.current,
      branches: Object.values(branches.branches).map(b => ({
        name: b.name,
        current: b.current,
        remote: b.linkedWorkTree,
        ahead: 0, behind: 0, // TODO: tracking info
      })),
      status: this.mapStatus(status),
      recentCommits: log.all.map(c => ({
        hash: c.hash,
        shortHash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: new Date(c.date).getTime(),
        files: 0,
      })),
      remotes: remotes.map(r => ({ name: r.name, url: r.refs.fetch || r.refs.push })),
      hasUnpushedCommits: false, // TODO
      hasUncommittedChanges: status.files.length > 0,
    };
  }

  /** Stage files */
  async stage(paths: string[]): Promise<void> {
    await this.git.add(paths);
  }

  /** Unstage files */
  async unstage(paths: string[]): Promise<void> {
    await this.git.reset(['HEAD', ...paths]);
  }

  /** Commit */
  async commit(message: string): Promise<string> {
    const result = await this.git.commit(message);
    return result.commit;
  }

  /** Push */
  async push(remote = 'origin', branch?: string): Promise<void> {
    await this.git.push(remote, branch);
  }

  /** Pull */
  async pull(remote = 'origin', branch?: string): Promise<void> {
    await this.git.pull(remote, branch);
  }

  /** Branch switch */
  async checkout(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  /** New branch */
  async createBranch(name: string, checkout = true): Promise<void> {
    if (checkout) {
      await this.git.checkoutLocalBranch(name);
    } else {
      await this.git.branch([name]);
    }
  }

  /** File diff (working tree vs HEAD) */
  async diff(filePath?: string): Promise<string> {
    if (filePath) {
      return await this.git.diff([filePath]);
    }
    return await this.git.diff();
  }

  /** File diff (staged) */
  async diffStaged(filePath?: string): Promise<string> {
    if (filePath) {
      return await this.git.diff(['--cached', filePath]);
    }
    return await this.git.diff(['--cached']);
  }

  private mapStatus(status: StatusResult): GitFileStatus[] {
    return status.files.map(f => ({
      path: f.path,
      status: this.mapFileStatus(f.working_dir, f.index),
      staged: f.index !== ' ' && f.index !== '?',
    }));
  }

  private mapFileStatus(working: string, index: string): GitFileStatus['status'] {
    if (index === '?' || working === '?') return 'untracked';
    if (index === 'A' || working === 'A') return 'added';
    if (index === 'D' || working === 'D') return 'deleted';
    if (index === 'R' || working === 'R') return 'renamed';
    return 'modified';
  }
}
```

### FileManager (per project)

```typescript
class FileManager {
  private projectPath: string;
  private watcher: FSWatcher | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /** Dosya ağacını oku (lazy, belirli derinliğe kadar) */
  async getTree(dirPath?: string, depth = 3): Promise<FileNode> {
    const target = dirPath || this.projectPath;
    return this.readDir(target, depth);
  }

  private async readDir(dirPath: string, depth: number): Promise<FileNode> {
    const name = path.basename(dirPath);
    const node: FileNode = { name, path: dirPath, type: 'directory', children: [] };

    if (depth <= 0) return node;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Filter: .git, node_modules, .next, dist, vb.
    const filtered = entries.filter(e => 
      !IGNORED_DIRS.includes(e.name) && !e.name.startsWith('.')
    );

    // Sort: directories first, then files, alphabetical
    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of filtered) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        node.children!.push(await this.readDir(fullPath, depth - 1));
      } else {
        const stat = await fs.stat(fullPath);
        node.children!.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          size: stat.size,
          modifiedAt: stat.mtimeMs,
        });
      }
    }

    return node;
  }

  /** Dosya içeriğini oku */
  async readFile(filePath: string): Promise<{ content: string; language: string }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    return { content, language };
  }

  /** Dosya oluştur */
  async createFile(filePath: string, content = ''): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /** Dosya sil */
  async deleteFile(filePath: string): Promise<void> {
    await fs.remove(filePath);
  }

  /** Dosya/klasör taşı */
  async move(from: string, to: string): Promise<void> {
    await fs.move(from, to);
  }

  /** Dosya/klasör kopyala */
  async copy(from: string, to: string): Promise<void> {
    await fs.copy(from, to);
  }

  /** Klasör oluştur */
  async createDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /** File watcher başlat (agent değişikliklerini izle) */
  startWatching(onChange: (event: FileChangeEvent) => void): void {
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: /(^|[\/\\])(\.|node_modules|\.git|dist|\.next)/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    });

    this.watcher.on('add', (p) => onChange({ path: p, type: 'added' }));
    this.watcher.on('change', (p) => onChange({ path: p, type: 'modified' }));
    this.watcher.on('unlink', (p) => onChange({ path: p, type: 'deleted' }));
  }

  stopWatching(): void {
    this.watcher?.close();
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1);
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
      py: 'python', rs: 'rust', go: 'go', rb: 'ruby',
      java: 'java', kt: 'kotlin', swift: 'swift',
      css: 'css', scss: 'scss', html: 'html',
      json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
      md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell',
      dockerfile: 'dockerfile',
    };
    return map[ext] || 'plaintext';
  }
}

const IGNORED_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build', '.turbo',
  '__pycache__', '.venv', 'venv', 'target', '.cargo',
  '.idea', '.vscode', '.zed',
];
```

---

## 5. ACP Integration Layer

### Agent Spawn & Communication

```typescript
import { ClientSideConnection, ndJsonStream } from '@agentclientprotocol/sdk';
import { spawn, ChildProcess } from 'child_process';

class ManagedAgent extends EventEmitter {
  readonly id: string;
  private process: ChildProcess | null = null;
  private connection: ClientSideConnection | null = null;
  private terminals: Map<string, TerminalProcess> = new Map();

  constructor(
    private profile: AgentProfile,
    private projectPath: string,
  ) {
    super();
    this.id = crypto.randomUUID();
  }

  async start(): Promise<void> {
    // 1. ACP agent subprocess'i spawn et
    //    Profile'daki acpCommand + acpArgs + extraArgs birleştirilir
    const args = [...this.profile.acpArgs, ...this.resolveArgs(this.profile.extraArgs)];
    
    this.process = spawn(this.profile.acpCommand, args, {
      cwd: this.projectPath,
      env: this.buildEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // stderr'i logla (debug için)
    this.process.stderr?.on('data', (data) => {
      this.emit('log', data.toString());
    });

    // 2. stdin/stdout → ACP JSON-RPC stream
    const stream = ndJsonStream(this.process.stdin!, this.process.stdout!);

    // 3. ClientSideConnection — biz "client" rolündeyiz
    this.connection = new ClientSideConnection(
      (agent) => this.createClientHandler(agent),
      stream,
    );

    // 4. ACP Initialize (capability negotiation)
    await this.connection.initialize({
      protocolVersion: 1,
      clientCapabilities: {
        terminal: true,
        fs: { readTextFile: true, writeTextFile: true },
      },
    });

    this.emit('status', 'running');
  }

  /** ACP Client handler — Agent'ın çağırdığı method'lar */
  private createClientHandler(agent: any) {
    return {
      // ★ PERMISSION REQUEST → UI'a ilet, kullanıcıdan cevap bekle
      'session/request_permission': async (params: any) => {
        this.emit('status', 'waiting_input');

        const outcome = await new Promise<any>((resolve) => {
          const requestId = crypto.randomUUID();
          
          this.emit('permission:request', {
            requestId,
            agentId: this.id,
            sessionId: params.sessionId,
            toolCall: params.toolCall,
            options: params.options,
          });

          this.once(`permission:response:${requestId}`, resolve);
        });

        this.emit('status', 'running');
        return { outcome };
      },

      // SESSION UPDATE → UI'a real-time stream
      'session/update': (params: any) => {
        this.emit('session:update', params);
      },

      // FILE SYSTEM — lokal dosya işlemleri
      'fs/read_text_file': async (params: any) => {
        const content = await fs.readFile(params.path, 'utf-8');
        return { content };
      },

      'fs/write_text_file': async (params: any) => {
        await fs.writeFile(params.path, params.content, 'utf-8');
        this.emit('file:changed', { path: params.path, type: 'modify' });
      },

      // TERMINAL — komut çalıştırma
      'terminal/create': async (params: any) => {
        const termId = crypto.randomUUID();
        // Terminal process spawn & manage...
        return { terminalId: termId };
      },

      'terminal/output': async (params: any) => {
        const term = this.terminals.get(params.terminalId);
        return { output: term?.getOutput() || '', truncated: false, exitStatus: term?.exitStatus };
      },

      'terminal/wait_for_exit': async (params: any) => {
        const term = this.terminals.get(params.terminalId);
        return await term?.waitForExit();
      },

      'terminal/kill': async (params: any) => {
        this.terminals.get(params.terminalId)?.kill();
      },

      'terminal/release': async (params: any) => {
        this.terminals.get(params.terminalId)?.kill();
        this.terminals.delete(params.terminalId);
      },
    };
  }

  /** Yeni session oluştur */
  async createSession(): Promise<string> {
    const result = await this.connection!.newSession({
      workingDirectory: this.projectPath,
    });
    return result.sessionId;
  }

  /** Prompt gönder */
  async prompt(sessionId: string, message: string): Promise<void> {
    await this.connection!.prompt({
      sessionId,
      messages: [{ role: 'user', content: [{ type: 'text', text: message }] }],
    });
  }

  /** Permission'a cevap ver */
  respondToPermission(requestId: string, outcome: any): void {
    this.emit(`permission:response:${requestId}`, outcome);
  }

  /** Kapatma */
  async shutdown(): Promise<void> {
    for (const [, term] of this.terminals) term.kill();
    this.process?.kill();
  }

  /** Path'leri cross-platform resolve et */
  private resolveArgs(args: string[]): string[] {
    return args.map(arg => {
      return arg
        .replace(/^~/, os.homedir())
        .replace(/%([^%]+)%/g, (_, name) => process.env[name] || _)
        .replace(/\$(\w+)/g, (_, name) => process.env[name] || _);
    });
  }

  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const [key, value] of Object.entries(this.profile.env)) {
      env[key] = this.resolveArgs([value])[0];
    }
    // Force color output
    env.FORCE_COLOR = '1';
    env.TERM = 'xterm-256color';
    return env;
  }
}
```

### AgentManager

```typescript
class AgentManager {
  private agents: Map<string, ManagedAgent> = new Map();
  private profiles: ProfileManager;
  private fileWatchers: Map<string, FSWatcher> = new Map();

  /** Yeni agent spawn et */
  async spawn(config: {
    profileId: string;
    projectPath: string;
    initialPrompt?: string;
  }): Promise<string> {
    const profile = this.profiles.get(config.profileId);
    const agent = new ManagedAgent(profile, config.projectPath);

    // Event relay → UI'a
    agent.on('session:update', (data) => this.emit('agent:update', { agentId: agent.id, ...data }));
    agent.on('permission:request', (data) => this.emit('permission:request', data));
    agent.on('file:changed', (data) => this.emit('file:changed', { agentId: agent.id, ...data }));
    agent.on('status', (status) => this.emit('agent:status', { agentId: agent.id, status }));

    // Start
    await agent.start();
    const sessionId = await agent.createSession();
    this.agents.set(agent.id, agent);

    // File watcher for this project
    this.ensureFileWatcher(config.projectPath, agent.id);

    // Initial prompt varsa gönder
    if (config.initialPrompt) {
      await agent.prompt(sessionId, config.initialPrompt);
    }

    return agent.id;
  }

  /** Permission'a cevap ver */
  respondToPermission(agentId: string, requestId: string, outcome: any): void {
    this.agents.get(agentId)?.respondToPermission(requestId, outcome);
  }

  /** Agent'a prompt gönder */
  async prompt(agentId: string, message: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    // TODO: sessionId yönetimi
    await agent.prompt(agent.activeSessionId, message);
  }

  /** Agent'ı kapat */
  async kill(agentId: string): Promise<void> {
    await this.agents.get(agentId)?.shutdown();
    this.agents.delete(agentId);
  }

  /** Tüm aktif agent'ları listele */
  list(): AgentInfo[] {
    return [...this.agents.entries()].map(([id, agent]) => ({
      id,
      profileId: agent.profileId,
      projectPath: agent.projectPath,
      status: agent.status,
    }));
  }
}
```

### ProfileManager

```typescript
class ProfileManager {
  private profiles: Map<string, AgentProfile> = new Map();
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.multipilot', 'config.json');
  }

  /** İlk kurulumda ~/.claude/*.json dosyalarını otomatik keşfet */
  async autoDiscover(): Promise<AgentProfile[]> {
    const suggestions: AgentProfile[] = [];
    const claudeDir = path.join(os.homedir(), '.claude');

    if (await fs.pathExists(claudeDir)) {
      const files = await fs.readdir(claudeDir);
      const jsonFiles = files.filter(f => 
        f.endsWith('.json') && 
        !['settings.json', 'projects.json', 'statsig.json'].includes(f)
      );

      for (const file of jsonFiles) {
        const name = path.basename(file, '.json');
        const filePath = path.join(claudeDir, file);
        
        try {
          const content = await fs.readJson(filePath);
          suggestions.push({
            id: `claude-${name}`,
            name: `Claude (${this.capitalize(name)})`,
            icon: this.guessIcon(name),
            color: this.guessColor(name),
            provider: this.guessProvider(name, content),
            acpCommand: 'npx',
            acpArgs: ['@zed-industries/claude-code-acp@latest'],
            extraArgs: ['--dangerously-skip-permissions', '--settings', filePath],
            env: {},
          });
        } catch { /* skip */ }
      }
    }

    return suggestions;
  }

  private guessProvider(name: string, content: any): string {
    const n = name.toLowerCase();
    if (n.includes('kimi') || n.includes('moonshot')) return 'Kimi / Moonshot';
    if (n.includes('minimax')) return 'MiniMax';
    if (n.includes('alibaba') || n.includes('qwen') || n.includes('dashscope')) return 'Alibaba / Qwen';
    if (n.includes('deepseek')) return 'DeepSeek';
    if (n.includes('glm') || n.includes('zai')) return 'Z.AI / GLM';
    if (n.includes('openrouter')) return 'OpenRouter';
    return 'Custom';
  }

  private guessIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('kimi')) return '🌙';
    if (n.includes('minimax')) return '🔶';
    if (n.includes('alibaba') || n.includes('qwen')) return '☁️';
    if (n.includes('deepseek')) return '🐋';
    if (n.includes('glm') || n.includes('zai')) return '🔮';
    return '🤖';
  }

  // CRUD operations
  getAll(): AgentProfile[] { ... }
  get(id: string): AgentProfile { ... }
  create(profile: AgentProfile): void { ... }
  update(id: string, profile: Partial<AgentProfile>): void { ... }
  delete(id: string): void { ... }
  save(): Promise<void> { ... }
  load(): Promise<void> { ... }
}
```

---

## 6. Frontend (React 19 + TypeScript)

### App Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MultiPilot                                                               │
│ [+ Spawn]  [Profiles ⚙]  [View ▼]              [Queue 🔔 3]  [─ □ ✕]   │
├────────────┬──────────────────────────────────────────────┬──────────────┤
│ SIDEBAR    │  MAIN AREA (tab-based views)                 │ RIGHT PANEL  │
│            │                                              │ (toggle)     │
│ ▼ PROJECTS │  [🤖 Agents] [📁 Files] [🔀 Git]             │              │
│            │                                              │ APPROVAL     │
│ ▼ my-saas  │  ── Agents View (default) ──                 │ QUEUE        │
│   📁 Files  │  ┌──────────────┐ ┌──────────────┐          │              │
│   🔀 main   │  │🟣 Claude/Ant.│ │🌙 Claude/Kimi│          │ 🌙 Claude    │
│   🟣 Claude │  │ my-saas      │ │ mobile-app   │          │ Edit auth.ts │
│   🟢 Codex  │  │ ● Running    │ │ ⏳ Waiting    │          │ [✓] [✗]     │
│             │  │ [messages..] │ │ [messages..] │          │              │
│ ▼ mobile    │  │ > prompt...  │ │ > prompt...  │          │ 💎 Gemini    │
│   📁 Files  │  └──────────────┘ └──────────────┘          │ Run npm test │
│   🔀 feat/* │  ┌──────────────┐ ┌──────────────┐          │ [✓] [✗]     │
│   🌙 Claude │  │🟢 Codex      │ │💎 Gemini     │          │              │
│   💎 Gemini │  │ my-saas      │ │ mobile-app   │          │              │
│             │  │ ● Running    │ │ ● Running    │          │              │
│             │  └──────────────┘ └──────────────┘          │              │
│             │                                              │              │
│             │  ── Files View (click 📁) ──                 │              │
│             │  ┌────────────┬─────────────────────┐       │              │
│             │  │ File Tree  │ File Viewer          │       │              │
│             │  │ ▼ src/     │ ┌─ auth.ts ─────────┐│       │              │
│             │  │   app.ts   │ │ import { jwt }..  ││       │              │
│             │  │   auth.ts ←│ │ export function.. ││       │              │
│             │  │   index.ts │ │ ...               ││       │              │
│             │  │ ▼ tests/   │ └───────────────────┘│       │              │
│             │  └────────────┴─────────────────────┘       │              │
│             │                                              │              │
│             │  ── Git View (click 🔀) ──                   │              │
│             │  ┌───────────────────────────────────┐       │              │
│             │  │ Branch: feat/payments  [↑2 ↓0]   │       │              │
│             │  │ ┌──────────┬────────────────────┐ │       │              │
│             │  │ │ Changes  │ Diff Viewer        │ │       │              │
│             │  │ │ ☑ auth.ts│ - old line         │ │       │              │
│             │  │ │ ☐ app.ts │ + new line         │ │       │              │
│             │  │ │          │                    │ │       │              │
│             │  │ └──────────┴────────────────────┘ │       │              │
│             │  │ Message: [fix auth validation  ]  │       │              │
│             │  │ [Stage All] [Commit] [Push]       │       │              │
│             │  │                                   │       │              │
│             │  │ Recent Commits                    │       │              │
│             │  │ a3f2c1d fix: login redirect  2m   │       │              │
│             │  │ b8e4a2f feat: add JWT auth  15m   │       │              │
│             │  └───────────────────────────────────┘       │              │
│             │                                              │              │
├─────────────┴──────────────────────────────────────┴──────────────────────┤
│ 📁 auth.ts (+15) Claude/Kimi 3s │ app.ts (~8) Codex 10s │ ...           │
├───────────────────────────────────────────────────────────────────────────┤
│ 4 agents │ 1 waiting │ 2 projects │ feat/payments │ session: 12m        │
└───────────────────────────────────────────────────────────────────────────┘
```

### Core Components

```
src/
├── App.tsx                        # Root layout
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx            # Project tree + agent list + file/git shortcuts
│   │   ├── MainArea.tsx           # Tab container (Agents / Files / Git views)
│   │   ├── RightPanel.tsx         # Approval queue (collapsible)
│   │   ├── StatusBar.tsx          # Bottom: agents, project, branch, session time
│   │   ├── TitleBar.tsx           # Custom window titlebar (Tauri)
│   │   └── FileChangeTicker.tsx   # Bottom bar: real-time file changes
│   │
│   ├── AgentGrid/
│   │   ├── AgentGrid.tsx          # Auto-fit NxM grid
│   │   ├── AgentCard.tsx          # Single agent panel
│   │   ├── AgentCardHeader.tsx    # Icon, name, status, project, controls
│   │   ├── AgentContent.tsx       # Scrollable messages + tool calls
│   │   ├── PromptInput.tsx        # Bottom input field per agent
│   │   └── MaximizedAgent.tsx     # Full-screen single agent view
│   │
│   ├── ACP/
│   │   ├── MessageRenderer.tsx    # Markdown message bubbles
│   │   ├── ToolCallCard.tsx       # Tool call progress + content
│   │   ├── DiffViewer.tsx         # Side-by-side diff
│   │   ├── TerminalViewer.tsx     # xterm.js for terminal/create output
│   │   └── PlanViewer.tsx         # Agent plan steps
│   │
│   ├── ApprovalQueue/
│   │   ├── ApprovalQueue.tsx      # Right panel with all pending approvals
│   │   ├── ApprovalCard.tsx       # Single approval item
│   │   └── ApprovalBadge.tsx      # Count badge in header
│   │
│   ├── Workspace/
│   │   ├── FileManager/
│   │   │   ├── FileTree.tsx       # Collapsible directory tree
│   │   │   ├── FileTreeNode.tsx   # Single file/folder node
│   │   │   ├── FileViewer.tsx     # Read-only code viewer (syntax highlighted)
│   │   │   ├── FileViewerTabs.tsx # Open file tabs
│   │   │   └── FileContextMenu.tsx# Right-click: open, copy path, delete, rename
│   │   │
│   │   ├── Git/
│   │   │   ├── GitPanel.tsx       # Main git view
│   │   │   ├── BranchSelector.tsx # Current branch + switch dropdown
│   │   │   ├── ChangedFileList.tsx# Modified/added/deleted files with checkboxes
│   │   │   ├── StagingArea.tsx    # Stage/unstage controls
│   │   │   ├── CommitBox.tsx      # Commit message input + commit button
│   │   │   ├── PushPullBar.tsx    # Push/pull buttons with ahead/behind count
│   │   │   ├── CommitHistory.tsx  # Recent commits list
│   │   │   ├── GitDiffViewer.tsx  # Inline diff for selected changed file
│   │   │   └── BranchCreateDialog.tsx # New branch dialog
│   │   │
│   │   └── ProjectSwitcher.tsx    # Quick switch between projects
│   │
│   ├── Spawn/
│   │   ├── SpawnDialog.tsx        # Modal: select profile + project + prompt
│   │   └── ProfileSelector.tsx    # Profile dropdown with icons
│   │
│   ├── Profiles/
│   │   ├── ProfileManager.tsx     # Full profile CRUD page
│   │   ├── ProfileEditor.tsx      # Single profile edit form
│   │   └── ProfileDiscovery.tsx   # Auto-discovered settings preview
│   │
│   └── FileChanges/
│       └── FileChangeFeed.tsx     # Bottom bar with real-time file changes
│
├── stores/
│   ├── agentStore.ts              # Zustand: agents, updates, status
│   ├── approvalStore.ts           # Zustand: pending approvals queue
│   ├── profileStore.ts            # Zustand: profiles CRUD
│   ├── projectStore.ts            # Zustand: projects, active project
│   ├── fileStore.ts               # Zustand: file tree, open files, viewer
│   ├── gitStore.ts                # Zustand: git status, branches, commits
│   └── uiStore.ts                 # Zustand: layout, theme, active view, sidebar
│
├── lib/
│   ├── ipc.ts                     # Tauri IPC bridge (invoke commands)
│   ├── types.ts                   # Shared TypeScript types
│   └── languages.ts               # File extension → language mapping
│
└── styles/
    └── globals.css                # Tailwind base + custom styles
```

### Agent Card Content (ACP session/update rendering)

```tsx
function AgentContent({ agent }: { agent: AgentInstance }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {agent.updates.map((update, i) => {
        switch (update.sessionUpdate) {
          case 'message_delta':
            return <MessageBubble key={i} role={update.role} text={update.content?.text} />;
          
          case 'tool_call':
            return (
              <ToolCallCard key={i}
                title={update.title}
                kind={update.kind}
                status={update.status}
              />
            );
          
          case 'tool_call_update':
            return (
              <ToolCallCard key={i}
                title={update.title}
                status={update.status}
                content={update.content?.map(c => {
                  if (c.type === 'diff') return <DiffViewer key={c.path} {...c} />;
                  if (c.type === 'terminal') return <TerminalViewer key={c.terminalId} {...c} />;
                  if (c.type === 'content') return <MessageBubble key={i} text={c.content.text} />;
                })}
              />
            );
          
          case 'plan':
            return <PlanViewer key={i} plan={update.plan} />;
        }
      })}
    </div>
  );
}
```

### Approval Queue

```tsx
function ApprovalQueue() {
  const { items, respond } = useApprovalStore();

  return (
    <div className="w-80 border-l border-zinc-800 bg-zinc-900/50">
      <div className="sticky top-0 p-3 bg-zinc-900 border-b border-zinc-800">
        <h2 className="text-sm font-semibold">
          Approval Queue
          {items.length > 0 && (
            <span className="ml-2 bg-amber-500/20 text-amber-400 rounded-full px-2 text-xs">
              {items.length}
            </span>
          )}
        </h2>
      </div>

      <div className="divide-y divide-zinc-800">
        {items.map(item => (
          <div key={item.id} className="p-3">
            {/* Agent identity */}
            <div className="flex items-center gap-2 mb-2">
              <span>{item.agentIcon}</span>
              <span className="text-xs text-zinc-400">{item.agentName}</span>
              <span className="text-xs text-zinc-600">{item.projectName}</span>
            </div>

            {/* What it wants to do */}
            <p className="text-sm text-zinc-300 mb-2">{item.permission.toolCallTitle}</p>

            {/* Mini diff preview if available */}
            {item.permission.content?.some(c => c.type === 'diff') && (
              <MiniDiff content={item.permission.content} />
            )}

            {/* ACP permission options → buttons */}
            <div className="flex gap-2">
              {item.permission.options.map(opt => (
                <button
                  key={opt.optionId}
                  onClick={() => respond(item.agentId, item.id, {
                    outcome: 'selected',
                    optionId: opt.optionId,
                  })}
                  className={buttonStyle(opt.kind)}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="p-6 text-center text-zinc-600 text-sm">
            All clear ✓
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 7. Tech Stack

### Desktop App
```
Tauri v2               — Desktop shell (Rust-based, lightweight, cross-platform)
React 19               — UI framework
TypeScript 5.x         — Type safety (strict)
Vite 6                 — Build tool
Tailwind CSS 4         — Styling
shadcn/ui              — UI components (dialog, select, tabs, dropdown)
Zustand 5              — State management
Lucide React           — Icons
```

### ACP & Backend (Tauri sidecar / Node.js)
```
@agentclientprotocol/sdk  — ACP client (ClientSideConnection, ndJsonStream)
simple-git                — Git operations (status, commit, push, pull, branch, diff)
chokidar                  — File system watcher
fs-extra                  — Cross-platform file ops
react-diff-viewer-continued — Diff rendering (ACP diffs + Git diffs)
react-markdown + remark-gfm — Agent message rendering
react-syntax-highlighter  — Code viewer syntax highlighting
@xterm/xterm 6            — Terminal viewer (only for ACP terminal output)
@xterm/addon-fit          — Terminal auto-resize
```

### Future (Phase 5)
```
Express / Fastify       — Remote access HTTP+WS server
jsonwebtoken            — Auth for remote access
```

---

## 8. Config Storage

```
~/.multipilot/
├── config.json              # Main config
├── profiles/                # User-created profiles
│   ├── claude-kimi.json
│   ├── claude-minimax.json
│   └── ...
└── sessions/                # Saved sessions (opsiyonel)
```

### config.json
```json
{
  "version": 1,
  "ui": {
    "theme": "dark",
    "sidebarWidth": 220,
    "approvalQueueVisible": true,
    "fileChangesVisible": true,
    "gridColumns": "auto",
    "notificationSound": true
  },
  "defaults": {
    "cwd": "~/projects",
    "preferredProfile": "claude-anthropic"
  },
  "profiles": [ ... ],
  "recentProjects": [
    "~/projects/my-saas",
    "~/projects/mobile-app"
  ]
}
```

---

## 9. Implementation Phases

### Phase 1 — Single Agent + Project Scaffold (3-4 gün)
- [ ] Tauri v2 + React 19 + Vite scaffold
- [ ] ProfileManager: Built-in preset profiles
- [ ] ManagedAgent: ACP spawn + ClientSideConnection
- [ ] Tek agent card: session/update rendering (messages, tool calls)
- [ ] Permission request → inline button response
- [ ] Prompt input per agent
- [ ] Sidebar: Project tree (basic)
- [ ] Test: Claude Code ACP spawn → prompt → approval → response

### Phase 2 — Multi-Agent Grid + Multi-Project (3-4 gün)
- [ ] AgentManager: N agent lifecycle
- [ ] Agent Grid: Auto-fit NxM layout
- [ ] Sidebar: Multi-project tree + per-project agent list
- [ ] Spawn Dialog: Profile dropdown + project picker + initial prompt
- [ ] Agent kill/restart
- [ ] Project add/remove
- [ ] Status bar: agents count, waiting count, projects, session time

### Phase 3 — Workspace: File Manager (3-4 gün)
- [ ] FileManager backend: tree read, file read, create, delete, move
- [ ] File Tree UI: Collapsible directory tree per project
- [ ] File Viewer: Read-only code display with syntax highlighting
- [ ] File Viewer Tabs: Multiple open files
- [ ] Context menu: Open, copy path, reveal in finder, delete, rename
- [ ] File change tracking: Agent-changed files highlighted in tree
- [ ] Main area tab navigation: Agents / Files / Git views

### Phase 4 — Workspace: Git Management (3-4 gün)
- [ ] GitManager backend: simple-git integration (status, diff, commit, push, pull, branch)
- [ ] Git Panel UI: Branch selector, changed files list
- [ ] Staging: Checkbox per file, stage/unstage buttons
- [ ] Commit: Message input + commit button
- [ ] Push/Pull: Buttons with ahead/behind indicator
- [ ] Diff Viewer: Selected file diff (working tree + staged)
- [ ] Commit History: Recent commits list with hash, message, author, time
- [ ] Branch management: Create, switch, list

### Phase 5 — Approval Queue + Rich ACP Content (3-4 gün)
- [ ] Approval Queue: Right panel, cross-agent, with diff preview
- [ ] DiffViewer: ACP tool call diff content + Git diffs (shared component)
- [ ] TerminalViewer: xterm.js for ACP terminal/create
- [ ] PlanViewer: Agent plan steps rendering
- [ ] Markdown messages with syntax-highlighted code blocks
- [ ] Tool call progress cards (pending → in_progress → completed)
- [ ] Notification badge + sound for new approvals

### Phase 6 — Profiles + Polish (2-3 gün)
- [ ] Profile Editor UI: Full CRUD
- [ ] Auto-discovery: ~/.claude/*.json scan + suggestions
- [ ] Agent maximize/minimize (full-screen single agent)
- [ ] Keyboard shortcuts:
  - Ctrl+1..9: Agent switch
  - Ctrl+Shift+G: Git view
  - Ctrl+Shift+E: Files view
  - Ctrl+Shift+A: Agent view
  - Enter/Esc on approval: Accept/Reject
- [ ] Theme system (dark/light + terminal themes)
- [ ] Window state persistence (size, position, layout)

### Phase 7 — Remote + Mobile Access (opsiyonel)
- [ ] Optional HTTP+WS server (port 3847)
- [ ] Auth token for remote access
- [ ] Mobile-responsive web UI
- [ ] QR code connect
- [ ] Push notifications for approvals

### Phase 8 — Advanced (opsiyonel)
- [ ] Same-prompt-multi-agent: Aynı prompt → N agent → karşılaştır
- [ ] Session save/load (ACP session/load)
- [ ] Slash commands pass-through
- [ ] Integrated terminal (project-level, not agent-bound)
- [ ] Import/export profiles
- [ ] Agent templates (pre-configured setups)
- [ ] Plugin system
- [ ] Git: Stash, rebase, merge conflict resolution
- [ ] File editor: Basic editing (not IDE-level, but quick fixes)

---

## 10. Competitive Positioning

```
              IDE-bound              Standalone
              ─────────              ──────────
Single Agent  Cursor, Windsurf      ACP UI (desktop)
              VS Code + Copilot

Multi Agent   Zed (ACP tabs)        Z Code (desktop ADE)
(sequential)  VS Code (agent view)  → agent switch, same window

Multi Agent   —                     ★ MultiPilot ★
(parallel     (nobody)              → N agent grid, parallel view
 dashboard)                         → unified approval queue
                                    → profile system (same CLI, N providers)
                                    → project-based organization
                                    → open source
                                    → future: remote/mobile access
```

### vs Z Code
Z Code = IDE-first, agent'lar IDE'nin parçası, sıralı switch, closed source, Z.AI vendor-locked.
MultiPilot = Agent-first mission control. Paralel grid. Profile system. Open source, vendor-neutral.
Z Code'un file manager + git + preview'ı var → MultiPilot da file manager + git ekliyor ama IDE olmadan.

### vs Zed
Zed = Harika editor, ACP'nin doğduğu yer, ama editor kullanmak zorundasın.
MultiPilot = IDE-independent. Zed kullananlar da, VS Code kullananlar da, terminal kullananlar da MultiPilot'u kullanabilir.

### vs ACP UI
ACP UI = Temel chat UI, tek agent, tek session, file/git yok.
MultiPilot = N agent, N project, grid, approval queue, profiles, file manager, git.

### Key Differentiator
MultiPilot bir IDE değil ama IDE'nin "agent yönetimi + proje görünürlüğü" kısmını çekip alıyor.
Kullanıcı hâlâ favori editor'ünü kullanır (VS Code, Zed, vim, whatever).
Ama agent'ları MultiPilot'tan yönetir, dosya değişikliklerini oradan izler, git'i oradan kontrol eder.

---

## 11. Key Technical Decisions

| Karar | Seçim | Neden |
|-------|-------|-------|
| Desktop framework | Tauri v2 | Lightweight (~5MB), Rust-based, cross-platform, FS access |
| Protocol | ACP only (v1) | 30+ agent destekli, structured, regex yok |
| State management | Zustand | Minimal, TypeScript-first, no boilerplate |
| Agent communication | @agentclientprotocol/sdk | Official TypeScript SDK, ClientSideConnection |
| Agent spawn | child_process + stdio | ACP standard transport |
| UI framework | React 19 | Ecosystem, community, component libraries |
| Styling | Tailwind 4 + shadcn/ui | Rapid development, consistent, dark theme |
| Git operations | simple-git | Pure JS, no native deps, cross-platform |
| Diff rendering | react-diff-viewer | ACP tool_call diffs + Git diffs, shared component |
| Code viewer | react-syntax-highlighter | Read-only code display, 200+ languages |
| Terminal | @xterm/xterm 6 | Only for ACP terminal/create output, secondary |
| File watcher | chokidar | Cross-platform, battle-tested, ignore patterns |
| Config format | JSON | Simple, human-readable, no YAML/TOML dependency |
| File manager | Read-only first | Agent'lar yazar, kullanıcı izler. Basic edit Phase 8'de |
| Main area | Tab-based views | Agents / Files / Git arası geçiş, karmaşıklığı azaltır |
