import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { EnergizedSunCharacter } from '../illustrations/CheckInCharacters';
import { PrimaryButton } from '../common/PrimaryButton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HeroCardProps {
  onCheckInPress: () => void;
  titlePrimary?: string;
  italicWord1?: string;
  italicWord2?: string;
  subtitle?: string;
  buttonLabel?: string;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  onCheckInPress,
  titlePrimary = 'Not sure',
  italicWord1 = 'what',
  italicWord2 = 'train',
  subtitle = "Tell us how you feel, we'll recommend workouts matching your energy & mood.",
  buttonLabel = 'Find my match',
}) => {
  const cardScale = useSharedValue(1);

  const handlePressIn = () => {
    cardScale.value = withSpring(0.98, { damping: 14 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 14 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onCheckInPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.heroCard, animatedCardStyle]}
    >
      {/* Top Section with Title and Illustration */}
      <View style={styles.topRow}>
        <View style={styles.textColumn}>
          <Text style={styles.titleText}>
            {titlePrimary} <Text style={styles.italicAccent}>{italicWord1}</Text>
            {'\n'}you want to <Text style={styles.italicAccent}>{italicWord2}</Text>
            {'\n'}today?
          </Text>
        </View>

        {/* Floating animated character */}
        <View style={styles.characterContainer}>
          <EnergizedSunCharacter size={105} animate={true} />
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitleText}>{subtitle}</Text>

      {/* Primary White Button matching video */}
      <View style={styles.buttonWrapper}>
        <PrimaryButton
          title={buttonLabel}
          variant="white"
          size="md"
          onPress={onCheckInPress}
          style={styles.whiteBtn}
          textStyle={styles.whiteBtnText}
        />
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#355544',
    borderRadius: Spacing.borderRadius.xl,
    padding: 22,
    marginTop: 10,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#436954',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textColumn: {
    flex: 1,
    paddingRight: 6,
  },
  titleText: {
    color: '#F4F2EC',
    fontSize: Typography.fontSizes['2xl'],
    lineHeight: 33,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  italicAccent: {
    fontFamily: Typography.fontFamilies.serifItalic,
    color: '#EBF3EC',
  },
  characterContainer: {
    width: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginRight: -6,
  },
  subtitleText: {
    color: '#C3D4C6',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 20,
    maxWidth: '92%',
  },
  buttonWrapper: {
    width: '100%',
  },
  whiteBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadius.round,
    paddingVertical: 14,
  },
  whiteBtnText: {
    color: '#161A17',
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});

