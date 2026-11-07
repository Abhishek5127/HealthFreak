import re

# ==============================================================================
# 1. Update OnboardingFlow.tsx
# ==============================================================================
with open('src/features/onboarding/OnboardingFlow.tsx', 'r', encoding='utf-8') as f:
    onboarding = f.read()

# Add ExpoImage import and LOGO_GIF + RemoteAssets
onboarding_import_old = "import React, { useState } from 'react';"
onboarding_import_new = """import React, { useState, useEffect } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { RemoteAssets } from '../../constants/remoteAssets';

const LOGO_GIF = require('../../../assets/logo/HealthFreakLogoTranasparent.gif');"""

assert onboarding_import_old in onboarding, "onboarding_import_old not found"
onboarding = onboarding.replace(onboarding_import_old, onboarding_import_new, 1)

# Add isImagesLoading state
state_old = "  const [selectedGoal, setSelectedGoal] = useState<WellnessGoal>('weight_gain');"
state_new = """  const [selectedGoal, setSelectedGoal] = useState<WellnessGoal>('weight_gain');
  const [isImagesLoading, setIsImagesLoading] = useState<boolean>(true);"""

assert state_old in onboarding, "state_old not found"
onboarding = onboarding.replace(state_old, state_new, 1)

# Update goalsList to use RemoteAssets
old_goals_list_snippet = """    color: string;
    image: any;
  }[] = [
      {
        id: 'weight_gain',
        title: 'Weight Gain & Muscle',
        subtitle: 'Lean caloric surplus, progressive overload & hypertrophy protein.',
        badge: 'Surplus & Mass',
        icon: <Dumbbell size={16} color={Colors.forestGreenLight} />,
        color: Colors.forestGreenLight,
        image: require('../../../assets/primaryGoals/Skinny to Strong Fitness Transformation.png'),
      },
      {
        id: 'weight_loss',
        title: 'Weight Loss & Fat Reduction',
        subtitle: 'Sustainable caloric deficit, hunger satiety & lean preservation.',
        badge: 'Deficit & Burn',
        icon: <Flame size={16} color={Colors.coralCTA} />,
        color: Colors.coralCTA,
        image: require('../../../assets/primaryGoals/Healthy Transformation Journey.png'),
      },
      {
        id: 'acne_control',
        title: 'Clear Skin & Acne Control',
        subtitle: 'Tackle active breakouts, cystic acne & post-acne dark marks.',
        badge: 'Dermal Clarity',
        icon: <Sparkles size={16} color="#45D09E" />,
        color: '#45D09E',
        image: require('../../../assets/primaryGoals/Cute Pastel Skincare Routine Duo.png'),
      },
      {
        id: 'skincare_glow',
        title: 'Skincare Routine & Skin Glow',
        subtitle: 'Cellular hydration, collagen repair, texture smoothing & radiance.',
        badge: 'Skin Longevity',
        icon: <Heart size={16} color="#F38BA8" />,
        color: '#F38BA8',
        image: require('../../../assets/primaryGoals/Before-and-After Wellness Glow-Up.png'),
      },
      {
        id: 'hair_health',
        title: 'Hair Growth & Anti-Hair Fall',
        subtitle: 'Keratin synthesis amino acids, scalp stimulation & micro-nutrition.',
        badge: 'Follicle Health',
        icon: <Droplet size={16} color={Colors.lightSage} />,
        color: Colors.lightSage,
        image: require('../../../assets/primaryGoals/Hair Loss Worries with a HealthFreak Mirror.png'),
      },
      {
        id: 'pcos_pcod',
        title: 'Hormonal Balance & PCOS Harmony',
        subtitle: 'Steady glucose levels, cycle synchronization & cortisol balance.',
        badge: 'Hormone Sync',
        icon: <Activity size={16} color="#D48BAA" />,
        color: '#D48BAA',
        image: require('../../../assets/primaryGoals/Hormone Balance_ Before and After.png'),
      },
      {
        id: 'metabolic_fitness',
        title: 'Metabolic Fitness & Energy',
        subtitle: 'Balanced macronutrients, athletic stamina & all-day vitality.',
        badge: 'Vitality',
        icon: <Sun size={16} color={Colors.softYellow} />,
        color: Colors.softYellow,
        image: require('../../../assets/primaryGoals/Cheerful Chibi Side Stretch Duo.png'),
      },
      {
        id: 'energy_vitality',
        title: 'Mindful Wellness & Rest',
        subtitle: 'Nervous system calm, mindful recovery & restorative sleep.',
        badge: 'Rest & Focus',
        icon: <Zap size={16} color="#818CF8" />,
        color: '#818CF8',
        image: require('../../../assets/primaryGoals/Mindful Wellness with HealthFreak.png'),
      },
      {
        id: 'weight_management',
        title: 'Gut Health & Digestive Glow',
        subtitle: 'Microbiome restoration, bloat reduction & optimal digestion.',
        badge: 'Gut & Glow',
        icon: <Utensils size={16} color="#38BDF8" />,
        color: '#38BDF8',
        image: require('../../../assets/primaryGoals/From Gut Pain to Healthy Glow.png'),
      },
    ];"""

