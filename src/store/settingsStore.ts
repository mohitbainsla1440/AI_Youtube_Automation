import { create } from 'zustand';
import { Platform } from 'react-native';
import { AppSettings } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsStore');
const SETTINGS_KEY = 'app_settings';

// Unified async storage: localStorage on web, AsyncStorage on native
const storage = Platform.OS === 'web'
  ? {
      getItem: async (key: string): Promise<string | null> => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      setItem: async (key: string, value: string): Promise<void> => {
        try { localStorage.setItem(key, value); } catch { /* no-op */ }
      },
      removeItem: async (key: string): Promise<void> => {
        try { localStorage.removeItem(key); } catch { /* no-op */ }
      },
    }
  : require('@react-native-async-storage/async-storage').default;

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: '',
  elevenLabsApiKey: '',
  pexelsApiKey: '',
  pixabayApiKey: '',
  runwayApiKey: '',
  stabilityApiKey: '',
  defaultTone: 'educational',
  defaultLanguage: 'en',
  defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  autoPublish: false,
  addWatermark: false,
  defaultVisibility: 'public',
  notifications: {
    email: true,
    push: true,
    onComplete: true,
    onError: true,
  },
};

async function loadFromStorage(): Promise<AppSettings> {
  try {
    const raw = await storage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    logger.warn('Failed to load settings from storage');
  }
  return { ...DEFAULT_SETTINGS };
}

async function saveToStorage(settings: AppSettings) {
  try {
    await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    logger.warn('Failed to save settings to storage');
  }
}

interface SettingsStore {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateApiKey: (key: keyof AppSettings, value: string) => void;
  resetSettings: () => void;
  hasRequiredKeys: () => boolean;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,

  hydrate: async () => {
    const settings = await loadFromStorage();
    set({ settings, hydrated: true });
  },

  updateSettings: (updates) => {
    set((s) => {
      const newSettings = { ...s.settings, ...updates };
      saveToStorage(newSettings);
      return { settings: newSettings };
    });
  },

  updateApiKey: (key, value) => {
    set((s) => {
      const newSettings = { ...s.settings, [key]: value };
      saveToStorage(newSettings);
      return { settings: newSettings };
    });
    logger.info('API key updated', { key });
  },

  resetSettings: () => {
    storage.removeItem(SETTINGS_KEY);
    set({ settings: { ...DEFAULT_SETTINGS } });
  },

  hasRequiredKeys: () => {
    const { settings } = get();
    return !!(settings.openaiApiKey && settings.elevenLabsApiKey);
  },
}));

// Kick off hydration immediately
useSettingsStore.getState().hydrate();

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const useSettings = () => useSettingsStore((s) => s.settings);
export const useApiKey = (key: keyof AppSettings) =>
  useSettingsStore((s) => s.settings[key] as string);
export const useHasRequiredKeys = () => useSettingsStore((s) => s.hasRequiredKeys());
