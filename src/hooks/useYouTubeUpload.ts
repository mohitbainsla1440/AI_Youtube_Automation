import { useState, useCallback } from 'react';
import { youtubeService } from '@/services/youtubeService';
import { videoService } from '@/services/videoService';
import { VideoProject } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useYouTubeUpload');

interface UploadState {
  isUploading: boolean;
  progress: number;
  stage: string;
  error: string | null;
  youtubeUrl: string | null;
}

export function useYouTubeUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    stage: '',
    error: null,
    youtubeUrl: null,
  });

  const upload = useCallback(
    async (
      projectId: string,
      channelId: string,
      options?: { visibility?: 'public' | 'private' | 'unlisted'; scheduledAt?: string },
    ): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, stage: 'Preparing…', error: null, youtubeUrl: null });
      logger.info('Starting YouTube upload', { projectId, channelId });

      try {
        setState((s) => ({ ...s, progress: 20, stage: 'Loading project…' }));
        const project: VideoProject = await videoService.getProject(projectId);

        if (!project.outputUrl) {
          throw new Error('Video not yet rendered. Please render the video first.');
        }

        setState((s) => ({ ...s, progress: 50, stage: 'Uploading to YouTube…' }));
        const { youtubeVideoId, url } = await youtubeService.uploadVideo(
          project,
          channelId,
          options,
        );

        setState((s) => ({ ...s, progress: 90, stage: 'Finalizing…' }));

        // Persist youtubeVideoId on project
        await videoService.updateProject(projectId, {
          youtubeVideoId,
          status: options?.scheduledAt ? 'scheduled' : 'published',
          publishedAt: options?.scheduledAt ? undefined : new Date().toISOString(),
        });

        setState((s) => ({ ...s, isUploading: false, progress: 100, youtubeUrl: url }));
        logger.info('Upload complete', { youtubeVideoId, url });
        return url;
      } catch (err) {
        const error = (err as Error).message;
        logger.error('Upload failed', { projectId, error });
        setState((s) => ({ ...s, isUploading: false, error }));
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, stage: '', error: null, youtubeUrl: null });
  }, []);

  return { ...state, upload, reset };
}
