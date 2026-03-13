import { useState, useEffect } from 'react';
import {
  FileJson,
  Save,
  X,
  Plus,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import type { AgentProfile } from '@/lib/types';
import * as ipc from '@/lib/ipc';

interface SettingsFileEditorProps {
  profile: AgentProfile;
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsField {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
}

// Common Claude settings fields
const CLAUDE_SETTINGS_SCHEMA: Record<string, { type: string; description: string; default?: unknown }> = {
  model: { type: 'string', description: 'Default model to use (e.g., claude-sonnet-4-6)' },
  autoEdit: { type: 'boolean', description: 'Automatically apply edits without confirmation', default: false },
  verbose: { type: 'boolean', description: 'Enable verbose output', default: false },
  allowedTools: { type: 'array', description: 'List of allowed tools' },
  blockedTools: { type: 'array', description: 'List of blocked tools' },
  maxTokens: { type: 'number', description: 'Maximum tokens per response', default: 4096 },
  temperature: { type: 'number', description: 'Temperature for responses (0-1)', default: 0.7 },
  timeout: { type: 'number', description: 'Request timeout in seconds', default: 60 },
  theme: { type: 'string', description: 'UI theme', default: 'dark' },
};

// Common Aider settings fields
const AIDER_SETTINGS_SCHEMA: Record<string, { type: string; description: string; default?: unknown }> = {
  model: { type: 'string', description: 'Model to use (e.g., gpt-4, claude-sonnet-4-6)' },
  weakModel: { type: 'string', description: 'Weaker model for simple tasks' },
  editFormat: { type: 'string', description: 'Edit format (diff, whole, etc.)', default: 'diff' },
  autoCommits: { type: 'boolean', description: 'Automatically commit changes', default: true },
  dirtyCommits: { type: 'boolean', description: 'Allow dirty commits', default: false },
  attributeAuthor: { type: 'boolean', description: 'Attribute commits to AI', default: true },
  attributeCommitMessageAuthor: { type: 'boolean', description: 'Attribute in commit messages', default: false },
  checkUpdate: { type: 'boolean', description: 'Check for updates', default: true },
  showDiffs: { type: 'boolean', description: 'Show diffs before applying', default: true },
  mapTokens: { type: 'number', description: 'Token limit for repo map', default: 1024 },
  mapMultiplier: { type: 'number', description: 'Multiplier for repo map', default: 2 },
  autoTest: { type: 'boolean', description: 'Run tests automatically', default: false },
  testCmd: { type: 'string', description: 'Command to run tests' },
  lintCmd: { type: 'string', description: 'Command to run linter' },
  darkMode: { type: 'boolean', description: 'Use dark mode', default: true },
};

export function SettingsFileEditor({ profile, isOpen, onClose }: SettingsFileEditorProps) {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [rawJson, setRawJson] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [isDirty, setIsDirty] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const schema = profile.id.includes('claude') ? CLAUDE_SETTINGS_SCHEMA : AIDER_SETTINGS_SCHEMA;

  useEffect(() => {
    // Load existing settings or create default
    const defaultSettings: Record<string, unknown> = {};
    Object.entries(schema).forEach(([key, def]) => {
      if (def.default !== undefined) {
        defaultSettings[key] = def.default;
      }
    });
    setSettings(defaultSettings);
    setRawJson(JSON.stringify(defaultSettings, null, 2));
  }, [profile, schema]);

  const handleSave = async () => {
    try {
      const dataToSave = activeTab === 'json' ? JSON.parse(rawJson) : settings;
      const content = JSON.stringify(dataToSave, null, 2);

      if (profile.settingsFilePath) {
        await ipc.writeFile(profile.settingsFilePath, content);
      } else {
        // No settings file path configured — trigger browser download as fallback
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profile.id}-settings.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save settings:', (error as Error).message);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setSettings(imported);
        setRawJson(JSON.stringify(imported, null, 2));
        setIsDirty(true);
      } catch (error) {
        console.error('Failed to import:', (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const updateField = (key: string, value: unknown) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setRawJson(JSON.stringify(newSettings, null, 2));
    setIsDirty(true);
  };

  const removeField = (key: string) => {
    const newSettings = { ...settings };
    delete newSettings[key];
    setSettings(newSettings);
    setRawJson(JSON.stringify(newSettings, null, 2));
    setIsDirty(true);
  };

  const addField = () => {
    if (!newFieldKey.trim()) return;
    updateField(newFieldKey, '');
    setNewFieldKey('');
    setShowAddField(false);
  };

  const handleRawJsonChange = (value: string) => {
    setRawJson(value);
    setIsDirty(true);
    try {
      setSettings(JSON.parse(value));
    } catch {
      // Invalid JSON, don't update form
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 dialog-backdrop flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Settings Editor</h2>
              <p className="text-sm text-muted-foreground">
                {profile.name} configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-yellow-400">Unsaved changes</span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b border-border bg-muted/30">
          {(['form', 'json'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab} View
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'form' ? (
            <div className="space-y-4">
              {/* Add Field Button */}
              {!showAddField ? (
                <button
                  onClick={() => setShowAddField(true)}
                  className="flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="Field name..."
                    className="flex-1 px-3 py-2 bg-muted rounded-lg border border-border text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addField()}
                  />
                  <button
                    onClick={addField}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddField(false)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Schema Fields */}
              <div className="space-y-4">
                {Object.entries(schema).map(([key, def]) => (
                  <SettingsField
                    key={key}
                    fieldKey={key}
                    value={settings[key]}
                    definition={def}
                    onChange={(value) => updateField(key, value)}
                  />
                ))}
              </div>

              {/* Custom Fields */}
              {Object.keys(settings).some((key) => !schema[key]) && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Custom Fields</h3>
                  <div className="space-y-3">
                    {Object.entries(settings)
                      .filter(([key]) => !schema[key])
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-sm font-mono w-32 truncate">{key}</span>
                          <input
                            type="text"
                            value={String(value)}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-muted rounded border border-border text-sm"
                          />
                          <button
                            onClick={() => removeField(key)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full">
              <textarea
                value={rawJson}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                className="w-full h-full min-h-[400px] px-4 py-3 bg-muted rounded-lg border border-border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors text-sm">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsFieldProps {
  fieldKey: string;
  value: unknown;
  definition: { type: string; description: string; default?: unknown };
  onChange: (value: unknown) => void;
}

function SettingsField({ fieldKey, value, definition, onChange }: SettingsFieldProps) {
  const renderInput = () => {
    switch (definition.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
            </div>
            <span className="text-sm text-muted-foreground">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(value) || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm"
          />
        );

      case 'array':
        return (
          <div className="space-y-2">
            {Array.isArray(value) ? (
              value.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={String(item)}
                    onChange={(e) => {
                      const newArr = [...(value as unknown[])];
                      newArr[i] = e.target.value;
                      onChange(newArr);
                    }}
                    className="flex-1 px-3 py-1.5 bg-muted rounded border border-border text-sm"
                  />
                  <button
                    onClick={() => {
                      const newArr = (value as unknown[]).filter((_, idx) => idx !== i);
                      onChange(newArr);
                    }}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : null}
            <button
              onClick={() => onChange([...(Array.isArray(value) ? value : []), ''])}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus className="w-3 h-3" />
              Add item
            </button>
          </div>
        );

      case 'object':
        return (
          <textarea
            value={JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full h-24 px-3 py-2 bg-muted rounded-lg border border-border font-mono text-xs resize-none"
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm"
          />
        );
    }
  };

  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <label className="text-sm font-medium">{fieldKey}</label>
          <p className="text-xs text-muted-foreground">{definition.description}</p>
        </div>
        {definition.default !== undefined && (
          <span className="text-xs text-muted-foreground">
            Default: {String(definition.default)}
          </span>
        )}
      </div>
      {renderInput()}
    </div>
  );
}
