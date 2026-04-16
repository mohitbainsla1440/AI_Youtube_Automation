import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useVideoStore, useWizard } from '@/store/videoStore';
import { Button, GradientCard, Badge, ProgressBar } from '@/components/ui';
import { COLORS } from '@/utils/constants';
import { formatDuration, formatMinutes } from '@/utils/helpers';
import type { ScriptSection } from '@/types';

// ─── Section type config ───────────────────────────────────────────────────────

const SECTION_TYPE_COLORS: Record<ScriptSection['type'], string> = {
  hook: '#FF4444',
  intro: '#3B82F6',
  body: '#00D084',
  cta: '#F59E0B',
};

const SECTION_TYPE_LABELS: Record<ScriptSection['type'], string> = {
  hook: 'Hook',
  intro: 'Intro',
  body: 'Body',
  cta: 'Call to Action',
};

// ─── ScriptSectionCard ────────────────────────────────────────────────────────

interface ScriptSectionCardProps {
  section: ScriptSection;
  index: number;
  onTextChange: (index: number, text: string) => void;
}

function ScriptSectionCard({ section, index, onTextChange }: ScriptSectionCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const rotateAnim = useRef(new Animated.Value(index === 0 ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  }, [expanded, rotateAnim]);

  const arrowRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const typeColor = SECTION_TYPE_COLORS[section.type];
  const charCount = section.text.length;

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionCardHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={[styles.sectionTypeDot, { backgroundColor: typeColor }]} />
        <View style={styles.sectionCardHeaderContent}>
          <View style={styles.sectionCardTitleRow}>
            <View style={[styles.sectionTypeBadge, { backgroundColor: `${typeColor}20`, borderColor: `${typeColor}50` }]}>
              <Text style={[styles.sectionTypeBadgeText, { color: typeColor }]}>
                {SECTION_TYPE_LABELS[section.type]}
              </Text>
            </View>
            <Text style={styles.sectionDuration}>
              {formatDuration(section.duration)}
            </Text>
          </View>
          <Text style={styles.sectionPreview} numberOfLines={expanded ? undefined : 2}>
            {!expanded && section.text}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sectionCardBody}>
          <TextInput
            style={styles.sectionTextInput}
            value={section.text}
            onChangeText={(t) => onTextChange(index, t)}
            multiline
            textAlignVertical="top"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
          />
          <Text style={styles.sectionCharCount}>{charCount} chars</Text>
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ScriptScreen() {
  const router = useRouter();
  const store = useVideoStore();
  const wizard = useWizard();
  const script = wizard.generatedScript;

  // ─── Local editable state seeded from the store ─────────────────────────────

  const [sections, setSections] = useState<ScriptSection[]>(
    script?.sections ?? [],
  );
  const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
  const [seoTitle, setSeoTitle] = useState(script?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(script?.description ?? '');
  const [seoTagsRaw, setSeoTagsRaw] = useState((script?.tags ?? []).join(', '));
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSectionTextChange = useCallback((index: number, text: string) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  }, []);

  const handleCopyFullScript = useCallback(() => {
    const fullText = sections.map((s) => s.text).join('\n\n');
    Clipboard.setString(fullText);
    Alert.alert('Copied', 'Full script copied to clipboard.');
  }, [sections]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Regenerate Script',
      'This will discard your edits and generate a new script. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsRegenerating(true);
            try {
              await store.generateScript();
              const updated = store.wizard.generatedScript;
              if (updated) {
                setSections([...updated.sections]);
                setSeoTitle(updated.title);
                setSeoDescription(updated.description);
                setSeoTagsRaw(updated.tags.join(', '));
                setSelectedHookIndex(0);
              }
            } catch {
              Alert.alert('Error', 'Failed to regenerate script. Please try again.');
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ],
    );
  }, [store]);

  const handleNext = useCallback(() => {
    if (!script) return;

    // Persist edits back into the store before advancing
    const updatedScript = {
      ...script,
      title: seoTitle,
      description: seoDescription,
      tags: seoTagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      sections,
      fullText: sections.map((s) => s.text).join('\n\n'),
      hooks: script.hooks,
    };
    store.setGeneratedScript(updatedScript);
    store.setWizardStep('voice');
    router.push('/(app)/create/voice' as never);
  }, [script, seoTitle, seoDescription, seoTagsRaw, sections, store, router]);

  // ─── Empty state ────────────────────────────────────────────────────────────

  if (!script) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyText}>No script found. Go back and generate one first.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.emptyBackBtn}>
          <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
          <Text style={styles.emptyBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalDuration = sections.reduce((acc, s) => acc + s.duration, 0);
  const hooks = script.hooks ?? [];
  const tags = script.tags.slice(0, 5);

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
        <Text style={styles.headerTitle}>Review Script</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>2 / 5</Text>
        </View>
      </View>

      {/* Step progress bar */}
      <View style={styles.progressRow}>
        <ProgressBar progress={40} color={COLORS.primary} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Metadata Card ── */}
        <GradientCard style={styles.metaCard} border>
          <Text style={styles.scriptTitle} numberOfLines={2}>{seoTitle}</Text>
          <View style={styles.metaRow}>
            <Badge
              label={formatMinutes(totalDuration)}
              color={COLORS.primary}
              icon="time-outline"
            />
            <Badge
              label={wizard.scriptRequest.tone ?? 'educational'}
              color={COLORS.info}
              icon="mic-outline"
            />
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </GradientCard>

        {/* ── AI Hooks ── */}
        {hooks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AI Hooks</Text>
            <Text style={styles.sectionSubtitle}>Select the hook that opens your video</Text>
            {hooks.map((hook, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.hookCard,
                  selectedHookIndex === idx && styles.hookCardSelected,
                ]}
                onPress={() => setSelectedHookIndex(idx)}
                activeOpacity={0.8}
              >
                {selectedHookIndex === idx && (
                  <LinearGradient
                    colors={['#6366F115', '#4f46e520']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={styles.hookCardInner}>
                  <Ionicons
                    name="flash"
                    size={16}
                    color={selectedHookIndex === idx ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.hookText,
                      selectedHookIndex === idx && styles.hookTextSelected,
                    ]}
                  >
                    {hook}
                  </Text>
                </View>
                {selectedHookIndex === idx && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Script Sections ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Script Sections</Text>
          <Text style={styles.sectionSubtitle}>Tap a section to expand and edit</Text>
          {sections.map((sec, idx) => (
            <ScriptSectionCard
              key={idx}
              section={sec}
              index={idx}
              onTextChange={handleSectionTextChange}
            />
          ))}
        </View>

        {/* ── Full Script Preview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Full Script</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyFullScript} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullScriptBox}>
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator
            >
              <Text style={styles.fullScriptText}>
                {sections.map((s) => s.text).join('\n\n')}
              </Text>
            </ScrollView>
          </View>
        </View>

        {/* ── SEO Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SEO Metadata</Text>
          <Text style={styles.sectionSubtitle}>Edit title, description and tags for YouTube</Text>

          <GradientCard style={styles.seoCard} border>
            <Text style={styles.fieldLabel}>Video Title</Text>
            <TextInput
              style={styles.seoInput}
              value={seoTitle}
              onChangeText={setSeoTitle}
              placeholder="Enter a compelling title..."
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              maxLength={100}
            />
            <Text style={styles.seoCharCount}>{seoTitle.length}/100</Text>

            <Text style={[styles.fieldLabel, styles.fieldLabelMargin]}>Description</Text>
            <TextInput
              style={[styles.seoInput, styles.seoTextarea]}
              value={seoDescription}
              onChangeText={setSeoDescription}
              placeholder="Add a description..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              selectionColor={COLORS.primary}
              maxLength={5000}
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelMargin]}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.seoInput}
              value={seoTagsRaw}
              onChangeText={setSeoTagsRaw}
              placeholder="ai, youtube, automation..."
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
            />
          </GradientCard>
        </View>

        {/* ── Regenerate Button ── */}
        <Button
          label={isRegenerating ? 'Regenerating...' : 'Regenerate Script'}
          onPress={handleRegenerate}
          variant="danger"
          loading={isRegenerating}
          fullWidth
          icon={
            !isRegenerating ? (
              <Ionicons name="refresh-outline" size={18} color={COLORS.error} />
            ) : undefined
          }
          iconPosition="left"
          style={styles.regenBtn}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <Button
          label="Next: Voiceover"
          onPress={handleNext}
          fullWidth
          size="lg"
          icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Empty state
  emptyRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyBackText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
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

  // Progress bar
  progressRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Metadata card
  metaCard: {
    gap: 10,
  },
  scriptTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: COLORS.elevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Section grouping
  section: {
    gap: 10,
  },
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Hook cards
  hookCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  hookCardSelected: {
    borderColor: COLORS.primary,
  },
  hookCardInner: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
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

  // Script section card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  sectionTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionCardHeaderContent: {
    flex: 1,
    gap: 4,
  },
  sectionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTypeBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDuration: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  sectionPreview: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCardBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
    gap: 6,
  },
  sectionTextInput: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 100,
    backgroundColor: COLORS.elevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionCharCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },

  // Full script box
  fullScriptBox: {
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  fullScriptText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  copyBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // SEO card
  seoCard: {
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabelMargin: {
    marginTop: 12,
  },
  seoInput: {
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  seoTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  seoCharCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },

  // Regenerate
  regenBtn: {
    marginTop: 4,
  },

  // Bottom
  bottomSpacer: { height: 110 },
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
  },
});
