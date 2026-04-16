import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/utils/constants';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.card }]} />
          )
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.createBtn, focused && styles.createBtnActive]}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Channels',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'logo-youtube' : 'logo-youtube'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="create/script" options={{ href: null }} />
      <Tabs.Screen name="create/voice" options={{ href: null }} />
      <Tabs.Screen name="create/preview" options={{ href: null }} />
      <Tabs.Screen name="editor/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 60,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: -2 },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  createBtnActive: { backgroundColor: COLORS.primary },
});
