import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useChannelStore, useChannels } from '@/store/channelStore';
import { StatCard, GradientCard, Select, EmptyState } from '@/components/ui';
import { COLORS } from '@/utils/constants';
import { formatCount, formatMinutes, formatPercent } from '@/utils/helpers';
import { ChannelAnalytics, DailyMetric, VideoAnalytics } from '@/types';

// ─── Period options ────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '1y';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
];

// ─── Analytics Screen ──────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const channels = useChannels();
  const { activeChannelId, analytics, loadAnalytics, setActiveChannel, isLoading } =
    useChannelStore();

  // Local UI state
  const [period, setPeriod] = useState<Period>('30d');

  // ─── Derived data ────────────────────────────────────────────────────────────
  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.handle,
    icon: '▶',
  }));

  const currentAnalytics: ChannelAnalytics | undefined =
    activeChannelId ? analytics[activeChannelId] : undefined;

  const dailyViews: DailyMetric[] = currentAnalytics?.dailyViews ?? [];
  const topVideos: VideoAnalytics[] = currentAnalytics?.topVideos ?? [];

  // Compute chart max for relative bar heights
  const maxDailyViews = dailyViews.length
    ? Math.max(...dailyViews.map((d) => d.views), 1)
    : 1;

  // ─── Load analytics on channel / period change ───────────────────────────────
  useEffect(() => {
    if (activeChannelId) {
      loadAnalytics(activeChannelId, period);
    }
  }, [activeChannelId, period]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleChannelChange = useCallback(
    (channelId: string) => {
      setActiveChannel(channelId);
    },
    [setActiveChannel],
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen header ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.headerTitle}>Analytics</Text>
          </View>
          <Text style={styles.headerSub}>
            Track performance across your channels
          </Text>
        </View>

        {/* ── Period selector ──────────────────────────────────────────── */}
        <View style={styles.periodSection}>
          <View style={styles.periodPills}>
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = period === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.periodPill,
                    isActive && styles.periodPillActive,
                  ]}
                  onPress={() => setPeriod(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      isActive && styles.periodPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Channel picker ───────────────────────────────────────────── */}
        {channels.length > 0 ? (
          <View style={styles.channelPickerSection}>
            <Select
              label="Channel"
              options={channelOptions}
              value={activeChannelId ?? ''}
              onChange={handleChannelChange}
              placeholder="Select a channel"
            />
          </View>
        ) : (
          <View style={styles.emptyChannelWrap}>
            <EmptyState
              icon="logo-youtube"
              title="No Channels Connected"
              description="Connect a YouTube channel to view analytics."
            />
          </View>
        )}

        {/* ── Stats grid ───────────────────────────────────────────────── */}
        {currentAnalytics ? (
          <>
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <StatCard
                  label="Views"
                  value={formatCount(currentAnalytics.totalViews)}
                  icon="eye-outline"
                  color={COLORS.info}
                />
                <StatCard
                  label="Watch Time"
                  value={formatMinutes(currentAnalytics.totalWatchTime * 60)}
                  icon="time-outline"
                  color={COLORS.warning}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  label="Avg CTR"
                  value={formatPercent(currentAnalytics.avgCTR)}
                  icon="magnet-outline"
                  color={COLORS.primary}
                />
                <StatCard
                  label="Subscribers"
                  value={formatCount(currentAnalytics.subscribers)}
                  change={currentAnalytics.subscriberChange}
                  icon="people-outline"
                  color={COLORS.success}
                />
              </View>
            </View>

            {/* ── Daily Views Chart ────────────────────────────────────── */}
            {dailyViews.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Daily Views</Text>
                <GradientCard border style={styles.chartCard} padding={16}>
                  <View style={styles.chartArea}>
                    {dailyViews.map((day, index) => {
                      const barHeightPercent = day.views / maxDailyViews;
                      const barHeight = Math.max(
                        4,
                        Math.round(barHeightPercent * 120),
                      );
                      // Highlight the tallest bar
                      const isHighest = day.views === maxDailyViews;
                      const barColor = isHighest
                        ? COLORS.primary
                        : COLORS.elevated;
                      const labelDate = new Date(day.date);
                      const dayLabel =
                        period === '7d' || period === '30d'
                          ? labelDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
                          : labelDate.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);

                      return (
                        <View key={index} style={styles.barGroup}>
                          <Text style={styles.barValue}>
                            {day.views > 0 && isHighest
                              ? formatCount(day.views)
                              : ''}
                          </Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.bar,
                                // Dynamic height and color derived from data — not a static style
                                { height: barHeight, backgroundColor: barColor },
                              ]}
                            />
                          </View>
                          <Text style={styles.barLabel}>{dayLabel}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Y-axis legend */}
                  <View style={styles.chartFooter}>
                    <Text style={styles.chartLegend}>
                      {formatCount(0)}
                    </Text>
                    <Text style={styles.chartLegend}>
                      Max: {formatCount(maxDailyViews)}
                    </Text>
                  </View>
                </GradientCard>
              </View>
            )}

            {/* ── Top Videos ───────────────────────────────────────────── */}
            <View style={styles.topVideosSection}>
              <Text style={styles.sectionTitle}>Top Videos</Text>

              {topVideos.length === 0 ? (
                <GradientCard border style={styles.emptyVideosCard} padding={24}>
                  <View style={styles.emptyVideosContent}>
                    <Ionicons
                      name="film-outline"
                      size={32}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.emptyVideosText}>
                      No video data for this period
                    </Text>
                  </View>
                </GradientCard>
              ) : (
                <FlatList
                  data={topVideos}
                  keyExtractor={(item) => item.videoId}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.videoSeparator} />
                  )}
                  renderItem={({ item, index }) => (
                    <TopVideoRow item={item} rank={index + 1} />
                  )}
                />
              )}
            </View>

            {/* ── Engagement summary ───────────────────────────────────── */}
            <View style={styles.engagementSection}>
              <Text style={styles.sectionTitle}>Engagement</Text>
              <GradientCard border padding={16}>
                <EngagementRow
                  icon="heart-outline"
                  label="Total Likes"
                  value={formatCount(
                    topVideos.reduce((s, v) => s + v.likes, 0),
                  )}
                  color={COLORS.error}
                />
                <View style={styles.engagementDivider} />
                <EngagementRow
                  icon="chatbubble-outline"
                  label="Comments"
                  value={formatCount(
                    topVideos.reduce((s, v) => s + v.comments, 0),
                  )}
                  color={COLORS.info}
                />
                <View style={styles.engagementDivider} />
                <EngagementRow
                  icon="eye-outline"
                  label="Impressions"
                  value={formatCount(
                    topVideos.reduce((s, v) => s + v.impressions, 0),
                  )}
                  color={COLORS.primary}
                />
              </GradientCard>
            </View>
          </>
        ) : channels.length > 0 && !isLoading ? (
          /* No analytics loaded yet, channel selected but no data */
          <View style={styles.noDataWrap}>
            <EmptyState
              icon="stats-chart-outline"
              title="No Analytics Data"
              description="Analytics data will appear here once your channel has activity."
            />
          </View>
        ) : null}

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface TopVideoRowProps {
  item: VideoAnalytics;
  rank: number;
}

