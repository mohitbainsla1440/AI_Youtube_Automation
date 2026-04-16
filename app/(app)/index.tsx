import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useVideoStore } from '@/store/videoStore';
import { useChannelStore, useChannels, useActiveChannel } from '@/store/channelStore';
import { useAuthStore, useUser } from '@/store/authStore';
import { VideoCard } from '@/components/dashboard/VideoCard';
import {
  StatCard,
  EmptyState,
  GradientCard,
  Button,
  Badge,
} from '@/components/ui';
import { COLORS } from '@/utils/constants';
import { formatCount, formatMinutes } from '@/utils/helpers';
import { VideoProject } from '@/types';

// ─── Dashboard Screen ──────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();

  // Store state
  const user = useUser();
  const { channels, activeChannelId, setActiveChannel, loadChannels } = useChannelStore();
  const { projects, isLoadingProjects, loadProjects, loadProject } = useVideoStore();

  // Local UI state
  const [refreshing, setRefreshing] = useState(false);

  // ─── Derived stats from projects ────────────────────────────────────────────
  const totalVideos = projects.length;
  const publishedVideos = projects.filter((p) => p.status === 'published').length;
  const totalViews = projects.reduce(
    (sum, p) => sum + (p.analytics?.views ?? 0),
    0,
  );
  const totalWatchTime = projects.reduce(
    (sum, p) => sum + (p.analytics?.watchTime ?? 0),
    0,
  );

  // ─── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    loadChannels();
    loadProjects(1);
  }, []);

  // ─── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadChannels(), loadProjects(1)]);
    setRefreshing(false);
  }, [loadChannels, loadProjects]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleVideoPress = useCallback(
    (project: VideoProject) => {
      loadProject(project.id);
      router.push(`/(app)/editor/${project.id}` as any);
    },
    [loadProject, router],
  );

  const handleCreatePress = useCallback(() => {
    router.push('/(app)/create' as any);
  }, [router]);

  // ─── Greeting ───────────────────────────────────────────────────────────────
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Creator';

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {user?.avatar ? (
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                <View style={styles.avatarImage}>
                  <Text style={styles.avatarInitial}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Online dot */}
              <View style={styles.onlineDot} />
            </View>

            {/* Greeting */}
            <View style={styles.greetingWrap}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.nameText} numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Plan badge */}
            {user?.plan && user.plan !== 'free' && (
              <Badge
                label={user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                color={user.plan === 'enterprise' ? COLORS.warning : COLORS.primary}
                size="sm"
              />
            )}
            {/* Notification bell */}
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              {/* Unread indicator */}
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Channel selector ───────────────────────────────────────────── */}
        {channels.length > 0 && (
          <View style={styles.channelSection}>
            <Text style={styles.sectionLabel}>Channel</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.channelRow}
            >
              {channels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={[
                      styles.channelPill,
                      isActive && styles.channelPillActive,
                    ]}
                    onPress={() => setActiveChannel(channel.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="logo-youtube"
                      size={13}
                      color={isActive ? COLORS.text : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.channelPillText,
                        isActive && styles.channelPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {channel.name}
                    </Text>
                    {channel.isDefault && (
                      <View style={styles.defaultDot} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Add channel CTA */}
              <TouchableOpacity
                style={styles.addChannelPill}
                onPress={() => router.push('/(app)/channels' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color={COLORS.textMuted} />
                <Text style={styles.addChannelText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatCard
              label="Total Videos"
              value={formatCount(totalVideos)}
              icon="film-outline"
              color={COLORS.primary}
            />
            <StatCard
              label="Published"
              value={formatCount(publishedVideos)}
              icon="checkmark-circle-outline"
              color={COLORS.success}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Total Views"
              value={formatCount(totalViews)}
              icon="eye-outline"
              color={COLORS.info}
            />
            <StatCard
              label="Watch Time"
              value={formatMinutes(totalWatchTime * 60)}
              icon="time-outline"
              color={COLORS.warning}
            />
          </View>
        </View>

        {/* ── Quick Create gradient banner ───────────────────────────────── */}
        <View style={styles.quickCreateSection}>
          <GradientCard
            gradient={[COLORS.primary, '#4338CA', '#312E81']}
            style={styles.quickCreateCard}
            padding={20}
          >
            <View style={styles.quickCreateContent}>
              <View style={styles.quickCreateLeft}>
                <View style={styles.quickCreateIconWrap}>
                  <Ionicons name="sparkles" size={24} color={COLORS.text} />
                </View>
                <View style={styles.quickCreateText}>
                  <Text style={styles.quickCreateTitle}>
                    Create with AI
                  </Text>
                  <Text style={styles.quickCreateSub}>
                    Generate a full video in minutes
                  </Text>
                </View>
              </View>
              <Button
                label="Start"
                onPress={handleCreatePress}
                variant="secondary"
                size="sm"
                icon={<Ionicons name="arrow-forward" size={14} color={COLORS.text} />}
                iconPosition="right"
              />
            </View>

            {/* Decorative sparkle dots */}
            <View style={styles.decorRow}>
              {['✦', '✦', '✦', '✦', '✦'].map((star, i) => (
                <Text
                  key={i}
                  style={[
                    styles.decorStar,
                    { opacity: 0.12 + i * 0.06, fontSize: 8 + i * 2 },
                  ]}
                >
                  {star}
                </Text>
              ))}
            </View>
          </GradientCard>
        </View>

        {/* ── Recent Videos ──────────────────────────────────────────────── */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Videos</Text>
            {projects.length > 5 && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/create' as any)}
                activeOpacity={0.75}
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoadingProjects && projects.length === 0 ? (
            /* Skeleton placeholders while loading */
            <View style={styles.skeletonWrap}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : projects.length === 0 ? (
            <EmptyState
              icon="film-outline"
              title="No videos yet"
              description="Create your first AI-powered YouTube video in minutes."
              actionLabel="Create Video"
              onAction={handleCreatePress}
            />
          ) : (
            <FlatList
              data={projects.slice(0, 10)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <VideoCard
                  project={item}
                  onPress={() => handleVideoPress(item)}
                  onMorePress={() => {
                    // More options handler — extend with ActionSheet if needed
                  }}
                />
              )}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.videoList}
            />
          )}
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Avatar
  avatarWrap: {
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarInitial: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },

  // Greeting
  greetingWrap: {
    flex: 1,
  },
  greetingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  nameText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
  },

  // Bell
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },

  // Channel selector
  channelSection: {
    paddingBottom: 20,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  channelRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  channelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 160,
  },
  channelPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  channelPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  channelPillTextActive: {
    color: COLORS.text,
  },
  defaultDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  addChannelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addChannelText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Quick Create
  quickCreateSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  quickCreateCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  quickCreateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  quickCreateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  quickCreateIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCreateText: {
    flex: 1,
  },
  quickCreateTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  quickCreateSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  decorRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 8,
    right: 14,
    gap: 4,
  },
  decorStar: {
    color: COLORS.text,
  },

  // Recent Videos
  recentSection: {
    paddingHorizontal: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },

  // Skeleton
  skeletonWrap: {
    gap: 10,
  },
  skeletonCard: {
    height: 104,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.6,
  },

  // Video list
  videoList: {
    gap: 0,
  },

  // Spacer
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 100 : 72,
  },
});
