import { useState, useCallback } from 'react';
import { useVideoStore } from '@/store/videoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { videoService } from '@/services/videoService';
import { PipelineJob, PipelineStage, VideoProject } from '@/types';
import { createLogger } from '@/utils/logger';
import { getPipelineProgress } from '@/utils/helpers';

const logger = createLogger('useVideoCreation');

export interface CreationState {
  isCreating: boolean;
  stage: PipelineStage | null;
  progress: number;
  stageLabel: string;
  error: string | null;
  project: VideoProject | null;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  script: 'Writing script…',
  voice: 'Recording voiceover…',
  visuals: 'Finding visuals…',
  subtitles: 'Generating subtitles…',
  render: 'Rendering video…',
  thumbnail: 'Creating thumbnail…',
  upload: 'Uploading to YouTube…',
};

export function useVideoCreation() {
  const { startPipeline, updatePipelineJob } = useVideoStore();
  const { settings } = useSettingsStore();

  const [state, setState] = useState<CreationState>({
    isCreating: false,
    stage: null,
    progress: 0,
    stageLabel: '',
    error: null,
    project: null,
  });

  const create = useCallback(
    async (projectId: string): Promise<VideoProject | null> => {
      setState({ isCreating: true, stage: 'script', progress: 0, stageLabel: STAGE_LABELS.script, error: null, project: null });
      logger.info('Starting video creation pipeline', { projectId });

      try {
        await startPipeline(projectId);

        const project = await videoService.pollPipelineUntilComplete(
          projectId,
          (job: PipelineJob) => {
            const stage = job.stage as PipelineStage;
            const progress = getPipelineProgress(stage, job.progress);
            const label = STAGE_LABELS[stage] ?? 'Processing…';
            setState((s) => ({ ...s, stage, progress, stageLabel: label }));
            updatePipelineJob(job);
          },
        );

        setState((s) => ({ ...s, isCreating: false, progress: 100, project }));
        logger.info('Video creation complete', { projectId });
        return project;
      } catch (err) {
        const error = (err as Error).message;
        logger.error('Video creation failed', { projectId, error });
        setState((s) => ({ ...s, isCreating: false, error }));
        return null;
      }
    },
    [startPipeline, updatePipelineJob],
  );

  const reset = useCallback(() => {
    setState({ isCreating: false, stage: null, progress: 0, stageLabel: '', error: null, project: null });
  }, []);

  return { ...state, create, reset };
}
