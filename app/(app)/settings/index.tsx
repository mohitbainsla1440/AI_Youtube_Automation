import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useSettingsStore, useSettings } from '@/store/settingsStore';
import { useAuthStore, useUser } from '@/store/authStore';
import { useChannelStore } from '@/store/channelStore';
import { Button, Input, GradientCard, Avatar, Select } from '@/components/ui';
import { SUBSCRIPTION_PLANS, COLORS, TONES, LANGUAGES, SAMPLE_VOICES } from '@/utils/constants';
import type { AppSettings, VideoTone, VideoLanguage } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ApiKeyField = keyof Pick<
  AppSettings,
  'openaiApiKey' | 'elevenLabsApiKey' | 'pexelsApiKey' | 'pixabayApiKey' | 'runwayApiKey' | 'stabilityApiKey'
>;

interface ApiKeyConfig {
  key: ApiKeyField;
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  docsUrl?: string;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  { key: 'openaiApiKey', label: 'OpenAI API Key', placeholder: 'sk-...', icon: 'brain-outline' },
  { key: 'elevenLabsApiKey', label: 'ElevenLabs API Key', placeholder: 'el-...', icon: 'mic-outline' },
  { key: 'pexelsApiKey', label: 'Pexels API Key', placeholder: 'pex-...', icon: 'images-outline' },
  { key: 'pixabayApiKey', label: 'Pixabay API Key', placeholder: 'pix-...', icon: 'camera-outline' },
  { key: 'runwayApiKey', label: 'Runway ML API Key', placeholder: 'rwy-...', icon: 'film-outline' },
  { key: 'stabilityApiKey', label: 'Stability AI Key', placeholder: 'sk-...', icon: 'color-palette-outline' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={sectionHeaderStyles.wrapper}>
      <Text style={sectionHeaderStyles.title}>{title}</Text>
      {subtitle && <Text style={sectionHeaderStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  wrapper: { gap: 2, marginBottom: 14 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 12 },
});

function SettingsRow({
  label,
  subtitle,
  icon,
  right,
  onPress,
  destructive = false,
}: {
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const inner = (
    <View style={rowStyles.row}>
      {icon && (
        <View style={[rowStyles.iconWrap, destructive && rowStyles.iconWrapDestructive]}>
          <Ionicons
            name={icon}
            size={18}
            color={destructive ? COLORS.error : COLORS.primaryLight}
          />
        </View>
      )}
      <View style={rowStyles.labelWrap}>
        <Text style={[rowStyles.label, destructive && rowStyles.labelDestructive]}>{label}</Text>
        {subtitle && <Text style={rowStyles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={rowStyles.right}>{right}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDestructive: {
    backgroundColor: `${COLORS.error}18`,
  },
  labelWrap: { flex: 1, gap: 1 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  labelDestructive: { color: COLORS.error },
  subtitle: { color: COLORS.textMuted, fontSize: 11 },
  right: { marginLeft: 8 },
});

function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 4 }} />;
}

function ApiKeyIndicator({ isSet }: { isSet: boolean }) {
  return (
    <View style={[
      indicatorStyles.dot,
      isSet ? indicatorStyles.dotActive : indicatorStyles.dotInactive,
    ]} />
  );
}

const indicatorStyles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: COLORS.success },
  dotInactive: { backgroundColor: COLORS.textMuted },
});

// ─── Plan Badge ──────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config = SUBSCRIPTION_PLANS.find((p) => p.id === plan) ?? SUBSCRIPTION_PLANS[0];
  return (
    <View style={[planBadgeStyles.badge, { backgroundColor: `${config.color}25`, borderColor: `${config.color}60` }]}>
      <Text style={[planBadgeStyles.text, { color: config.color }]}>
        {config.name.toUpperCase()}
      </Text>
    </View>
  );
}