new_goals_list_snippet = """    color: string;
    image: { uri: string };
  }[] = [
      {
        id: 'weight_gain',
        title: 'Weight Gain & Muscle',
        subtitle: 'Lean caloric surplus, progressive overload & hypertrophy protein.',
        badge: 'Surplus & Mass',
        icon: <Dumbbell size={16} color={Colors.forestGreenLight} />,
        color: Colors.forestGreenLight,
        image: { uri: RemoteAssets.primaryGoals.skinnyToStrong },
      },
      {
        id: 'weight_loss',
        title: 'Weight Loss & Fat Reduction',
        subtitle: 'Sustainable caloric deficit, hunger satiety & lean preservation.',
        badge: 'Deficit & Burn',
        icon: <Flame size={16} color={Colors.coralCTA} />,
        color: Colors.coralCTA,
        image: { uri: RemoteAssets.primaryGoals.healthyTransformation },
      },
      {
        id: 'acne_control',
        title: 'Clear Skin & Acne Control',
        subtitle: 'Tackle active breakouts, cystic acne & post-acne dark marks.',
        badge: 'Dermal Clarity',
        icon: <Sparkles size={16} color="#45D09E" />,
        color: '#45D09E',
        image: { uri: RemoteAssets.primaryGoals.cutePastelSkincare },
      },
      {
        id: 'skincare_glow',
        title: 'Skincare Routine & Skin Glow',
        subtitle: 'Cellular hydration, collagen repair, texture smoothing & radiance.',
        badge: 'Skin Longevity',
        icon: <Heart size={16} color="#F38BA8" />,
        color: '#F38BA8',
        image: { uri: RemoteAssets.primaryGoals.beforeAfterWellness },
      },
      {
        id: 'hair_health',
        title: 'Hair Growth & Anti-Hair Fall',
        subtitle: 'Keratin synthesis amino acids, scalp stimulation & micro-nutrition.',
        badge: 'Follicle Health',
        icon: <Droplet size={16} color={Colors.lightSage} />,
        color: Colors.lightSage,
        image: { uri: RemoteAssets.primaryGoals.hairLossWorries },
      },
      {
        id: 'pcos_pcod',
        title: 'Hormonal Balance & PCOS Harmony',
        subtitle: 'Steady glucose levels, cycle synchronization & cortisol balance.',
        badge: 'Hormone Sync',
        icon: <Activity size={16} color="#D48BAA" />,
        color: '#D48BAA',
        image: { uri: RemoteAssets.primaryGoals.hormoneBalance },
      },
      {
        id: 'metabolic_fitness',
        title: 'Metabolic Fitness & Energy',
        subtitle: 'Balanced macronutrients, athletic stamina & all-day vitality.',
        badge: 'Vitality',
        icon: <Sun size={16} color={Colors.softYellow} />,
        color: Colors.softYellow,
        image: { uri: RemoteAssets.primaryGoals.cheerfulChibiStretch },
      },
      {
        id: 'energy_vitality',
        title: 'Mindful Wellness & Rest',
        subtitle: 'Nervous system calm, mindful recovery & restorative sleep.',
        badge: 'Rest & Focus',
        icon: <Zap size={16} color="#818CF8" />,
        color: '#818CF8',
        image: { uri: RemoteAssets.primaryGoals.mindfulWellness },
      },
      {
        id: 'weight_management',
        title: 'Gut Health & Digestive Glow',
        subtitle: 'Microbiome restoration, bloat reduction & optimal digestion.',
        badge: 'Gut & Glow',
        icon: <Utensils size={16} color="#38BDF8" />,
        color: '#38BDF8',
        image: { uri: RemoteAssets.primaryGoals.gutPainToGlow },
      },
    ];

  // Prefetch remote goal images into local cache
  useEffect(() => {
    let isMounted = true;
    const urls = goalsList.map((g) => g.image.uri);

    Promise.allSettled(urls.map((u) => ExpoImage.prefetch(u)))
      .then(() => {
        if (isMounted) setIsImagesLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsImagesLoading(false);
      });

    const timer = setTimeout(() => {
      if (isMounted) setIsImagesLoading(false);
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);"""

