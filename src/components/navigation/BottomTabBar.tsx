import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Home,
  Calendar,
  MessageSquare,
  Activity,
  User,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TabType } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPECULAR_LEFT = require('../../../assets/liquidGlass/specular-map-left.png');
const SPECULAR_RIGHT = require('../../../assets/liquidGlass/specular-map-right.png');
const GRAIN_TEXTURE = require('../../../assets/images/glass_grain_texture.png');

interface BottomTabBarProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

interface TabItemConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: TabItemConfig[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'plan', label: 'Calendar', icon: Calendar },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
  { id: 'progress', label: 'Progress', icon: Activity },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  const handleTabSelect = (tabId: TabType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onTabPress(tabId);
  };

  return (
    <View style={[styles.wrapper, { bottom: bottomPadding }]}>
      <View style={styles.glassContainer}>
        {/* 1. Underlying Native Frosted Blur (expo-blur) */}
        <View style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 50}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {/* Neutral Dark Substrate Tint (Zero color added) */}
          <View style={[StyleSheet.absoluteFill, styles.neutralDarkTint]} />
        </View>

        {/* 2. Micro-etched Sandblasted Glass Grain Noise */}
        <Image
          source={GRAIN_TEXTURE}
          style={[StyleSheet.absoluteFill, styles.grainTexture]}
          contentFit="cover"
          pointerEvents="none"
        />

        {/* 3. Inset 3D Specular Curvature Caps from physical liquid glass lens maps */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.specularWrapper]}>
          <Image
            source={SPECULAR_LEFT}
            style={styles.specularCap}
            contentFit="fill"
          />
          <View style={styles.specularFlexSpacer} />
          <Image
            source={SPECULAR_RIGHT}
            style={styles.specularCap}
            contentFit="fill"
          />
        </View>

        {/* 4. Top Specular Sheen Line (Incidence Light) */}
        <View pointerEvents="none" style={styles.topSheenLine} />

        {/* 5. Interactive Tab Buttons */}
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={isActive}
                onPress={() => handleTabSelect(tab.id)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const TabButton: React.FC<{
  tab: TabItemConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const Icon = tab.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive ? 1.06 : 1, { damping: 14 }) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.tabItem,
        isActive && styles.activeTabPod,
        animatedStyle,
      ]}
    >
      <Icon
        size={22}
        color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
        strokeWidth={isActive ? 2.4 : 1.9}
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  // Authentic Apple iOS Control Center Glass Capsule Container (Zero Color)
  glassContainer: {
    width: '100%',
    maxWidth: 380,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderTopColor: 'rgba(255, 255, 255, 0.68)',
    borderBottomColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(18, 22, 20, 0.35)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 22,
    elevation: 12,
  },
  neutralDarkTint: {
    backgroundColor: 'rgba(14, 18, 16, 0.55)',
  },
  grainTexture: {
    opacity: 0.055,
  },
  specularWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.22,
  },
  specularCap: {
    width: 32,
    height: 64,
    opacity: 0.9,
  },
  specularFlexSpacer: {
    flex: 1,
  },
  topSheenLine: {
    position: 'absolute',
    top: 1,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    opacity: 0.75,
  },
  tabBarInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  tabItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inset Circular Frosted Glass Pod for Active Tab (Matching Login Button Icon Pod)
  activeTabPod: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.65)',
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
