import { useState, useEffect, useCallback } from 'react';
import { useChannelStore } from '@/store/channelStore';
import { ChannelAnalytics } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAnalytics');

export function useAnalytics(channelId: string | null, period: '7d' | '30d' | '90d' | '1y' = '30d') {
  const { analytics, loadAnalytics } = useChannelStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data: ChannelAnalytics | null = channelId ? (analytics[channelId] ?? null) : null;

  const refresh = useCallback(async () => {
    if (!channelId) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadAnalytics(channelId, period);
    } catch (err) {
      const msg = (err as Error).message;
      logger.error('Analytics fetch failed', { channelId, period, error: msg });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, period, loadAnalytics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Computed summaries
  const summary = data
    ? {
        totalViews: data.totalViews,
        totalWatchTime: data.totalWatchTime,
        avgCTR: data.avgCTR,
        subscribers: data.subscribers,
        subscriberChange: data.subscriberChange,
        topVideo: data.topVideos[0] ?? null,
      }
    : null;

  return { data, summary, isLoading, error, refresh };
}
