import { useProjectStore } from '@/stores/projectStore';
import { AgentGrid } from '../AgentGrid/AgentGrid';
import { FileManager } from '../Workspace/FileManager/FileManager';
import { GitPanel } from '../Workspace/Git/GitPanel';
import { SettingsPanel } from '../Workspace/SettingsPanel';
import { SpawnDialog } from '../Spawn/SpawnDialog';

export function MainArea() {
  const { viewMode } = useProjectStore();

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex-1 overflow-hidden">
        {viewMode === 'agents' && <AgentGrid />}
        {viewMode === 'files' && <FileManager />}
        {viewMode === 'git' && <GitPanel />}
        {viewMode === 'settings' && <SettingsPanel />}
      </div>
      <SpawnDialog />
    </main>
  );
}
