// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: SubscriptionPlan;
  createdAt: string;
  youtubeConnected: boolean;
}

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ─── Script ───────────────────────────────────────────────────────────────────

export type VideoTone = 'educational' | 'storytelling' | 'viral' | 'documentary' | 'casual';
export type VideoLanguage = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'pt' | 'ja' | 'ko' | 'zh';
export type VideoStyle = 'talking-head' | 'slideshow' | 'animation' | 'shorts';

export interface ScriptSection {
  type: 'hook' | 'intro' | 'body' | 'cta';
  text: string;
  duration: number; // seconds
  keywords: string[];
}

export interface GeneratedScript {
  id: string;
  topic: string;
  tone: VideoTone;
  language: VideoLanguage;
  title: string;
  description: string;
  tags: string[];
  sections: ScriptSection[];
  fullText: string;
  estimatedDuration: number;
  hooks: string[];
  createdAt: string;
}

export interface ScriptGenerationRequest {
  topic: string;
  tone: VideoTone;
  language: VideoLanguage;
  style: VideoStyle;
  targetDuration: number; // minutes
  targetAudience?: string;
  additionalContext?: string;
}

// ─── Voice ────────────────────────────────────────────────────────────────────

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  accent?: string;
  previewUrl?: string;
  category: 'professional' | 'casual' | 'dramatic' | 'news';
}

export interface VoiceSettings {
  voiceId: string;
  stability: number;       // 0–1
  similarityBoost: number; // 0–1
  style: number;           // 0–1
  speed: number;           // 0.5–2.0
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'serious';
}

export interface VoiceoverJob {
  id: string;
  scriptId: string;
  status: JobStatus;
  audioUrl?: string;
  duration?: number;
  settings: VoiceSettings;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ─── Video ────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface VideoScene {
  id: string;
  order: number;
  scriptSection: ScriptSection;
  clipUrl?: string;
  clipSource: 'pexels' | 'pixabay' | 'runway' | 'pika' | 'upload';
  duration: number;
  transition: 'fade' | 'slide' | 'zoom' | 'cut' | 'dissolve';
  keywords: string[];
  subtitle?: SubtitleEntry;
}

export interface SubtitleEntry {
  startTime: number;
  endTime: number;
  text: string;
  highlightedWords?: string[];
}

export interface BackgroundMusic {
  id: string;
  name: string;
  url: string;
  genre: string;
  bpm: number;
  duration: number;
}

export interface VideoProject {
  id: string;
  userId: string;
  channelId?: string;
  title: string;
  description: string;
  tags: string[];
  topic: string;
  status: VideoStatus;
  script?: GeneratedScript;
  voiceover?: VoiceoverJob;
  scenes: VideoScene[];
  subtitles: SubtitleEntry[];
  backgroundMusic?: BackgroundMusic;
  thumbnail?: Thumbnail;
  outputUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  youtubeVideoId?: string;
  analytics?: VideoAnalytics;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus =
  | 'draft'
  | 'generating_script'
  | 'generating_voice'
  | 'generating_visuals'
  | 'rendering'
  | 'ready'
  | 'scheduled'
  | 'uploading'
  | 'published'
  | 'failed';

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export interface Thumbnail {
  id: string;
  url: string;
  prompt?: string;
  variant: 'A' | 'B' | 'C';
  ctr?: number; // click-through rate
  isActive: boolean;
}

export interface ThumbnailGenerationRequest {
  title: string;
  style: 'dramatic' | 'minimal' | 'bright' | 'dark' | 'gradient';
  textOverlay?: string;
  colorScheme?: string;
  faceImage?: string;
}

// ─── Channel ──────────────────────────────────────────────────────────────────

export interface YouTubeChannel {
  id: string;
  youtubeChannelId: string;
  name: string;
  handle: string;
  avatar?: string;
  banner?: string;
  subscriberCount: number;
  videoCount: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ChannelAnalytics {
  channelId: string;
  period: '7d' | '30d' | '90d' | '1y';
  totalViews: number;
  totalWatchTime: number; // minutes
  avgCTR: number;
  subscribers: number;
  subscriberChange: number;
  topVideos: VideoAnalytics[];
  dailyViews: DailyMetric[];
}

export interface VideoAnalytics {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  watchTime: number;
  ctr: number;
  likes: number;
  comments: number;
  impressions: number;
  avgViewDuration: number;
  publishedAt: string;
}

export interface DailyMetric {
  date: string;
  views: number;
  watchTime: number;
  subscribers: number;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export interface ScheduledPost {
  id: string;
  videoProjectId: string;
  channelId: string;
  scheduledAt: string;
  status: 'pending' | 'uploaded' | 'failed';
  title: string;
  description: string;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
  createdAt: string;
}

// ─── Subscription & Billing ───────────────────────────────────────────────────

export interface PlanFeatures {
  videosPerMonth: number;
  maxDuration: number; // minutes
  voiceClones: number;
  channels: number;
  analytics: boolean;
  bulkCreation: boolean;
  aiAvatars: boolean;
  shorts: boolean;
  scheduling: boolean;
  customBranding: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    videosPerMonth: 3,
    maxDuration: 5,
    voiceClones: 0,
    channels: 1,
    analytics: false,
    bulkCreation: false,
    aiAvatars: false,
    shorts: false,
    scheduling: false,
    customBranding: false,
  },
  pro: {
    videosPerMonth: 30,
    maxDuration: 15,
    voiceClones: 3,
    channels: 3,
    analytics: true,
    bulkCreation: true,
    aiAvatars: false,
    shorts: true,
    scheduling: true,
    customBranding: true,
  },
  enterprise: {
    videosPerMonth: Infinity,
    maxDuration: 60,
    voiceClones: 10,
    channels: Infinity,
    analytics: true,
    bulkCreation: true,
    aiAvatars: true,
    shorts: true,
    scheduling: true,
    customBranding: true,
  },
};

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  openaiApiKey?: string;
  elevenLabsApiKey?: string;
  pexelsApiKey?: string;
  pixabayApiKey?: string;
  runwayApiKey?: string;
  stabilityApiKey?: string;
  defaultTone: VideoTone;
  defaultLanguage: VideoLanguage;
  defaultVoiceId?: string;
  autoPublish: boolean;
  addWatermark: boolean;
  defaultVisibility: 'public' | 'private' | 'unlisted';
  notifications: {
    email: boolean;
    push: boolean;
    onComplete: boolean;
    onError: boolean;
  };
}

// ─── Job Pipeline ─────────────────────────────────────────────────────────────

export interface PipelineJob {
  id: string;
  projectId: string;
  stage: PipelineStage;
  status: JobStatus;
  progress: number; // 0–100
  retryCount: number;
  maxRetries: number;
  logs: JobLog[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export type PipelineStage =
  | 'script'
  | 'voice'
  | 'visuals'
  | 'subtitles'
  | 'render'
  | 'thumbnail'
  | 'upload';

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'education' | 'finance' | 'facts' | 'tech' | 'health' | 'entertainment' | 'news';
  description: string;
  prompt: string;
  tone: VideoTone;
  icon: string;
  exampleOutput?: string;
}
