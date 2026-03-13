import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfileStore } from '../profileStore';
import type { AgentProfile } from '@/lib/types';

// Mock the IPC module
vi.mock('@/lib/ipc', () => ({
  discoverClis: vi.fn().mockResolvedValue([]),
  validateCommand: vi.fn().mockResolvedValue({ isValid: true, version: '1.0.0' }),
}));

describe('profileStore', () => {
  beforeEach(() => {
    // Reset store to initial state but keep default profiles
    useProfileStore.setState({
      profiles: [],
      settingsFiles: [],
      discoveredClis: [],
      isDiscovering: false,
    });
  });

  describe('addProfile', () => {
    it('should add a new profile', () => {
      const newProfile: AgentProfile = {
        id: 'custom-profile',
        name: 'Custom Agent',
        icon: 'Bot',
        color: '#ff0000',
        description: 'Test profile',
        provider: 'Test',
        acpCommand: 'test-agent',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(newProfile);

      const profiles = useProfileStore.getState().profiles;
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('Custom Agent');
      expect(profiles[0].createdAt).toBeDefined();
    });

    it('should set timestamps when adding profile', () => {
      const beforeAdd = Date.now();
      const newProfile: AgentProfile = {
        id: 'test',
        name: 'Test',
        icon: 'Bot',
        color: '#000',
        description: 'Test',
        provider: 'Test',
        acpCommand: 'test',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(newProfile);
      const afterAdd = Date.now();

      const profile = useProfileStore.getState().profiles[0];
      expect(profile.createdAt).toBeGreaterThanOrEqual(beforeAdd);
      expect(profile.createdAt).toBeLessThanOrEqual(afterAdd);
    });
  });

  describe('updateProfile', () => {
    it('should update profile properties', () => {
      const newProfile: AgentProfile = {
        id: 'test-profile',
        name: 'Original Name',
        icon: 'Bot',
        color: '#000',
        description: 'Test',
        provider: 'Test',
        acpCommand: 'test',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(newProfile);
      useProfileStore.getState().updateProfile('test-profile', { name: 'Updated Name' });

      const profile = useProfileStore.getState().getProfileById('test-profile');
      expect(profile?.name).toBe('Updated Name');
    });

    it('should update updatedAt timestamp', () => {
      const newProfile: AgentProfile = {
        id: 'test-profile',
        name: 'Test',
        icon: 'Bot',
        color: '#000',
        description: 'Test',
        provider: 'Test',
        acpCommand: 'test',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(newProfile);
      const beforeUpdate = Date.now();
      useProfileStore.getState().updateProfile('test-profile', { color: '#fff' });
      const afterUpdate = Date.now();

      const profile = useProfileStore.getState().getProfileById('test-profile');
      expect(profile?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(profile?.updatedAt).toBeLessThanOrEqual(afterUpdate);
    });
  });

  describe('removeProfile', () => {
    it('should remove profile by id', () => {
      const profile: AgentProfile = {
        id: 'to-remove',
        name: 'To Remove',
        icon: 'Bot',
        color: '#000',
        description: 'Test',
        provider: 'Test',
        acpCommand: 'test',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(profile);
      expect(useProfileStore.getState().profiles).toHaveLength(1);

      useProfileStore.getState().removeProfile('to-remove');
      expect(useProfileStore.getState().profiles).toHaveLength(0);
    });
  });

  describe('getProfileById', () => {
    it('should return profile by id', () => {
      const profile: AgentProfile = {
        id: 'find-me',
        name: 'Find Me',
        icon: 'Bot',
        color: '#000',
        description: 'Test',
        provider: 'Test',
        acpCommand: 'test',
        acpArgs: [],
        extraArgs: [],
        env: {},
        modes: [],
        supportsSettingsFile: false,
        supportsPromptInput: true,
      };

      useProfileStore.getState().addProfile(profile);
      const found = useProfileStore.getState().getProfileById('find-me');

      expect(found?.name).toBe('Find Me');
    });

    it('should return undefined for non-existent profile', () => {
      const found = useProfileStore.getState().getProfileById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('settingsFiles', () => {
    it('should add settings file', () => {
      useProfileStore.getState().addSettingsFile({
        id: 'settings-1',
        name: 'settings.json',
        profileId: 'profile-1',
        path: '/path/to/settings.json',
        content: '{}',
        format: 'json',
        isValid: true,
      });

      expect(useProfileStore.getState().settingsFiles).toHaveLength(1);
    });

    it('should get settings files for profile', () => {
      const store = useProfileStore.getState();

      store.addSettingsFile({
        id: 'settings-1',
        name: 'a.json',
        profileId: 'profile-a',
        path: '/path/a.json',
        content: '{}',
        format: 'json',
        isValid: true,
      });

      store.addSettingsFile({
        id: 'settings-2',
        name: 'b.json',
        profileId: 'profile-b',
        path: '/path/b.json',
        content: '{}',
        format: 'json',
        isValid: true,
      });

      store.addSettingsFile({
        id: 'settings-3',
        name: 'a2.json',
        profileId: 'profile-a',
        path: '/path/a2.json',
        content: '{}',
        format: 'json',
        isValid: true,
      });

      const profileAFiles = store.getSettingsFilesForProfile('profile-a');
      expect(profileAFiles).toHaveLength(2);
    });

    it('should remove settings file', () => {
      useProfileStore.getState().addSettingsFile({
        id: 'settings-1',
        name: 'settings.json',
        profileId: 'profile-1',
        path: '/path/to/settings.json',
        content: '{}',
        format: 'json',
        isValid: true,
      });

      useProfileStore.getState().removeSettingsFile('settings-1');
      expect(useProfileStore.getState().settingsFiles).toHaveLength(0);
    });
  });
});
