import { useState, useEffect } from 'react';
import { Search, Bot, Check, AlertCircle } from 'lucide-react';
import { useProfileStore, PREDEFINED_MODES } from '@/stores/profileStore';
import * as ipc from '@/lib/ipc';
import type { AgentProfile, DiscoveredCli } from '@/lib/types';

export function ProfileDiscovery() {
  const { addProfile, profiles } = useProfileStore();
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredCli[]>([]);

  useEffect(() => {
    scanForAgents();
  }, []);

  const scanForAgents = async () => {
    setScanning(true);
    try {
      const clis = await ipc.discoverClis();
      setDiscovered(clis);
    } catch (error) {
      console.error('Failed to discover CLIs:', error);
      setDiscovered([]);
    } finally {
      setScanning(false);
    }
  };

  const handleAddProfile = (cli: DiscoveredCli) => {
    const newProfile: AgentProfile = {
      id: `profile_${Date.now()}`,
      name: cli.name,
      icon: 'Bot',
      color: getColor(cli.command),
      description: `${cli.name} AI agent`,
      provider: cli.name,
      acpCommand: cli.command,
      acpArgs: [],
      extraArgs: [],
      env: {},
      modes: [PREDEFINED_MODES.safe, PREDEFINED_MODES.cautious],
      supportsSettingsFile: false,
      supportsPromptInput: true,
      promptFlag: '-p',
      isAutoDiscovered: true,
      detectedPath: cli.detectedPath,
      version: cli.version,
    };

    addProfile(newProfile);
  };

  const isAlreadyAdded = (command: string) => {
    return profiles.some((p) => p.acpCommand === command);
  };

  const getColor = (command: string) => {
    const colorMap: Record<string, string> = {
      claude: '#d97757',
      codex: '#10a37f',
      gemini: '#4285f4',
      aider: '#c4902c',
    };
    return colorMap[command] || '#3b82f6';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Discovered Agents</h3>
        <button
          onClick={scanForAgents}
          disabled={scanning}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline disabled:opacity-50"
        >
          <Search className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      <div className="space-y-2">
        {discovered.map((cli) => {
          const alreadyAdded = isAlreadyAdded(cli.command);

          return (
            <div
              key={cli.command}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                cli.isAvailable
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-border bg-muted/30 opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  cli.isAvailable ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{cli.name}</div>
                <div className="text-xs text-muted-foreground">
                  {cli.command}
                  {cli.version && ` v${cli.version}`}
                </div>
              </div>

              {cli.isAvailable ? (
                alreadyAdded ? (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="w-3.5 h-3.5" />
                    Added
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddProfile(cli)}
                    className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
                  >
                    Add
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Not found
                </div>
              )}
            </div>
          );
        })}

        {!scanning && discovered.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No CLI tools found. Click Rescan to search again.
          </div>
        )}
      </div>
    </div>
  );
}