function TopVideoRow({ item, rank }: TopVideoRowProps) {
  const rankColor =
    rank === 1 ? COLORS.warning : rank === 2 ? COLORS.textSecondary : rank === 3 ? '#CD7F32' : COLORS.textMuted;

  return (
    <View style={videoRowStyles.row}>
      {/* Rank */}
      <View style={videoRowStyles.rankWrap}>
        <Text style={[videoRowStyles.rank, { color: rankColor }]}>
          {rank}
        </Text>
      </View>

      {/* Info */}
      <View style={videoRowStyles.info}>
        <Text style={videoRowStyles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={videoRowStyles.metaRow}>
          <MetricChip
            icon="eye-outline"
            value={formatCount(item.views)}
          />
          <MetricChip
            icon="magnet-outline"
            value={formatPercent(item.ctr)}
          />
          <MetricChip
            icon="time-outline"
            value={formatMinutes(item.watchTime * 60)}
          />
        </View>
      </View>

      {/* CTR indicator bar */}
      <View style={videoRowStyles.ctrBar}>
        <View
          style={[
            videoRowStyles.ctrFill,
            // Dynamic width proportional to CTR — derived from data
            { width: `${Math.min(item.ctr * 10, 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function MetricChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={videoRowStyles.chip}>
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={10}
        color={COLORS.textMuted}
      />
      <Text style={videoRowStyles.chipText}>{value}</Text>
    </View>
  );
}

interface EngagementRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

function EngagementRow({ icon, label, value, color }: EngagementRowProps) {
  return (
    <View style={engagementRowStyles.row}>
      <View
        style={[
          engagementRowStyles.iconWrap,
          // Dynamic background tint derived from the color prop
          { backgroundColor: `${color}18` },
        ]}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={engagementRowStyles.label}>{label}</Text>
      <Text style={engagementRowStyles.value}>{value}</Text>
    </View>
  );
}

// ─── Sub-component styles ──────────────────────────────────────────────────────

const videoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  rankWrap: {
    width: 24,
    alignItems: 'center',
    paddingTop: 1,
  },
  rank: {
    fontSize: 15,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.elevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  ctrBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.elevated,
  },
  ctrFill: {
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
});

const engagementRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ─── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginLeft: 46,
  },

  // Period selector
  periodSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  periodPills: {
    flexDirection: 'row',
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    gap: 2,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillActive: {
    backgroundColor: COLORS.primary,
  },
  periodPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  periodPillTextActive: {
    color: COLORS.text,
  },

  // Channel picker
  channelPickerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyChannelWrap: {
    paddingHorizontal: 20,
    marginTop: 40,
  },

  // Stats grid
  statsSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Chart
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartCard: {
    overflow: 'hidden',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 3,
    paddingBottom: 4,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  barTrack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
  },
  bar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chartLegend: {
    color: COLORS.textMuted,
    fontSize: 10,
  },

  // Top Videos
  topVideosSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyVideosCard: {
    alignItems: 'center',
  },
  emptyVideosContent: {
    alignItems: 'center',
    gap: 10,
  },
  emptyVideosText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  videoSeparator: {
    height: 8,
  },

  // Engagement
  engagementSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  engagementDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  // No data
  noDataWrap: {
    flex: 1,
    paddingTop: 40,
  },

  // Spacer
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 100 : 72,
  },
});
