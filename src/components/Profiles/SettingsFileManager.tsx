import { useState, useEffect } from 'react';
import {
  FileJson,
  FolderOpen,
  Code,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react';
import * as ipc from '@/lib/ipc';
import type { AgentProfile } from '@/lib/types';

interface SettingsFileManagerProps {
  profile: AgentProfile;
  onProfileChange?: (profile: AgentProfile) => void;
}

export function SettingsFileManager({ profile, onProfileChange }: SettingsFileManagerProps) {
  const [defaultSettingsPath, setDefaultSettingsPath] = useState(profile.settingsFilePath || '');
  const [jsonEditorContent, setJsonEditorContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Load settings files from profile
  useEffect(() => {
    if (profile.settingsContent) {
      setJsonEditorContent(JSON.stringify(profile.settingsContent, null, 2));
    } else {
      setJsonEditorContent('{}');
    }
  }, [profile.settingsContent]);

  const validateJson = (content: string): boolean => {
    try {
      JSON.parse(content);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError(String(e));
      return false;
    }
  };

  const handleSaveJsonContent = () => {
    if (!validateJson(jsonEditorContent)) return;

    try {
      const parsed = JSON.parse(jsonEditorContent);
      if (onProfileChange) {
        onProfileChange({
          ...profile,
          settingsContent: parsed,
        });
      }
    } catch (e) {
      setJsonError(String(e));
    }
  };

  const handleBrowse = async () => {
    // Use Tauri's dialog API via IPC
    try {
      // For now, use prompt as placeholder
      const path = window.prompt('Enter the full path to the settings file:');
      if (path) {
        setDefaultSettingsPath(path);

        // Try to load the file content
        try {
          const content = await ipc.readFile(path);
          // Validate it's JSON
          JSON.parse(content);
          setJsonEditorContent(content);
        } catch (e) {
          console.warn('Could not load file content:', e);
        }
      }
    } catch (e) {
      console.error('Browse failed:', e);
    }
  };

  const handleSetDefaultPath = () => {
    if (onProfileChange && defaultSettingsPath) {
      onProfileChange({
        ...profile,
        settingsFilePath: defaultSettingsPath,
      });
    }
  };

  const generateSampleConfig = () => {
    const sample = {
      env: {
        ANTHROPIC_AUTH_TOKEN: '${ANTHROPIC_API_KEY}',
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
      },
      autoUpdater: {
        disabled: true,
      },
    };
    setJsonEditorContent(JSON.stringify(sample, null, 2));
    setJsonError(null);
  };

  if (!profile.supportsSettingsFile) {
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileJson className="w-4 h-4" />
          <span className="text-sm">
            This profile does not support external settings files.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Settings Path */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Default Settings File Path
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={defaultSettingsPath}
            onChange={(e) => setDefaultSettingsPath(e.target.value)}
            placeholder="e.g., ~/.claude/settings.json or C:\\Users\\...\\settings.json"
            className="flex-1 px-3 py-2 bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          <button
            onClick={handleBrowse}
            className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={handleSetDefaultPath}
            disabled={!defaultSettingsPath}
            className="px-3 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This path will be used as default when spawning agents with this profile
        </p>
      </div>

      {/* JSON Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">
            Settings Content (JSON)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={generateSampleConfig}
              className="text-xs text-accent hover:underline"
            >
              Load sample config
            </button>
            <button
              onClick={handleSaveJsonContent}
              disabled={!!jsonError}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={jsonEditorContent}
            onChange={(e) => {
              setJsonEditorContent(e.target.value);
              validateJson(e.target.value);
            }}
            placeholder="{}"
            className={`w-full h-64 px-3 py-2 bg-muted rounded-md border font-mono text-xs resize-none focus:outline-none focus:ring-2 ${
              jsonError
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-border focus:ring-accent'
            }`}
            spellCheck={false}
          />
          {jsonError ? (
            <div className="absolute bottom-2 left-2 right-2 p-2 rounded bg-red-500/20 border border-red-500/30 text-xs text-red-400">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span className="font-medium">JSON Error:</span>
              </div>
              <p className="mt-0.5 truncate">{jsonError}</p>
            </div>
          ) : (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" />
              <span>Valid JSON</span>
            </div>
          )}
        </div>

        {/* Quick Config Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1">Quick add:</span>
          {[
            { key: 'ANTHROPIC_API_KEY', value: '${ANTHROPIC_API_KEY}' },
            { key: 'ANTHROPIC_BASE_URL', value: 'https://api.anthropic.com' },
            { key: 'OPENAI_API_KEY', value: '${OPENAI_API_KEY}' },
          ].map(({ key, value }) => (
            <button
              key={key}
              onClick={() => {
                try {
                  const current = JSON.parse(jsonEditorContent || '{}');
                  if (!current.env) current.env = {};
                  current.env[key] = value;
                  setJsonEditorContent(JSON.stringify(current, null, 2));
                  setJsonError(null);
                } catch (e) {
                  // Ignore parse errors
                }
              }}
              className="px-2 py-1 text-xs bg-muted rounded border border-border hover:border-accent"
            >
              + {key}
            </button>
          ))}
        </div>
      </div>

      {/* Common Config Locations */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <h4 className="text-sm font-medium mb-2">Common Settings Locations</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <Code className="w-3 h-3" />
            <code>~/.claude/settings.json</code> - Claude Code global settings
          </li>
          <li className="flex items-center gap-2">
            <Code className="w-3 h-3" />
            <code>~/.claude/zai.json</code> - Z.AI endpoint config
          </li>
          <li className="flex items-center gap-2">
            <Code className="w-3 h-3" />
            <code>.aider.conf.yml</code> - Aider project config
          </li>
        </ul>
      </div>
    </div>
  );
}
