import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import axios from 'axios';
import { api } from './api';
import {
  YouTubeChannel,
  ChannelAnalytics,
  VideoProject,
  ScheduledPost,
  ApiResponse,
} from '@/types';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/helpers';

WebBrowser.maybeCompleteAuthSession();

const logger = createLogger('YouTubeService');

const YOUTUBE_CLIENT_ID = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID ?? '';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtubepartner',
];

export const youtubeService = {
  // ─── OAuth ──────────────────────────────────────────────────────────────────

  async connectChannel(redirectUri: string): Promise<YouTubeChannel> {
    logger.info('Starting YouTube OAuth');

    const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

    const request = new AuthSession.AuthRequest({
      clientId: YOUTUBE_CLIENT_ID,
      scopes: YOUTUBE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });

    if (result.type !== 'success') {
      throw new Error('YouTube authorization was cancelled or failed');
    }

    const res = await api.post<ApiResponse<YouTubeChannel>>('/youtube/connect', {
      code: result.params.code,
      codeVerifier: request.codeVerifier,
      redirectUri,
    });

    if (!res.success || !res.data) throw new Error(res.error ?? 'Channel connection failed');
    logger.info('YouTube channel connected', { channelId: res.data.id });
    return res.data;
  },

  async disconnectChannel(channelId: string): Promise<void> {
    await api.delete(`/youtube/channels/${channelId}`);
    logger.info('Channel disconnected', { channelId });
  },

  async refreshChannelToken(channelId: string): Promise<void> {
    await api.post(`/youtube/channels/${channelId}/refresh-token`);
  },

  // ─── Channels ──────────────────────────────────────────────────────────────

  async getChannels(): Promise<YouTubeChannel[]> {
    const res = await api.get<ApiResponse<YouTubeChannel[]>>('/youtube/channels');
    if (!res.success || !res.data) throw new Error(res.error ?? 'Fetch failed');
    return res.data;
  },

  async getChannel(id: string): Promise<YouTubeChannel> {
    const res = await api.get<ApiResponse<YouTubeChannel>>(`/youtube/channels/${id}`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Channel not found');
    return res.data;
  },

  async setDefaultChannel(channelId: string): Promise<void> {
    await api.put(`/youtube/channels/${channelId}/default`);
  },

  // ─── Upload ─────────────────────────────────────────────────────────────────

  async uploadVideo(
    project: VideoProject,
    channelId: string,
    options?: {
      visibility?: 'public' | 'private' | 'unlisted';
      scheduledAt?: string;
    },
  ): Promise<{ youtubeVideoId: string; url: string }> {
    logger.info('Uploading video to YouTube', {
      projectId: project.id,
      channelId,
      title: project.title,
    });

    return withRetry(async () => {
      const res = await api.post<ApiResponse<{ youtubeVideoId: string; url: string }>>(
        '/youtube/upload',
        {
          projectId: project.id,
          channelId,
          title: project.title,
          description: project.description,
          tags: project.tags,
          thumbnailUrl: project.thumbnail?.url,
          visibility: options?.visibility ?? 'public',
          scheduledAt: options?.scheduledAt,
        },
      );

      if (!res.success || !res.data) throw new Error(res.error ?? 'Upload failed');
      logger.info('Video uploaded', { youtubeVideoId: res.data.youtubeVideoId });
      return res.data;
    }, 2, 5000);
  },

  async updateVideoMetadata(
    youtubeVideoId: string,
    channelId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      thumbnailUrl?: string;
    },
  ): Promise<void> {
    await api.put(`/youtube/videos/${youtubeVideoId}`, { channelId, ...updates });
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getChannelAnalytics(
    channelId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<ChannelAnalytics> {
    logger.info('Fetching analytics', { channelId, period });
    const res = await api.get<ApiResponse<ChannelAnalytics>>(
      `/youtube/channels/${channelId}/analytics`,
      { params: { period } },
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Analytics fetch failed');
    return res.data;
  },

  // ─── SEO Optimizer ─────────────────────────────────────────────────────────

  async optimizeSEO(
    topic: string,
    draft: { title?: string; description?: string; tags?: string[] },
  ): Promise<{ title: string; description: string; tags: string[] }> {
    const res = await api.post<
      ApiResponse<{ title: string; description: string; tags: string[] }>
    >('/youtube/seo/optimize', { topic, draft });
    if (!res.success || !res.data) throw new Error(res.error ?? 'SEO optimization failed');
    return res.data;
  },

  // ─── Scheduler ─────────────────────────────────────────────────────────────

  async schedulePost(
    projectId: string,
    channelId: string,
    scheduledAt: string,
    visibility: 'public' | 'private' | 'unlisted' = 'public',
  ): Promise<ScheduledPost> {
    logger.info('Scheduling post', { projectId, scheduledAt });
    const res = await api.post<ApiResponse<ScheduledPost>>('/scheduler/posts', {
      videoProjectId: projectId,
      channelId,
      scheduledAt,
      visibility,
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Scheduling failed');
    return res.data;
  },

  async getScheduledPosts(channelId?: string): Promise<ScheduledPost[]> {
    const res = await api.get<ApiResponse<ScheduledPost[]>>('/scheduler/posts', {
      params: { channelId },
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Fetch failed');
    return res.data;
  },

  async cancelScheduledPost(postId: string): Promise<void> {
    await api.delete(`/scheduler/posts/${postId}`);
  },
};