assert old_goals_list_snippet in onboarding, "old_goals_list_snippet not found"
onboarding = onboarding.replace(old_goals_list_snippet, new_goals_list_snippet, 1)

# Update Step 1 rendering with loading screen
step1_old = """        {/* new comment*/}
        {currentStep === 1 && (
          <View>
            <View style={styles.questionHeader}>
              <Text style={styles.stepQuestion}>
                What is your <Text style={styles.serifAccent}>primary focus</Text>?
              </Text>
              <Text style={styles.stepSubtitle}>
                Select your core health goal. We’ll calibrate your exact daily calories, protein targets, carbs, and habits accordingly.
              </Text>
            </View>

            <View style={styles.goalsList}>
              {goalsList.map((g) => {
                const isSelected = !isNoneSelected && selectedGoal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[
                      styles.goalCard,
                      isSelected && [styles.goalCardActive, { borderColor: g.color }],
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setIsNoneSelected(false);
                      setSelectedGoal(g.id);
                      // Set smart default target weights based on goal
                      if (g.id === 'weight_gain' && targetWeightKg <= currentWeightKg) {
                        setTargetWeightKg(currentWeightKg + 6);
                      } else if (g.id === 'weight_loss' && targetWeightKg >= currentWeightKg) {
                        setTargetWeightKg(Math.max(45, currentWeightKg - 6));
                      }
                    }}
                  >
                    {/* Header Row: Title on Left, Radio Indicator on Right */}
                    <View style={styles.goalHeaderRow}>
                      <Text
                        style={[styles.goalCardTitle, isSelected && { color: '#FFFFFF' }]}
                        numberOfLines={1}
                      >
                        {g.title}
                      </Text>
                      <View style={[styles.radioCircle, isSelected && { borderColor: g.color }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: g.color }]} />}
                      </View>
                    </View>

                    {/* Full-width 16:9 Illustration (Full Natural Height) */}
                    <View style={styles.goalImageContainer}>
                      <Image
                        source={g.image}
                        style={styles.goalImage}
                        resizeMode="cover"
                      />
                    </View>
                  </Pressable>
                );
              })}"""

step1_new = """        {/* new comment*/}
        {currentStep === 1 && (
          isImagesLoading ? (
            <View style={styles.centerLoadingContainer}>
              <ExpoImage
                source={LOGO_GIF}
                style={styles.loadingLogoGif}
                contentFit="contain"
                autoplay
              />
              <Text style={styles.loadingBrandTitle}>Health Freak</Text>
              <Text style={styles.loadingSubtitle}>Personalizing your wellness journey...</Text>
            </View>
          ) : (
            <View>
              <View style={styles.questionHeader}>
                <Text style={styles.stepQuestion}>
                  What is your <Text style={styles.serifAccent}>primary focus</Text>?
                </Text>
                <Text style={styles.stepSubtitle}>
                  Select your core health goal. We’ll calibrate your exact daily calories, protein targets, carbs, and habits accordingly.
                </Text>
              </View>

              <View style={styles.goalsList}>
                {goalsList.map((g) => {
                  const isSelected = !isNoneSelected && selectedGoal === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[
                        styles.goalCard,
                        isSelected && [styles.goalCardActive, { borderColor: g.color }],
                      ]}
                      onPress={() => {
                        triggerHaptic('selection');
                        setIsNoneSelected(false);
                        setSelectedGoal(g.id);
                        // Set smart default target weights based on goal
                        if (g.id === 'weight_gain' && targetWeightKg <= currentWeightKg) {
                          setTargetWeightKg(currentWeightKg + 6);
                        } else if (g.id === 'weight_loss' && targetWeightKg >= currentWeightKg) {
                          setTargetWeightKg(Math.max(45, currentWeightKg - 6));
                        }
                      }}
                    >
                      {/* Header Row: Title on Left, Radio Indicator on Right */}
                      <View style={styles.goalHeaderRow}>
                        <Text
                          style={[styles.goalCardTitle, isSelected && { color: '#FFFFFF' }]}
                          numberOfLines={1}
                        >
                          {g.title}
                        </Text>
                        <View style={[styles.radioCircle, isSelected && { borderColor: g.color }]}>
                          {isSelected && <View style={[styles.radioDot, { backgroundColor: g.color }]} />}
                        </View>
                      </View>

                      {/* Full-width 16:9 Illustration (Full Natural Height) */}
                      <View style={styles.goalImageContainer}>
                        <ExpoImage
                          source={g.image}
                          style={styles.goalImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      </View>
                    </Pressable>
                  );
                })}"""

