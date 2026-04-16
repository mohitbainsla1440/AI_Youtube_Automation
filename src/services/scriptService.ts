import { api } from './api';
import {
  GeneratedScript,
  ScriptGenerationRequest,
  ApiResponse,
  VideoTone,
} from '@/types';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/helpers';

const logger = createLogger('ScriptService');

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(tone: VideoTone): string {
  const personas: Record<VideoTone, string> = {
    educational: 'You are an expert YouTube educator who creates clear, engaging educational content. You structure videos with: a strong hook, clear explanations, real-world examples, and actionable takeaways.',
    storytelling: 'You are a master YouTube storyteller. You craft compelling narratives that hook viewers emotionally, build tension, and deliver satisfying conclusions that inspire action.',
    viral: 'You are a viral content strategist. You specialize in creating highly shareable YouTube videos with pattern-interrupt hooks, shocking facts, controversy, and emotional triggers that maximize engagement.',
    documentary: 'You are a documentary filmmaker who creates deep-dive YouTube content. You present balanced, investigative narratives with data, expert quotes, and cinematic storytelling.',
    casual: 'You are a friendly, conversational YouTuber. You speak naturally, use humor, share personal stories, and make complex topics feel like a chat with a knowledgeable friend.',
  };
  return personas[tone];
}

function buildUserPrompt(req: ScriptGenerationRequest): string {
  return `Create a complete YouTube video script about: "${req.topic}"

Requirements:
- Duration: approximately ${req.targetDuration} minutes
- Language: ${req.language}
- Style: ${req.style}
${req.targetAudience ? `- Target audience: ${req.targetAudience}` : ''}
${req.additionalContext ? `- Additional context: ${req.additionalContext}` : ''}

Return a JSON object with this exact structure:
{
  "title": "SEO-optimized video title (max 70 chars)",
  "description": "YouTube description (200-300 words, with timestamps and keywords)",
  "tags": ["tag1", "tag2", ..., "tag15"],
  "hooks": ["hook1", "hook2", "hook3"],
  "sections": [
    {
      "type": "hook",
      "text": "First 30 seconds - attention-grabbing opening",
      "duration": 30,
      "keywords": ["keyword1", "keyword2"]
    },
    {
      "type": "intro",
      "text": "60 second intro",
      "duration": 60,
      "keywords": []
    },
    {
      "type": "body",
      "text": "Main content split into clear points",
      "duration": ${req.targetDuration * 60 - 120},
      "keywords": []
    },
    {
      "type": "cta",
      "text": "Strong call-to-action (like, subscribe, comment)",
      "duration": 30,
      "keywords": []
    }
  ]
}

Make the script engaging, with natural speech patterns, pauses, and emphasis markers [PAUSE], [EMPHASIS: word].`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const scriptService = {
  async generate(req: ScriptGenerationRequest): Promise<GeneratedScript> {
    logger.info('Generating script', { topic: req.topic, tone: req.tone });

    return withRetry(async () => {
      const res = await api.post<ApiResponse<GeneratedScript>>('/scripts/generate', {
        ...req,
        systemPrompt: buildSystemPrompt(req.tone),
        userPrompt: buildUserPrompt(req),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Script generation failed');
      }

      logger.info('Script generated', { id: res.data.id });
      return res.data;
    }, 3, 2000);
  },

  async generateHooks(topic: string, count = 5): Promise<string[]> {
    logger.info('Generating hooks', { topic });
    const res = await api.post<ApiResponse<{ hooks: string[] }>>('/scripts/hooks', {
      topic,
      count,
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Hook generation failed');
    return res.data.hooks;
  },

  async generateShorts(scriptId: string): Promise<GeneratedScript> {
    logger.info('Generating shorts from script', { scriptId });
    const res = await api.post<ApiResponse<GeneratedScript>>(`/scripts/${scriptId}/shorts`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Shorts generation failed');
    return res.data;
  },

  async getScript(id: string): Promise<GeneratedScript> {
    const res = await api.get<ApiResponse<GeneratedScript>>(`/scripts/${id}`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Not found');
    return res.data;
  },

  async updateScript(id: string, updates: Partial<GeneratedScript>): Promise<GeneratedScript> {
    const res = await api.put<ApiResponse<GeneratedScript>>(`/scripts/${id}`, updates);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Update failed');
    return res.data;
  },

  async translateScript(id: string, targetLanguage: string): Promise<GeneratedScript> {
    logger.info('Translating script', { id, targetLanguage });
    const res = await api.post<ApiResponse<GeneratedScript>>(`/scripts/${id}/translate`, {
      targetLanguage,
    });
    if (!res.success || !res.data) throw new Error(res.error ?? 'Translation failed');
    return res.data;
  },
};
