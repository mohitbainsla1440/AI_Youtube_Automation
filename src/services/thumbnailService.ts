import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { api } from './api';
import { Thumbnail, ThumbnailGenerationRequest, ApiResponse } from '@/types';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/helpers';

const logger = createLogger('ThumbnailService');

export const thumbnailService = {
  async generate(
    req: ThumbnailGenerationRequest,
    apiKey: string,
  ): Promise<Thumbnail[]> {
    logger.info('Generating thumbnails', { title: req.title });

    const prompts = buildThumbnailPrompts(req);
    const variants: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

    const thumbnails = await Promise.all(
      prompts.slice(0, 3).map(async (prompt, i) => {
        const url = await withRetry(() =>
          generateWithDallE(prompt, apiKey),
        );
        return {
          id: `thumb_${Date.now()}_${i}`,
          url,
          prompt,
          variant: variants[i],
          isActive: i === 0,
          ctr: 0,
        } satisfies Thumbnail;
      }),
    );

    return thumbnails;
  },

  async generateFromServer(
    projectId: string,
    req: ThumbnailGenerationRequest,
  ): Promise<Thumbnail[]> {
    const res = await api.post<ApiResponse<Thumbnail[]>>(
      `/thumbnails/generate`,
      { projectId, ...req },
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Thumbnail generation failed');
    return res.data;
  },

  async downloadThumbnail(url: string): Promise<string> {
    const filename = `thumbnail_${Date.now()}.jpg`;
    const localUri = FileSystem.documentDirectory + filename;
    const { uri } = await FileSystem.downloadAsync(url, localUri);
    return uri;
  },

  async setActiveThumbnail(projectId: string, thumbnailId: string): Promise<void> {
    await api.put(`/thumbnails/${projectId}/active`, { thumbnailId });
  },

  async trackCTR(thumbnailId: string, impressions: number, clicks: number): Promise<void> {
    await api.post(`/thumbnails/${thumbnailId}/ctr`, { impressions, clicks });
  },
};

function buildThumbnailPrompts(req: ThumbnailGenerationRequest): string[] {
  const styleGuide: Record<string, string> = {
    dramatic: 'dramatic lighting, high contrast, cinematic, dark shadows, vivid colors',
    minimal: 'clean minimal design, white background, bold typography, simple icons',
    bright: 'bright vibrant colors, energetic, optimistic, high saturation',
    dark: 'dark moody background, neon accents, mysterious, atmospheric',
    gradient: 'smooth gradient background, modern, professional, glossy',
  };

  const style = styleGuide[req.style] ?? styleGuide.dramatic;

  return [
    `YouTube thumbnail: "${req.title}", ${style}, text overlay "${req.textOverlay ?? req.title}", eye-catching, clickbait style, 16:9 ratio, professional`,
    `YouTube thumbnail: "${req.title}", ${style}, bold red and yellow color scheme, shocked expression, text "${req.textOverlay ?? req.title}", viral thumbnail style`,
    `YouTube thumbnail: "${req.title}", ${style}, blue gradient, professional design, clean layout, text "${req.textOverlay ?? req.title}", modern typography`,
  ];
}

async function generateWithDallE(prompt: string, apiKey: string): Promise<string> {
  const res = await axios.post<{ data: Array<{ url: string }> }>(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
      style: 'vivid',
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return res.data.data[0].url;
}