assert step1_old in onboarding, "step1_old not found"
onboarding = onboarding.replace(step1_old, step1_new, 1)

# Add closing tag for Step 1 ternary (since isImagesLoading ? ... : (<View> ... </View>))
old_step1_close = """              </Pressable>
            </View>
          </View>
        )}"""

# Note: step1_old opened with <View> after else, so it needs to close with </View>
# Since step1_old had <View> directly before questionHeader, and closed with </View> </View>,
# our step1_new also has <View> before questionHeader, so the matching closing tags remain intact!

# Add center loading styles
styles_anchor = "  goalCard: {"
new_styles = """  centerLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    minHeight: 460,
  },
  loadingLogoGif: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  loadingBrandTitle: {
    fontFamily: Typography.fontFamilies.instrumentSerif,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.body,
    color: '#8A9E90',
  },
  goalCard: {"""

assert styles_anchor in onboarding, "styles_anchor not found"
onboarding = onboarding.replace(styles_anchor, new_styles, 1)

with open('src/features/onboarding/OnboardingFlow.tsx', 'w', encoding='utf-8') as f:
    f.write(onboarding)
print("Updated OnboardingFlow.tsx successfully!")

# ==============================================================================
# 2. Update DashboardScreen.tsx
# ==============================================================================
with open('src/features/dashboard/DashboardScreen.tsx', 'r', encoding='utf-8') as f:
    dashboard = f.read()

dash_import_old = "import { Colors } from '../../theme/colors';"
dash_import_new = """import { Colors } from '../../theme/colors';
import { RemoteAssets } from '../../constants/remoteAssets';"""
if dash_import_old in dashboard and 'RemoteAssets' not in dashboard:
    dashboard = dashboard.replace(dash_import_old, dash_import_new, 1)

dash_img_old = "source={require('../../../assets/foodScan/foodScan.png')}"
dash_img_new = "source={{ uri: RemoteAssets.foodScan }}"
assert dash_img_old in dashboard, "dash_img_old not found"
dashboard = dashboard.replace(dash_img_old, dash_img_new, 1)

with open('src/features/dashboard/DashboardScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(dashboard)
print("Updated DashboardScreen.tsx successfully!")

# ==============================================================================
# 3. Update LoginScreen.tsx
# ==============================================================================
with open('src/features/auth/LoginScreen.tsx', 'r', encoding='utf-8') as f:
    login = f.read()

login_import_old = "import { IOSGlassVariant } from '../../components/common/IOSControlCenterGlassButton';"
login_import_new = """import { IOSGlassVariant } from '../../components/common/IOSControlCenterGlassButton';
import { RemoteAssets } from '../../constants/remoteAssets';"""
if login_import_old in login and 'RemoteAssets' not in login:
    login = login.replace(login_import_old, login_import_new, 1)

old_slides = """const SLIDES = [
  {
    id: 'fitness',
    image: require('../../../assets/loginUiImages/HealthFreak Fitness Doodle Wallpaper.png'),
    subtitle: 'Touch grass, Track macros!',
    variant: 'frostedDark' as IOSGlassVariant,
  },
  {
    id: 'nutrition',
    image: require('../../../assets/loginUiImages/HealthFreak Nutrition Doodle Collage.png'),
    subtitle: 'We scan. You snack!',
    variant: 'frostedOlive' as IOSGlassVariant,
  },
  {
    id: 'call',
    image: require('../../../assets/loginUiImages/Neon HealthFreak Call Doodle Wallpaper.png'),
    subtitle: 'Your health, Her headache!',
    variant: 'frostedCoral' as IOSGlassVariant,
  },
];"""

new_slides = """const SLIDES = [
  {
    id: 'fitness',
    image: { uri: RemoteAssets.loginUi.fitnessDoodle },
    subtitle: 'Touch grass, Track macros!',
    variant: 'frostedDark' as IOSGlassVariant,
  },
  {
    id: 'nutrition',
    image: { uri: RemoteAssets.loginUi.nutritionCollage },
    subtitle: 'We scan. You snack!',
    variant: 'frostedOlive' as IOSGlassVariant,
  },
  {
    id: 'call',
    image: { uri: RemoteAssets.loginUi.neonCallDoodle },
    subtitle: 'Your health, Her headache!',
    variant: 'frostedCoral' as IOSGlassVariant,
  },
];"""

assert old_slides in login, "old_slides not found"
login = login.replace(old_slides, new_slides, 1)

with open('src/features/auth/LoginScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(login)
print("Updated LoginScreen.tsx successfully!")

