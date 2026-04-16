import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { api } from './api';
import { Voice, VoiceSettings, VoiceoverJob, ApiResponse } from '@/types';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/helpers';

const logger = createLogger('VoiceService');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

function getElevenLabsHeaders(apiKey: string) {
  return {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

export const voiceService = {
  // ─── Voices ─────────────────────────────────────────────────────────────────

  async getAvailableVoices(apiKey: string): Promise<Voice[]> {
    logger.info('Fetching available voices');
    const res = await withRetry(() =>
      axios.get<{ voices: Array<{ voice_id: string; name: string; labels: Record<string, string>; preview_url: string }> }>(
        `${ELEVENLABS_BASE}/voices`,
        { headers: getElevenLabsHeaders(apiKey) },
      ),
    );

    return res.data.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      gender: (v.labels.gender as Voice['gender']) ?? 'neutral',
      language: v.labels.language ?? 'English',
      accent: v.labels.accent,
      previewUrl: v.preview_url,
      category: (v.labels.use_case as Voice['category']) ?? 'professional',
    }));
  },

  async previewVoice(voiceId: string, text: string, apiKey: string): Promise<string> {
    logger.info('Previewing voice', { voiceId });
    const res = await withRetry(() =>
      axios.post(
        `${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`,
        {
          text: text.slice(0, 200),
          model_id: 'eleven_multilingual_v3',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        },
        {
          headers: { ...getElevenLabsHeaders(apiKey), Accept: 'audio/mpeg' },
          responseType: 'arraybuffer',
        },
      ),
    );

    const uri = FileSystem.cacheDirectory + `preview_${voiceId}.mp3`;
    const base64 = Buffer.from(res.data as ArrayBuffer).toString('base64');
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  },

  // ─── Generation ─────────────────────────────────────────────────────────────

  async generateVoiceover(
    scriptId: string,
    settings: VoiceSettings,
    apiKey: string,
  ): Promise<VoiceoverJob> {
    logger.info('Starting voiceover generation', { scriptId, voiceId: settings.voiceId });

    return withRetry(async () => {
      const res = await api.post<ApiResponse<VoiceoverJob>>('/voice/generate', {
        scriptId,
        settings,
        elevenLabsKey: apiKey,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Voiceover generation failed');
      }

      logger.info('Voiceover job started', { jobId: res.data.id });
      return res.data;
    }, 3, 2000);
  },

  // Direct ElevenLabs generation (for short text, ≤ 2500 chars)
  async generateDirect(
    text: string,
    settings: VoiceSettings,
    apiKey: string,
    outputUri?: string,
  ): Promise<string> {
    logger.info('Direct voice generation', { chars: text.length });

    const res = await withRetry(() =>
      axios.post(
        `${ELEVENLABS_BASE}/text-to-speech/${settings.voiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v3',
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: true,
          },
          pronunciation_dictionary_locators: [],
        },
        {
          headers: { ...getElevenLabsHeaders(apiKey), Accept: 'audio/mpeg' },
          responseType: 'arraybuffer',
        },
      ),
    );

    const uri = outputUri ?? FileSystem.documentDirectory + `voice_${Date.now()}.mp3`;
    const base64 = Buffer.from(res.data as ArrayBuffer).toString('base64');
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    logger.info('Voice audio saved', { uri });
    return uri;
  },

  async getJob(jobId: string): Promise<VoiceoverJob> {
    const res = await api.get<ApiResponse<VoiceoverJob>>(`/voice/jobs/${jobId}`);
    if (!res.success || !res.data) throw new Error(res.error ?? 'Job not found');
    return res.data;
  },

  async pollUntilComplete(
    jobId: string,
    onProgress?: (pct: number) => void,
    intervalMs = 3000,
    timeoutMs = 600_000,
  ): Promise<VoiceoverJob> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() - start > timeoutMs) {
          return reject(new Error('Voiceover generation timed out'));
        }
        try {
          const job = await this.getJob(jobId);
          onProgress?.(job.status === 'completed' ? 100 : 50);

          if (job.status === 'completed') return resolve(job);
          if (job.status === 'failed') return reject(new Error(job.error ?? 'Job failed'));

          setTimeout(poll, intervalMs);
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  },

  // ─── Voice Clone ─────────────────────────────────────────────────────────────

  async cloneVoice(name: string, audioFileUri: string, apiKey: string): Promise<Voice> {
    logger.info('Cloning voice', { name });

    const form = new FormData();
    form.append('name', name);
    form.append('files', {
      uri: audioFileUri,
      name: 'sample.mp3',
      type: 'audio/mpeg',
    } as unknown as Blob);

    const res = await withRetry(() =>
      axios.post<{ voice_id: string; name: string }>(
        `${ELEVENLABS_BASE}/voices/add`,
        form,
        { headers: { 'xi-api-key': apiKey, 'Content-Type': 'multipart/form-data' } },
      ),
    );

    return {
      id: res.data.voice_id,
      name: res.data.name,
      gender: 'neutral',
      language: 'English',
      category: 'professional',
    };
  },
};
