import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useVideoStore, useWizard } from '@/store/videoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Button, GradientCard, Badge, ProgressBar } from '@/components/ui';
import { SAMPLE_VOICES, COLORS } from '@/utils/constants';
import type { Voice, VoiceSettings } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmotionOption = NonNullable<VoiceSettings['emotion']>;

const EMOTIONS: { value: EmotionOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'neutral', label: 'Neutral', icon: 'remove-circle-outline' },
  { value: 'happy', label: 'Happy', icon: 'happy-outline' },
  { value: 'sad', label: 'Sad', icon: 'sad-outline' },
  { value: 'excited', label: 'Excited', icon: 'flash-outline' },
  { value: 'serious', label: 'Serious', icon: 'alert-circle-outline' },
];

const CATEGORY_COLORS: Record<Voice['category'], string> = {
  professional: COLORS.primary,
  casual: COLORS.success,
  dramatic: COLORS.error,
  news: COLORS.info,
};

// ─── VoiceCard (FlatList item) ────────────────────────────────────────────────

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  isLoadingPreview: boolean;
  onSelect: (voice: Voice) => void;
  onPreview: (voice: Voice) => void;
}

function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  isLoadingPreview,
  onSelect,
  onPreview,
}: VoiceCardProps) {
  const catColor = CATEGORY_COLORS[voice.category];

  return (
    <TouchableOpacity
      style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
      onPress={() => onSelect(voice)}
      activeOpacity={0.8}
    >
      {isSelected && (
        <LinearGradient
          colors={['#6366F118', '#4f46e528']}
          style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        />
      )}

      {/* Gender icon */}
      <View style={[styles.voiceAvatarRing, isSelected && styles.voiceAvatarRingSelected]}>
        <Ionicons
          name={voice.gender === 'female' ? 'woman-outline' : 'man-outline'}
          size={20}
          color={isSelected ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      <Text style={[styles.voiceName, isSelected && styles.voiceNameSelected]} numberOfLines={1}>
        {voice.name}
      </Text>
      <Text style={styles.voiceLanguage} numberOfLines={1}>
        {voice.accent ? `${voice.language} · ${voice.accent}` : voice.language}
      </Text>

      {/* Category badge */}
      <View style={[styles.voiceCategoryBadge, { backgroundColor: `${catColor}20`, borderColor: `${catColor}50` }]}>
        <Text style={[styles.voiceCategoryText, { color: catColor }]}>
          {voice.category}
        </Text>
      </View>

      {/* Play preview button */}
      <TouchableOpacity
        style={styles.voicePlayBtn}
        onPress={() => onPreview(voice)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {isLoadingPreview ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={26}
            color={isPlaying ? COLORS.success : COLORS.primary}
          />
        )}
      </TouchableOpacity>

      {/* Selected checkmark */}
      {isSelected && (
        <View style={styles.voiceSelectedDot}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VoiceScreen() {
  const router = useRouter();
  const store = useVideoStore();
  const wizard = useWizard();
  const settingsStore = useSettingsStore();
  const apiKey = settingsStore.settings.elevenLabsApiKey ?? '';

  // ─── Local state ────────────────────────────────────────────────────────────

  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(() => {
    const savedId = wizard.voiceSettings.voiceId;
    return SAMPLE_VOICES.find((v) => v.id === savedId) ?? SAMPLE_VOICES[0];
  });

  const [stability, setStability] = useState(
    Math.round((wizard.voiceSettings.stability ?? 0.5) * 100),
  );
  const [similarity, setSimilarity] = useState(
    Math.round((wizard.voiceSettings.similarityBoost ?? 0.75) * 100),
  );
  const [speed, setSpeed] = useState(wizard.voiceSettings.speed ?? 1.0);
  const [emotion, setEmotion] = useState<EmotionOption>(
    wizard.voiceSettings.emotion ?? 'neutral',
  );

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingPreviewVoiceId, setLoadingPreviewVoiceId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [voiceoverComplete, setVoiceoverComplete] = useState(
    wizard.voiceoverJob?.status === 'completed',
  );

  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const scriptLanguage = wizard.scriptRequest.language ?? 'en';
  const voiceLanguage = selectedVoice?.language.toLowerCase().slice(0, 2) ?? 'en';
  // Simple check — English voices work for 'en' scripts
  const languageMismatch =
    selectedVoice !== null &&
    scriptLanguage !== 'en' &&
    !selectedVoice.language.toLowerCase().includes(scriptLanguage);

  const hookText =
    wizard.generatedScript?.hooks?.[0] ??
    wizard.generatedScript?.sections?.[0]?.text?.slice(0, 200) ??
    'No preview available.';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectVoice = (voice: Voice) => {
    setSelectedVoice(voice);
    store.updateVoiceSettings({ voiceId: voice.id });
  };

  const handlePreviewVoice = async (voice: Voice) => {
    // Toggle off if already playing this voice
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }

    setLoadingPreviewVoiceId(voice.id);
    try {
      // Simulate audio preview load (replace with real audio playback)
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPlayingVoiceId(voice.id);
      // Simulate playback duration
      setTimeout(() => setPlayingVoiceId(null), 4000);
    } catch {
      Alert.alert('Preview Error', 'Unable to play voice preview at this time.');
    } finally {
      setLoadingPreviewVoiceId(null);
    }
  };

  const handlePreviewScript = async () => {
    if (!selectedVoice) {
      Alert.alert('No Voice Selected', 'Please select a voice first.');
      return;
    }
    setIsPreviewing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      Alert.alert('Preview Ready', 'Voice preview generated with current settings.');
    } catch {
      Alert.alert('Error', 'Failed to generate preview.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!selectedVoice) {
      Alert.alert('No Voice Selected', 'Please select a voice first.');
      return;
    }
    if (!apiKey) {
      Alert.alert(
        'API Key Required',
        'ElevenLabs API key not configured. Go to Settings to add it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/(app)/settings' as never) },
        ],
      );
      return;
    }

    setIsGenerating(true);
    setGenerateProgress(0);

    // Persist settings before generating
    store.updateVoiceSettings({
      voiceId: selectedVoice.id,
      stability: stability / 100,
      similarityBoost: similarity / 100,
      speed,
      emotion,
    });

    // Animate fake progress while waiting
    progressInterval.current = setInterval(() => {
      setGenerateProgress((prev) => {
        const next = prev + Math.random() * 8;
        return next >= 90 ? 90 : next;
      });
    }, 400);

    try {
      await store.generateVoiceover(apiKey);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setGenerateProgress(100);
      setVoiceoverComplete(true);
    } catch (err) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setGenerateProgress(0);
      Alert.alert('Generation Failed', (err as Error).message ?? 'Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    store.setWizardStep('visuals');
    router.push('/(app)/create/preview' as never);
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderVoiceCard = ({ item }: { item: Voice }) => (
    <VoiceCard
      voice={item}
      isSelected={selectedVoice?.id === item.id}
      isPlaying={playingVoiceId === item.id}
      isLoadingPreview={loadingPreviewVoiceId === item.id}
      onSelect={handleSelectVoice}
      onPreview={handlePreviewVoice}
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Voice</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>3 / 5</Text>
        </View>
      </View>

      {/* Step progress bar */}
      <View style={styles.progressRow}>
        <ProgressBar progress={60} color={COLORS.primary} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Voice Grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose a Voice</Text>
          <Text style={styles.sectionSubtitle}>
            {SAMPLE_VOICES.length} voices available — tap to select, play to preview
          </Text>
          <FlatList<Voice>
            data={SAMPLE_VOICES}
            renderItem={renderVoiceCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.voiceColumnWrapper}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.voiceRowGap} />}
          />
        </View>

        {/* ── Language Mismatch Note ── */}
        {languageMismatch && selectedVoice && (
          <View style={styles.langWarning}>
            <Ionicons name="language-outline" size={16} color={COLORS.warning} />
            <Text style={styles.langWarningText}>
              Selected voice is {selectedVoice.language}, but your script language is{' '}
              <Text style={styles.langWarningBold}>{scriptLanguage.toUpperCase()}</Text>. Consider
              using a matching voice for best results.
            </Text>
          </View>
        )}

        {/* ── Voice Settings ── */}
        {selectedVoice && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Voice Settings</Text>
            <Text style={styles.sectionSubtitle}>
              Fine-tune {selectedVoice.name}'s output
            </Text>

            <GradientCard style={styles.settingsCard} border>
              {/* Stability */}
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>Stability</Text>
                  <Text style={styles.sliderValue}>{stability}%</Text>
                </View>
                <Text style={styles.sliderHint}>
                  Higher stability = more consistent, less expressive
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={stability}
                  onValueChange={setStability}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primaryLight}
                />
              </View>

              <View style={styles.divider} />

              {/* Similarity */}
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>Similarity Boost</Text>
                  <Text style={styles.sliderValue}>{similarity}%</Text>
                </View>
                <Text style={styles.sliderHint}>
                  Higher similarity = closer to the original voice character
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={similarity}
                  onValueChange={setSimilarity}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primaryLight}
                />
              </View>

              <View style={styles.divider} />

              {/* Speed */}
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>Speed</Text>
                  <Text style={styles.sliderValue}>{speed.toFixed(1)}x</Text>
                </View>
                <Text style={styles.sliderHint}>0.5x (slow) to 2.0x (fast)</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  step={0.1}
                  value={speed}
                  onValueChange={(v) => setSpeed(Math.round(v * 10) / 10)}
                  minimumTrackTintColor={COLORS.success}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.success}
                />
              </View>

              <View style={styles.divider} />

              {/* Emotion selector */}
              <View style={styles.emotionBlock}>
                <Text style={styles.sliderLabel}>Emotion</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emotionScrollContent}
                >
                  {EMOTIONS.map((em) => {
                    const isSelected = emotion === em.value;
                    return (
                      <TouchableOpacity
                        key={em.value}
                        style={[
                          styles.emotionPill,
                          isSelected && styles.emotionPillSelected,
                        ]}
                        onPress={() => setEmotion(em.value)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={em.icon}
                          size={14}
                          color={isSelected ? COLORS.primary : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.emotionPillText,
                            isSelected && styles.emotionPillTextSelected,
                          ]}
                        >
                          {em.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </GradientCard>
          </View>
        )}

        {/* ── Preview Section ── */}
        {selectedVoice && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preview</Text>
            <GradientCard style={styles.previewCard} border>
              <View style={styles.previewHookRow}>
                <Ionicons name="mic-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.previewHookText} numberOfLines={3}>
                  {hookText}
                </Text>
              </View>
              <Button
                label={isPreviewing ? 'Generating preview...' : 'Preview Voice'}
                onPress={handlePreviewScript}
                variant="secondary"
                loading={isPreviewing}
                fullWidth
                icon={
                  !isPreviewing ? (
                    <Ionicons name="play-circle-outline" size={18} color={COLORS.text} />
                  ) : undefined
                }
                iconPosition="left"
              />
            </GradientCard>
          </View>
        )}

        {/* ── Generate Voiceover ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Generate Voiceover</Text>

          {isGenerating && (
            <View style={styles.generateProgressBlock}>
              <View style={styles.generateProgressHeader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.generateProgressLabel}>
                  Generating voiceover... {Math.round(generateProgress)}%
                </Text>
              </View>
              <ProgressBar progress={generateProgress} color={COLORS.primary} />
            </View>
          )}

          {voiceoverComplete && !isGenerating ? (
            <View style={styles.completeBlock}>
              <View style={styles.completeBanner}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                <Text style={styles.completeBannerText}>Voiceover generated successfully!</Text>
              </View>
              <Button
                label="Next: Visuals"
                onPress={handleNext}
                fullWidth
                size="lg"
                icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
                iconPosition="right"
              />
            </View>
          ) : (
            <Button
              label={isGenerating ? 'Generating...' : 'Generate Voiceover'}
              onPress={handleGenerateVoiceover}
              fullWidth
              size="lg"
              loading={isGenerating}
              disabled={!selectedVoice || isGenerating}
              icon={
                !isGenerating ? (
                  <Ionicons name="mic" size={20} color="#fff" />
                ) : undefined
              }
              iconPosition="left"
            />
          )}

          {!apiKey && (
            <Text style={styles.apiKeyHint}>
              ElevenLabs API key not configured. Add it in Settings.
            </Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  stepBadge: {
    backgroundColor: `${COLORS.primary}25`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${COLORS.primary}50`,
  },
  stepBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },

  // Progress bar row
  progressRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 20,
  },

  // Section
  section: { gap: 10 },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: -6,
  },

  // Voice FlatList grid
  voiceColumnWrapper: {
    gap: 12,
  },
  voiceRowGap: {
    height: 12,
  },

  // VoiceCard
  voiceCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    minHeight: 160,
  },
  voiceCardSelected: {
    borderColor: COLORS.primary,
  },
  voiceAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  voiceAvatarRingSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  voiceName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceNameSelected: {
    color: COLORS.text,
  },
  voiceLanguage: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  voiceCategoryBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  voiceCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  voicePlayBtn: {
    marginTop: 4,
  },
  voiceSelectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Language warning
  langWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.warning}15`,
    borderWidth: 1,
    borderColor: `${COLORS.warning}40`,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  langWarningText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  langWarningBold: {
    fontWeight: '700',
  },

  // Settings card
  settingsCard: {
    gap: 0,
  },
  sliderBlock: {
    paddingVertical: 12,
    gap: 4,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sliderValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
  sliderHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },

  // Emotion block
  emotionBlock: {
    paddingVertical: 12,
    gap: 10,
  },
  emotionScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  emotionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.elevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emotionPillSelected: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  emotionPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emotionPillTextSelected: {
    color: COLORS.primaryLight,
  },

  // Preview card
  previewCard: {
    gap: 12,
  },
  previewHookRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewHookText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // Generate progress
  generateProgressBlock: {
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  generateProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateProgressLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Complete block
  completeBlock: {
    gap: 12,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.success}40`,
    padding: 14,
  },
  completeBannerText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
  },

  // API key hint
  apiKeyHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  // Bottom spacer
  bottomSpacer: { height: 40 },
});
