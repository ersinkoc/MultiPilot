import { useState, useEffect } from 'react';
import {
  Settings, Bell, Palette, Keyboard, Shield, Bot, Check, AlertCircle,
  Terminal, Trash2, Plus, RefreshCw, ChevronDown, ChevronUp, Sparkles,
  Search, X, Eye, EyeOff,
} from 'lucide-react';
import { themes, applyTheme } from '@/lib/themes';
import { useProfileStore } from '@/stores/profileStore';
import type { AgentProfile } from '@/lib/types';

type SettingsTab = 'profiles' | 'general' | 'appearance' | 'notifications' | 'shortcuts' | 'security';

const SETTINGS_KEY = 'multipilot-settings';

interface AppSettings {
  openLastProject: boolean;
  activeTheme: string;
  notifyTaskComplete: boolean;
  notifyPermission: boolean;
  requireApprovalForWrites: boolean;
}

const defaultSettings: AppSettings = {
  openLastProject: false,
  activeTheme: 'dark',
  notifyTaskComplete: true,
  notifyPermission: true,
  requireApprovalForWrites: true,
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch { /* use defaults */ }
  return { ...defaultSettings };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profiles');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = (themeId: string) => {
    update('activeTheme', themeId);
    applyTheme(themeId);
  };

  const tabs = [
    { id: 'profiles' as const, icon: Bot, label: 'Agent Profiles' },
    { id: 'general' as const, icon: Settings, label: 'General' },
    { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'shortcuts' as const, icon: Keyboard, label: 'Shortcuts' },
    { id: 'security' as const, icon: Shield, label: 'Security' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-52 border-r border-border bg-card">
        <div className="flex items-center px-3 h-10 border-b border-border">
          <h2 className="text-sm font-semibold">Settings</h2>
        </div>
        <nav className="p-1.5 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-item w-full ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'profiles' && <ProfilesTab />}

        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold mb-3">General Settings</h3>
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-2">Startup</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={settings.openLastProject}
                  onChange={(e) => update('openLastProject', e.target.checked)}
                />
                <span className="text-sm">Open last project on startup</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold mb-3">Appearance</h3>
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-4">Theme</h4>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      settings.activeTheme === theme.id
                        ? 'border-accent ring-2 ring-accent/20'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div
                      className="w-full h-16 rounded-md mb-2 border border-white/5 overflow-hidden"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div className="flex h-full">
                        <div className="w-8 h-full border-r" style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}>
                          <div className="flex flex-col gap-1 p-1 pt-2">
                            <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: theme.colors.accent }} />
                            <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: theme.colors.muted }} />
                            <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: theme.colors.muted }} />
                          </div>
                        </div>
                        <div className="flex-1 p-1.5">
                          <div className="flex gap-1 mb-1">
                            <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: theme.colors['muted-foreground'] }} />
                            <div className="w-3 h-1 rounded-sm" style={{ backgroundColor: theme.colors.muted }} />
                          </div>
                          <div className="w-full h-2 rounded-sm mb-1" style={{ backgroundColor: theme.colors.muted }} />
                          <div className="w-3/4 h-2 rounded-sm" style={{ backgroundColor: theme.colors.muted }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{theme.name}</span>
                      {settings.activeTheme === theme.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">Active</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold mb-3">Notifications</h3>
            <div className="p-4 border border-border rounded-lg space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm">Agent completed task</span>
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={settings.notifyTaskComplete}
                  onChange={(e) => update('notifyTaskComplete', e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Permission request</span>
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={settings.notifyPermission}
                  onChange={(e) => update('notifyPermission', e.target.checked)}
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {[
                { action: 'Spawn Agent', shortcut: 'Ctrl+Shift+N' },
                { action: 'Kill Selected Agent', shortcut: 'Ctrl+Shift+K' },
                { action: 'Command Palette', shortcut: 'Ctrl+P' },
                { action: 'Save File', shortcut: 'Ctrl+S' },
                { action: 'Close Tab', shortcut: 'Ctrl+W' },
                { action: 'Agents View', shortcut: 'Ctrl+1' },
                { action: 'Files View', shortcut: 'Ctrl+2' },
                { action: 'Git View', shortcut: 'Ctrl+3' },
                { action: 'Settings View', shortcut: 'Ctrl+4' },
                { action: 'Dashboard', shortcut: 'Ctrl+Shift+D' },
                { action: 'Task Manager', shortcut: 'Ctrl+Shift+T' },
                { action: 'Approve Request', shortcut: 'Ctrl+Shift+A' },
                { action: 'Reject Request', shortcut: 'Ctrl+Shift+R' },
                { action: 'Close Modal', shortcut: 'Escape' },
              ].map(({ action, shortcut }) => (
                <div key={action} className="flex items-center justify-between px-4 py-2 border border-border rounded-lg">
                  <span className="text-sm">{action}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{shortcut}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold mb-3">Security</h3>
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-2">Approval Settings</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={settings.requireApprovalForWrites}
                  onChange={(e) => update('requireApprovalForWrites', e.target.checked)}
                />
                <span className="text-sm">Require approval for file writes</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agent Profiles Tab ───────────────────────────────────────────────────

function ProfilesTab() {
  const { profiles, removeProfile, updateProfile, discoverProfiles, validateProfile, isDiscovering, validateAllProfiles } = useProfileStore();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRediscovering, setIsRediscovering] = useState(false);

  const filtered = search.trim()
    ? profiles.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.acpCommand.toLowerCase().includes(search.toLowerCase()) ||
        p.provider?.toLowerCase().includes(search.toLowerCase())
      )
    : profiles;

  const handleRediscover = async () => {
    setIsRediscovering(true);
    try {
      await discoverProfiles();
      await validateAllProfiles();
    } finally {
      setIsRediscovering(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Agent Profiles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profiles.length} profiles ({profiles.filter(p => p.isValid).length} available)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRediscover}
            disabled={isRediscovering || isDiscovering}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRediscovering ? 'animate-spin' : ''}`} />
            Re-discover
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search profiles..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Profile List */}
      <div className="space-y-2">
        {filtered.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isExpanded={expandedId === profile.id}
            onToggle={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
            onUpdate={(updates) => updateProfile(profile.id, updates)}
            onRemove={() => removeProfile(profile.id)}
            onValidate={() => validateProfile(profile)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No profiles match your search
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onValidate,
}: {
  profile: AgentProfile;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<AgentProfile>) => void;
  onRemove: () => void;
  onValidate: () => void;
}) {
  const [isValidating, setIsValidating] = useState(false);
  const [editCommand, setEditCommand] = useState(profile.acpCommand);
  const [editArgs, setEditArgs] = useState(profile.acpArgs.join(' '));
  const [editExtraArgs, setEditExtraArgs] = useState(profile.extraArgs.join(' '));
  const [editSettingsPath, setEditSettingsPath] = useState(profile.settingsFilePath || '');
  const [editPromptFlag, setEditPromptFlag] = useState(profile.promptFlag || '-p');
  const [showEnv, setShowEnv] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onValidate();
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveCommand = () => {
    onUpdate({
      acpCommand: editCommand.trim(),
      acpArgs: editArgs.trim() ? editArgs.trim().split(/\s+/) : [],
      extraArgs: editExtraArgs.trim() ? editExtraArgs.trim().split(/\s+/) : [],
      settingsFilePath: editSettingsPath.trim() || undefined,
      promptFlag: editPromptFlag.trim() || '-p',
    });
  };

  const handleAddEnv = () => {
    if (newEnvKey && newEnvValue) {
      onUpdate({ env: { ...profile.env, [newEnvKey]: newEnvValue } });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnv = (key: string) => {
    const newEnv = { ...profile.env };
    delete newEnv[key];
    onUpdate({ env: newEnv });
  };

  return (
    <div className={`border rounded-lg transition-all ${
      profile.isValid
        ? 'border-border hover:border-accent/30'
        : 'border-red-500/20 bg-red-500/5'
    }`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: profile.color }}
        >
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{profile.name}</span>
            {profile.isAutoDiscovered && (
              <span title="Auto-discovered"><Sparkles className="w-3 h-3 text-blue-400" /></span>
            )}
            {profile.isValid ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <code className="text-[11px]">{profile.acpCommand}</code>
            {profile.version && <span>v{profile.version}</span>}
            {profile.provider && <span>({profile.provider})</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {profile.modes.length} modes
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Validation status */}
          {profile.validationError && (
            <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {profile.validationError}
            </div>
          )}
          {profile.detectedPath && (
            <div className="p-2.5 rounded-md bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              Found at: {profile.detectedPath}
            </div>
          )}

          {/* Command Configuration */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Command</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Executable</label>
                <input
                  type="text"
                  value={editCommand}
                  onChange={(e) => setEditCommand(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Base Args</label>
                <input
                  type="text"
                  value={editArgs}
                  onChange={(e) => setEditArgs(e.target.value)}
                  placeholder="e.g. run"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Extra Args (always added)</label>
                <input
                  type="text"
                  value={editExtraArgs}
                  onChange={(e) => setEditExtraArgs(e.target.value)}
                  placeholder="e.g. -q --no-pretty"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Prompt Flag</label>
                <input
                  type="text"
                  value={editPromptFlag}
                  onChange={(e) => setEditPromptFlag(e.target.value)}
                  placeholder="-p"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Settings File Path</label>
              <input
                type="text"
                value={editSettingsPath}
                onChange={(e) => setEditSettingsPath(e.target.value)}
                placeholder="Optional: path to settings.json"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCommand}
                className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
              >
                Save Changes
              </button>
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
              >
                <Terminal className={`w-3 h-3 ${isValidating ? 'animate-pulse' : ''}`} />
                {isValidating ? 'Checking...' : 'Validate'}
              </button>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'supportsPromptInput', label: 'Prompt Input' },
                { key: 'supportsSettingsFile', label: 'Settings File' },
              ].map(({ key, label }) => {
                const value = profile[key as keyof AgentProfile] as boolean;
                return (
                  <button
                    key={key}
                    onClick={() => onUpdate({ [key]: !value })}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-all ${
                      value
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-border text-muted-foreground hover:border-accent/30'
                    }`}
                  >
                    {value ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modes */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Modes ({profile.modes.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {profile.modes.map((mode) => (
                <div
                  key={mode.id}
                  className={`p-2.5 rounded-md border text-xs ${
                    mode.securityLevel === 'dangerous'
                      ? 'border-red-500/20 bg-red-500/5'
                      : mode.securityLevel === 'safe'
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{mode.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      mode.securityLevel === 'dangerous' ? 'bg-red-500/20 text-red-400'
                      : mode.securityLevel === 'safe' ? 'bg-green-500/20 text-green-400'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {mode.securityLevel}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{mode.description}</div>
                  {mode.args.length > 0 && (
                    <code className="block mt-1 text-[10px] text-accent">{mode.args.join(' ')}</code>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <button
              onClick={() => setShowEnv(!showEnv)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
            >
              Environment Variables ({Object.keys(profile.env).length})
              {showEnv ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showEnv && (
              <div className="space-y-1.5">
                {Object.entries(profile.env).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 px-2.5 py-1.5 bg-muted rounded-md group text-xs">
                    <code className="font-medium text-blue-400">{key}</code>
                    <span className="text-muted-foreground">=</span>
                    <code className="flex-1 truncate">{value}</code>
                    <button
                      onClick={() => handleRemoveEnv(key)}
                      className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder="KEY"
                    className="w-32 px-2.5 py-1 bg-muted rounded-md border border-border text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="value"
                    className="flex-1 px-2.5 py-1 bg-muted rounded-md border border-border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={handleAddEnv}
                    disabled={!newEnvKey || !newEnvValue}
                    className="px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-3 border-t border-border">
            <button
              onClick={() => {
                if (confirm(`Remove profile "${profile.name}"? This cannot be undone.`)) {
                  onRemove();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />
              Remove Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
