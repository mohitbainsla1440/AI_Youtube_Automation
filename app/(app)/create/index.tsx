import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useVideoStore, useWizard } from '@/store/videoStore';
import { useSettingsStore, useHasRequiredKeys } from '@/store/settingsStore';
import { Button, Select, GradientCard } from '@/components/ui';
import { TONES, LANGUAGES, PROMPT_TEMPLATES, COLORS } from '@/utils/constants';
import type { VideoTone, VideoLanguage, VideoStyle, PromptTemplate } from '@/types';

// ─── Static mock hooks shown before generation ──────────────────────────────

const MOCK_HOOKS: string[] = [
  'What if everything you learned about this was wrong?',
  'Scientists just discovered something that changes everything...',
  'In the next 5 minutes you\'ll know what 99% of people don\'t.',
];

// ─── Duration options ────────────────────────────────────────────────────────

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
];

// ─── Video style options ─────────────────────────────────────────────────────

const VIDEO_STYLES: { value: VideoStyle; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'talking-head', label: 'Talking Head', icon: 'person-outline', description: 'On-camera presenter style' },
  { value: 'slideshow', label: 'Slideshow', icon: 'images-outline', description: 'Image & text driven' },
  { value: 'shorts', label: 'Shorts', icon: 'phone-portrait-outline', description: 'Vertical 60s format' },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateVideoScreen() {
  const router = useRouter();
  const store = useVideoStore();
  const wizard = useWizard();
  const hasRequiredKeys = useHasRequiredKeys();

  // Local UI state
  const [topic, setTopic] = useState(wizard.topic);
  const [selectedTone, setSelectedTone] = useState<VideoTone>(wizard.scriptRequest.tone ?? 'educational');
  const [selectedLanguage, setSelectedLanguage] = useState<VideoLanguage>(wizard.scriptRequest.language ?? 'en');
  const [selectedDuration, setSelectedDuration] = useState<number>(wizard.scriptRequest.targetDuration ?? 5);
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>(wizard.scriptRequest.style ?? 'talking-head');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [hooks, setHooks] = useState<string[]>(MOCK_HOOKS);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Animated progress bar value
  const progressAnim = useRef(new Animated.Value(0)).current;

  const MAX_TOPIC_LENGTH = 200;
  const topicLength = topic.length;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerateHooks = useCallback(async () => {
    if (!topic.trim()) return;
    setIsGeneratingHooks(true);
    // Simulate AI hook generation — replace with real API call when available
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setHooks([
      `The shocking truth about ${topic} nobody talks about`,
      `I tested ${topic} for 30 days — here's what happened`,
      `Why ${topic} is completely different from what you think`,
    ]);
    setIsGeneratingHooks(false);
  }, [topic]);

  const handleApplyTemplate = useCallback((template: PromptTemplate) => {
    setSelectedTemplate(template.id);
    setSelectedTone(template.tone);
    // Inject template prompt into topic context if topic is empty
    if (!topic.trim()) {
      setTopic(template.description);
    }
  }, [topic]);

  const animateProgress = useCallback(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const handleGenerateScript = useCallback(async () => {
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    animateProgress();

    try {
      store.setWizardTopic(topic);
      store.updateScriptRequest({
        tone: selectedTone,
        language: selectedLanguage,
        style: selectedStyle,
        targetDuration: selectedDuration,
        additionalContext: selectedHook ?? undefined,
      });

      await store.generateScript();
      router.push('/(app)/create/script' as never);
    } catch (err) {
      // Error is surfaced via store.error; wizard stays open
    } finally {
      setIsGenerating(false);
    }
  }, [
    topic,
    isGenerating,
    selectedTone,
    selectedLanguage,
    selectedStyle,
    selectedDuration,
    selectedHook,
    store,
    router,
    animateProgress,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '90%'],
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Video</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* API Key warning banner */}
        {!hasRequiredKeys && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={() => router.push('/(app)/settings' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
            <Text style={styles.warningText}>
              API keys not configured.{' '}
              <Text style={styles.warningLink}>Tap to set up in Settings</Text>
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Topic Input */}
        <GradientCard style={styles.sectionCard} border>
          <Text style={styles.sectionTitle}>What's your video about?</Text>
          <View style={styles.topicInputWrapper}>
            <TextInput
              style={styles.topicInput}
              value={topic}
              onChangeText={(v) => setTopic(v.slice(0, MAX_TOPIC_LENGTH))}
              placeholder="e.g. 10 facts about black holes"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={MAX_TOPIC_LENGTH}
              returnKeyType="done"
              blurOnSubmit
            />
            <Text style={[
              styles.charCounter,
              topicLength > MAX_TOPIC_LENGTH * 0.9 && styles.charCounterWarn,
            ]}>
              {topicLength}/{MAX_TOPIC_LENGTH}
            </Text>
          </View>
        </GradientCard>

        {/* AI Hook Generator */}
        <GradientCard style={styles.sectionCard} border>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>AI Hook Suggestions</Text>
            <TouchableOpacity
              style={[styles.generateHooksBtn, (!topic.trim() || isGeneratingHooks) && styles.generateHooksBtnDisabled]}
              onPress={handleGenerateHooks}
              disabled={!topic.trim() || isGeneratingHooks}
            >
              {isGeneratingHooks ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.generateHooksBtnText}>Generate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Select a hook to use as your video opener</Text>
          <View style={styles.hooksList}>
            {hooks.map((hook, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.hookPill,
                  selectedHook === hook && styles.hookPillSelected,
                ]}
                onPress={() => setSelectedHook(selectedHook === hook ? null : hook)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="flash-outline"
                  size={14}
                  color={selectedHook === hook ? COLORS.primary : COLORS.textMuted}
                  style={styles.hookIcon}
                />
                <Text style={[
                  styles.hookText,
                  selectedHook === hook && styles.hookTextSelected,
                ]}>
                  {hook}
                </Text>
                {selectedHook === hook && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </GradientCard>

        {/* Tone Selector */}
        <GradientCard style={styles.sectionCard} border>
          <Text style={styles.sectionTitle}>Tone</Text>
          <Text style={styles.sectionSubtitle}>Choose the style of your narration</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toneScrollContent}
          >
            {TONES.map((tone) => {
              const isSelected = selectedTone === tone.value;
              return (
                <TouchableOpacity
                  key={tone.value}
                  style={[styles.toneCard, isSelected && styles.toneCardSelected]}
                  onPress={() => setSelectedTone(tone.value)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['#6366F115', '#4f46e520']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={styles.toneEmoji}>{tone.emoji}</Text>
                  <Text style={[styles.toneLabel, isSelected && styles.toneLabelSelected]}>
                    {tone.label}
                  </Text>
                  <Text style={styles.toneDesc} numberOfLines={2}>
                    {tone.description}
                  </Text>
                  {isSelected && (
                    <View style={styles.toneCheck}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GradientCard>

        {/* Language Picker */}
        <GradientCard style={styles.sectionCard} border>
          <Select<VideoLanguage>
            label="Language"
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            options={LANGUAGES.map((l) => ({
              value: l.value,
              label: `${l.flag}  ${l.label}`,
              icon: undefined,
            }))}
          />
        </GradientCard>

        {/* Duration Picker */}
        <GradientCard style={styles.sectionCard} border>
          <Text style={styles.sectionTitle}>Duration</Text>
          <Text style={styles.sectionSubtitle}>Target length for your video</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = selectedDuration === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.durationPill, isSelected && styles.durationPillSelected]}
                  onPress={() => setSelectedDuration(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.durationText, isSelected && styles.durationTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GradientCard>

        {/* Prompt Templates */}
        <GradientCard style={styles.sectionCard} border>
          <Text style={styles.sectionTitle}>Prompt Templates</Text>
          <Text style={styles.sectionSubtitle}>Start with a proven format</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateScrollContent}
          >
            {PROMPT_TEMPLATES.map((template) => {
              const isSelected = selectedTemplate === template.id;
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.templateCard, isSelected && styles.templateCardSelected]}
                  onPress={() => handleApplyTemplate(template)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['#6366F120', '#4f46e530']}
                      style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                    />
                  )}
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={[styles.templateName, isSelected && styles.templateNameSelected]} numberOfLines={2}>
                    {template.name}
                  </Text>
                  <View style={styles.templateCategoryBadge}>
                    <Text style={styles.templateCategoryText}>{template.category}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GradientCard>

        {/* Video Style Selector */}
        <GradientCard style={styles.sectionCard} border>
          <Text style={styles.sectionTitle}>Video Style</Text>
          <Text style={styles.sectionSubtitle}>How should your video be formatted?</Text>
          <View style={styles.styleRow}>
            {VIDEO_STYLES.map((style) => {
              const isSelected = selectedStyle === style.value;
              return (
                <TouchableOpacity
                  key={style.value}
                  style={[styles.styleCard, isSelected && styles.styleCardSelected]}
                  onPress={() => setSelectedStyle(style.value)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['#6366F1', '#4f46e5']}
                      style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                    />
                  )}
                  <Ionicons
                    name={style.icon}
                    size={22}
                    color={isSelected ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[styles.styleLabel, isSelected && styles.styleLabelSelected]}>
                    {style.label}
                  </Text>
                  <Text style={[styles.styleDesc, isSelected && styles.styleDescSelected]} numberOfLines={2}>
                    {style.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GradientCard>

        {/* Bottom spacer for button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Generate Script Button (sticky bottom) */}
      <View style={styles.bottomBar}>
        {isGenerating && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressWidth },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>Generating your script...</Text>
          </View>
        )}
        <Button
          label={isGenerating ? 'Generating Script...' : 'Generate Script'}
          onPress={handleGenerateScript}
          loading={isGenerating}
          disabled={!topic.trim() || isGenerating || !hasRequiredKeys}
          fullWidth
          size="lg"
          icon={!isGenerating ? <Ionicons name="sparkles" size={20} color="#fff" /> : undefined}
          iconPosition="left"
        />
        {!hasRequiredKeys && (
          <Text style={styles.bottomHint}>Configure API keys in Settings to enable generation</Text>
        )}
      </View>
    </KeyboardAvoidingView>
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
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}18`,
    borderWidth: 1,
    borderColor: `${COLORS.warning}40`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '500',
  },
  warningLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  // Section cards
  sectionCard: {
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: -6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Topic Input
  topicInputWrapper: {
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  topicInput: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  charCounterWarn: {
    color: COLORS.warning,
  },

  // Hook Generator
  generateHooksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  generateHooksBtnDisabled: {
    opacity: 0.4,
  },
  generateHooksBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  hooksList: {
    gap: 8,
  },
  hookPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  hookPillSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}60`,
  },
  hookIcon: {
    marginTop: 1,
  },
  hookText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  hookTextSelected: {
    color: COLORS.text,
  },

  // Tone Selector
  toneScrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  toneCard: {
    width: 110,
    backgroundColor: COLORS.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 4,
    overflow: 'hidden',
  },
  toneCardSelected: {
    borderColor: COLORS.primary,
  },
  toneEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  toneLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  toneLabelSelected: {
    color: COLORS.primary,
  },
  toneDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  toneCheck: {
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

  // Duration Picker
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  durationPillSelected: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  durationText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  durationTextSelected: {
    color: COLORS.primary,
  },

  // Prompt Templates
  templateScrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  templateCard: {
    width: 108,
    backgroundColor: COLORS.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 6,
    overflow: 'hidden',
  },
  templateCardSelected: {
    borderColor: COLORS.primary,
  },
  templateIcon: {
    fontSize: 26,
  },
  templateName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  templateNameSelected: {
    color: COLORS.text,
  },
  templateCategoryBadge: {
    backgroundColor: `${COLORS.primary}25`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  templateCategoryText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Video Style
  styleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  styleCard: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  styleCardSelected: {
    borderColor: COLORS.primary,
  },
  styleLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  styleLabelSelected: {
    color: '#fff',
  },
  styleDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  styleDescSelected: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Bottom bar
  bottomSpacer: {
    height: 120,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 8,
  },
  progressContainer: {
    gap: 6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  bottomHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
