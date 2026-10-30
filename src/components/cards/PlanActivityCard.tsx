import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Check,
  Clock,
  Flame,
  Dumbbell,
  Utensils,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { DailyActivityItem } from '../../types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlanActivityCardProps {
  activity: DailyActivityItem;
  onToggleComplete: () => void;
  onPressDetails?: () => void;
}

export const PlanActivityCard: React.FC<PlanActivityCardProps> = ({
  activity,
  onToggleComplete,
  onPressDetails,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 14 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderCategoryIcon = () => {
    switch (activity.iconName) {
      case 'Dumbbell':
        return <Dumbbell size={18} color={activity.completed ? Colors.success : Colors.coralCTA} />;
      case 'Utensils':
      case 'Salad':
        return <Utensils size={18} color={activity.completed ? Colors.success : Colors.softYellow} />;
      case 'Sun':
        return <Sun size={18} color={activity.completed ? Colors.success : '#FFA940'} />;
      case 'Moon':
        return <Moon size={18} color={activity.completed ? Colors.success : '#8F7CEE'} />;
      default:
        return <Dumbbell size={18} color={Colors.textSecondary} />;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPressDetails || onToggleComplete}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        activity.completed && styles.cardCompleted,
        animatedStyle,
      ]}
    >
      <View style={styles.topRow}>
        {/* Category Icon Badge */}
        <View
          style={[
            styles.iconBadge,
            activity.completed && styles.iconBadgeCompleted,
          ]}
        >
          {renderCategoryIcon()}
        </View>

        {/* Title and Time info */}
        <View style={styles.contentColumn}>
          <Text
            style={[
              styles.title,
              activity.completed && styles.titleCompleted,
            ]}
            numberOfLines={1}
          >
            {activity.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{activity.time}</Text>
            </View>

            {activity.duration && (
              <Text style={styles.metaBullet}>• {activity.duration}</Text>
            )}

            {activity.calories && (
              <View style={styles.metaItem}>
                <Flame size={12} color={Colors.coralCTA} />
                <Text style={styles.metaText}>{activity.calories} kcal</Text>
              </View>
            )}
          </View>
        </View>

        {/* Completion Check Circle button */}
        <Pressable
          onPress={onToggleComplete}
          hitSlop={10}
          style={[
            styles.checkCircle,
            activity.completed && styles.checkCircleCompleted,
          ]}
        >
          {activity.completed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </Pressable>
      </View>

      {/* Pill tags */}
      {activity.tags && activity.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {activity.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {onPressDetails && (
            <View style={styles.detailsPrompt}>
              <Text style={styles.detailsText}>View details</Text>
              <ChevronRight size={12} color={Colors.textSecondary} />
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  cardCompleted: {
    backgroundColor: '#181E19',
    borderColor: '#27382B',
    opacity: 0.88,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#262D27',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBadgeCompleted: {
    backgroundColor: 'rgba(78, 154, 111, 0.15)',
  },
  contentColumn: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  metaBullet: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3D463F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#242B25',
  },
  tagPill: {
    backgroundColor: '#232924',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: Spacing.borderRadius.round,
  },
  tagText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  detailsPrompt: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

