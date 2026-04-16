import { VideoTone, VideoLanguage, Voice, PromptTemplate, BackgroundMusic } from '@/types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.aiyoutube.app/v1';

export const TONES: { value: VideoTone; label: string; emoji: string; description: string }[] = [
  {
    value: 'educational',
    label: 'Educational',
    emoji: '📚',
    description: 'Clear, structured & informative',
  },
  {
    value: 'storytelling',
    label: 'Storytelling',
    emoji: '📖',
    description: 'Narrative & emotionally engaging',
  },
  { value: 'viral', label: 'Viral', emoji: '🔥', description: 'Hook-heavy & trend-optimized' },
  {
    value: 'documentary',
    label: 'Documentary',
    emoji: '🎬',
    description: 'Deep-dive investigative tone',
  },
  { value: 'casual', label: 'Casual', emoji: '😊', description: 'Conversational & relatable' },
];

export const LANGUAGES: { value: VideoLanguage; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { value: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'ko', label: 'Korean', flag: '🇰🇷' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
];

export const SAMPLE_VOICES: Voice[] = [
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    language: 'English',
    accent: 'American',
    category: 'professional',
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'male',
    language: 'English',
    accent: 'American',
    category: 'casual',
  },
  {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    gender: 'female',
    language: 'English',
    accent: 'British',
    category: 'professional',
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'male',
    language: 'English',
    accent: 'American',
    category: 'dramatic',
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    gender: 'male',
    language: 'English',
    accent: 'American',
    category: 'news',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    language: 'English',
    accent: 'American',
    category: 'professional',
  },
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'edu-science',
    name: 'Science Explained',
    category: 'education',
    description: 'Break down complex science topics simply',
    prompt: 'Explain {topic} in a way that a 15-year-old can understand, with real-world examples',
    tone: 'educational',
    icon: '🔬',
  },
  {
    id: 'finance-tips',
    name: 'Money Tips',
    category: 'finance',
    description: 'Personal finance advice and tips',
    prompt: 'Give actionable personal finance tips about {topic} with stats and examples',
    tone: 'educational',
    icon: '💰',
  },
  {
    id: 'facts-list',
    name: 'Mind-Blowing Facts',
    category: 'facts',
    description: 'Viral fact-based content',
    prompt: 'Share 10 mind-blowing facts about {topic} that most people don\'t know',
    tone: 'viral',
    icon: '🤯',
  },
  {
    id: 'tech-review',
    name: 'Tech Deep Dive',
    category: 'tech',
    description: 'In-depth technology analysis',
    prompt: 'Provide a comprehensive analysis of {topic} covering pros, cons, and future outlook',
    tone: 'documentary',
    icon: '⚡',
  },
  {
    id: 'health-tips',
    name: 'Health & Wellness',
    category: 'health',
    description: 'Evidence-based health content',
    prompt: 'Explain the science behind {topic} and give actionable health tips',
    tone: 'educational',
    icon: '🏥',
  },
  {
    id: 'story-drama',
    name: 'True Story',
    category: 'entertainment',
    description: 'Dramatic storytelling format',
    prompt: 'Tell the story of {topic} in a dramatic, cinematic narrative style',
    tone: 'storytelling',
    icon: '🎭',
  },
];

export const BACKGROUND_MUSIC: BackgroundMusic[] = [
  {
    id: 'upbeat-corporate',
    name: 'Upbeat Corporate',
    url: 'https://storage.aiyoutube.app/music/upbeat-corporate.mp3',
    genre: 'Corporate',
    bpm: 120,
    duration: 180,
  },
  {
    id: 'cinematic-drama',
    name: 'Cinematic Drama',
    url: 'https://storage.aiyoutube.app/music/cinematic-drama.mp3',
    genre: 'Cinematic',
    bpm: 80,
    duration: 240,
  },
  {
    id: 'tech-electronic',
    name: 'Tech Electronic',
    url: 'https://storage.aiyoutube.app/music/tech-electronic.mp3',
    genre: 'Electronic',
    bpm: 135,
    duration: 200,
  },
  {
    id: 'ambient-calm',
    name: 'Ambient Calm',
    url: 'https://storage.aiyoutube.app/music/ambient-calm.mp3',
    genre: 'Ambient',
    bpm: 70,
    duration: 300,
  },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    color: '#6B7280',
    features: ['3 videos/month', '5 min max duration', '1 YouTube channel', 'Basic voices'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: 'price_pro_monthly',
    color: '#6366F1',
    popular: true,
    features: [
      '30 videos/month',
      '15 min max duration',
      '3 YouTube channels',
      'All voices + 3 clones',
      'Auto scheduling',
      'Analytics dashboard',
      'Bulk creation',
      'Auto Shorts',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: 'price_enterprise_monthly',
    color: '#F59E0B',
    features: [
      'Unlimited videos',
      '60 min max duration',
      'Unlimited channels',
      '10 voice clones',
      'AI avatars',
      'Multi-language dubbing',
      'Priority rendering',
      'Dedicated support',
    ],
  },
];

export const TRANSITIONS = [
  { value: 'cut', label: 'Cut', icon: '✂️' },
  { value: 'fade', label: 'Fade', icon: '🌅' },
  { value: 'slide', label: 'Slide', icon: '➡️' },
  { value: 'zoom', label: 'Zoom', icon: '🔍' },
  { value: 'dissolve', label: 'Dissolve', icon: '💧' },
];

export const PIPELINE_STAGES_CONFIG = [
  { stage: 'script', label: 'Script', icon: '📝', weight: 10 },
  { stage: 'voice', label: 'Voiceover', icon: '🎙️', weight: 20 },
  { stage: 'visuals', label: 'Visuals', icon: '🎬', weight: 40 },
  { stage: 'subtitles', label: 'Subtitles', icon: '💬', weight: 10 },
  { stage: 'render', label: 'Render', icon: '⚙️', weight: 15 },
  { stage: 'thumbnail', label: 'Thumbnail', icon: '🖼️', weight: 5 },
];

export const COLORS = {
  bg: '#0F0F1A',
  card: '#1A1A2E',
  elevated: '#252540',
  border: '#2D2D50',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#00D084',
  error: '#FF4444',
  warning: '#FFB800',
  info: '#3B82F6',
};
