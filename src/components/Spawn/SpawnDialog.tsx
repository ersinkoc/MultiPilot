import { useState, useEffect, useMemo } from 'react';
import { Bot, X, Folder, Play, Shield, AlertTriangle, Zap, Rocket, Code, Building2, Sparkles, GitBranch, FileJson, Lock, Terminal, Plus, Trash2, Check, AlertCircle, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAgentStore } from '@/stores/agentStore';
import { useFileStore } from '@/stores/fileStore';
import { useGitStore } from '@/stores/gitStore';
import * as ipc from '@/lib/ipc';
import { useNotificationStore } from '@/stores/notificationStore';
import type { AgentProfile, AgentMode, SpawnConfig } from '@/lib/types';

const iconMap: Record<string, React.ElementType> = {
  Shield, AlertTriangle, Zap, Rocket, Bot, Code, Building2, Sparkles, GitBranch,
};

/**
 * Classify a mode as "model" (selects AI model) or "behavior" (permission/safety).
 * Model modes have --model or -m in their args.
 */
function isModelMode(mode: AgentMode): boolean {
  return mode.args.some(a => a === '--model' || a === '-m');
}

/**
 * Classify a mode as "behavior" (permission/safety related).
 * Anything that's not a model mode and not "Standard" default.
 */
function isBehaviorMode(mode: AgentMode): boolean {
  return mode.securityLevel === 'safe' || mode.securityLevel === 'dangerous';
}

