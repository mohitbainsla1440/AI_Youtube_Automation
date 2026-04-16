import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useChannelStore, useChannels, useActiveChannel } from '@/store/channelStore';
import {
  Button,
  GradientCard,
  Badge,
  Avatar,
  EmptyState,
  StatCard,
} from '@/components/ui';
import { COLORS } from '@/utils/constants';
import { formatCount, timeAgo } from '@/utils/helpers';
import { YouTubeChannel, ScheduledPost } from '@/types';

// ─── Channel Manager Screen ────────────────────────────────────────────────────

export default function ChannelManagerScreen() {
  const router = useRouter();

  const channels = useChannels();
  const activeChannel = useActiveChannel();

  const {
    isLoading,
    scheduledPosts,
    loadChannels,
    setActiveChannel,
    connectChannel,
    disconnectChannel,
    loadScheduledPosts,
  } = useChannelStore();

  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadChannels();
    loadScheduledPosts();
  }, []);

  // ─── Pull-to-refresh ──────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadChannels(), loadScheduledPosts()]);
    setRefreshing(false);
  }, [loadChannels, loadScheduledPosts]);

  // ─── Computed stats ────────────────────────────────────────────────────────
  const totalSubscribers = channels.reduce((sum, c) => sum + c.subscriberCount, 0);
  const totalVideos = channels.reduce((sum, c) => sum + c.videoCount, 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleConnectChannel = useCallback(async () => {
    setConnecting(true);
    try {
      // In a real app, use makeRedirectUri from expo-auth-session
      const redirectUri = 'aiyoutube://oauth/callback';
      await connectChannel(redirectUri);
      setConnectModalVisible(false);
      Alert.alert('Success', 'Channel connected successfully!');
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Failed to connect channel');
    } finally {
      setConnecting(false);
    }
  }, [connectChannel]);

  const handleDisconnect = useCallback(
    (channel: YouTubeChannel) => {
      Alert.alert(
        'Disconnect Channel',
        `Are you sure you want to disconnect "${channel.name}"? This will remove all associated data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await disconnectChannel(channel.id);
              } catch (err) {
                Alert.alert('Error', (err as Error).message ?? 'Failed to disconnect channel');
              }
            },
          },
        ],
      );
    },
    [disconnectChannel],
  );

  const handleSetDefault = useCallback(
    (channelId: string) => {
      setActiveChannel(channelId);
    },
    [setActiveChannel],
  );

  // ─── Render: empty state ──────────────────────────────────────────────────
  if (!isLoading && channels.length === 0) {
    return (
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Channel Manager</Text>
          <View style={styles.headerSpacer} />
        </View>

        <EmptyState
          icon="logo-youtube"
          title="No channels connected"
          description="Connect your YouTube channel to get started creating and publishing AI-generated videos."
          actionLabel="Connect Channel"
          onAction={() => setConnectModalVisible(true)}
        />

        <ConnectModal
          visible={connectModalVisible}
          onClose={() => setConnectModalVisible(false)}
          onConnect={handleConnectChannel}
          connecting={connecting}
        />
      </View>
    );
  }

  // ─── Render: main ─────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Fixed Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Channel Manager</Text>
        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => setConnectModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.connectBtnGradient}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.connectBtnText}>Connect</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
        {/* ── Active / Featured Channel Card ────────────────────────────── */}
        {activeChannel && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Active Channel</Text>
            <ActiveChannelCard
              channel={activeChannel}
              onAnalytics={() => router.push('/(app)/analytics' as any)}
              onManage={() => {}}
            />
          </View>
        )}

        {/* ── Summary Stats ─────────────────────────────────────────────── */}
        {channels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Combined Stats</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Subscribers"
                value={formatCount(totalSubscribers)}
                icon="people-outline"
                color={COLORS.primary}
              />
              <StatCard
                label="Total Videos"
                value={formatCount(totalVideos)}
                icon="film-outline"
                color={COLORS.success}
              />
            </View>
          </View>
        )}

        {/* ── All Channels List ──────────────────────────────────────────── */}
        {channels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>All Channels ({channels.length})</Text>
            <View style={styles.channelList}>
              {channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannel?.id}
                  onSetDefault={() => handleSetDefault(channel.id)}
                  onDisconnect={() => handleDisconnect(channel)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Scheduled Posts ────────────────────────────────────────────── */}
        {scheduledPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upcoming Scheduled Posts</Text>
            <ScheduledPostsTimeline
              posts={scheduledPosts}
              channels={channels}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Connect Channel Modal ─────────────────────────────────────────── */}
      <ConnectModal
        visible={connectModalVisible}
        onClose={() => setConnectModalVisible(false)}
        onConnect={handleConnectChannel}
        connecting={connecting}
      />
    </View>
  );
}

// ─── Active Channel Card ───────────────────────────────────────────────────────

interface ActiveChannelCardProps {
  channel: YouTubeChannel;
  onAnalytics: () => void;
  onManage: () => void;
}

function ActiveChannelCard({ channel, onAnalytics, onManage }: ActiveChannelCardProps) {
  const hasBanner = Boolean(channel.banner);

  return (
    <View style={styles.activeCard}>
      {/* Banner / gradient background */}
      {hasBanner ? (
        <Image source={{ uri: channel.banner }} style={styles.activeBanner} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#6366F1', '#4338CA', '#312E81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeBanner}
        />
      )}

      {/* Scrim overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content */}
      <View style={styles.activeContent}>
        {/* Default badge top-right */}
        {channel.isDefault && (
          <View style={styles.activeBadgeRow}>
            <Badge label="Default" color={COLORS.success} dot />
          </View>
        )}

        {/* Channel info */}
        <View style={styles.activeInfo}>
          <Avatar uri={channel.avatar} name={channel.name} size={60} />
          <View style={styles.activeTextBlock}>
            <Text style={styles.activeChannelName} numberOfLines={1}>
              {channel.name}
            </Text>
            <Text style={styles.activeHandle} numberOfLines={1}>
              {channel.handle}
            </Text>
            <View style={styles.activeMetaRow}>
              <View style={styles.activeMeta}>
                <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.activeMetaText}>
                  {formatCount(channel.subscriberCount)} subscribers
                </Text>
              </View>
              <View style={styles.activeMeta}>
                <Ionicons name="film-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.activeMetaText}>
                  {formatCount(channel.videoCount)} videos
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.activeActions}>
          <TouchableOpacity style={styles.activeActionBtn} onPress={onAnalytics} activeOpacity={0.8}>
            <Ionicons name="bar-chart-outline" size={15} color={COLORS.text} />
            <Text style={styles.activeActionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.activeActionBtn, styles.activeActionBtnPrimary]}
            onPress={onManage}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={15} color={COLORS.text} />
            <Text style={styles.activeActionText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Channel Card ──────────────────────────────────────────────────────────────

interface ChannelCardProps {
  channel: YouTubeChannel;
  isActive: boolean;
  onSetDefault: () => void;
  onDisconnect: () => void;
}

function ChannelCard({ channel, isActive, onSetDefault, onDisconnect }: ChannelCardProps) {
  const isTokenExpired = new Date(channel.tokenExpiry) < new Date();

  return (
    <GradientCard border style={styles.channelCard} padding={14}>
      <View style={styles.channelCardRow}>
        {/* Avatar */}
        <Avatar uri={channel.avatar} name={channel.name} size={48} />

        {/* Info block */}
        <View style={styles.channelCardInfo}>
          <View style={styles.channelCardNameRow}>
            <Text style={styles.channelCardName} numberOfLines={1}>
              {channel.name}
            </Text>
            {channel.isDefault && (
              <Badge label="Default" color={COLORS.success} size="sm" dot />
            )}
          </View>
          <Text style={styles.channelCardHandle} numberOfLines={1}>
            {channel.handle}
          </Text>
          <View style={styles.channelCardStats}>
            <View style={styles.channelCardStat}>
              <Ionicons name="people-outline" size={11} color={COLORS.textMuted} />
              <Text style={styles.channelCardStatText}>
                {formatCount(channel.subscriberCount)}
              </Text>
            </View>
            <Text style={styles.channelCardStatDivider}>·</Text>
            <View style={styles.channelCardStat}>
              <Ionicons name="film-outline" size={11} color={COLORS.textMuted} />
              <Text style={styles.channelCardStatText}>
                {formatCount(channel.videoCount)} videos
              </Text>
            </View>
          </View>
        </View>

        {/* Connection status */}
        <Badge
          label={isTokenExpired ? 'Expired' : 'Connected'}
          color={isTokenExpired ? COLORS.warning : COLORS.success}
          size="sm"
          dot
        />
      </View>

      {/* Actions row */}
      <View style={styles.channelCardActions}>
        {!channel.isDefault && (
          <TouchableOpacity
            style={styles.channelActionBtn}
            onPress={onSetDefault}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={13} color={COLORS.primary} />
            <Text style={[styles.channelActionText, { color: COLORS.primary }]}>
              Set Default
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.channelActionBtn, styles.channelActionBtnDanger]}
          onPress={onDisconnect}
          activeOpacity={0.8}
        >
          <Ionicons name="unlink-outline" size={13} color={COLORS.error} />
          <Text style={[styles.channelActionText, { color: COLORS.error }]}>
            Disconnect
          </Text>
        </TouchableOpacity>
      </View>
    </GradientCard>
  );
}

// ─── Scheduled Posts Timeline ─────────────────────────────────────────────────

interface ScheduledPostsTimelineProps {
  posts: ScheduledPost[];
  channels: YouTubeChannel[];
}

function ScheduledPostsTimeline({ posts, channels }: ScheduledPostsTimelineProps) {
  const sorted = [...posts]
    .filter((p) => p.status === 'pending')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 8);

  const getChannel = (channelId: string) =>
    channels.find((c) => c.id === channelId);

  const formatScheduledTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.timeline}>
      {sorted.map((post, index) => {
        const channel = getChannel(post.channelId);
        const isLast = index === sorted.length - 1;

        return (
          <View key={post.id} style={styles.timelineItem}>
            {/* Left: line + dot */}
            <View style={styles.timelineLine}>
              <View style={styles.timelineDot} />
              {!isLast && <View style={styles.timelineConnector} />}
            </View>

            {/* Right: card */}
            <GradientCard border style={styles.timelineCard} padding={12}>
              <View style={styles.timelineCardRow}>
                <Avatar
                  uri={channel?.avatar}
                  name={channel?.name ?? 'Channel'}
                  size={32}
                />
                <View style={styles.timelineCardInfo}>
                  <Text style={styles.timelineCardTitle} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <View style={styles.timelineCardMeta}>
                    <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                    <Text style={styles.timelineCardTime}>
                      {formatScheduledTime(post.scheduledAt)}
                    </Text>
                    <Badge
                      label={post.visibility}
                      color={
                        post.visibility === 'public'
                          ? COLORS.success
                          : post.visibility === 'private'
                          ? COLORS.error
                          : COLORS.warning
                      }
                      size="sm"
                    />
                  </View>
                </View>
              </View>
            </GradientCard>
          </View>
        );
      })}
    </View>
  );
}

// ─── Connect Channel Modal ────────────────────────────────────────────────────

interface ConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting: boolean;
}

function ConnectModal({ visible, onClose, onConnect, connecting }: ConnectModalProps) {
  const steps = [
    {
      icon: 'lock-closed-outline' as const,
      title: 'Secure OAuth 2.0',
      description: "You'll be redirected to Google's secure sign-in page.",
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Grant Permissions',
      description: 'Allow read/write access to your YouTube channel.',
    },
    {
      icon: 'checkmark-circle-outline' as const,
      title: 'Start Publishing',
      description: 'Upload and schedule videos directly from the app.',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Icon header */}
          <LinearGradient
            colors={['#6366F120', '#4F46E520']}
            style={styles.modalIconWrap}
          >
            <Ionicons name="logo-youtube" size={36} color={COLORS.error} />
          </LinearGradient>

          <Text style={styles.modalTitle}>Connect YouTube Channel</Text>
          <Text style={styles.modalSubtitle}>
            Link your YouTube channel to start creating, scheduling, and publishing
            AI-generated videos automatically.
          </Text>

          {/* Steps */}
          <View style={styles.modalSteps}>
            {steps.map((step, i) => (
              <View key={i} style={styles.modalStep}>
                <View style={styles.modalStepIcon}>
                  <Ionicons name={step.icon} size={18} color={COLORS.primary} />
                </View>
                <View style={styles.modalStepText}>
                  <Text style={styles.modalStepTitle}>{step.title}</Text>
                  <Text style={styles.modalStepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={styles.modalDisclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.modalDisclaimerText}>
              We only store tokens required for API access. You can disconnect at any time.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Button
              label="Connect with Google"
              onPress={onConnect}
              loading={connecting}
              fullWidth
              icon={<Ionicons name="logo-google" size={16} color="#fff" />}
            />
            <Button
              label="Cancel"
              onPress={onClose}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: { width: 38 },
  connectBtn: { borderRadius: 10, overflow: 'hidden' },
  connectBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  connectBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 20 },

  // Section
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Active Channel Card
  activeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 220,
  },
  activeBanner: {
    ...StyleSheet.absoluteFillObject,
  },
  activeContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  activeBadgeRow: {
    alignItems: 'flex-end',
  },
  activeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: 'auto',
  },
  activeTextBlock: {
    flex: 1,
    gap: 3,
  },
  activeChannelName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  activeHandle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  activeMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  activeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeMetaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  activeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeActionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  activeActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },

  // Channel list
  channelList: { gap: 10 },

  // Channel card
  channelCard: { gap: 12 },
  channelCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelCardInfo: { flex: 1, gap: 3 },
  channelCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  channelCardName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  channelCardHandle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  channelCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  channelCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  channelCardStatText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  channelCardStatDivider: {
    color: COLORS.border,
    fontSize: 12,
  },
  channelCardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  channelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  channelActionBtnDanger: {
    backgroundColor: `${COLORS.error}15`,
    borderColor: `${COLORS.error}30`,
  },
  channelActionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
  },
  timelineLine: {
    width: 20,
    alignItems: 'center',
    paddingTop: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
    marginBottom: 4,
    minHeight: 20,
  },
  timelineCard: { flex: 1, marginBottom: 10 },
  timelineCardRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  timelineCardInfo: { flex: 1, gap: 6 },
  timelineCardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  timelineCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timelineCardTime: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalSteps: { gap: 14, marginBottom: 20 },
  modalStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  modalStepIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  modalStepText: { flex: 1, gap: 3 },
  modalStepTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalStepDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalDisclaimer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDisclaimerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalActions: { gap: 8 },

  // Bottom spacer
  bottomSpacer: { height: Platform.OS === 'ios' ? 100 : 72 },
});
