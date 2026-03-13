import { useState, useEffect, useCallback } from 'react';
import { X, Bot, Plus, Trash2, Terminal, Check, AlertCircle, RefreshCw, FileJson, Eye } from 'lucide-react';
import { useProfileStore, PREDEFINED_MODES } from '@/stores/profileStore';
import * as ipc from '@/lib/ipc';
import type { AgentProfile, CommandValidationResult } from '@/lib/types';
import { SettingsFileManager } from './SettingsFileManager';

interface ProfileEditorProps {
  profile: AgentProfile | null;
  isNew: boolean;
  onClose: () => void;
}

export function ProfileEditor({ profile, isNew, onClose }: ProfileEditorProps) {
  const { addProfile, updateProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'basic' | 'command' | 'env' | 'settings'>('basic');
  const [validationResult, setValidationResult] = useState<CommandValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showCommandPreview, setShowCommandPreview] = useState(true);

  const [formData, setFormData] = useState<AgentProfile>({
    id: profile?.id || '',
    name: profile?.name || '',
    icon: profile?.icon || 'Bot',
    color: profile?.color || '#3b82f6',
    description: profile?.description || '',
    provider: profile?.provider || 'Custom',
    acpCommand: profile?.acpCommand || '',
    acpArgs: profile?.acpArgs || [],
    extraArgs: profile?.extraArgs || [],
    env: profile?.env || {},
    defaultCwd: profile?.defaultCwd || '',
    modes: profile?.modes || [PREDEFINED_MODES.safe, PREDEFINED_MODES.cautious],
    supportsSettingsFile: profile?.supportsSettingsFile || false,
    settingsFilePath: profile?.settingsFilePath || undefined,
    supportsPromptInput: profile?.supportsPromptInput ?? true,
    promptFlag: profile?.promptFlag || '-p',
    // Phase 8 fields
    isAutoDiscovered: profile?.isAutoDiscovered || false,
    detectedPath: profile?.detectedPath || undefined,
    version: profile?.version || undefined,
    settingsContent: profile?.settingsContent || undefined,
    createdAt: profile?.createdAt || Date.now(),
    updatedAt: profile?.updatedAt || Date.now(),
  });

  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newArg, setNewArg] = useState('');

  // Validate command when it changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (formData.acpCommand) {
        validateCommand();
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData.acpCommand]);

  const validateCommand = async () => {
    if (!formData.acpCommand) return;
    setIsValidating(true);
    try {
      const result = await ipc.validateCommand(formData.acpCommand);
      setValidationResult(result);
      if (result.isValid) {
        setFormData(prev => ({
          ...prev,
          version: result.version || prev.version,
          detectedPath: result.path || prev.detectedPath,
        }));
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: String(error),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.acpCommand) {
      return;
    }

    const profileToSave = {
      ...formData,
      updatedAt: Date.now(),
    };

    if (isNew) {
      addProfile(profileToSave);
    } else {
      updateProfile(formData.id, profileToSave);
    }
    onClose();
  };

  const addEnvVar = () => {
    if (newEnvKey && newEnvValue) {
      setFormData((prev) => ({
        ...prev,
        env: { ...prev.env, [newEnvKey]: newEnvValue },
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const removeEnvVar = (key: string) => {
    setFormData((prev) => {
      const newEnv = { ...prev.env };
      delete newEnv[key];
      return { ...prev, env: newEnv };
    });
  };

  const addArg = () => {
    if (newArg) {
      setFormData((prev) => ({
        ...prev,
        extraArgs: [...prev.extraArgs, newArg],
      }));
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      extraArgs: prev.extraArgs.filter((_, i) => i !== index),
    }));
  };

  // Build command preview
  const buildCommandPreview = useCallback(() => {
    const parts: string[] = [formData.acpCommand || 'command'];

    // Add extra args
    parts.push(...formData.extraArgs);

    // Add settings file if supported
    if (formData.supportsSettingsFile && formData.settingsFilePath) {
      parts.push('--settings', `"${formData.settingsFilePath}"`);
    }

    // Add env vars preview
    const envVars = Object.entries(formData.env);
    if (envVars.length > 0) {
      const envStr = envVars.map(([k, v]) => `${k}="${v}"`).join(' ');
      return `$ ${envStr} \\\n  ${parts.join(' ')}`;
    }

    return `$ ${parts.join(' ')}`;
  }, [formData]);

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16',
  ];

  const renderBasicTab = () => (
    <div className="space-y-6">
      {/* Name and Provider */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Profile Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Claude Code (Z.AI)"
            className="w-full px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Provider
          </label>
          <input
            type="text"
            value={formData.provider}
            onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
            placeholder="e.g., Anthropic"
            className="w-full px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this agent configuration"
          className="w-full px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Accent Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setFormData(prev => ({ ...prev, color }))}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                formData.color === color
                  ? 'border-white scale-110 ring-2 ring-accent'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Auto-discovered badge */}
      {formData.isAutoDiscovered && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400">
            This profile was auto-discovered from your system
          </span>
        </div>
      )}

      {/* Version info */}
      {formData.version && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-400" />
          <span>Detected version: {formData.version}</span>
        </div>
      )}
    </div>
  );

  const renderCommandTab = () => (
    <div className="space-y-6">
      {/* Command Input with Validation */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Command *
        </label>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={formData.acpCommand}
            onChange={(e) => setFormData(prev => ({ ...prev, acpCommand: e.target.value }))}
            placeholder="e.g., claude, codex, gemini"
            className={`flex-1 px-3 py-2 bg-muted rounded-md border focus:outline-none focus:ring-2 ${
              validationResult
                ? validationResult.isValid
                  ? 'border-green-500/50 focus:ring-green-500/30'
                  : 'border-red-500/50 focus:ring-red-500/30'
                : 'border-border focus:ring-accent'
            }`}
          />
          <button
            onClick={validateCommand}
            disabled={isValidating || !formData.acpCommand}
            className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            {isValidating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Validation Status */}
        {validationResult && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${
            validationResult.isValid ? 'text-green-400' : 'text-red-400'
          }`}>
            {validationResult.isValid ? (
              <>
                <Check className="w-4 h-4" />
                <span>Command found at: {validationResult.path}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>{validationResult.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detected Path */}
      {formData.detectedPath && (
        <div className="p-3 rounded-lg bg-muted/50">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Detected Path
          </label>
          <code className="text-xs break-all">{formData.detectedPath}</code>
        </div>
      )}

      {/* Extra Arguments */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Default Arguments
        </label>
        <div className="space-y-2">
          {formData.extraArgs.map((arg, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md group"
            >
              <code className="flex-1 text-sm font-mono">{arg}</code>
              <button
                onClick={() => removeArg(index)}
                className="p-1 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newArg}
              onChange={(e) => setNewArg(e.target.value)}
              placeholder="Add argument (e.g., --dangerously-skip-permissions)"
              className="flex-1 px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') addArg(); }}
            />
            <button
              onClick={addArg}
              disabled={!newArg}
              className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          These arguments will be used every time this profile spawns an agent
        </p>
      </div>

      {/* Prompt Support */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id="supportsPrompt"
            checked={formData.supportsPromptInput}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              supportsPromptInput: e.target.checked
            }))}
            className="w-4 h-4 rounded border-border bg-background"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="supportsPrompt" className="font-medium text-sm cursor-pointer">
            Supports Prompt Input
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            This CLI can receive an initial prompt via command line argument
          </p>
        </div>
      </div>

      {formData.supportsPromptInput && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Prompt Flag
          </label>
          <input
            type="text"
            value={formData.promptFlag}
            onChange={(e) => setFormData(prev => ({ ...prev, promptFlag: e.target.value }))}
            placeholder="-p or --prompt"
            className="w-full px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}
    </div>
  );

  const renderEnvTab = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-400">
          Environment variables are stored in plaintext. Use placeholder syntax like{' '}
          <code className="bg-yellow-500/20 px-1 rounded">${'{CLAUDE_API_KEY}'}</code>{' '}
          to reference external environment variables.
        </p>
      </div>

      <div className="space-y-2">
        {Object.entries(formData.env).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md group"
          >
            <code className="text-sm font-medium text-blue-400">{key}</code>
            <span className="text-muted-foreground">=</span>
            <code className="flex-1 text-sm truncate">{value}</code>
            <button
              onClick={() => removeEnvVar(key)}
              className="p-1 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <input
            type="text"
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            placeholder="VARIABLE_NAME"
            className="flex-1 px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm uppercase"
          />
          <input
            type="text"
            value={newEnvValue}
            onChange={(e) => setNewEnvValue(e.target.value)}
            placeholder="value or ${ENV_VAR}"
            className="flex-1 px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          <button
            onClick={addEnvVar}
            disabled={!newEnvKey || !newEnvValue}
            className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Common Env Vars Quick Add */}
      <div className="pt-4 border-t border-border">
        <label className="block text-sm font-medium mb-2">
          Quick Add Common Variables
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ANTHROPIC_API_KEY', value: '${ANTHROPIC_API_KEY}' },
            { key: 'OPENAI_API_KEY', value: '${OPENAI_API_KEY}' },
            { key: 'ANTHROPIC_BASE_URL', value: 'https://api.anthropic.com' },
          ].map(({ key, value }) => (
            <button
              key={key}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  env: { ...prev.env, [key]: value },
                }));
              }}
              disabled={key in formData.env}
              className="px-2 py-1 text-xs bg-muted rounded border border-border hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Settings File Support */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id="supportsSettings"
            checked={formData.supportsSettingsFile}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              supportsSettingsFile: e.target.checked
            }))}
            className="w-4 h-4 rounded border-border bg-background"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="supportsSettings" className="font-medium text-sm cursor-pointer flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            Supports Settings File
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            This CLI can load configuration from a JSON settings file
          </p>
        </div>
      </div>

      {formData.supportsSettingsFile && (
        <SettingsFileManager
          profile={formData}
          onProfileChange={setFormData}
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
      <div className="bg-card rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: formData.color }}
            >
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isNew ? 'Create Profile' : 'Edit Profile'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure an AI agent profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/30">
          {[
            { id: 'basic', label: 'Basic', icon: Bot },
            { id: 'command', label: 'Command', icon: Terminal },
            { id: 'env', label: 'Environment', icon: RefreshCw },
            { id: 'settings', label: 'Settings', icon: FileJson },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'command' && renderCommandTab()}
          {activeTab === 'env' && renderEnvTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>

        {/* Command Preview */}
        {showCommandPreview && (
          <div className="px-6 py-3 border-t border-border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Command Preview</span>
              </div>
              <button
                onClick={() => setShowCommandPreview(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            <pre className="p-3 rounded-md bg-black/50 font-mono text-xs text-green-400 overflow-x-auto">
              {buildCommandPreview()}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/50">
          <div className="text-sm text-muted-foreground">
            {validationResult?.isValid ? (
              <span className="text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Command validated
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {isNew ? 'Create a new profile' : 'Edit profile settings'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name || !formData.acpCommand}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              {isNew ? 'Create Profile' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