export function SpawnDialog() {
  const { profiles } = useProfileStore();
  const { activeProject, addAgentToProject } = useProjectStore();
  const { addAgent } = useAgentStore();
  const fileStore = useFileStore();
  const gitStore = useGitStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AgentProfile | null>(null);
  const [selectedModelMode, setSelectedModelMode] = useState<AgentMode | null>(null);
  const [selectedBehaviorMode, setSelectedBehaviorMode] = useState<string>('standard'); // 'standard' | mode id
  const [selectedSettingsFile, setSelectedSettingsFile] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isolated, setIsolated] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extraArgs, setExtraArgs] = useState<string[]>([]);
  const [newExtraArg, setNewExtraArg] = useState('');
  const [spawnEnv, setSpawnEnv] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [settingsFileOverride, setSettingsFileOverride] = useState('');
  const [validationStatus, setValidationStatus] = useState<{ isValid: boolean; message: string } | null>(null);
  const [profileSearch, setProfileSearch] = useState('');

  // Split modes into categories
  const { modelModes, behaviorModes, defaultMode } = useMemo(() => {
    if (!selectedProfile) return { modelModes: [], behaviorModes: [], defaultMode: null };
    const models: AgentMode[] = [];
    const behaviors: AgentMode[] = [];
    let defMode: AgentMode | null = null;

    for (const mode of selectedProfile.modes) {
      if (isModelMode(mode)) {
        models.push(mode);
      } else if (isBehaviorMode(mode)) {
        behaviors.push(mode);
      } else {
        // "Standard" or similar default mode
        if (!defMode) defMode = mode;
      }
    }
    return { modelModes: models, behaviorModes: behaviors, defaultMode: defMode };
  }, [selectedProfile]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    document.addEventListener('open-spawn-dialog', handleOpen);
    document.addEventListener('close-modals', handleClose);
    return () => {
      document.removeEventListener('open-spawn-dialog', handleOpen);
      document.removeEventListener('close-modals', handleClose);
    };
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      setSelectedModelMode(null);
      setSelectedBehaviorMode('standard');
      validateProfileCommand(selectedProfile);
    }
    setSelectedSettingsFile('');
    setSettingsFileOverride('');
    setExtraArgs([]);
    setSpawnEnv({});
    setValidationStatus(null);
  }, [selectedProfile]);

  const validateProfileCommand = async (profile: AgentProfile) => {
    if (!profile.acpCommand) return;
    try {
      const result = await ipc.validateCommand(profile.acpCommand);
      if (result.isValid) {
        setValidationStatus({ isValid: true, message: `Found at: ${result.path}` });
      } else {
        setValidationStatus({ isValid: false, message: result.error || 'Command not found' });
      }
    } catch (error) {
      setValidationStatus({ isValid: false, message: String(error) });
    }
  };

  const handleSpawn = async () => {
    if (!selectedProfile || !activeProject) return;

    setIsSpawning(true);
    try {
      const agentId = `${selectedProfile.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      // Determine which mode to use for modeId (behavior mode or default)
      let modeId: string | undefined;
      if (selectedBehaviorMode !== 'standard') {
        modeId = selectedBehaviorMode;
      } else if (defaultMode) {
        modeId = defaultMode.id;
      }

      // Model args go into extraSpawnArgs
      const allExtraArgs = [...extraArgs];
      if (selectedModelMode) {
        allExtraArgs.push(...selectedModelMode.args);
      }

      const spawnConfig: SpawnConfig = {
        modeId,
        initialPrompt: prompt || undefined,
        settingsFile: settingsFileOverride || selectedSettingsFile || undefined,
        isolated,
        spawnEnv: Object.keys(spawnEnv).length > 0 ? spawnEnv : undefined,
        extraSpawnArgs: allExtraArgs.length > 0 ? allExtraArgs : undefined,
      };

      const agent = await ipc.spawnAgent(
        agentId,
        selectedProfile,
        activeProject.id,
        activeProject.path,
        spawnConfig
      );
      addAgent(agent);
      addAgentToProject(activeProject.id, agent.id);
      // Refresh file/git status in background
      fileStore.loadProject(activeProject.path).catch(() => {});
      gitStore.loadGitStatus(activeProject.path).catch(() => {});
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to spawn agent:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      useNotificationStore.getState().error('Spawn Failed', errMsg);
      setValidationStatus({ isValid: false, message: `Spawn failed: ${errMsg}` });
    } finally {
      setIsSpawning(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setSelectedProfile(null);
    setSelectedModelMode(null);
    setSelectedBehaviorMode('standard');
    setSelectedSettingsFile('');
    setIsolated(false);
    setExtraArgs([]);
    setNewExtraArg('');
    setSpawnEnv({});
    setNewEnvKey('');
    setNewEnvValue('');
    setSettingsFileOverride('');
    setShowAdvanced(false);
    setProfileSearch('');
  };

  const addExtraArg = () => {
    if (newExtraArg) {
      setExtraArgs([...extraArgs, newExtraArg]);
      setNewExtraArg('');
    }
  };

  const removeExtraArg = (index: number) => {
    setExtraArgs(extraArgs.filter((_, i) => i !== index));
  };

  const addEnvVar = () => {
    if (newEnvKey && newEnvValue) {
      setSpawnEnv({ ...spawnEnv, [newEnvKey]: newEnvValue });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...spawnEnv };
    delete newEnv[key];
    setSpawnEnv(newEnv);
  };

  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const q = profileSearch.toLowerCase();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.provider?.toLowerCase().includes(q) ||
        p.acpCommand.toLowerCase().includes(q)
    );
  }, [profiles, profileSearch]);

  const installHints: Record<string, string> = {
    claude: 'npm install -g @anthropic-ai/claude-code',
    codex: 'npm install -g @openai/codex',
    gemini: 'npm install -g @anthropic-ai/gemini-cli',
    goose: 'pipx install goose-ai',
    aider: 'pip install aider-chat',
    opencode: 'curl -fsSL https://opencode.ai/install | bash',
    cline: 'npm install -g @anthropic-ai/cline',
    'fast-agent-acp': 'pip install fast-agent-acp',
    vibe: 'npm install -g @mistralai/vibe',
    qwen: 'pip install qwen-code',
  };

  const commandPreview = useMemo(() => {
    if (!selectedProfile) return null;

    const parts: string[] = [selectedProfile.acpCommand];
    parts.push(...selectedProfile.acpArgs);
    parts.push(...selectedProfile.extraArgs);

    // Add behavior mode args
    if (selectedBehaviorMode !== 'standard') {
      const bMode = behaviorModes.find(m => m.id === selectedBehaviorMode);
      if (bMode) parts.push(...bMode.args);
    }

    const settingsFile = settingsFileOverride || selectedSettingsFile;
    if (settingsFile && selectedProfile.supportsSettingsFile) {
      parts.push('--settings', `"${settingsFile}"`);
    }

    // Extra args from advanced panel
    parts.push(...extraArgs);

    // Model args (extraSpawnArgs in Rust)
    if (selectedModelMode) {
      parts.push(...selectedModelMode.args);
    }

    // Auto-injected flags (matching Rust backend logic)
    const cmd = selectedProfile.acpCommand.toLowerCase();
    const isClaude = cmd === 'claude' || cmd === 'claude.cmd' || cmd === 'claude.exe';
    const isCodex = cmd === 'codex' || cmd === 'codex.cmd' || cmd === 'codex.exe';
    const allArgs = [...selectedProfile.extraArgs, ...extraArgs, ...(selectedModelMode?.args || [])];

    if (isClaude && !allArgs.includes('--output-format')) {
      parts.push('--output-format', 'stream-json', '--include-partial-messages', '--verbose');
    }
    if (isCodex && !allArgs.includes('--json')) {
      parts.push('--json');
    }

    // Prompt LAST (matches Rust arg order)
    if (prompt && selectedProfile.supportsPromptInput) {
      const flag = selectedProfile.promptFlag || '-p';
      if (flag) {
        parts.push(flag, `"${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
      } else {
        parts.push(`"${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
      }
    }

    const envPrefix = Object.entries(spawnEnv)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    if (envPrefix) {
      return `$ ${envPrefix} \\\n  ${parts.join(' ')}`;
    }

    return `$ ${parts.join(' ')}`;
  }, [selectedProfile, selectedModelMode, selectedBehaviorMode, behaviorModes, selectedSettingsFile, settingsFileOverride, extraArgs, prompt, spawnEnv]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
      <div className="dialog-content bg-card rounded-lg w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Spawn Agent</h2>
              <p className="text-xs text-muted-foreground">
                {activeProject ? `Project: ${activeProject.name}` : 'Select a profile to start'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left panel: Profile selection */}
          <div className="w-56 border-r border-border flex flex-col shrink-0 bg-muted/20">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-all ${
                    selectedProfile?.id === profile.id
                      ? 'bg-accent/15 border border-accent/40'
                      : 'hover:bg-secondary border border-transparent'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: profile.color }}
                  >
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{profile.name}</div>
                    <div className="text-[10px] text-muted-foreground">{profile.provider || 'Local'}</div>
                  </div>
                  {profile.isAutoDiscovered && (
                    <Sparkles className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                  )}
                </button>
              ))}
              {filteredProfiles.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No matches
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Configuration */}
          <div className="flex-1 overflow-y-auto">
            {!selectedProfile ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Select a profile to configure</p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Validation Status */}
                {validationStatus && (
                  <div className={`p-2.5 rounded-md border text-xs ${
                    validationStatus.isValid
                      ? 'text-green-400 border-green-400/20 bg-green-400/5'
                      : 'text-red-400 border-red-400/20 bg-red-400/5'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {validationStatus.isValid ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{validationStatus.message}</span>
                    </div>
                    {!validationStatus.isValid && installHints[selectedProfile.acpCommand] && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-[11px]">
                        <Download className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Install: </span>
                          <code className="px-1 py-0.5 bg-black/30 rounded text-yellow-400 select-all">
                            {installHints[selectedProfile.acpCommand]}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Model Selection — only if there are model modes */}
                {modelModes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Model</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedModelMode(null)}
                        className={`px-3 py-1.5 rounded-md border text-xs transition-all ${
                          !selectedModelMode
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border hover:border-accent/40 text-muted-foreground'
                        }`}
                      >
                        Default
                      </button>
                      {modelModes.map((mode) => {
                        const Icon = iconMap[mode.icon] || Bot;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setSelectedModelMode(mode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all ${
                              selectedModelMode?.id === mode.id
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-border hover:border-accent/40 text-muted-foreground'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {mode.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approval / Permission Mode — separate from model */}
                {behaviorModes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Permissions</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedBehaviorMode('standard')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all ${
                          selectedBehaviorMode === 'standard'
                            ? 'border-accent bg-accent/15 text-foreground'
                            : 'border-border hover:border-accent/40 text-muted-foreground'
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        Standard
                      </button>
                      {behaviorModes.map((mode) => {
                        const Icon = iconMap[mode.icon] || Shield;
                        const colorClass = mode.securityLevel === 'safe'
                          ? 'text-green-400'
                          : mode.securityLevel === 'dangerous'
                          ? 'text-red-400'
                          : '';
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setSelectedBehaviorMode(mode.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all ${
                              selectedBehaviorMode === mode.id
                                ? mode.securityLevel === 'dangerous'
                                  ? 'border-red-400/50 bg-red-400/10 text-red-400'
                                  : mode.securityLevel === 'safe'
                                  ? 'border-green-400/50 bg-green-400/10 text-green-400'
                                  : 'border-accent bg-accent/15 text-foreground'
                                : 'border-border hover:border-accent/40 text-muted-foreground'
                            }`}
                          >
                            <Icon className={`w-3 h-3 ${colorClass}`} />
                            {mode.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Initial Prompt */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Initial Prompt
                    {!selectedProfile.supportsPromptInput && (
                      <span className="ml-1.5 normal-case tracking-normal text-yellow-500">(not supported)</span>
                    )}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter instructions for the agent..."
                    disabled={!selectedProfile.supportsPromptInput}
                    className="w-full h-24 px-3 py-2 text-sm bg-muted rounded-md border border-border resize-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Working directory + isolation row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Directory</label>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md text-xs">
                      <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{activeProject?.path || 'No project'}</span>
                    </div>
                  </div>
                  <div className="pt-5">
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isolated}
                        onChange={(e) => setIsolated(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border"
                      />
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">Isolated</span>
                    </label>
                  </div>
                </div>

                {/* Settings File */}
                {selectedProfile.supportsSettingsFile && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Settings File</label>
                    <div className="flex items-center gap-2">
                      <FileJson className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={settingsFileOverride || selectedSettingsFile}
                        onChange={(e) => setSettingsFileOverride(e.target.value)}
                        placeholder="Optional path to settings.json"
                        className="flex-1 px-2.5 py-1.5 bg-muted rounded-md border border-border text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                )}

                {/* Advanced Options */}
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Advanced
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-4">
                      {/* Extra Arguments */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Additional Arguments</label>
                        <div className="space-y-1.5">
                          {extraArgs.map((arg, index) => (
                            <div key={index} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md group text-xs">
                              <code className="flex-1">{arg}</code>
                              <button onClick={() => removeExtraArg(index)} className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newExtraArg}
                              onChange={(e) => setNewExtraArg(e.target.value)}
                              placeholder="e.g. --verbose"
                              className="flex-1 px-2.5 py-1 bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                              onKeyDown={(e) => { if (e.key === 'Enter') addExtraArg(); }}
                            />
                            <button
                              onClick={addExtraArg}
                              disabled={!newExtraArg}
                              className="px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Environment Variables */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Environment Overrides</label>
                        <div className="space-y-1.5">
                          {Object.entries(spawnEnv).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md group text-xs">
                              <code className="font-medium text-blue-400">{key}</code>
                              <span className="text-muted-foreground">=</span>
                              <code className="flex-1 truncate">{value}</code>
                              <button onClick={() => removeEnvVar(key)} className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newEnvKey}
                              onChange={(e) => setNewEnvKey(e.target.value)}
                              placeholder="KEY"
                              className="w-28 px-2.5 py-1 bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent text-xs uppercase"
                            />
                            <input
                              type="text"
                              value={newEnvValue}
                              onChange={(e) => setNewEnvValue(e.target.value)}
                              placeholder="value"
                              className="flex-1 px-2.5 py-1 bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                            />
                            <button
                              onClick={addEnvVar}
                              disabled={!newEnvKey || !newEnvValue}
                              className="px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Command Preview */}
                {commandPreview && (
                  <div className="p-3 rounded-md bg-black/40 border border-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Terminal className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">Command</span>
                    </div>
                    <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {commandPreview}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30 shrink-0">
          <div className="text-xs text-muted-foreground">
            {selectedProfile ? (
              <span className="flex items-center gap-1.5">
                {validationStatus?.isValid ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                )}
                {selectedProfile.name}
                {selectedModelMode && <span>/ {selectedModelMode.name}</span>}
                {selectedBehaviorMode !== 'standard' && (
                  <span className={
                    behaviorModes.find(m => m.id === selectedBehaviorMode)?.securityLevel === 'dangerous'
                      ? 'text-red-400' : 'text-green-400'
                  }>
                    / {behaviorModes.find(m => m.id === selectedBehaviorMode)?.name}
                  </span>
                )}
              </span>
            ) : (
              'Select a profile'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs font-medium hover:bg-secondary rounded-md">
              Cancel
            </button>
            <button
              onClick={handleSpawn}
              disabled={!selectedProfile || !activeProject || isSpawning || (validationStatus !== null && !validationStatus.isValid)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              {isSpawning ? 'Spawning...' : <><Play className="w-3.5 h-3.5" /> Spawn</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
