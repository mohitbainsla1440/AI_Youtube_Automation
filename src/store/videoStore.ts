import { create } from 'zustand';
import {
  VideoProject,
  GeneratedScript,
  VoiceSettings,
  VoiceoverJob,
  PipelineJob,
  VideoScene,
  Thumbnail,
  VideoStatus,
  ScriptGenerationRequest,
  ThumbnailGenerationRequest,
} from '@/types';
import { scriptService } from '@/services/scriptService';
import { voiceService } from '@/services/voiceService';
import { videoService } from '@/services/videoService';
import { thumbnailService } from '@/services/thumbnailService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VideoStore');

interface CreateVideoWizard {
  step: 'topic' | 'script' | 'voice' | 'visuals' | 'review';
  topic: string;
  scriptRequest: Partial<ScriptGenerationRequest>;
  generatedScript: GeneratedScript | null;
  voiceSettings: VoiceSettings;
  voiceoverJob: VoiceoverJob | null;
  thumbnailRequest: Partial<ThumbnailGenerationRequest>;
  thumbnails: Thumbnail[];
  currentProjectId: string | null;
}

interface VideoStore {
  // Project list
  projects: VideoProject[];
  totalProjects: number;
  isLoadingProjects: boolean;

  // Active project
  activeProject: VideoProject | null;
  pipelineJob: PipelineJob | null;

  // Create wizard
  wizard: CreateVideoWizard;

  // Error
  error: string | null;

  // Project list actions
  loadProjects: (page?: number) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Wizard actions
  setWizardStep: (step: CreateVideoWizard['step']) => void;
  setWizardTopic: (topic: string) => void;
  updateScriptRequest: (req: Partial<ScriptGenerationRequest>) => void;
  generateScript: () => Promise<GeneratedScript>;
  setGeneratedScript: (script: GeneratedScript) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  generateVoiceover: (apiKey: string) => Promise<VoiceoverJob>;
  generateThumbnails: (apiKey: string) => Promise<Thumbnail[]>;
  setActiveThumbnail: (thumbnailId: string) => void;
  resetWizard: () => void;

  // Pipeline
  startPipeline: (projectId: string) => Promise<void>;
  updatePipelineJob: (job: PipelineJob) => void;

  // Scene editing
  updateScene: (scene: VideoScene) => Promise<void>;
  reorderScenes: (sceneIds: string[]) => Promise<void>;

  setError: (error: string | null) => void;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceId: 'EXAVITQu4vr4xnSDxMaL',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.3,
  speed: 1.0,
  emotion: 'neutral',
};

const DEFAULT_WIZARD: CreateVideoWizard = {
  step: 'topic',
  topic: '',
  scriptRequest: {
    tone: 'educational',
    language: 'en',
    style: 'talking-head',
    targetDuration: 5,
  },
  generatedScript: null,
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  voiceoverJob: null,
  thumbnailRequest: { style: 'dramatic' },
  thumbnails: [],
  currentProjectId: null,
};

