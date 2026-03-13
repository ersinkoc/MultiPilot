import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as ipc from '@/lib/ipc';
import type { AgentProfile, AgentMode, SettingsFile, DiscoveredCli, CommandValidationResult } from '@/lib/types';

// ─── Shared mode presets ───────────────────────────────────────────────
const MODE_SAFE: AgentMode = {
  id: 'safe',
  name: 'Safe Mode',
  description: 'All changes require approval',
  icon: 'Shield',
  args: [],
  securityLevel: 'safe',
  requiresApproval: true,
};

// ─── Claude Code modes ────────────────────────────────────────────────
const CLAUDE_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'claude_standard',
    name: 'Standard',
    description: 'Default interactive mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'claude_sonnet',
    name: 'Sonnet 4.6',
    description: 'Claude Sonnet 4.6',
    icon: 'Sparkles',
    args: ['--model', 'claude-sonnet-4-6'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'claude_opus',
    name: 'Opus 4.6',
    description: 'Claude Opus 4.6 - Most capable',
    icon: 'Zap',
    args: ['--model', 'claude-opus-4-6'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'claude_haiku',
    name: 'Haiku 4.5',
    description: 'Claude Haiku 4.5 - Fastest',
    icon: 'Rocket',
    args: ['--model', 'claude-haiku-4-5'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'claude_skip_perms',
    name: 'Skip Approvals',
    description: 'Skip all permission prompts',
    icon: 'AlertTriangle',
    args: ['--dangerously-skip-permissions'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ─── Codex CLI modes ──────────────────────────────────────────────────
const CODEX_MODES: AgentMode[] = [
  {
    id: 'codex_suggest',
    name: 'Suggest',
    description: 'All actions require approval (default)',
    icon: 'Shield',
    args: ['-a', 'suggest'],
    securityLevel: 'safe',
    requiresApproval: true,
  },
  {
    id: 'codex_standard',
    name: 'Auto Edit',
    description: 'File edits auto-applied, shell commands need approval',
    icon: 'Bot',
    args: ['-a', 'auto-edit'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'codex_full_auto',
    name: 'Full Auto',
    description: 'All operations auto-approved (sandboxed)',
    icon: 'Zap',
    args: ['-a', 'full-auto'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ─── Gemini CLI modes ─────────────────────────────────────────────────
const GEMINI_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'gemini_standard',
    name: 'Standard',
    description: 'Interactive mode with Gemini',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'gemini_flash',
    name: 'Flash',
    description: 'Gemini 2.5 Flash - Fast',
    icon: 'Zap',
    args: ['-m', 'gemini-2.5-flash'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'gemini_pro',
    name: 'Pro',
    description: 'Gemini 2.5 Pro - Most capable',
    icon: 'Sparkles',
    args: ['-m', 'gemini-2.5-pro'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Cursor Agent modes ───────────────────────────────────────────────
const CURSOR_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'cursor_standard',
    name: 'Standard',
    description: 'Default ACP mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Goose modes ──────────────────────────────────────────────────────
const GOOSE_MODES: AgentMode[] = [
  {
    id: 'goose_approve',
    name: 'Approve',
    description: 'Approve each action',
    icon: 'Shield',
    args: [],
    securityLevel: 'safe',
    requiresApproval: true,
  },
  {
    id: 'goose_standard',
    name: 'Auto',
    description: 'Auto-approve all actions',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Augment Code modes ──────────────────────────────────────────────
const AUGMENT_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'augment_standard',
    name: 'Standard',
    description: 'Default ACP mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Kiro CLI modes ──────────────────────────────────────────────────
const KIRO_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'kiro_standard',
    name: 'Standard',
    description: 'Default ACP mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Mistral Vibe modes ──────────────────────────────────────────────
const VIBE_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'vibe_standard',
    name: 'Standard',
    description: 'Default interactive mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'vibe_plan',
    name: 'Plan',
    description: 'Planning mode - read-only analysis',
    icon: 'Building2',
    args: ['--agent', 'plan'],
    securityLevel: 'safe',
    requiresApproval: true,
  },
  {
    id: 'vibe_auto',
    name: 'Auto Approve',
    description: 'Auto-approve all tool calls',
    icon: 'Zap',
    args: ['--auto-approve'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ─── OpenCode modes ──────────────────────────────────────────────────
const OPENCODE_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'opencode_build',
    name: 'Build',
    description: 'Full-access development agent',
    icon: 'Code',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Aider modes ─────────────────────────────────────────────────────
const AIDER_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'aider_code',
    name: 'Code',
    description: 'Standard coding mode',
    icon: 'Code',
    args: ['--no-pretty', '--no-stream'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'aider_architect',
    name: 'Architect',
    description: 'High-level design mode',
    icon: 'Building2',
    args: ['--architect', '--no-pretty', '--no-stream'],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'aider_yes_always',
    name: 'Yes Always',
    description: 'Auto-approve all changes',
    icon: 'Zap',
    args: ['--yes-always', '--no-pretty', '--no-stream'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ─── Qwen Code modes ────────────────────────────────────────────────
const QWEN_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'qwen_standard',
    name: 'Standard',
    description: 'Default interactive mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'qwen_yolo',
    name: 'YOLO',
    description: 'Auto-approve all operations',
    icon: 'Zap',
    args: ['--yolo'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ─── Blackbox modes ─────────────────────────────────────────────────
const BLACKBOX_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'blackbox_standard',
    name: 'Standard',
    description: 'Default interactive mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── Cline modes ────────────────────────────────────────────────────
const CLINE_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'cline_standard',
    name: 'Standard',
    description: 'Default interactive mode',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
];

// ─── fast-agent modes ───────────────────────────────────────────────
const FAST_AGENT_MODES: AgentMode[] = [
  MODE_SAFE,
  {
    id: 'fastagent_standard',
    name: 'Standard',
    description: 'With shell & file access',
    icon: 'Bot',
    args: [],
    securityLevel: 'cautious',
    requiresApproval: false,
  },
  {
    id: 'fastagent_no_perms',
    name: 'No Permissions',
    description: 'Skip permission prompts',
    icon: 'Zap',
    args: ['--no-permissions'],
    securityLevel: 'dangerous',
    requiresApproval: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Default agent profiles — one per real ACP-compatible CLI tool
// ═══════════════════════════════════════════════════════════════════════
const defaultProfiles: AgentProfile[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: 'Bot',
    color: '#d97757',
    description: 'Anthropic\'s AI coding agent — Opus, Sonnet, Haiku models',
    provider: 'Anthropic',
    acpCommand: 'claude',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: CLAUDE_MODES,
    supportsSettingsFile: true,
    supportsPromptInput: true,
    promptFlag: '-p',
  },
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    icon: 'Code',
    color: '#10a37f',
    description: 'OpenAI\'s terminal coding agent — o4-mini default',
    provider: 'OpenAI',
    acpCommand: 'codex',
    acpArgs: [],
    extraArgs: ['-q'],  // quiet mode for non-interactive
    env: {},
    modes: CODEX_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '',  // codex takes prompt as positional arg
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    icon: 'Sparkles',
    color: '#4285f4',
    description: 'Google\'s AI coding agent — Gemini 2.5 Pro & Flash',
    provider: 'Google',
    acpCommand: 'gemini',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: GEMINI_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '-p',
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    icon: 'Bot',
    color: '#7c3aed',
    description: 'Cursor\'s CLI agent with ACP support',
    provider: 'Cursor',
    acpCommand: 'agent',
    acpArgs: ['acp'],
    extraArgs: [],
    env: {},
    modes: CURSOR_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
  {
    id: 'goose',
    name: 'Goose',
    icon: 'Bot',
    color: '#ff6b00',
    description: 'Block\'s open-source coding agent with MCP support',
    provider: 'Block',
    acpCommand: 'goose',
    acpArgs: ['run'],
    extraArgs: ['-q', '--output-format', 'stream-json'],
    env: {},
    modes: GOOSE_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '-t',  // goose run -t "prompt"
  },
  {
    id: 'augment-code',
    name: 'Augment Code',
    icon: 'Zap',
    color: '#00b4d8',
    description: 'Augment\'s AI coding agent — ACP via --acp flag',
    provider: 'Augment',
    acpCommand: 'auggie',
    acpArgs: ['--acp'],
    extraArgs: [],
    env: {},
    modes: AUGMENT_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
  {
    id: 'kiro-cli',
    name: 'Kiro CLI',
    icon: 'Bot',
    color: '#ff9900',
    description: 'AWS Kiro\'s coding agent — ACP via JSON-RPC stdio',
    provider: 'AWS',
    acpCommand: 'kiro-cli',
    acpArgs: ['acp'],
    extraArgs: [],
    env: {},
    modes: KIRO_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    icon: 'Zap',
    color: '#ff7000',
    description: 'Mistral\'s open-source CLI coding agent',
    provider: 'Mistral AI',
    acpCommand: 'vibe',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: VIBE_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '--prompt',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: 'Code',
    color: '#e11d48',
    description: 'SST\'s provider-agnostic terminal coding agent',
    provider: 'SST',
    acpCommand: 'opencode',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: OPENCODE_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
  {
    id: 'aider',
    name: 'Aider',
    icon: 'GitBranch',
    color: '#c4902c',
    description: 'AI pair programmer — works with Claude, GPT, Gemini, local models',
    provider: 'Community',
    acpCommand: 'aider',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: AIDER_MODES,
    supportsSettingsFile: true,
    settingsFilePath: '.aider.conf.yml',
    supportsPromptInput: true,
    promptFlag: '-m',  // --message / -m for non-interactive
  },
  {
    id: 'qwen-code',
    name: 'Qwen Code',
    icon: 'Bot',
    color: '#6366f1',
    description: 'Alibaba\'s open-source AI coding agent',
    provider: 'Alibaba',
    acpCommand: 'qwen',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: QWEN_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '-p',
  },
  {
    id: 'blackbox-ai',
    name: 'Blackbox AI',
    icon: 'Bot',
    color: '#1e1e2e',
    description: 'Blackbox AI coding agent with multi-provider support',
    provider: 'Blackbox',
    acpCommand: 'blackbox',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: BLACKBOX_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
  {
    id: 'cline',
    name: 'Cline',
    icon: 'Bot',
    color: '#22d3ee',
    description: 'Autonomous coding agent — multi-provider support',
    provider: 'Community',
    acpCommand: 'cline',
    acpArgs: [],
    extraArgs: [],
    env: {},
    modes: CLINE_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: true,
    promptFlag: '-p',
  },
  {
    id: 'fast-agent',
    name: 'fast-agent',
    icon: 'Rocket',
    color: '#8b5cf6',
    description: 'Fast-agent with ACP — multi-model, MCP support',
    provider: 'Community',
    acpCommand: 'fast-agent-acp',
    acpArgs: [],
    extraArgs: ['-x'],
    env: {},
    modes: FAST_AGENT_MODES,
    supportsSettingsFile: false,
    supportsPromptInput: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════════

interface ProfileState {
  profiles: AgentProfile[];
  settingsFiles: SettingsFile[];
  discoveredClis: DiscoveredCli[];
  isDiscovering: boolean;
  addProfile: (profile: AgentProfile) => void;
  updateProfile: (profileId: string, updates: Partial<AgentProfile>) => void;
  removeProfile: (profileId: string) => void;
  discoverProfiles: () => Promise<void>;
  getProfileById: (profileId: string) => AgentProfile | undefined;
  validateProfile: (profile: AgentProfile) => Promise<CommandValidationResult>;
  importDiscoveredCli: (cli: DiscoveredCli, options?: { importEnvVars?: boolean; importSettings?: boolean }) => AgentProfile;
  validateAllProfiles: () => Promise<void>;
  addSettingsFile: (file: SettingsFile) => void;
  removeSettingsFile: (fileId: string) => void;
  getSettingsFilesForProfile: (profileId: string) => SettingsFile[];
  updateSettingsFile: (fileId: string, updates: Partial<SettingsFile>) => void;
  migrateProfiles: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: defaultProfiles,
      settingsFiles: [],
      discoveredClis: [],
      isDiscovering: false,

      addProfile: (profile) => {
        const now = Date.now();
        const newProfile: AgentProfile = {
          ...profile,
          createdAt: profile.createdAt || now,
          updatedAt: now,
          isValid: undefined,
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));
      },

      updateProfile: (profileId, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, ...updates, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      removeProfile: (profileId) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
        }));
      },

      discoverProfiles: async () => {
        set({ isDiscovering: true });
        try {
          const discovered = await ipc.discoverClis();
          set({ discoveredClis: discovered });
        } catch (error) {
          console.error('Failed to discover CLIs:', error);
        } finally {
          set({ isDiscovering: false });
        }
      },

      getProfileById: (profileId) => {
        return get().profiles.find((p) => p.id === profileId);
      },

      validateProfile: async (profile) => {
        try {
          const result = await ipc.validateCommand(profile.acpCommand);
          if (result.isValid) {
            get().updateProfile(profile.id, {
              isValid: true,
              validationError: undefined,
              version: result.version,
              detectedPath: result.path,
            });
          } else {
            get().updateProfile(profile.id, {
              isValid: false,
              validationError: result.error,
            });
          }
          return result;
        } catch (error) {
          const errorMsg = String(error);
          get().updateProfile(profile.id, {
            isValid: false,
            validationError: errorMsg,
          });
          return { isValid: false, error: errorMsg };
        }
      },

      importDiscoveredCli: (cli, options = {}) => {
        const { importEnvVars = false, importSettings = false } = options;
        const now = Date.now();

        const newProfile: AgentProfile = {
          id: `profile_${now}`,
          name: cli.name,
          icon: 'Bot',
          color: '#3b82f6',
          description: `Auto-discovered ${cli.name} (${cli.version || 'unknown version'})`,
          provider: 'Auto-Discovered',
          acpCommand: cli.command,
          acpArgs: cli.suggestedProfile?.acpArgs || [],
          extraArgs: cli.suggestedProfile?.extraArgs || [],
          env: importEnvVars ? (cli.suggestedProfile?.env || {}) : {},
          modes: cli.suggestedProfile?.modes || [MODE_SAFE],
          supportsSettingsFile: importSettings,
          supportsPromptInput: true,
          promptFlag: '-p',
          isAutoDiscovered: true,
          detectedPath: cli.detectedPath,
          version: cli.version,
          createdAt: now,
          updatedAt: now,
          isValid: cli.isAvailable,
        };

        get().addProfile(newProfile);
        return newProfile;
      },

      addSettingsFile: (file) => {
        set((state) => ({
          settingsFiles: [...state.settingsFiles, file],
        }));
      },

      removeSettingsFile: (fileId) => {
        set((state) => ({
          settingsFiles: state.settingsFiles.filter((f) => f.id !== fileId),
        }));
      },

      getSettingsFilesForProfile: (profileId) => {
        return get().settingsFiles.filter((f) => f.profileId === profileId);
      },

      updateSettingsFile: (fileId, updates) => {
        set((state) => ({
          settingsFiles: state.settingsFiles.map((f) =>
            f.id === fileId ? { ...f, ...updates } : f
          ),
        }));
      },

      validateAllProfiles: async () => {
        const { profiles } = get();
        for (const profile of profiles) {
          await get().validateProfile(profile);
        }
      },

      migrateProfiles: () => {
        const { profiles } = get();
        let migrated = false;

        const updatedProfiles = profiles.map((profile) => {
          if (!profile.createdAt) {
            migrated = true;
            return {
              ...profile,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isAutoDiscovered: profile.isAutoDiscovered || false,
            };
          }
          return profile;
        });

        if (migrated) {
          set({ profiles: updatedProfiles });
        }
      },
    }),
    {
      name: 'multipilot-profiles',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          // v2: Replace old fake profiles with real ACP agent profiles
          // Keep any user-created custom profiles (not in old default set)
          const oldDefaultIds = new Set([
            'claude-code-free', 'claude-code-pro', 'claude-code-team',
            'codex-gpt4', 'gemini-pro', 'aider-claude', 'aider-gpt4',
          ]);
          const state = persisted as { profiles?: AgentProfile[] };
          const customProfiles = (state.profiles || []).filter(
            (p) => !oldDefaultIds.has(p.id) && !defaultProfiles.some((d) => d.id === p.id)
          );
          return {
            ...state,
            profiles: [...defaultProfiles, ...customProfiles],
          };
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            useProfileStore.getState().migrateProfiles();
          }, 0);
        }
      },
    }
  )
);

// Re-export for backward compatibility
export const PREDEFINED_MODES = {
  safe: MODE_SAFE,
  cautious: {
    id: 'cautious',
    name: 'Cautious Mode',
    description: 'File reads automatic, writes require approval',
    icon: 'AlertTriangle',
    args: [],
    securityLevel: 'cautious' as const,
    requiresApproval: false,
  },
};

export { CLAUDE_MODES, CODEX_MODES, AIDER_MODES };
