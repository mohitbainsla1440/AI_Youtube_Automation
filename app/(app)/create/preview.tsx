import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoStore, useWizard } from '@/store/videoStore';
import { useChannelStore, useActiveChannel } from '@/store/channelStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  Button,
  GradientCard,
  Badge,
  Select,
  LoadingOverlay,
} from '@/components/ui';
import { COLORS, SUBSCRIPTION_PLANS } from '@/utils/constants';
import { formatDuration, timeAgo } from '@/utils/helpers';
import { thumbnailService } from '@/services/thumbnailService';
import { youtubeService } from '@/services/youtubeService';
import { videoService } from '@/services/videoService';
import { Thumbnail } from '@/types';

const { width } = Dimensions.get('window');
const PREVIEW_HEIGHT = width * (9 / 16);

export default function PreviewScreen() {
  const router = useRouter();
  const wizard = useWizard();
  const { setActiveThumbnail, generateThumbnails, resetWizard } = useVideoStore();
  const { channels } = useChannelStore();
  const activeChannel = useActiveChannel();
  const { settings } = useSettingsStore();

  const [selectedChannelId, setSelectedChannelId] = useState(activeChannel?.id ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStage, setPublishStage] = useState('');
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const script = wizard.generatedScript;

  useEffect(() => {
    if (wizard.thumbnails.length === 0 && settings.openaiApiKey) {
      handleGenerateThumbnails();
    }
  }, []);

  const handleGenerateThumbnails = async () => {
    if (!settings.openaiApiKey) return;
    setIsGeneratingThumbs(true);
    try {
      await generateThumbnails(settings.openaiApiKey);
    } catch {
      // non-fatal — user can continue without AI thumbnails
    } finally {
      setIsGeneratingThumbs(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedChannelId) {
      Alert.alert('No Channel', 'Please select a YouTube channel to publish to.');
      return;
    }
    if (!wizard.currentProjectId) {
      Alert.alert('Error', 'No project found. Please restart the wizard.');
      return;
    }

    Alert.alert(
      'Publish Video',
      `Upload "${script?.title}" to YouTube as ${visibility}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            setIsPublishing(true);
            try {
              // Stage 1: Start pipeline
              setPublishStage('Starting pipeline...');
              setPublishProgress(10);
              await videoService.startPipeline(wizard.currentProjectId!);

              // Stage 2: Poll pipeline
              setPublishStage('Generating video...');
              setPublishProgress(30);
              await videoService.pollPipelineUntilComplete(
                wizard.currentProjectId!,
                (job) => {
                  setPublishProgress(30 + Math.round(job.progress * 0.5));
                  setPublishStage(`${job.stage}...`);
                },
              );

              // Stage 3: Upload
              setPublishStage('Uploading to YouTube...');
              setPublishProgress(85);

              const project = await videoService.getProject(wizard.currentProjectId!);
              await youtubeService.uploadVideo(project, selectedChannelId, { visibility });

              setPublishProgress(100);
              setPublishStage('Done!');

              setTimeout(() => {
                setIsPublishing(false);
                resetWizard();
                Alert.alert('Published!', 'Your video is live on YouTube.', [
                  { text: 'View Dashboard', onPress: () => router.replace('/(app)') },
                ]);
              }, 800);
            } catch (err) {
              setIsPublishing(false);
              Alert.alert('Upload Failed', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: c.name,
    description: `${c.handle} · ${c.subscriberCount.toLocaleString()} subs`,
    icon: '📺',
  }));

  const visibilityOptions = [
    { value: 'public' as const, label: 'Public', icon: '🌍', description: 'Visible to everyone' },
    { value: 'unlisted' as const, label: 'Unlisted', icon: '🔗', description: 'Only via link' },
    { value: 'private' as const, label: 'Private', icon: '🔒', description: 'Only you' },
  ];

  return (
    <View style={styles.container}>
      <LoadingOverlay
        visible={isPublishing}
        message="Hang tight while we create and upload your video…"
        progress={publishProgress}
        stage={publishStage}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Preview & Publish</Text>
          <Text style={styles.headerSub}>Step 5 of 5</Text>
        </View>
        {/* Step dots */}
        <View style={styles.stepDots}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.dot, s <= 5 && styles.dotActive, s === 5 && styles.dotCurrent]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Video Preview */}
        <View style={[styles.previewContainer, { height: PREVIEW_HEIGHT }]}>
          {wizard.thumbnails.find((t) => t.isActive)?.url ? (
            <Image
              source={{ uri: wizard.thumbnails.find((t) => t.isActive)!.url }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient colors={['#1a1a3e', '#0F0F1A']} style={styles.previewPlaceholder}>
              <Ionicons name="film-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.previewPlaceholderText}>Video Preview</Text>
            </LinearGradient>
          )}

          {/* Play overlay */}
          <View style={styles.playOverlay}>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={28} color="#fff" />
            </View>
          </View>

          {/* Duration chip */}
          {script?.estimatedDuration && (
            <View style={styles.durationChip}>
              <Text style={styles.durationChipText}>
                {formatDuration(script.estimatedDuration)}
              </Text>
            </View>
          )}
        </View>

        {/* Title & Description */}
        <GradientCard border style={styles.metaCard}>
          <Text style={styles.videoTitle}>{script?.title ?? wizard.topic}</Text>
          <Text style={styles.videoDesc} numberOfLines={3}>
            {script?.description ?? 'AI-generated video description will appear here.'}
          </Text>
          <View style={styles.tagRow}>
            {(script?.tags ?? []).slice(0, 6).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </GradientCard>

        {/* Thumbnails */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thumbnails (A/B/C Test)</Text>
            {settings.openaiApiKey && (
              <TouchableOpacity onPress={handleGenerateThumbnails} disabled={isGeneratingThumbs}>
                <Text style={styles.regenerateText}>
                  {isGeneratingThumbs ? 'Generating…' : '↺ Regenerate'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {wizard.thumbnails.length > 0 ? (
            <FlatList
              data={wizard.thumbnails}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(t) => t.id}
              contentContainerStyle={styles.thumbsRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.thumbCard, item.isActive && styles.thumbCardActive]}
                  onPress={() => setActiveThumbnail(item.id)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.url }} style={styles.thumbImage} />
                  <View style={styles.thumbMeta}>
                    <Badge
                      label={`Variant ${item.variant}`}
                      color={item.isActive ? COLORS.primary : COLORS.textMuted}
                      size="sm"
                    />
                    {item.isActive && (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="image-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.thumbPlaceholderText}>
                {settings.openaiApiKey
                  ? 'Tap "Regenerate" to create AI thumbnails'
                  : 'Add OpenAI API key in Settings to generate thumbnails'}
              </Text>
            </View>
          )}
        </View>

        {/* Publish Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publish Settings</Text>

          <Select
            label="YouTube Channel"
            options={channelOptions.length > 0 ? channelOptions : [{ value: '', label: 'No channels connected', icon: '⚠️' }]}
            value={selectedChannelId}
            onChange={(v) => setSelectedChannelId(v)}
            style={styles.selectSpacing}
          />

          <Select
            label="Visibility"
            options={visibilityOptions}
            value={visibility}
            onChange={(v) => setVisibility(v)}
          />

          {channels.length === 0 && (
            <TouchableOpacity
              style={styles.connectChannelBanner}
              onPress={() => router.push('/(app)/channels')}
            >
              <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              <Text style={styles.connectChannelText}>
                Connect a YouTube channel to publish →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Checklist */}
        <GradientCard border style={styles.checklist}>
          <Text style={styles.sectionTitle}>Pre-publish Checklist</Text>
          {[
            { label: 'Script generated', done: !!script },
            { label: 'Voiceover ready', done: !!wizard.voiceoverJob?.audioUrl },
            { label: 'Thumbnail selected', done: wizard.thumbnails.some((t) => t.isActive) },
            { label: 'Channel connected', done: channels.length > 0 },
          ].map((item) => (
            <View key={item.label} style={styles.checkItem}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={item.done ? COLORS.success : COLORS.textMuted}
              />
              <Text style={[styles.checkLabel, item.done && styles.checkLabelDone]}>
                {item.label}
              </Text>
            </View>
          ))}
        </GradientCard>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Save as Draft"
            onPress={() => {
              resetWizard();
              router.replace('/(app)');
            }}
            variant="outline"
            fullWidth
          />
          <Button
            label="Publish to YouTube"
            onPress={handlePublish}
            disabled={channels.length === 0}
            fullWidth
            icon={<Ionicons name="logo-youtube" size={18} color="#fff" />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  stepDots: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primaryLight },
  dotCurrent: { width: 16, backgroundColor: COLORS.primary },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  previewContainer: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  previewPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewPlaceholderText: { color: COLORS.textMuted, fontSize: 13 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  durationChip: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  metaCard: { gap: 10 },
  videoTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  videoDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: COLORS.elevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { color: COLORS.textMuted, fontSize: 11 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  regenerateText: { color: COLORS.primaryLight, fontSize: 13 },

  thumbsRow: { gap: 12, paddingRight: 4 },
  thumbCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  thumbCardActive: { borderColor: COLORS.primary },
  thumbImage: { width: 140, height: 79 },
  thumbMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLORS.card,
  },
  thumbPlaceholder: {
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  thumbPlaceholderText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },

  selectSpacing: { marginBottom: 12 },
  connectChannelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF000015',
    borderWidth: 1,
    borderColor: '#FF000030',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  connectChannelText: { color: '#FF6B6B', fontSize: 13 },

  checklist: { gap: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { color: COLORS.textSecondary, fontSize: 14 },
  checkLabelDone: { color: COLORS.text },

  actions: { gap: 12, marginTop: 4 },
});
