import { create } from 'zustand';
import { YouTubeChannel, ChannelAnalytics, ScheduledPost } from '@/types';
import { youtubeService } from '@/services/youtubeService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ChannelStore');

interface ChannelStore {
  channels: YouTubeChannel[];
  activeChannelId: string | null;
  analytics: Record<string, ChannelAnalytics>;
  scheduledPosts: ScheduledPost[];
  isLoading: boolean;
  error: string | null;

  loadChannels: () => Promise<void>;
  setActiveChannel: (channelId: string) => void;
  connectChannel: (redirectUri: string) => Promise<YouTubeChannel>;
  disconnectChannel: (channelId: string) => Promise<void>;
  loadAnalytics: (channelId: string, period?: '7d' | '30d' | '90d' | '1y') => Promise<void>;
  loadScheduledPosts: (channelId?: string) => Promise<void>;
  cancelScheduledPost: (postId: string) => Promise<void>;
}

export const useChannelStore = create<ChannelStore>((set, get) => ({
  channels: [],
  activeChannelId: null,
  analytics: {},
  scheduledPosts: [],
  isLoading: false,
  error: null,

  loadChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      const channels = await youtubeService.getChannels();
      const defaultChannel = channels.find((c) => c.isDefault);
      set({
        channels,
        activeChannelId: defaultChannel?.id ?? channels[0]?.id ?? null,
      });
    } catch (err) {
      logger.error('Failed to load channels', err);
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveChannel: (channelId) => {
    set({ activeChannelId: channelId });
  },

  connectChannel: async (redirectUri) => {
    set({ isLoading: true });
    try {
      const channel = await youtubeService.connectChannel(redirectUri);
      set((s) => ({ channels: [...s.channels, channel] }));
      if (!get().activeChannelId) set({ activeChannelId: channel.id });
      return channel;
    } finally {
      set({ isLoading: false });
    }
  },

  disconnectChannel: async (channelId) => {
    await youtubeService.disconnectChannel(channelId);
    set((s) => {
      const remaining = s.channels.filter((c) => c.id !== channelId);
      return {
        channels: remaining,
        activeChannelId:
          s.activeChannelId === channelId ? (remaining[0]?.id ?? null) : s.activeChannelId,
      };
    });
  },

  loadAnalytics: async (channelId, period = '30d') => {
    try {
      const analytics = await youtubeService.getChannelAnalytics(channelId, period);
      set((s) => ({ analytics: { ...s.analytics, [channelId]: analytics } }));
    } catch (err) {
      logger.error('Failed to load analytics', err);
    }
  },

  loadScheduledPosts: async (channelId) => {
    try {
      const posts = await youtubeService.getScheduledPosts(channelId);
      set({ scheduledPosts: posts });
    } catch (err) {
      logger.error('Failed to load scheduled posts', err);
    }
  },

  cancelScheduledPost: async (postId) => {
    await youtubeService.cancelScheduledPost(postId);
    set((s) => ({
      scheduledPosts: s.scheduledPosts.filter((p) => p.id !== postId),
    }));
  },
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const useChannels = () => useChannelStore((s) => s.channels);
export const useActiveChannel = () => {
  const { channels, activeChannelId } = useChannelStore();
  return channels.find((c) => c.id === activeChannelId) ?? null;
};
export const useChannelAnalytics = (channelId: string) =>
  useChannelStore((s) => s.analytics[channelId]);