export const useVideoStore = create<VideoStore>((set, get) => ({
  projects: [],
  totalProjects: 0,
  isLoadingProjects: false,
  activeProject: null,
  pipelineJob: null,
  wizard: { ...DEFAULT_WIZARD },
  error: null,

  // ─── Project list ──────────────────────────────────────────────────────────

  loadProjects: async (page = 1) => {
    set({ isLoadingProjects: true, error: null });
    try {
      const result = await videoService.listProjects(page, 20);
      set((state) => ({
        projects: page === 1 ? result.items : [...state.projects, ...result.items],
        totalProjects: result.total,
      }));
    } catch (err) {
      const msg = (err as Error).message;
      logger.error('Failed to load projects', err);
      set({ error: msg });
    } finally {
      set({ isLoadingProjects: false });
    }
  },

  loadProject: async (id) => {
    try {
      const project = await videoService.getProject(id);
      set({ activeProject: project });
      // Also update in list
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
      }));
    } catch (err) {
      logger.error('Failed to load project', err);
      set({ error: (err as Error).message });
    }
  },

  deleteProject: async (id) => {
    await videoService.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    }));
  },

  // ─── Wizard ────────────────────────────────────────────────────────────────

  setWizardStep: (step) => set((s) => ({ wizard: { ...s.wizard, step } })),

  setWizardTopic: (topic) => set((s) => ({ wizard: { ...s.wizard, topic } })),

  updateScriptRequest: (req) =>
    set((s) => ({
      wizard: { ...s.wizard, scriptRequest: { ...s.wizard.scriptRequest, ...req } },
    })),

  generateScript: async () => {
    const { wizard } = get();
    logger.info('Generating script', { topic: wizard.topic });
    const req: ScriptGenerationRequest = {
      topic: wizard.topic,
      tone: wizard.scriptRequest.tone ?? 'educational',
      language: wizard.scriptRequest.language ?? 'en',
      style: wizard.scriptRequest.style ?? 'talking-head',
      targetDuration: wizard.scriptRequest.targetDuration ?? 5,
      targetAudience: wizard.scriptRequest.targetAudience,
      additionalContext: wizard.scriptRequest.additionalContext,
    };

    const script = await scriptService.generate(req);
    set((s) => ({
      wizard: { ...s.wizard, generatedScript: script, step: 'voice' },
    }));
    return script;
  },

  setGeneratedScript: (script) =>
    set((s) => ({ wizard: { ...s.wizard, generatedScript: script } })),

  updateVoiceSettings: (settings) =>
    set((s) => ({
      wizard: { ...s.wizard, voiceSettings: { ...s.wizard.voiceSettings, ...settings } },
    })),

  generateVoiceover: async (apiKey) => {
    const { wizard } = get();
    if (!wizard.generatedScript) throw new Error('No script generated');

    const job = await voiceService.generateVoiceover(
      wizard.generatedScript.id,
      wizard.voiceSettings,
      apiKey,
    );

    set((s) => ({ wizard: { ...s.wizard, voiceoverJob: job } }));
    return job;
  },

  generateThumbnails: async (apiKey) => {
    const { wizard } = get();
    const req: ThumbnailGenerationRequest = {
      title: wizard.generatedScript?.title ?? wizard.topic,
      style: wizard.thumbnailRequest.style ?? 'dramatic',
      textOverlay: wizard.thumbnailRequest.textOverlay,
    };

    const thumbs = await thumbnailService.generate(req, apiKey);
    set((s) => ({ wizard: { ...s.wizard, thumbnails: thumbs } }));
    return thumbs;
  },

  setActiveThumbnail: (thumbnailId) =>
    set((s) => ({
      wizard: {
        ...s.wizard,
        thumbnails: s.wizard.thumbnails.map((t) => ({
          ...t,
          isActive: t.id === thumbnailId,
        })),
      },
    })),

  resetWizard: () => set({ wizard: { ...DEFAULT_WIZARD } }),

  // ─── Pipeline ──────────────────────────────────────────────────────────────

  startPipeline: async (projectId) => {
    logger.info('Starting pipeline', { projectId });
    const job = await videoService.startPipeline(projectId);
    set({ pipelineJob: job });

    // Update project status
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, status: 'generating_script' as VideoStatus } : p,
      ),
      activeProject:
        s.activeProject?.id === projectId
          ? { ...s.activeProject, status: 'generating_script' as VideoStatus }
          : s.activeProject,
    }));
  },

  updatePipelineJob: (job) => set({ pipelineJob: job }),

  // ─── Scene editing ─────────────────────────────────────────────────────────

  updateScene: async (scene) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updated = await videoService.updateScene(activeProject.id, scene);
    set((s) => ({
      activeProject: s.activeProject
        ? {
            ...s.activeProject,
            scenes: s.activeProject.scenes.map((sc) =>
              sc.id === updated.id ? updated : sc,
            ),
          }
        : null,
    }));
  },

  reorderScenes: async (sceneIds) => {
    const { activeProject } = get();
    if (!activeProject) return;

    await videoService.reorderScenes(activeProject.id, sceneIds);
    set((s) => ({
      activeProject: s.activeProject
        ? {
            ...s.activeProject,
            scenes: sceneIds
              .map((id) => s.activeProject!.scenes.find((sc) => sc.id === id)!)
              .filter(Boolean),
          }
        : null,
    }));
  },

  setError: (error) => set({ error }),
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const useProjects = () => useVideoStore((s) => s.projects);
export const useActiveProject = () => useVideoStore((s) => s.activeProject);
export const useWizard = () => useVideoStore((s) => s.wizard);
export const usePipelineJob = () => useVideoStore((s) => s.pipelineJob);
