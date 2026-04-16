import { VideoStatus, PipelineStage, JobStatus } from '@/types';

// ─── Time ─────────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m === 1 ? '1 min' : `${m} mins`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getStatusColor(status: VideoStatus | JobStatus): string {
  const map: Record<string, string> = {
    draft: '#6B7280',
    pending: '#6B7280',
    generating_script: '#3B82F6',
    generating_voice: '#8B5CF6',
    generating_visuals: '#F59E0B',
    rendering: '#EC4899',
    processing: '#3B82F6',
    ready: '#00D084',
    completed: '#00D084',
    scheduled: '#6366F1',
    uploading: '#F59E0B',
    uploaded: '#00D084',
    published: '#00D084',
    failed: '#FF4444',
    retrying: '#F59E0B',
  };
  return map[status] ?? '#6B7280';
}

export function getStatusLabel(status: VideoStatus): string {
  const map: Record<VideoStatus, string> = {
    draft: 'Draft',
    generating_script: 'Writing Script...',
    generating_voice: 'Recording Voice...',
    generating_visuals: 'Generating Visuals...',
    rendering: 'Rendering...',
    ready: 'Ready',
    scheduled: 'Scheduled',
    uploading: 'Uploading...',
    published: 'Published',
    failed: 'Failed',
  };
  return map[status] ?? status;
}

export function getPipelineProgress(stage: PipelineStage, stageProgress: number): number {
  const weights: Record<PipelineStage, [number, number]> = {
    script: [0, 10],
    voice: [10, 30],
    visuals: [30, 70],
    subtitles: [70, 80],
    render: [80, 95],
    thumbnail: [95, 98],
    upload: [98, 100],
  };
  const [start, end] = weights[stage];
  return start + ((end - start) * stageProgress) / 100;
}

// ─── String utils ─────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractKeywords(text: string, maxCount = 5): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they',
  ]);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([w]) => w);
}

// ─── File utils ───────────────────────────────────────────────────────────────

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoffMultiplier = 2,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = delayMs * backoffMultiplier ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── SRT ──────────────────────────────────────────────────────────────────────

export function generateSRT(
  subtitles: Array<{ startTime: number; endTime: number; text: string }>,
): string {
  return subtitles
    .map((sub, i) => {
      const start = formatSRTTime(sub.startTime);
      const end = formatSRTTime(sub.endTime);
      return `${i + 1}\n${start} --> ${end}\n${sub.text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${ms.toString().padStart(3, '0')}`;
}
