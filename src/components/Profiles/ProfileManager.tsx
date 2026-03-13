import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  FileJson,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useProfileStore, PREDEFINED_MODES } from '@/stores/profileStore';
import { ProfileEditor } from './ProfileEditor';
import { SettingsFileEditor } from './SettingsFileEditor';
import { DiscoveredCliImport } from './DiscoveredCliImport';
import type { AgentProfile } from '@/lib/types';

export function ProfileManager() {
  const { profiles, removeProfile, discoverProfiles, discoveredClis, isDiscovering } = useProfileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfile, setEditingProfile] = useState<AgentProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [settingsProfile, setSettingsProfile] = useState<AgentProfile | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Run discovery on mount
  useEffect(() => {
    discoverProfiles();
  }, []);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.acpCommand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate auto-discovered and custom profiles
  const autoDiscoveredProfiles = filteredProfiles.filter((p) => p.isAutoDiscovered);
  const customProfiles = filteredProfiles.filter((p) => !p.isAutoDiscovered);

  // Find CLIs that are not yet imported
  const availableClis = discoveredClis.filter(
    (cli) => cli.isAvailable && !profiles.some((p) => p.acpCommand === cli.command && p.isAutoDiscovered)
  );

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingProfile({
      id: `profile_${Date.now()}`,
      name: 'New Profile',
      icon: 'Bot',
      color: '#3b82f6',
      description: '',
      provider: 'Custom',
      acpCommand: '',
      acpArgs: [],
      extraArgs: [],
      env: {},
      modes: [PREDEFINED_MODES.safe, PREDEFINED_MODES.cautious],
      supportsSettingsFile: false,
      supportsPromptInput: true,
      promptFlag: '-p',
      isAutoDiscovered: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold">Agent Profiles</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => discoverProfiles()}
            disabled={isDiscovering}
            className="p-2 rounded-md hover:bg-secondary disabled:opacity-50"
            title="Discover from system"
          >
            <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          </button>
          {availableClis.length > 0 && (
            <button
              onClick={() => setShowDiscovery(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30"
            >
              <Sparkles className="w-4 h-4" />
              {availableClis.length} found
            </button>
          )}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Profile List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Available CLIs Alert */}
        {availableClis.length > 0 && !showDiscovery && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">
                {availableClis.length} CLI tool{availableClis.length > 1 ? 's' : ''} detected
              </span>
            </div>
            <button
              onClick={() => setShowDiscovery(true)}
              className="text-sm text-green-400 hover:underline"
            >
              Import
            </button>
          </div>
        )}

        {/* Auto-discovered Profiles Section */}
        {autoDiscoveredProfiles.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Auto-Discovered
            </h3>
            <div className="space-y-2">
              {autoDiscoveredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onEdit={() => setEditingProfile(profile)}
                  onDelete={() => {
                    if (confirm(`Delete profile "${profile.name}"?`)) {
                      removeProfile(profile.id);
                    }
                  }}
                  onEditSettings={profile.supportsSettingsFile ? () => setSettingsProfile(profile) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Profiles Section */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Custom Profiles
          </h3>
          <div className="space-y-2">
            {customProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => setEditingProfile(profile)}
                onDelete={() => {
                  if (confirm(`Delete profile "${profile.name}"?`)) {
                    removeProfile(profile.id);
                  }
                }}
                onEditSettings={profile.supportsSettingsFile ? () => setSettingsProfile(profile) : undefined}
              />
            ))}

            {customProfiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No custom profiles</p>
                <button
                  onClick={handleCreateNew}
                  className="text-sm text-accent hover:underline mt-2"
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {(editingProfile || isCreating) && (
        <ProfileEditor
          profile={editingProfile}
          isNew={isCreating}
          onClose={() => {
            setEditingProfile(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Settings File Editor */}
      {settingsProfile && (
        <SettingsFileEditor
          profile={settingsProfile}
          isOpen={!!settingsProfile}
          onClose={() => setSettingsProfile(null)}
        />
      )}

      {/* Discovery Import Modal */}
      {showDiscovery && (
        <DiscoveredCliImport
          discoveredClis={availableClis}
          onClose={() => setShowDiscovery(false)}
        />
      )}
    </div>
  );
}

interface ProfileCardProps {
  profile: AgentProfile;
  onEdit: () => void;
  onDelete: () => void;
  onEditSettings?: () => void;
}

function ProfileCard({ profile, onEdit, onDelete, onEditSettings }: ProfileCardProps) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-accent/50 transition-colors">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: profile.color }}
      >
        <Bot className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{profile.name}</span>
          {profile.isAutoDiscovered && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              Auto
            </span>
          )}
          {profile.isValid !== undefined && (
            <div className="group/icon relative">
              {profile.isValid ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-400" />
              )}
              {!profile.isValid && profile.validationError && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {profile.validationError}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {profile.provider} • {profile.acpCommand}
        </div>
        {profile.description && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {profile.description}
          </div>
        )}
        {profile.version && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            v{profile.version}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEditSettings && (
          <button
            onClick={onEditSettings}
            className="p-1.5 rounded-md hover:bg-secondary"
            title="Edit Settings File"
          >
            <FileJson className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-secondary"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