const planBadgeStyles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const { updateSettings, updateApiKey } = useSettingsStore();
  const { signOut, updateUser } = useAuthStore();
  const user = useUser();
  const channelStore = useChannelStore();

  // Local draft state for API keys (so user can edit before saving)
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Partial<Record<ApiKeyField, string>>>(() =>
    Object.fromEntries(API_KEY_CONFIGS.map((c) => [c.key, (settings[c.key] as string) ?? ''])) as Partial<Record<ApiKeyField, string>>
  );

  // Track which keys have been modified
  const [modifiedKeys, setModifiedKeys] = useState<Set<ApiKeyField>>(new Set());

  const handleApiKeyChange = useCallback((field: ApiKeyField, value: string) => {
    setApiKeyDrafts((prev) => ({ ...prev, [field]: value }));
    setModifiedKeys((prev) => new Set(prev).add(field));
  }, []);

  const handleSaveApiKey = useCallback(
    (field: ApiKeyField) => {
      const value = apiKeyDrafts[field] ?? '';
      Alert.alert(
        'Save API Key',
        `Save your ${API_KEY_CONFIGS.find((c) => c.key === field)?.label ?? 'key'}? This is stored securely on your device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            style: 'default',
            onPress: () => {
              updateApiKey(field, value);
              setModifiedKeys((prev) => {
                const next = new Set(prev);
                next.delete(field);
                return next;
              });
            },
          },
        ],
      );
    },
    [apiKeyDrafts, updateApiKey],
  );

  const handleToggleNotification = useCallback(
    (key: keyof AppSettings['notifications'], value: boolean) => {
      updateSettings({
        notifications: { ...settings.notifications, [key]: value },
      });
    },
    [settings.notifications, updateSettings],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login' as never);
        },
      },
    ]);
  }, [signOut, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" in the next step to confirm. For now, contact support@aiyoutube.app to complete account deletion.',
            );
          },
        },
      ],
    );
  }, []);

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === (user?.plan ?? 'free')) ?? SUBSCRIPTION_PLANS[0];

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Profile ─────────────────────────────────────────────────────── */}
        <GradientCard
          gradient={['#1e1e3f', '#252545']}
          style={styles.profileCard}
          border
        >
          <View style={styles.profileRow}>
            <Avatar uri={user?.avatar} name={user?.name} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
              <PlanBadge plan={user?.plan ?? 'free'} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon.')}
          >
            <Ionicons name="pencil-outline" size={14} color={COLORS.primaryLight} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </GradientCard>

        {/* ── 2. Subscription ────────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader title="Subscription" subtitle="Manage your plan and billing" />

          {/* Current plan card */}
          <View style={[styles.planCurrentCard, { borderColor: `${currentPlan.color}50` }]}>
            <View style={styles.planCurrentLeft}>
              <Text style={[styles.planCurrentName, { color: currentPlan.color }]}>
                {currentPlan.name} Plan
              </Text>
              <Text style={styles.planCurrentPrice}>
                {currentPlan.price === 0 ? 'Free forever' : `$${currentPlan.price}/month`}
              </Text>
            </View>
            {(currentPlan as { popular?: boolean }).popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
            )}
          </View>

          <View style={styles.planFeaturesList}>
            {currentPlan.features.slice(0, 4).map((f, i) => (
              <View key={i} style={styles.planFeatureRow}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.planFeatureText}>{f}</Text>
              </View>
            ))}
          </View>

          {user?.plan !== 'enterprise' && (
            <Button
              label={user?.plan === 'free' ? 'Upgrade to Pro — $29/mo' : 'Upgrade to Enterprise'}
              onPress={() => Alert.alert('Upgrade', 'Billing portal coming soon.')}
              variant="primary"
              fullWidth
              icon={<Ionicons name="rocket-outline" size={16} color="#fff" />}
            />
          )}

          <Divider />

          <SettingsRow
            label="Billing History"
            subtitle="View invoices and receipts"
            icon="receipt-outline"
            onPress={() => Alert.alert('Billing History', 'Opens billing portal — coming soon.')}
            right={<Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
          />
        </GradientCard>

        {/* ── 3. API Keys ────────────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader
            title="API Keys"
            subtitle="Keys are stored securely on your device"
          />

          {API_KEY_CONFIGS.map((config, idx) => {
            const currentValue = apiKeyDrafts[config.key] ?? '';
            const isSet = !!(settings[config.key] as string | undefined);
            const isModified = modifiedKeys.has(config.key);

            return (
              <View key={config.key}>
                {idx > 0 && <Divider />}
                <View style={styles.apiKeyRow}>
                  <View style={styles.apiKeyHeader}>
                    <Ionicons name={config.icon} size={16} color={COLORS.textSecondary} />
                    <Text style={styles.apiKeyLabel}>{config.label}</Text>
                    <ApiKeyIndicator isSet={isSet} />
                  </View>
                  <View style={styles.apiKeyInputRow}>
                    <View style={styles.apiKeyInputFlex}>
                      <Input
                        value={currentValue}
                        onChangeText={(v) => handleApiKeyChange(config.key, v)}
                        placeholder={config.placeholder}
                        isPassword
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.saveKeyBtn,
                        (!isModified || !currentValue) && styles.saveKeyBtnDisabled,
                      ]}
                      onPress={() => handleSaveApiKey(config.key)}
                      disabled={!isModified || !currentValue}
                    >
                      <Text style={[
                        styles.saveKeyBtnText,
                        (!isModified || !currentValue) && styles.saveKeyBtnTextDisabled,
                      ]}>
                        {isSet && !isModified ? 'Saved' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </GradientCard>

        {/* ── 4. Video Defaults ──────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader title="Video Defaults" subtitle="Applied to every new video you create" />

          <Select<VideoTone>
            label="Default Tone"
            value={settings.defaultTone}
            onChange={(v) => updateSettings({ defaultTone: v })}
            options={TONES.map((t) => ({
              value: t.value,
              label: `${t.emoji}  ${t.label}`,
              description: t.description,
            }))}
          />

          <Select<VideoLanguage>
            label="Default Language"
            value={settings.defaultLanguage}
            onChange={(v) => updateSettings({ defaultLanguage: v })}
            options={LANGUAGES.map((l) => ({
              value: l.value,
              label: `${l.flag}  ${l.label}`,
            }))}
          />

          <Select<string>
            label="Default Voice"
            value={settings.defaultVoiceId ?? 'EXAVITQu4vr4xnSDxMaL'}
            onChange={(v) => updateSettings({ defaultVoiceId: v })}
            options={SAMPLE_VOICES.map((v) => ({
              value: v.id,
              label: `${v.name} (${v.gender}, ${v.accent})`,
              description: v.category,
            }))}
          />

          <Select<'public' | 'private' | 'unlisted'>
            label="Default Visibility"
            value={settings.defaultVisibility}
            onChange={(v) => updateSettings({ defaultVisibility: v })}
            options={[
              { value: 'public', label: 'Public', icon: '🌍', description: 'Visible to everyone' },
              { value: 'unlisted', label: 'Unlisted', icon: '🔗', description: 'Only via link' },
              { value: 'private', label: 'Private', icon: '🔒', description: 'Only you' },
            ]}
          />
        </GradientCard>

        {/* ── 5. Notifications ───────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader title="Notifications" />

          <SettingsRow
            label="Push Notifications"
            subtitle="Alerts on your device"
            icon="notifications-outline"
            right={
              <Switch
                value={settings.notifications.push}
                onValueChange={(v) => handleToggleNotification('push', v)}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.notifications.push ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />

          <Divider />

          <SettingsRow
            label="Email Notifications"
            subtitle="Updates sent to your inbox"
            icon="mail-outline"
            right={
              <Switch
                value={settings.notifications.email}
                onValueChange={(v) => handleToggleNotification('email', v)}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.notifications.email ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />

          <Divider />

          <SettingsRow
            label="On Completion"
            subtitle="When a video finishes rendering"
            icon="checkmark-circle-outline"
            right={
              <Switch
                value={settings.notifications.onComplete}
                onValueChange={(v) => handleToggleNotification('onComplete', v)}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.notifications.onComplete ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />

          <Divider />

          <SettingsRow
            label="On Error"
            subtitle="When a pipeline step fails"
            icon="alert-circle-outline"
            right={
              <Switch
                value={settings.notifications.onError}
                onValueChange={(v) => handleToggleNotification('onError', v)}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.notifications.onError ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />
        </GradientCard>

        {/* ── 6. Preferences ─────────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader title="Preferences" />

          <SettingsRow
            label="Auto-Publish"
            subtitle="Automatically upload to YouTube on completion"
            icon="cloud-upload-outline"
            right={
              <Switch
                value={settings.autoPublish}
                onValueChange={(v) => updateSettings({ autoPublish: v })}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.autoPublish ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />

          <Divider />

          <SettingsRow
            label="Add Watermark"
            subtitle="Brand your videos with your channel logo"
            icon="water-outline"
            right={
              <Switch
                value={settings.addWatermark}
                onValueChange={(v) => updateSettings({ addWatermark: v })}
                trackColor={{ false: COLORS.elevated, true: `${COLORS.primary}80` }}
                thumbColor={settings.addWatermark ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.elevated}
              />
            }
          />
        </GradientCard>

        {/* ── 7. App Info ────────────────────────────────────────────────────── */}
        <GradientCard style={styles.sectionCard} border>
          <SectionHeader title="App" />

          <SettingsRow
            label="Privacy Policy"
            icon="shield-outline"
            onPress={() => Alert.alert('Privacy Policy', 'Opens in browser — coming soon.')}
            right={<Ionicons name="open-outline" size={15} color={COLORS.textMuted} />}
          />

          <Divider />

          <SettingsRow
            label="Terms of Service"
            icon="document-text-outline"
            onPress={() => Alert.alert('Terms', 'Opens in browser — coming soon.')}
            right={<Ionicons name="open-outline" size={15} color={COLORS.textMuted} />}
          />

          <Divider />

          <SettingsRow
            label="Contact Support"
            subtitle="support@aiyoutube.app"
            icon="chatbubble-outline"
            onPress={() => Alert.alert('Support', 'Email support@aiyoutube.app for assistance.')}
            right={<Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
          />

          <Divider />

          <View style={styles.versionRow}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.versionText}>Version 1.0.0 (build 1)</Text>
          </View>
        </GradientCard>

        {/* ── 8. Danger Zone ─────────────────────────────────────────────────── */}
        <GradientCard
          style={[styles.sectionCard, styles.dangerCard]}
          border
        >
          <SectionHeader title="Danger Zone" subtitle="These actions are irreversible" />

          <Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={18} color={COLORS.primaryLight} />}
            style={styles.signOutBtn}
          />

          <Button
            label="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            fullWidth
            icon={<Ionicons name="trash-outline" size={18} color={COLORS.error} />}
            style={styles.deleteBtn}
          />
        </GradientCard>

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
  headerSpacer: { width: 36 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // Profile
  profileCard: {
    gap: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editProfileText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },

  // Section card
  sectionCard: {
    gap: 8,
  },

  // Subscription
  planCurrentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  planCurrentLeft: { gap: 3 },
  planCurrentName: {
    fontSize: 16,
    fontWeight: '700',
  },
  planCurrentPrice: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  popularBadge: {
    backgroundColor: `${COLORS.warning}25`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${COLORS.warning}50`,
  },
  popularBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  planFeaturesList: {
    gap: 6,
    marginBottom: 6,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  // API Keys
  apiKeyRow: {
    gap: 8,
    paddingVertical: 4,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  apiKeyLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apiKeyInputFlex: {
    flex: 1,
  },
  saveKeyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${COLORS.primary}25`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}50`,
  },
  saveKeyBtnDisabled: {
    backgroundColor: COLORS.elevated,
    borderColor: COLORS.border,
  },
  saveKeyBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  saveKeyBtnTextDisabled: {
    color: COLORS.textMuted,
  },

  // App info
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  // Danger zone
  dangerCard: {
    borderColor: `${COLORS.error}30`,
  },
  signOutBtn: {
    marginTop: 4,
  },
  deleteBtn: {
    marginTop: 4,
  },

  // Bottom
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 100 : 72,
  },
});
