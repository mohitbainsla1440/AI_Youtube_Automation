import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { api } from './api';
import {
  VideoProject,
  VideoScene,
  SubtitleEntry,
  ApiResponse,
  PaginatedResponse,
  PipelineJob,
} from '@/types';
import { createLogger } from '@/utils/logger';
import { withRetry, generateSRT } from '@/utils/helpers';

const logger = createLogger('VideoService');

export const videoService = {
  // ─── Projects ──────────────────────────────────────────────────────────────

  async createProject(data: Partial<VideoProject>): Promise<VideoProject> {
    logger.info('Creating video project', { topic: data.topic });
    const res = await api.post<ApiResponse<VideoProject>>('/videos', data);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create project');
    return res.data;
  },

  async getProject(id: string): Promise<VideoProject> {
    const res = await api.get<ApiResponse<VideoProject>>(`/videos/${id}`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Project not found');
    return res.data;
  },

  async updateProject(id: string, updates: Partial<VideoProject>): Promise<VideoProject> {
    const res = await api.put<ApiResponse<VideoProject>>(`/videos/${id}`, updates);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Update failed');
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/videos/${id}`);
    logger.info('Project deleted', { id });
  },

  async listProjects(
    page = 1,
    pageSize = 20,
    status?: string,
  ): Promise<PaginatedResponse<VideoProject>> {
    return api.get<PaginatedResponse<VideoProject>>('/videos', {
      params: { page, pageSize, status },
    });
  },

  // ─── Pipeline ──────────────────────────────────────────────────────────────

  async startPipeline(projectId: string): Promise<PipelineJob> {
    logger.info('Starting video pipeline', { projectId });
    const res = await api.post<ApiResponse<PipelineJob>>(`/videos/${projectId}/pipeline/start`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Pipeline start failed');
    return res.data;
  },

  async getPipelineStatus(projectId: string): Promise<PipelineJob> {
    const res = await api.get<ApiResponse<PipelineJob>>(`/videos/${projectId}/pipeline/status`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Status fetch failed');
    return res.data;
  },

  async retryPipeline(projectId: string, stage?: string): Promise<PipelineJob> {
    logger.info('Retrying pipeline', { projectId, stage });
    const res = await api.post<ApiResponse<PipelineJob>>(`/videos/${projectId}/pipeline/retry`, {
      stage,
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Retry failed');
    return res.data;
  },

  async pollPipelineUntilComplete(
    projectId: string,
    onProgress?: (job: PipelineJob) => void,
    intervalMs = 5000,
    timeoutMs = 3_600_000,
  ): Promise<VideoProject> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() - start > timeoutMs) {
          return reject(new Error('Pipeline timed out'));
        }
        try {
          const job = await this.getPipelineStatus(projectId);
          onProgress?.(job);

          if (job.status === 'completed') {
            const project = await this.getProject(projectId);
            return resolve(project);
          }
          if (job.status === 'failed') {
            return reject(new Error(job.error ?? 'Pipeline failed'));
          }

          setTimeout(poll, intervalMs);
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  },

  // ─── Stock Footage ─────────────────────────────────────────────────────────

  async searchPexels(
    query: string,
    apiKey: string,
    perPage = 10,
  ): Promise<Array<{ id: string; url: string; thumbnail: string; duration: number }>> {
    logger.debug('Searching Pexels', { query });
    const res = await withRetry(() =>
      axios.get<{
        videos: Array<{
          id: number;
          duration: number;
          video_files: Array<{ link: string; quality: string }>;
          image: string;
        }>;
      }>('https://api.pexels.com/videos/search', {
        headers: { Authorization: apiKey },
        params: { query, per_page: perPage, orientation: 'landscape' },
      }),
    );

    return res.data.videos.map((v) => {
      const hd = v.video_files.find((f) => f.quality === 'hd') ?? v.video_files[0];
      return {
        id: v.id.toString(),
        url: hd.link,
        thumbnail: v.image,
        duration: v.duration,
      };
    });
  },

  async searchPixabay(
    query: string,
    apiKey: string,
    perPage = 10,
  ): Promise<Array<{ id: string; url: string; thumbnail: string; duration: number }>> {
    logger.debug('Searching Pixabay', { query });
    const res = await withRetry(() =>
      axios.get<{
        hits: Array<{
          id: number;
          duration: number;
          videos: { large: { url: string }; medium: { url: string } };
          userImageURL: string;
        }>;
      }>('https://pixabay.com/api/videos/', {
        params: { key: apiKey, q: query, per_page: perPage, video_type: 'film' },
      }),
    );

    return res.data.hits.map((v) => ({
      id: v.id.toString(),
      url: v.videos.large?.url ?? v.videos.medium.url,
      thumbnail: v.userImageURL,
      duration: v.duration,
    }));
  },

  // ─── Scenes ────────────────────────────────────────────────────────────────

  async updateScene(projectId: string, scene: VideoScene): Promise<VideoScene> {
    const res = await api.put<ApiResponse<VideoScene>>(
      `/videos/${projectId}/scenes/${scene.id}`,
      scene,
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Scene update failed');
    return res.data;
  },

  async reorderScenes(projectId: string, sceneIds: string[]): Promise<void> {
    await api.put(`/videos/${projectId}/scenes/reorder`, { sceneIds });
  },

  // ─── Subtitles ─────────────────────────────────────────────────────────────

  async generateSubtitles(projectId: string): Promise<SubtitleEntry[]> {
    logger.info('Generating subtitles', { projectId });
    const res = await api.post<ApiResponse<{ subtitles: SubtitleEntry[] }>>(
      `/videos/${projectId}/subtitles`,
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Subtitle generation failed');
    return res.data.subtitles;
  },

  async exportSRT(subtitles: SubtitleEntry[]): Promise<string> {
    const srt = generateSRT(subtitles);
    const uri = FileSystem.documentDirectory + `subtitles_${Date.now()}.srt`;
    await FileSystem.writeAsStringAsync(uri, srt);
    return uri;
  },

  // ─── Render ────────────────────────────────────────────────────────────────

  async renderVideo(
    projectId: string,
    options?: { quality?: '720p' | '1080p' | '4k'; format?: 'mp4' | 'webm' },
  ): Promise<PipelineJob> {
    logger.info('Starting render', { projectId, options });
    const res = await api.post<ApiResponse<PipelineJob>>(`/videos/${projectId}/render`, options);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Render start failed');
    return res.data;
  },

  // ─── Bulk ──────────────────────────────────────────────────────────────────

  async createBulk(
    topics: string[],
    settings: { tone: string; language: string; voiceId?: string; autoPublish?: boolean },
  ): Promise<VideoProject[]> {
    logger.info('Creating bulk videos', { count: topics.length });
    const res = await api.post<ApiResponse<VideoProject[]>>('/videos/bulk', {
      topics,
      settings,
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Bulk creation failed');
    return res.data;
  },
};
