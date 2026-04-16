import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Alert,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useVideoStore } from '@/store/videoStore';
import { useChannelStore } from '@/store/channelStore';
import {
  Button,
  GradientCard,
  Badge,
  ProgressBar,
  LoadingOverlay,
  BottomSheet,
} from '@/components/ui';
import { COLORS, TRANSITIONS, BACKGROUND_MUSIC } from '@/utils/constants';
import { VideoProject, VideoScene, BackgroundMusic } from '@/types';
import { formatDuration, getStatusLabel } from '@/utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * (9 / 16);

// ─── Video Editor Screen ───────────────────────────────────────────────────────

export default function VideoEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { activeProject, pipelineJob, loadProject, updateScene, startPipeline, updatePipelineJob } =
    useVideoStore();
  const { channels } = useChannelStore();

  // ─── Local state ──────────────────────────────────────────────────────────
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [titleEditing, setTitleEditing] = useState(false);

  // Music
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(50);

  // Subtitles
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'white' | 'yellow' | 'colorful'>('white');

  // Render & Export
  const [quality, setQuality] = useState<'720p' | '1080p'>('1080p');
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Publish
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    channels[0]?.id ?? null,
  );
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDatetime, setScheduleDatetime] = useState<string>('');

  // Sheets
  const [footagePickerVisible, setFootagePickerVisible] = useState(false);
  const [channelPickerVisible, setChannelPickerVisible] = useState(false);

  // Animated subtitle fade
  const subtitleOpacity = useRef(new Animated.Value(1)).current;

  // Timeline ref
  const timelineRef = useRef<FlatList>(null);

  // ─── Load project ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) loadProject(id);
  }, [id]);

  useEffect(() => {
    if (activeProject) {
      setEditableTitle(activeProject.title);
      if (activeProject.backgroundMusic) {
        setSelectedMusicId(activeProject.backgroundMusic.id);
      }
    }
  }, [activeProject]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const scenes: VideoScene[] = activeProject?.scenes ?? [];
  const selectedScene: VideoScene | undefined = scenes[selectedSceneIndex];
  const totalScenes = scenes.length;

  // ─── Playback ──────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handlePrevScene = useCallback(() => {
    setSelectedSceneIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNextScene = useCallback(() => {
    setSelectedSceneIndex((i) => Math.min(totalScenes - 1, i + 1));
  }, [totalScenes]);

  // ─── Scene select ─────────────────────────────────────────────────────────
  const handleSceneSelect = useCallback((index: number) => {
    setSelectedSceneIndex(index);
    timelineRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, []);

  // ─── Scene edit: transition ───────────────────────────────────────────────
  const handleTransitionChange = useCallback(
    async (transitionValue: VideoScene['transition']) => {
      if (!selectedScene) return;
      try {
        await updateScene({ ...selectedScene, transition: transitionValue });
      } catch (err) {
        Alert.alert('Error', 'Failed to update transition.');
      }
    },
    [selectedScene, updateScene],
  );

  // ─── Scene edit: duration ─────────────────────────────────────────────────
  const handleDurationAdjust = useCallback(
    async (delta: number) => {
      if (!selectedScene) return;
      const next = Math.max(1, selectedScene.duration + delta);
      try {
        await updateScene({ ...selectedScene, duration: next });
      } catch (err) {
        Alert.alert('Error', 'Failed to update duration.');
      }
    },
    [selectedScene, updateScene],
  );

  // ─── Scene edit: subtitle ─────────────────────────────────────────────────
  const handleSubtitleChange = useCallback(
    async (text: string) => {
      if (!selectedScene) return;
      const updated: VideoScene = {
        ...selectedScene,
        subtitle: selectedScene.subtitle
          ? { ...selectedScene.subtitle, text }
          : { startTime: 0, endTime: selectedScene.duration, text },
      };
      await updateScene(updated);
    },
    [selectedScene, updateScene],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const handleRender = useCallback(async () => {
    if (!activeProject) return;
    Alert.alert(
      'Render Video',
      `Render at ${quality}? This may take a few minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Render',
          onPress: async () => {
            setIsRendering(true);
            setRenderProgress(0);
            try {
              await startPipeline(activeProject.id);
              // Simulate progress updates (replaced by websocket in production)
              let prog = 0;
              const interval = setInterval(() => {
                prog += 3;
                setRenderProgress(prog);
                if (prog >= 100) clearInterval(interval);
              }, 400);
            } catch (err) {
              setIsRendering(false);
              Alert.alert('Error', (err as Error).message ?? 'Render failed');
            }
          },
        },
      ],
    );
  }, [activeProject, quality, startPipeline]);

  // ─── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(() => {
    if (!selectedChannelId) {
      Alert.alert('Select Channel', 'Please select a YouTube channel first.');
      return;
    }
    Alert.alert(
      'Upload to YouTube',
      `Upload "${editableTitle}" as ${visibility}?${scheduleEnabled ? ` Scheduled for ${scheduleDatetime || 'selected time'}.` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: () => {
            // Trigger upload pipeline stage
            if (activeProject) startPipeline(activeProject.id);
          },
        },
      ],
    );
  }, [
    activeProject,
    editableTitle,
    selectedChannelId,
    visibility,
    scheduleEnabled,
    scheduleDatetime,
    startPipeline,
  ]);

  // ─── Pipeline overlay ─────────────────────────────────────────────────────
  const pipelineActive =
    pipelineJob != null &&
    (pipelineJob.status === 'processing' || pipelineJob.status === 'pending');

  // ─── Render: loading ──────────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Loading project...</Text>
      </View>
    );
  }

  // ─── Render: main ─────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {titleEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editableTitle}
              onChangeText={setEditableTitle}
              onBlur={() => setTitleEditing(false)}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => setTitleEditing(false)}
            />
          ) : (
            <TouchableOpacity onPress={() => setTitleEditing(true)} activeOpacity={0.8}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {editableTitle || 'Untitled Project'}
              </Text>
            </TouchableOpacity>
          )}
          <Badge
            label={getStatusLabel(activeProject.status)}
            status={activeProject.status}
            size="sm"
            dot
          />
        </View>

        <Button
          label="Save"
          onPress={() => {}}
          size="sm"
          variant="outline"
          icon={<Ionicons name="checkmark" size={14} color={COLORS.primaryLight} />}
          iconPosition="left"
        />
      </View>

      {/* ── Main Scroll ──────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Video Preview ─────────────────────────────────────────────── */}
        <View style={[styles.previewContainer, { height: PREVIEW_HEIGHT }]}>
          {/* Thumbnail */}
          {selectedScene?.clipUrl ? (
            <Image
              source={{ uri: selectedScene.clipUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#1A1A2E', '#252540', '#1A1A2E']}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          {/* Scene counter badge */}
          <View style={styles.sceneCounter}>
            <Text style={styles.sceneCounterText}>
              Scene {selectedSceneIndex + 1}/{totalScenes}
            </Text>
          </View>

          {/* Subtitle overlay */}
          {subtitlesEnabled && selectedScene?.subtitle && (
            <Animated.View style={[styles.subtitleOverlay, { opacity: subtitleOpacity }]}>
              <Text
                style={[
                  styles.subtitleText,
                  subtitleStyle === 'yellow' && styles.subtitleYellow,
                  subtitleStyle === 'colorful' && styles.subtitleColorful,
                ]}
              >
                {selectedScene.subtitle.text}
              </Text>
            </Animated.View>
          )}

          {/* Playback controls */}
          <View style={styles.playbackControls}>
            <TouchableOpacity style={styles.playbackBtn} onPress={handlePrevScene}>
              <Ionicons name="play-skip-back" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playbackBtn} onPress={handleNextScene}>
              <Ionicons name="play-skip-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Duration label */}
          {selectedScene && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.durationBadgeText}>
                {formatDuration(selectedScene.duration)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Timeline Strip ────────────────────────────────────────────── */}
        <View style={styles.timelineSection}>
          <FlatList
            ref={timelineRef}
            data={scenes}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineContent}
            renderItem={({ item, index }) => (
              <TimelineThumbnail
                scene={item}
                index={index}
                isSelected={index === selectedSceneIndex}
                onPress={() => handleSceneSelect(index)}
              />
            )}
          />
        </View>

        {/* ── Scene Editor Panel ────────────────────────────────────────── */}
        {selectedScene && (
          <View style={styles.panelSection}>
            <SectionHeader title="Scene Editor" icon="cut-outline" />

            <GradientCard border style={styles.sceneEditorCard} padding={16}>
              {/* Clip row */}
              <View style={styles.clipRow}>
                <View style={styles.clipThumb}>
                  {selectedScene.clipUrl ? (
                    <Image
                      source={{ uri: selectedScene.clipUrl }}
                      style={styles.clipThumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.clipThumbPlaceholder}>
                      <Ionicons name="image-outline" size={22} color={COLORS.textMuted} />
                    </View>
                  )}
                </View>
                <View style={styles.clipInfo}>
                  <Text style={styles.clipSource}>
                    Source: {selectedScene.clipSource.toUpperCase()}
                  </Text>
                  <Text style={styles.clipKeywords} numberOfLines={1}>
                    {selectedScene.keywords.join(', ')}
                  </Text>
                </View>
                <Button
                  label="Change"
                  onPress={() => setFootagePickerVisible(true)}
                  size="sm"
                  variant="outline"
                />
              </View>

              {/* Transition selector */}
              <View style={styles.editorBlock}>
                <Text style={styles.editorBlockLabel}>Transition</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.transitionRow}
                >
                  {TRANSITIONS.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        styles.transitionPill,
                        selectedScene.transition === t.value && styles.transitionPillActive,
                      ]}
                      onPress={() =>
                        handleTransitionChange(t.value as VideoScene['transition'])
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.transitionIcon}>{t.icon}</Text>
                      <Text
                        style={[
                          styles.transitionLabel,
                          selectedScene.transition === t.value &&
                            styles.transitionLabelActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Duration adjustment */}
              <View style={styles.editorBlock}>
                <Text style={styles.editorBlockLabel}>Duration</Text>
                <View style={styles.durationRow}>
                  <TouchableOpacity
                    style={styles.durationBtn}
                    onPress={() => handleDurationAdjust(-1)}
                  >
                    <Ionicons name="remove" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                  <View style={styles.durationDisplay}>
                    <Text style={styles.durationValue}>
                      {selectedScene.duration}s
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.durationBtn}
                    onPress={() => handleDurationAdjust(1)}
                  >
                    <Ionicons name="add" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subtitle text */}
              <View style={styles.editorBlock}>
                <Text style={styles.editorBlockLabel}>Subtitle Text</Text>
                <TextInput
                  style={styles.subtitleInput}
                  value={selectedScene.subtitle?.text ?? ''}
                  onChangeText={handleSubtitleChange}
                  placeholder="Enter subtitle for this scene..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </GradientCard>
          </View>
        )}

        {/* ── Background Music ─────────────────────────────────────────── */}
        <View style={styles.panelSection}>
          <SectionHeader title="Background Music" icon="musical-notes-outline" />

          <FlatList
            data={BACKGROUND_MUSIC}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <MusicTrackRow
                track={item}
                isSelected={item.id === selectedMusicId}
                volume={musicVolume}
                onSelect={() =>
                  setSelectedMusicId((prev) => (prev === item.id ? null : item.id))
                }
                onVolumeChange={setMusicVolume}
              />
            )}
            contentContainerStyle={styles.musicList}
          />
        </View>

        {/* ── Subtitles ────────────────────────────────────────────────── */}
        <View style={styles.panelSection}>
          <SectionHeader title="Subtitles" icon="chatbubble-ellipses-outline" />

          <GradientCard border style={styles.subtitlePanel} padding={16}>
            {/* Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="text-outline" size={18} color={COLORS.primaryLight} />
                <View>
                  <Text style={styles.toggleTitle}>Enable Subtitles</Text>
                  <Text style={styles.toggleDesc}>
                    Auto-generated from voiceover transcript
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggle, subtitlesEnabled && styles.toggleActive]}
                onPress={() => setSubtitlesEnabled((v) => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.toggleThumb, subtitlesEnabled && styles.toggleThumbActive]}
                />
              </TouchableOpacity>
            </View>

            {/* Style selector */}
            {subtitlesEnabled && (
              <View style={styles.editorBlock}>
                <Text style={styles.editorBlockLabel}>Subtitle Style</Text>
                <View style={styles.subtitleStyleRow}>
                  {(['white', 'yellow', 'colorful'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.subtitleStylePill,
                        subtitleStyle === s && styles.subtitleStylePillActive,
                      ]}
                      onPress={() => setSubtitleStyle(s)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.subtitleStyleDot,
                          {
                            backgroundColor:
                              s === 'white' ? '#fff' : s === 'yellow' ? '#FFE600' : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.subtitleStyleLabel,
                          subtitleStyle === s && styles.subtitleStyleLabelActive,
                        ]}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </GradientCard>
        </View>

        {/* ── Render & Export ──────────────────────────────────────────── */}
        <View style={styles.panelSection}>
          <SectionHeader title="Render & Export" icon="cloud-download-outline" />

          <GradientCard border style={styles.renderPanel} padding={16}>
            {/* Quality selector */}
            <View style={styles.editorBlock}>
              <Text style={styles.editorBlockLabel}>Export Quality</Text>
              <View style={styles.qualityRow}>
                {(['720p', '1080p'] as const).map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.qualityPill,
                      quality === q && styles.qualityPillActive,
                    ]}
                    onPress={() => setQuality(q)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={q === '1080p' ? 'diamond-outline' : 'film-outline'}
                      size={14}
                      color={quality === q ? COLORS.text : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.qualityLabel,
                        quality === q && styles.qualityLabelActive,
                      ]}
                    >
                      {q}
                    </Text>
                    {q === '1080p' && (
                      <Badge label="HD" color={COLORS.warning} size="sm" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Render progress */}
            {isRendering && (
              <View style={styles.renderProgressBlock}>
                <View style={styles.renderProgressHeader}>
                  <Text style={styles.renderProgressLabel}>Rendering...</Text>
                  <Text style={styles.renderProgressPercent}>
                    {Math.round(renderProgress)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={renderProgress}
                  color={COLORS.primary}
                  animated
                />
              </View>
            )}

            <Button
              label={isRendering ? 'Rendering...' : 'Render Video'}
              onPress={handleRender}
              loading={isRendering}
              fullWidth
              icon={
                !isRendering ? (
                  <Ionicons name="rocket-outline" size={16} color="#fff" />
                ) : undefined
              }
            />
          </GradientCard>
        </View>

        {/* ── Publish ──────────────────────────────────────────────────── */}
        <View style={styles.panelSection}>
          <SectionHeader title="Publish to YouTube" icon="logo-youtube" />

          <GradientCard border style={styles.publishPanel} padding={16}>
            {/* Channel selector */}
            <View style={styles.editorBlock}>
              <Text style={styles.editorBlockLabel}>Channel</Text>
              <TouchableOpacity
                style={styles.channelSelector}
                onPress={() => setChannelPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-youtube" size={16} color={COLORS.error} />
                <Text style={styles.channelSelectorText} numberOfLines={1}>
                  {channels.find((c) => c.id === selectedChannelId)?.name ??
                    'Select a channel'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Visibility */}
            <View style={styles.editorBlock}>
              <Text style={styles.editorBlockLabel}>Visibility</Text>
              <View style={styles.visibilityRow}>
                {(['public', 'unlisted', 'private'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.visibilityPill,
                      visibility === v && styles.visibilityPillActive,
                    ]}
                    onPress={() => setVisibility(v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        v === 'public'
                          ? 'earth-outline'
                          : v === 'unlisted'
                          ? 'link-outline'
                          : 'lock-closed-outline'
                      }
                      size={13}
                      color={visibility === v ? COLORS.text : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.visibilityLabel,
                        visibility === v && styles.visibilityLabelActive,
                      ]}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Schedule toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primaryLight} />
                <View>
                  <Text style={styles.toggleTitle}>Schedule Post</Text>
                  <Text style={styles.toggleDesc}>Publish at a specific time</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggle, scheduleEnabled && styles.toggleActive]}
                onPress={() => setScheduleEnabled((v) => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    scheduleEnabled && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {/* Datetime picker placeholder */}
            {scheduleEnabled && (
              <TouchableOpacity style={styles.datetimePicker} activeOpacity={0.8}>
                <Ionicons name="time-outline" size={16} color={COLORS.primaryLight} />
                <Text style={styles.datetimeText}>
                  {scheduleDatetime || 'Tap to select date & time'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}

            <Button
              label="Upload to YouTube"
              onPress={handleUpload}
              fullWidth
              icon={<Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
              style={styles.uploadBtn}
            />
          </GradientCard>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Pipeline Loading Overlay ──────────────────────────────────────── */}
      <LoadingOverlay
        visible={pipelineActive}
        stage={pipelineJob?.stage ? `Stage: ${pipelineJob.stage}` : undefined}
        progress={pipelineJob?.progress}
        message="Generating your video... This may take a few minutes."
      />

      {/* ── Footage Picker Bottom Sheet ───────────────────────────────────── */}
      <BottomSheet
        visible={footagePickerVisible}
        onClose={() => setFootagePickerVisible(false)}
        title="Stock Footage"
      >
        <StockFootagePicker
          keywords={selectedScene?.keywords ?? []}
          onSelect={(url) => {
            if (selectedScene) {
              updateScene({ ...selectedScene, clipUrl: url });
            }
            setFootagePickerVisible(false);
          }}
        />
      </BottomSheet>

      {/* ── Channel Picker Bottom Sheet ───────────────────────────────────── */}
      <BottomSheet
        visible={channelPickerVisible}
        onClose={() => setChannelPickerVisible(false)}
        title="Select Channel"
      >
        <View style={styles.channelPickerList}>
          {channels.map((ch) => (
            <TouchableOpacity
              key={ch.id}
              style={[
                styles.channelPickerItem,
                selectedChannelId === ch.id && styles.channelPickerItemActive,
              ]}
              onPress={() => {
                setSelectedChannelId(ch.id);
                setChannelPickerVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-youtube" size={18} color={COLORS.error} />
              <Text style={styles.channelPickerName}>{ch.name}</Text>
              {selectedChannelId === ch.id && (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

// ─── Timeline Thumbnail ────────────────────────────────────────────────────────

interface TimelineThumbnailProps {
  scene: VideoScene;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}

function TimelineThumbnail({ scene, index, isSelected, onPress }: TimelineThumbnailProps) {
  const transition = TRANSITIONS.find((t) => t.value === scene.transition);

  return (
    <TouchableOpacity
      style={[styles.timelineThumb, isSelected && styles.timelineThumbSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Thumbnail image */}
      {scene.clipUrl ? (
        <Image
          source={{ uri: scene.clipUrl }}
          style={styles.timelineThumbImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={['#252540', '#1A1A2E']}
          style={styles.timelineThumbImage}
        />
      )}

      {/* Selected highlight border */}
      {isSelected && <View style={styles.timelineThumbBorder} />}

      {/* Scene number */}
      <View style={styles.timelineSceneNum}>
        <Text style={styles.timelineSceneNumText}>{index + 1}</Text>
      </View>

      {/* Transition icon (bottom right) */}
      <View style={styles.timelineTransitionIcon}>
        <Text style={{ fontSize: 10 }}>{transition?.icon ?? '✂️'}</Text>
      </View>

      {/* Duration (bottom left) */}
      <View style={styles.timelineDuration}>
        <Text style={styles.timelineDurationText}>{scene.duration}s</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Music Track Row ───────────────────────────────────────────────────────────

interface MusicTrackRowProps {
  track: BackgroundMusic;
  isSelected: boolean;
  volume: number;
  onSelect: () => void;
  onVolumeChange: (v: number) => void;
}

function MusicTrackRow({ track, isSelected, volume, onSelect, onVolumeChange }: MusicTrackRowProps) {
  return (
    <GradientCard
      border={isSelected}
      style={[styles.musicTrack, isSelected && styles.musicTrackSelected]}
      padding={12}
    >
      <View style={styles.musicTrackMain}>
        {/* Play button */}
        <TouchableOpacity
          style={[styles.musicPlayBtn, isSelected && styles.musicPlayBtnActive]}
          onPress={onSelect}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSelected ? 'pause' : 'play'}
            size={16}
            color={isSelected ? '#fff' : COLORS.textSecondary}
          />
        </TouchableOpacity>

        {/* Track info */}
        <View style={styles.musicInfo}>
          <Text style={styles.musicName} numberOfLines={1}>
            {track.name}
          </Text>
          <View style={styles.musicMeta}>
            <Badge label={track.genre} size="sm" color={COLORS.info} />
            <Text style={styles.musicBpm}>{track.bpm} BPM</Text>
            <Text style={styles.musicDuration}>{formatDuration(track.duration)}</Text>
          </View>
        </View>

        {/* Selected check */}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        )}
      </View>

      {/* Volume slider (visible only when selected) */}
      {isSelected && (
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low-outline" size={14} color={COLORS.textMuted} />
          <View style={styles.volumeTrack}>
            <TouchableOpacity
              style={[styles.volumeFill, { width: `${volume}%` }]}
              activeOpacity={1}
            />
            <View style={styles.volumeTrackBg} />
          </View>
          <Ionicons name="volume-high-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.volumeValue}>{volume}</Text>
        </View>
      )}
    </GradientCard>
  );
}

// ─── Stock Footage Picker (placeholder UI) ─────────────────────────────────────

interface StockFootagePickerProps {
  keywords: string[];
  onSelect: (url: string) => void;
}

function StockFootagePicker({ keywords, onSelect }: StockFootagePickerProps) {
  // Placeholder tiles – in production, these come from Pexels/Pixabay API
  const placeholders = Array.from({ length: 6 }, (_, i) => ({
    id: `clip-${i}`,
    url: `https://picsum.photos/seed/${keywords[0] ?? 'nature'}-${i}/320/180`,
    label: `${keywords[0] ?? 'Clip'} ${i + 1}`,
  }));

  return (
    <View>
      <Text style={styles.footageKeywords}>
        Keywords: {keywords.slice(0, 4).join(', ')}
      </Text>
      <View style={styles.footageGrid}>
        {placeholders.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.footageTile}
            onPress={() => onSelect(item.url)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.url }} style={styles.footageTileImage} resizeMode="cover" />
            <Text style={styles.footageTileLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Section Header Helper ─────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Ionicons name={icon} size={16} color={COLORS.primaryLight} />
      </View>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  titleInput: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 2,
    minWidth: 120,
    maxWidth: SCREEN_WIDTH * 0.45,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Preview
  previewContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  sceneCounter: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sceneCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    lineHeight: 22,
  },
  subtitleYellow: { color: '#FFE600' },
  subtitleColorful: { color: '#FF6B6B' },
  playbackControls: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  playbackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  durationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  durationBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  // Timeline
  timelineSection: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  timelineContent: { paddingHorizontal: 16, gap: 8 },
  timelineThumb: {
    width: 80,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  timelineThumbSelected: {
    borderColor: COLORS.primary,
  },
  timelineThumbImage: {
    width: '100%',
    height: '100%',
  },
  timelineThumbBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  timelineSceneNum: {
    position: 'absolute',
    top: 3,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  timelineSceneNumText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  timelineTransitionIcon: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    padding: 2,
  },
  timelineDuration: {
    position: 'absolute',
    bottom: 3,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  timelineDurationText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '600' },

  // Panel section
  panelSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },

  // Scene editor card
  sceneEditorCard: { gap: 16 },

  // Clip row
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clipThumb: {
    width: 72,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clipThumbImage: { width: '100%', height: '100%' },
  clipThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipInfo: { flex: 1, gap: 3 },
  clipSource: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  clipKeywords: { color: COLORS.textSecondary, fontSize: 12 },

  // Editor block
  editorBlock: { gap: 8 },
  editorBlockLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Transition row
  transitionRow: { gap: 8 },
  transitionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transitionPillActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderColor: COLORS.primary,
  },
  transitionIcon: { fontSize: 14 },
  transitionLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  transitionLabelActive: { color: COLORS.text },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
  },
  durationBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationDisplay: {
    minWidth: 56,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },

  // Subtitle input
  subtitleInput: {
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 60,
  },

  // Music
  musicList: { gap: 8 },
  musicTrack: { gap: 10 },
  musicTrackSelected: { borderColor: COLORS.primary },
  musicTrackMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  musicPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicPlayBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  musicInfo: { flex: 1, gap: 5 },
  musicName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  musicMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  musicBpm: { color: COLORS.textMuted, fontSize: 11 },
  musicDuration: { color: COLORS.textMuted, fontSize: 11 },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.elevated,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  volumeTrackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.elevated,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    zIndex: 1,
  },
  volumeValue: { color: COLORS.textMuted, fontSize: 11, minWidth: 24, textAlign: 'right' },

  // Subtitles panel
  subtitlePanel: { gap: 14 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  toggleDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textMuted,
  },
  toggleThumbActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  subtitleStyleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subtitleStylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subtitleStylePillActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderColor: COLORS.primary,
  },
  subtitleStyleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subtitleStyleLabel: { color: COLORS.textMuted, fontSize: 13 },
  subtitleStyleLabelActive: { color: COLORS.text },

  // Render panel
  renderPanel: { gap: 14 },
  qualityRow: { flexDirection: 'row', gap: 10 },
  qualityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qualityPillActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderColor: COLORS.primary,
  },
  qualityLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  qualityLabelActive: { color: COLORS.text },
  renderProgressBlock: { gap: 6 },
  renderProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renderProgressLabel: { color: COLORS.textSecondary, fontSize: 13 },
  renderProgressPercent: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  // Publish panel
  publishPanel: { gap: 14 },
  channelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  channelSelectorText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visibilityPillActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderColor: COLORS.primary,
  },
  visibilityLabel: { color: COLORS.textMuted, fontSize: 12 },
  visibilityLabelActive: { color: COLORS.text, fontWeight: '600' },
  datetimePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  datetimeText: { flex: 1, color: COLORS.textSecondary, fontSize: 14 },
  uploadBtn: { marginTop: 4 },

  // Channel picker bottom sheet
  channelPickerList: { gap: 4 },
  channelPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelPickerItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  channelPickerName: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },

  // Footage picker
  footageKeywords: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  footageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footageTile: {
    width: (SCREEN_WIDTH - 60) / 2,
    gap: 6,
  },
  footageTileImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
  },
  footageTileLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },

  // Bottom spacer
  bottomSpacer: { height: Platform.OS === 'ios' ? 100 : 72 },
});
