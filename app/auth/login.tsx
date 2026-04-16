import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';

WebBrowser.maybeCompleteAuthSession();

const logger = createLogger('LoginScreen');
const { height } = Dimensions.get('window');

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const HAS_GOOGLE_CONFIG = !!GOOGLE_CLIENT_ID;

export default function LoginScreen() {
  const { setToken, initialize } = useAuthStore();

  const [request, response, promptAsync] = Google.useAuthRequest(
    HAS_GOOGLE_CONFIG
      ? {
          clientId: GOOGLE_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
          scopes: ['openid', 'profile', 'email'],
          redirectUri: makeRedirectUri({ scheme: 'aiyoutube' }),
        }
      : { clientId: 'placeholder' }
  );

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleSuccess(response.authentication.accessToken);
    }
    if (response?.type === 'error') {
      Alert.alert('Sign-in Failed', response.error?.message ?? 'Google sign-in failed');
    }
  }, [response]);

  const handleGoogleSuccess = async (googleToken: string) => {
    try {
      // Mock user for demo — replace with real API call when backend is ready
      await setToken('demo-token-' + Date.now());
      await initialize();
      logger.info('Google sign-in successful');
    } catch (err) {
      logger.error('Google auth exchange failed', err);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    try {
      // Bypass auth for Expo Go testing
      const { useAuthStore: store } = await import('@/store/authStore');
      store.setState({
        user: {
          id: 'demo-user',
          email: 'demo@aiyoutube.com',
          name: 'Demo User',
          avatar: '',
          plan: 'pro',
          youtubeConnected: false,
          createdAt: new Date().toISOString(),
        },
        token: 'demo-token',
        isAuthenticated: true,
        isLoading: false,
      });
      logger.info('Demo login successful');
    } catch (err) {
      logger.error('Demo login failed', err);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0F1A', '#1a0a3b', '#0F0F1A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.glowBlob} />

      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.logoGradient}>
            <Ionicons name="logo-youtube" size={32} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.headline}>AI YouTube{'\n'}Automation</Text>
        <Text style={styles.subheadline}>
          Turn any topic into a viral YouTube video{'\n'}in minutes — fully automated.
        </Text>

        <View style={styles.features}>
          {[
            { icon: '🧠', text: 'AI Script Generation' },
            { icon: '🎙️', text: 'Human-like Voiceover' },
            { icon: '🎬', text: 'Auto Video Creation' },
            { icon: '📤', text: 'YouTube Auto-Upload' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.authSection}>
        {HAS_GOOGLE_CONFIG && (
          <TouchableOpacity
            style={[styles.googleBtn, !request && styles.btnDisabled]}
            onPress={() => promptAsync()}
            disabled={!request}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        )}

        {!HAS_GOOGLE_CONFIG && (
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => Alert.alert(
              'Google OAuth Not Configured',
              'Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file to enable Google sign-in.\n\nUse "Try Demo" below to explore the app.',
              [{ text: 'OK' }]
            )}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.demoBtn}
          onPress={handleDemoLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.demoBtnText}>Try Demo (No login required)</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By signing in, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingTop: 80, paddingBottom: 50, paddingHorizontal: 28 },
  glowBlob: {
    position: 'absolute',
    top: height * 0.15,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#6366f140',
    transform: [{ scaleX: 2 }],
  },
  hero: { flex: 1, justifyContent: 'center', gap: 20 },
  logoWrap: { alignSelf: 'flex-start' },
  logoGradient: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 42, fontWeight: '800', color: '#fff', lineHeight: 48 },
  subheadline: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24 },
  features: { gap: 12, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureEmoji: { fontSize: 20, width: 28 },
  featureText: { color: COLORS.textSecondary, fontSize: 15 },
  authSection: { gap: 12 },
  googleBtn: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
  demoBtn: {
    backgroundColor: 'transparent',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6366f160',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  terms: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  termsLink: { color: COLORS.primaryLight },
});
