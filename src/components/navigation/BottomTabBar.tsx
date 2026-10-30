import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Dumbbell,
  MessageSquare,
  Activity,
  User,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TabType } from '../../types';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  { id: 'plan', label: 'Plan', icon: Dumbbell },
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

  return (
    <View style={[styles.wrapper, { bottom: bottomPadding }]}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={isActive}
              onPress={() => onTabPress(tab.id)}
            />
          );
        })}
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
    transform: [{ scale: withSpring(isActive ? 1.05 : 1, { damping: 14 }) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.tabItem,
        isActive && styles.activeTabCircle,
        animatedStyle,
      ]}
    >
      <Icon
        size={22}
        color={isActive ? '#111311' : Colors.textSecondary}
        strokeWidth={isActive ? 2.6 : 2}
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C19',
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#262D28',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  tabItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabCircle: {
    backgroundColor: Colors.coralCTA,
    shadowColor: Colors.coralCTA,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
