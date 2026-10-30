import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import {
  Bell,
  Crown,
  Footprints,
  Flame,
  Clock,
  Dumbbell,
  Sparkles,
  Zap,
  Salad,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { HeroCard } from '../../components/cards/HeroCard';
import { CategoryTile } from '../../components/cards/CategoryTile';
import { ProgressMetricCard } from '../../components/cards/ProgressMetricCard';
import { PlanActivityCard } from '../../components/cards/PlanActivityCard';
import { CheckInCharacterView } from '../../components/illustrations/CheckInCharacters';

export const DashboardScreen: React.FC = () => {
  const {
    userProfile,
    metrics,
    activities,
    toggleActivityCompletion,
    setActiveModal,
    setActiveTab,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('Gym');

  const categories = [
    { label: 'Gym', icon: <Dumbbell size={20} color={selectedCategory === 'Gym' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Yoga', icon: <Sparkles size={20} color={selectedCategory === 'Yoga' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Fitness', icon: <Zap size={20} color={selectedCategory === 'Fitness' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Run', icon: <Footprints size={20} color={selectedCategory === 'Run' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Nutrition', icon: <Salad size={20} color={selectedCategory === 'Nutrition' ? '#FFFFFF' : Colors.textSecondary} /> },
  ];

  return (
    <ScreenContainer scrollable={true}>
      {/* 1. Header Section */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.avatarButton}
          onPress={() => setActiveTab('profile')}
        >
          <Image
            source={require('../../../assets/images/user_avatar.jpg')}
            style={styles.avatarImage}
          />
        </Pressable>

        <View style={styles.greetingContainer}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.userNameText}>{userProfile.name}</Text>
        </View>

        <View style={styles.headerActions}>
          {/* Notification Bell */}
          <Pressable
            style={styles.iconCircleButton}
            onPress={() => setActiveTab('coach')}
            hitSlop={8}
          >
            <Bell size={18} color={Colors.textPrimary} />
          </Pressable>

          {/* Streak Badge matching video */}
          <Pressable
            style={styles.streakBadge}
            onPress={() => setActiveTab('progress')}
          >
            <Crown size={15} color={Colors.streakCrown} fill={Colors.streakCrown} />
            <Text style={styles.streakText}>{userProfile.streakDays}</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Hero Card (Forest Green with Sun character) */}
      <HeroCard
        titlePrimary="Not sure"
        italicWord1="what"
        italicWord2="train"
        subtitle="Tell us how you feel, we'll recommend workouts matching your energy & mood."
        buttonLabel="Find my match"
        onCheckInPress={() => setActiveModal('checkin')}
      />

      {/* 3. Daily Status & Quick Check-in pill */}
      <Pressable
        style={styles.dailyCheckInCard}
        onPress={() => setActiveModal('checkin')}
      >
        <View style={styles.checkInLeft}>
          <View style={styles.checkInMiniAvatar}>
            <CheckInCharacterView mood={userProfile.currentMood} size={42} animate={false} />
          </View>
          <View>
            <Text style={styles.checkInQuestion}>How are you feeling today?</Text>
            <Text style={styles.checkInStatus}>
              Logged as <Text style={styles.checkInStatusHighlight}>{userProfile.currentMood.toUpperCase()}</Text> • {userProfile.lastCheckInTime || 'Today'}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>

      {/* 4. Categories Section */}
      <SectionHeader
        title="Categories"
        actionText="See all"
        onActionPress={() => setActiveTab('plan')}
      />
      <View style={styles.categoriesRow}>
        {categories.map((cat) => (
          <CategoryTile
            key={cat.label}
            label={cat.label}
            icon={cat.icon}
            isSelected={selectedCategory === cat.label}
            onPress={() => setSelectedCategory(cat.label)}
          />
        ))}
      </View>

      {/* 5. Your Progress Section */}
      <SectionHeader
        title="Your progress"
        actionText="See activity"
        onActionPress={() => setActiveTab('progress')}
      />
      <View style={styles.progressCardsRow}>
        {metrics.map((metric) => {
          let IconComponent = Footprints;
          if (metric.id === 'calories') IconComponent = Flame;
          if (metric.id === 'activity') IconComponent = Clock;

          return (
            <ProgressMetricCard
              key={metric.id}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              percentage={metric.percentage}
              color={metric.color}
              icon={<IconComponent size={18} color={metric.color} />}
              onPress={() => setActiveTab('progress')}
            />
          );
        })}
      </View>

      {/* 6. Today's sessions / Suggested Routine */}
      <SectionHeader
        title="Today's sessions"
        actionText="See all"
        onActionPress={() => setActiveTab('plan')}
      />
      <View style={styles.sessionsList}>
        {activities.slice(0, 3).map((activity) => (
          <PlanActivityCard
            key={activity.id}
            activity={activity}
            onToggleComplete={() => toggleActivityCompletion(activity.id)}
            onPressDetails={() => {
              if (activity.category === 'movement') {
                setActiveModal('activity_session');
              } else {
                setActiveTab('plan');
              }
            }}
          />
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  avatarButton: {
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#364038',
    backgroundColor: '#242925',
  },
  greetingContainer: {
    flex: 1,
  },
  welcomeLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  userNameText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  streakText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  dailyCheckInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A201C',
    borderRadius: Spacing.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262F28',
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInMiniAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#262F28',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkInQuestion: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  checkInStatus: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  checkInStatusHighlight: {
    color: Colors.coralCTA,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  progressCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sessionsList: {
    marginBottom: 20,
  },
});

