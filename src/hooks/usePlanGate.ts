import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlan } from '@/store/authStore';
import { PLAN_FEATURES, SubscriptionPlan } from '@/types';

type FeatureKey = keyof typeof PLAN_FEATURES[SubscriptionPlan];

/**
 * Returns a gate function. Call gate(featureKey) before any plan-gated action.
 * If the user's plan supports it, calls onAllowed(). Otherwise shows an upgrade alert.
 */
export function usePlanGate() {
  const plan = usePlan();
  const router = useRouter();

  const canUse = useCallback(
    (feature: FeatureKey): boolean => {
      const features = PLAN_FEATURES[plan];
      const value = features[feature];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      return true;
    },
    [plan],
  );

  const gate = useCallback(
    (feature: FeatureKey, onAllowed: () => void) => {
      if (canUse(feature)) {
        onAllowed();
        return;
      }

      const featureLabels: Partial<Record<FeatureKey, string>> = {
        analytics: 'Analytics Dashboard',
        bulkCreation: 'Bulk Video Creation',
        aiAvatars: 'AI Avatars',
        shorts: 'Auto Shorts Generator',
        scheduling: 'Content Scheduling',
        customBranding: 'Custom Branding',
      };

      Alert.alert(
        'Upgrade Required',
        `"${featureLabels[feature] ?? String(feature)}" is available on Pro and Enterprise plans.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/(app)/settings'),
          },
        ],
      );
    },
    [canUse, router],
  );

  return { canUse, gate, plan };
}
