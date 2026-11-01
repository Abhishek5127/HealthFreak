import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Flame,
  Activity,
  Heart,
  ArrowRight,
  Dumbbell,
  Droplet,
  Minus,
  Plus,
  Scale,
  Check,
  Utensils,
  Sun,
  Compass,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import {
  WellnessGoal,
  LanguagePreference,
  GenderType,
  ActivityLevel,
  DietaryPreference,
  SkinType,
  UserSurveyAssessment,
} from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { calculatePersonalizedNutrition } from '../../services/nutritionCalculator';

export const OnboardingFlow: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { applySurveyAssessment, setActiveModal, triggerHaptic } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: Goal State
  const [selectedGoal, setSelectedGoal] = useState<WellnessGoal>('weight_gain');

  // STEP 2: Metrics & Dynamic Sub-Options State
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(65);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(72);
  const [heightCm, setHeightCm] = useState<number>(174);
  const [age, setAge] = useState<number>(24);
  const [gender, setGender] = useState<GenderType>('male');
  const [weightPace, setWeightPace] = useState<'steady' | 'moderate' | 'rapid'>('moderate');

  // Skincare & Acne Sub-Options
  const [skinType, setSkinType] = useState<SkinType>('oily');
  const [selectedSkinConcerns, setSelectedSkinConcerns] = useState<string[]>([
    'active_acne',
    'dark_spots',
  ]);
  const [waterIntakeLiters, setWaterIntakeLiters] = useState<number>(2.0);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sunscreenHabit, setSunscreenHabit] = useState<'daily' | 'sometimes' | 'never'>('sometimes');

  // Hair Concerns
  const [selectedHairConcerns, setSelectedHairConcerns] = useState<string[]>([
    'hair_fall',
    'thinning',
  ]);

  // Hormonal Concerns
  const [selectedHormonalConcerns, setSelectedHormonalConcerns] = useState<string[]>([
    'irregular_cycles',
    'bloating',
  ]);

  // STEP 3: Dietary & Activity State
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('vegetarian');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [selectedLang, setSelectedLang] = useState<LanguagePreference>('Hinglish');

  // Calculate live targets
  const calculatedPlan = calculatePersonalizedNutrition({
    goal: selectedGoal,
    currentWeightKg,
    targetWeightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    dietaryPreference,
    skinType,
    skinConcerns: selectedSkinConcerns,
    waterIntakeLiters,
    sleepHours,
  });

  const goalsList: {
    id: WellnessGoal;
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'weight_gain',
      title: 'Weight Gain & Muscle Building',
      subtitle: 'Lean caloric surplus, progressive overload, and hypertrophy protein targets.',
      badge: 'Surplus & Mass',
      icon: <Dumbbell size={22} color={Colors.forestGreenLight} />,
      color: Colors.forestGreenLight,
    },
    {
      id: 'weight_loss',
      title: 'Weight Loss & Fat Reduction',
      subtitle: 'Sustainable caloric deficit, hunger-blunting satiety, and lean muscle preservation.',
      badge: 'Deficit & Burn',
      icon: <Flame size={22} color={Colors.coralCTA} />,
      color: Colors.coralCTA,
    },
    {
      id: 'acne_control',
      title: 'Clear Skin & Acne Control',
      subtitle: 'Tackle active pimples, cystic hormonal acne, sebum overload, and post-acne dark marks.',
      badge: 'Dermal Clarity',
      icon: <Sparkles size={22} color="#45D09E" />,
      color: '#45D09E',
    },
    {
      id: 'skincare_glow',
      title: 'Skincare Routine & Skin Glow',
      subtitle: 'Cellular hydration, collagen repair, texture smoothing, and anti-aging radiance.',
      badge: 'Skin Longevity',
      icon: <Heart size={22} color="#F38BA8" />,
      color: '#F38BA8',
    },
    {
      id: 'hair_health',
      title: 'Hair Growth & Anti-Hair Fall',
      subtitle: 'Keratin synthesis amino acids, scalp stimulation, and ferritin micro-nutrition.',
      badge: 'Follicle Health',
      icon: <Droplet size={22} color={Colors.lightSage} />,
      color: Colors.lightSage,
    },
    {
      id: 'pcos_pcod',
      title: 'Hormonal Balance & PCOS Harmony',
      subtitle: 'Steady glucose levels, cycle synchronization, cortisol blunting, and metabolic rhythm.',
      badge: 'Hormone Sync',
      icon: <Activity size={22} color="#D48BAA" />,
      color: '#D48BAA',
    },
    {
      id: 'metabolic_fitness',
      title: 'Metabolic Fitness & All-Day Energy',
      subtitle: 'Balanced macronutrients, athletic stamina, and beating the afternoon energy slump.',
      badge: 'Vitality',
      icon: <Sun size={22} color={Colors.softYellow} />,
      color: Colors.softYellow,
    },
  ];

  const skinConcernsOptions = [
    { id: 'active_acne', label: 'Active Pimples / Breakouts' },
    { id: 'dark_spots', label: 'Post-Acne Dark Marks (PIH)' },
    { id: 'open_pores', label: 'Large Open Pores' },
    { id: 'hormonal_breakouts', label: 'Hormonal Jawline Acne' },
    { id: 'dullness', label: 'Dull & Tired Skin' },
    { id: 'fine_lines', label: 'Premature Fine Lines' },
  ];

  const hairConcernsOptions = [
    { id: 'hair_fall', label: 'Excess Daily Hair Fall' },
    { id: 'thinning', label: 'Thinning Crown / Parting' },
    { id: 'dandruff', label: 'Dandruff & Scalp Itch' },
    { id: 'dry_brittle', label: 'Dry & Brittle Strands' },
  ];

  const hormonalConcernsOptions = [
    { id: 'irregular_cycles', label: 'Irregular Periods' },
    { id: 'bloating', label: 'Water Retention & Bloating' },
    { id: 'sugar_cravings', label: 'Intense Sugar Cravings' },
    { id: 'fatigue', label: 'Unexplained Sluggishness' },
  ];

  const toggleSkinConcern = (id: string) => {
    triggerHaptic('selection');
    setSelectedSkinConcerns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleHairConcern = (id: string) => {
    triggerHaptic('selection');
    setSelectedHairConcerns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleHormonalConcern = (id: string) => {
    triggerHaptic('selection');
    setSelectedHormonalConcerns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    triggerHaptic('selection');
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Step 4: Finalize and save survey
      triggerHaptic('success');
      const assessment: UserSurveyAssessment = {
        goal: selectedGoal,
        currentWeightKg,
        targetWeightKg,
        heightCm,
        age,
        gender,
        activityLevel,
        dietaryPreference,
        weightPace,
        skinType,
        skinConcerns: selectedSkinConcerns,
        waterIntakeLiters,
        sleepHours,
        sunscreenHabit,
        hairConcerns: selectedHairConcerns,
        hormonalConcerns: selectedHormonalConcerns,
        calculatedPlan,
        completedAt: new Date().toISOString(),
      };

      await applySurveyAssessment(assessment);
      setActiveModal(null);
    }
  };

  const handleBack = () => {
    triggerHaptic('selection');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setActiveModal(null);
    }
  };

  const isWeightGoal = selectedGoal === 'weight_gain' || selectedGoal === 'weight_loss';
  const isSkinGoal = selectedGoal === 'acne_control' || selectedGoal === 'skincare_glow';
  const isHairGoal = selectedGoal === 'hair_health';
  const isHormonalGoal = selectedGoal === 'pcos_pcod';

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top Header & Step Progress Bar */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${(currentStep / 4) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>Step 0{currentStep} / 04</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.containerPadding,
          { paddingBottom: Math.max(insets.bottom, 24) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* STEP 1: PRIMARY GOAL SELECTION                                 */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <View>
            <View style={styles.questionHeader}>
              <Text style={styles.stepQuestion}>
                What is your <Text style={styles.serifAccent}>primary focus</Text>?
              </Text>
              <Text style={styles.stepSubtitle}>
                Select your core health goal. We’ll calibrate your exact daily calories, protein target, carbs, and habits accordingly.
              </Text>
            </View>

            <View style={styles.goalsList}>
              {goalsList.map((g) => {
                const isSelected = selectedGoal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[
                      styles.goalCard,
                      isSelected && [styles.goalCardActive, { borderColor: g.color }],
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedGoal(g.id);
                      // Set smart default target weights based on goal
                      if (g.id === 'weight_gain' && targetWeightKg <= currentWeightKg) {
                        setTargetWeightKg(currentWeightKg + 6);
                      } else if (g.id === 'weight_loss' && targetWeightKg >= currentWeightKg) {
                        setTargetWeightKg(Math.max(45, currentWeightKg - 6));
                      }
                    }}
                  >
                    <View style={styles.goalCardTop}>
                      <View style={[styles.goalIconCircle, { backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)' }]}>
                        {g.icon}
                      </View>
                      <View style={styles.goalTitleCol}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.goalCardTitle}>{g.title}</Text>
                        </View>
                        <Text style={styles.goalCardSubtitle}>{g.subtitle}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && { borderColor: g.color }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: g.color }]} />}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* STEP 2: DYNAMIC SUB-OPTIONS & MEASUREMENTS                    */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <View>
            <View style={styles.questionHeader}>
              <Text style={styles.stepQuestion}>
                {isWeightGoal
                  ? 'Calibrate Your Body Metrics'
                  : isSkinGoal
                  ? 'Your Skin Profile & Concerns'
                  : 'Tailor Your Baseline Health'}
              </Text>
              <Text style={styles.stepSubtitle}>
                {isWeightGoal
                  ? 'These numbers determine your exact BMR, TDEE, and daily calorie surplus or deficit.'
                  : isSkinGoal
                  ? 'Personalizing your anti-acne meal ratio, hydration flush, and barrier repair protocol.'
                  : 'Fine-tuning your clinical nutrient breakdown and movement rhythm.'}
              </Text>
            </View>

            {/* A. WEIGHT GAIN / LOSS SUB-OPTIONS */}
            {isWeightGoal && (
              <View style={styles.subOptionsContainer}>
                {/* Current Weight Stepper */}
                <View style={styles.metricInputCard}>
                  <View style={styles.metricLabelRow}>
                    <Scale size={18} color={Colors.forestGreenLight} style={{ marginRight: 6 }} />
                    <Text style={styles.metricLabel}>CURRENT BODY WEIGHT</Text>
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        triggerHaptic('selection');
                        setCurrentWeightKg((prev) => Math.max(35, prev - 1));
                      }}
                    >
                      <Minus size={20} color={Colors.textPrimary} />
                    </Pressable>
                    <View style={styles.stepperCenter}>
                      <Text style={styles.stepperValue}>{currentWeightKg}</Text>
                      <Text style={styles.stepperUnit}>kg</Text>
                    </View>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        triggerHaptic('selection');
                        setCurrentWeightKg((prev) => Math.min(180, prev + 1));
                      }}
                    >
                      <Plus size={20} color={Colors.textPrimary} />
                    </Pressable>
                  </View>
                  {/* Quick Preset Chips */}
                  <View style={styles.presetChipsRow}>
                    {[50, 55, 60, 65, 70, 75, 82, 90].map((val) => (
                      <Pressable
                        key={val}
                        style={[
                          styles.presetChip,
                          currentWeightKg === val && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setCurrentWeightKg(val);
                        }}
                      >
                        <Text style={[styles.presetChipText, currentWeightKg === val && styles.presetChipTextActive]}>
                          {val} kg
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Target Weight Stepper */}
                <View style={styles.metricInputCard}>
                  <View style={styles.metricLabelRow}>
                    <Compass size={18} color={Colors.coralCTA} style={{ marginRight: 6 }} />
                    <Text style={styles.metricLabel}>TARGET GOAL WEIGHT</Text>
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        triggerHaptic('selection');
                        setTargetWeightKg((prev) => Math.max(35, prev - 1));
                      }}
                    >
                      <Minus size={20} color={Colors.textPrimary} />
                    </Pressable>
                    <View style={styles.stepperCenter}>
                      <Text style={[styles.stepperValue, { color: Colors.coralCTA }]}>{targetWeightKg}</Text>
                      <Text style={styles.stepperUnit}>kg</Text>
                    </View>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        triggerHaptic('selection');
                        setTargetWeightKg((prev) => Math.min(180, prev + 1));
                      }}
                    >
                      <Plus size={20} color={Colors.textPrimary} />
                    </Pressable>
                  </View>

                  {/* Dynamic Weight Delta Badge */}
                  <View style={styles.deltaNoticeBox}>
                    <Text style={styles.deltaNoticeText}>
                      {selectedGoal === 'weight_gain'
                        ? `Target Delta: +${Math.max(0, targetWeightKg - currentWeightKg)} kg lean bulk`
                        : `Target Delta: -${Math.max(0, currentWeightKg - targetWeightKg)} kg fat burn`}
                    </Text>
                    <Text style={styles.deltaNoticeSub}>
                      Estimated timeline: ~{Math.max(4, Math.round(Math.abs(targetWeightKg - currentWeightKg) / 0.5))} weeks at a healthy, sustainable pace.
                    </Text>
                  </View>
                </View>

                {/* Height & Age Grid */}
                <View style={styles.twoColumnGrid}>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>HEIGHT (CM)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setHeightCm((prev) => Math.max(120, prev - 1))}
                      >
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{heightCm}</Text>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setHeightCm((prev) => Math.min(230, prev + 1))}
                      >
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>AGE</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setAge((prev) => Math.max(14, prev - 1))}
                      >
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{age}</Text>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setAge((prev) => Math.min(95, prev + 1))}
                      >
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Biological Sex Selector */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>BIOLOGICAL SEX</Text>
                  <View style={styles.pillChoiceRow}>
                    {(['male', 'female'] as GenderType[]).map((g) => (
                      <Pressable
                        key={g}
                        style={[
                          styles.pillChoice,
                          gender === g && styles.pillChoiceActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setGender(g);
                        }}
                      >
                        <Text style={[styles.pillChoiceText, gender === g && styles.pillChoiceTextActive]}>
                          {g === 'male' ? 'Male (Higher Basal BMR)' : 'Female (Hormonal Calibrated)'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Progression Pace */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>WEEKLY PROGRESSION PACE</Text>
                  <View style={styles.pillChoiceRow}>
                    {[
                      { id: 'steady', label: 'Steady (0.35 kg/wk)' },
                      { id: 'moderate', label: 'Moderate (0.5 kg/wk)' },
                      { id: 'rapid', label: 'Active (0.8 kg/wk)' },
                    ].map((pace) => (
                      <Pressable
                        key={pace.id}
                        style={[
                          styles.pillChoice,
                          weightPace === pace.id && styles.pillChoiceActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setWeightPace(pace.id as any);
                        }}
                      >
                        <Text style={[styles.pillChoiceText, weightPace === pace.id && styles.pillChoiceTextActive]}>
                          {pace.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* B. ACNE CONTROL & SKINCARE SUB-OPTIONS */}
            {isSkinGoal && (
              <View style={styles.subOptionsContainer}>
                {/* Skin Type */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>CURRENT SKIN TYPE</Text>
                  <View style={styles.pillChoiceColumn}>
                    {[
                      { id: 'oily', label: 'Oily & Sebum-Prone', desc: 'Shiny T-zone, frequent breakouts, enlarged pores' },
                      { id: 'combination', label: 'Combination Skin', desc: 'Oily forehead/nose with normal or dry cheeks' },
                      { id: 'dry', label: 'Dry & Flaky', desc: 'Tightness, roughness, compromised lipid barrier' },
                      { id: 'sensitive', label: 'Sensitive & Reactive', desc: 'Prone to redness, burning, and irritation' },
                      { id: 'normal', label: 'Balanced Normal', desc: 'Relatively calm and uniform hydration' },
                    ].map((type) => {
                      const isSelected = skinType === type.id;
                      return (
                        <Pressable
                          key={type.id}
                          style={[
                            styles.skinTypeCard,
                            isSelected && styles.skinTypeCardActive,
                          ]}
                          onPress={() => {
                            triggerHaptic('selection');
                            setSkinType(type.id as SkinType);
                          }}
                        >
                          <View style={styles.skinTypeHeader}>
                            <Text style={[styles.skinTypeTitle, isSelected && styles.skinTypeTitleActive]}>
                              {type.label}
                            </Text>
                            {isSelected && <Check size={16} color={Colors.forestGreenLight} />}
                          </View>
                          <Text style={styles.skinTypeDesc}>{type.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Primary Skin Concerns (Multi-Select) */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>PRIMARY SKIN CONCERNS (SELECT ALL THAT APPLY)</Text>
                  <View style={styles.concernsWrap}>
                    {skinConcernsOptions.map((concern) => {
                      const isSelected = selectedSkinConcerns.includes(concern.id);
                      return (
                        <Pressable
                          key={concern.id}
                          style={[
                            styles.concernChip,
                            isSelected && styles.concernChipActive,
                          ]}
                          onPress={() => toggleSkinConcern(concern.id)}
                        >
                          {isSelected && <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />}
                          <Text style={[styles.concernChipText, isSelected && styles.concernChipTextActive]}>
                            {concern.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Hydration & Sleep Quick Checks */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>DAILY WATER INTAKE</Text>
                  <View style={styles.pillChoiceRow}>
                    {[
                      { val: 1.5, label: '< 1.5 Litres (Low)' },
                      { val: 2.5, label: '2.0 - 2.5 L (Fair)' },
                      { val: 3.5, label: '3.0 L+ (High)' },
                    ].map((item) => (
                      <Pressable
                        key={item.val}
                        style={[
                          styles.pillChoice,
                          waterIntakeLiters === item.val && styles.pillChoiceActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setWaterIntakeLiters(item.val);
                        }}
                      >
                        <Text style={[styles.pillChoiceText, waterIntakeLiters === item.val && styles.pillChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Sleep & Sunscreen Habits */}
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>DAILY SLEEP DURATION</Text>
                  <View style={styles.pillChoiceRow}>
                    {[
                      { hours: 5, label: '< 6 hrs' },
                      { hours: 7, label: '7-8 hrs' },
                      { hours: 9, label: '8+ hrs' },
                    ].map((item) => (
                      <Pressable
                        key={item.hours}
                        style={[
                          styles.pillChoice,
                          sleepHours === item.hours && styles.pillChoiceActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setSleepHours(item.hours);
                        }}
                      >
                        <Text style={[styles.pillChoiceText, sleepHours === item.hours && styles.pillChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>SUNSCREEN & SPF HABIT</Text>
                  <View style={styles.pillChoiceRow}>
                    {[
                      { id: 'daily', label: 'Daily SPF 50+' },
                      { id: 'sometimes', label: 'Sometimes' },
                      { id: 'never', label: 'Rarely' },
                    ].map((item) => (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.pillChoice,
                          sunscreenHabit === item.id && styles.pillChoiceActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('selection');
                          setSunscreenHabit(item.id as any);
                        }}
                      >
                        <Text style={[styles.pillChoiceText, sunscreenHabit === item.id && styles.pillChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Body Metrics for Skin (BMR Calculation) */}
                <View style={styles.twoColumnGrid}>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>WEIGHT (KG)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setCurrentWeightKg((prev) => Math.max(35, prev - 1))}
                      >
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{currentWeightKg}</Text>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setCurrentWeightKg((prev) => Math.min(180, prev + 1))}
                      >
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>HEIGHT (CM)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setHeightCm((prev) => Math.max(120, prev - 1))}
                      >
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{heightCm}</Text>
                      <Pressable
                        style={styles.miniStepperBtn}
                        onPress={() => setHeightCm((prev) => Math.min(230, prev + 1))}
                      >
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* C. HAIR HEALTH SUB-OPTIONS */}
            {isHairGoal && (
              <View style={styles.subOptionsContainer}>
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>HAIR & SCALP CONCERNS</Text>
                  <View style={styles.concernsWrap}>
                    {hairConcernsOptions.map((item) => {
                      const isSelected = selectedHairConcerns.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.concernChip,
                            isSelected && styles.concernChipActive,
                          ]}
                          onPress={() => toggleHairConcern(item.id)}
                        >
                          {isSelected && <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />}
                          <Text style={[styles.concernChipText, isSelected && styles.concernChipTextActive]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Weight & Height */}
                <View style={styles.twoColumnGrid}>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>WEIGHT (KG)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{currentWeightKg}</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>HEIGHT (CM)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{heightCm}</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* D. HORMONAL / PCOS SUB-OPTIONS */}
            {isHormonalGoal && (
              <View style={styles.subOptionsContainer}>
                <View style={styles.metricInputCard}>
                  <Text style={styles.metricLabel}>HORMONAL HEALTH FOCUS</Text>
                  <View style={styles.concernsWrap}>
                    {hormonalConcernsOptions.map((item) => {
                      const isSelected = selectedHormonalConcerns.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.concernChip,
                            isSelected && styles.concernChipActive,
                          ]}
                          onPress={() => toggleHormonalConcern(item.id)}
                        >
                          {isSelected && <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />}
                          <Text style={[styles.concernChipText, isSelected && styles.concernChipTextActive]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Weight & Height */}
                <View style={styles.twoColumnGrid}>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>WEIGHT (KG)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{currentWeightKg}</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>HEIGHT (CM)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{heightCm}</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* E. GENERAL / METABOLIC */}
            {!isWeightGoal && !isSkinGoal && !isHairGoal && !isHormonalGoal && (
              <View style={styles.subOptionsContainer}>
                <View style={styles.twoColumnGrid}>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>CURRENT WEIGHT</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{currentWeightKg} kg</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setCurrentWeightKg((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.halfCard}>
                    <Text style={styles.halfCardLabel}>HEIGHT (CM)</Text>
                    <View style={styles.miniStepperRow}>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p - 1)}>
                        <Minus size={16} color={Colors.textPrimary} />
                      </Pressable>
                      <Text style={styles.halfCardValue}>{heightCm} cm</Text>
                      <Pressable style={styles.miniStepperBtn} onPress={() => setHeightCm((p) => p + 1)}>
                        <Plus size={16} color={Colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* STEP 3: DIET PREFERENCE & ACTIVITY LEVEL                       */}
        {/* ============================================================== */}
        {currentStep === 3 && (
          <View>
            <View style={styles.questionHeader}>
              <Text style={styles.stepQuestion}>
                Your Diet & <Text style={styles.serifAccent}>Daily Movement</Text>
              </Text>
              <Text style={styles.stepSubtitle}>
                We align your protein sources with traditional Indian foods and match your daily activity baseline.
              </Text>
            </View>

            {/* Dietary Preference */}
            <View style={styles.metricInputCard}>
              <Text style={styles.metricLabel}>DIETARY PREFERENCE</Text>
              <View style={styles.pillChoiceColumn}>
                {[
                  {
                    id: 'vegetarian',
                    label: 'Vegetarian (Paneer, Dal, Soya, Dairy)',
                    desc: 'Focus on rich vegetarian protein sources and low-GI legumes.',
                  },
                  {
                    id: 'non_vegetarian',
                    label: 'Non-Vegetarian (Chicken, Fish, Eggs, Dairy)',
                    desc: 'High bioavailability animal and plant protein combinations.',
                  },
                  {
                    id: 'eggetarian',
                    label: 'Eggetarian (Vegetarian + Whole Eggs)',
                    desc: 'Combines whole eggs and egg whites with Indian vegetarian meals.',
                  },
                  {
                    id: 'vegan',
                    label: '100% Plant-Based / Vegan (Tofu, Soya, Pulses)',
                    desc: 'Dairy-free plant proteins with complementary amino acid profiles.',
                  },
                ].map((item) => {
                  const isSelected = dietaryPreference === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.skinTypeCard,
                        isSelected && styles.skinTypeCardActive,
                      ]}
                      onPress={() => {
                        triggerHaptic('selection');
                        setDietaryPreference(item.id as DietaryPreference);
                      }}
                    >
                      <View style={styles.skinTypeHeader}>
                        <Text style={[styles.skinTypeTitle, isSelected && styles.skinTypeTitleActive]}>
                          {item.label}
                        </Text>
                        {isSelected && <Check size={16} color={Colors.coralCTA} />}
                      </View>
                      <Text style={styles.skinTypeDesc}>{item.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Physical Activity Level */}
            <View style={styles.metricInputCard}>
              <Text style={styles.metricLabel}>DAILY PHYSICAL ACTIVITY LEVEL</Text>
              <View style={styles.pillChoiceColumn}>
                {[
                  {
                    id: 'sedentary',
                    label: 'Sedentary (Desk Job / < 4,000 steps)',
                    desc: 'Standard desk lifestyle with minimal physical expenditure.',
                  },
                  {
                    id: 'lightly_active',
                    label: 'Lightly Active (1-2 walks / 5,000 - 7,000 steps)',
                    desc: 'Regular daily movement and light mobility.',
                  },
                  {
                    id: 'moderately_active',
                    label: 'Moderately Active (Gym or Yoga 3-4 days/week)',
                    desc: 'Consistent structured workouts and active lifestyle.',
                  },
                  {
                    id: 'very_active',
                    label: 'Very Active (Intense training 5-6 days/week)',
                    desc: 'High cardiovascular and strength training demand.',
                  },
                ].map((item) => {
                  const isSelected = activityLevel === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.skinTypeCard,
                        isSelected && styles.skinTypeCardActive,
                      ]}
                      onPress={() => {
                        triggerHaptic('selection');
                        setActivityLevel(item.id as ActivityLevel);
                      }}
                    >
                      <View style={styles.skinTypeHeader}>
                        <Text style={[styles.skinTypeTitle, isSelected && styles.skinTypeTitleActive]}>
                          {item.label}
                        </Text>
                        {isSelected && <Check size={16} color={Colors.softYellow} />}
                      </View>
                      <Text style={styles.skinTypeDesc}>{item.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Language Preference */}
            <View style={styles.metricInputCard}>
              <Text style={styles.metricLabel}>COACH LANGUAGE PREFERENCE</Text>
              <View style={styles.pillChoiceRow}>
                {(['Hinglish', 'English', 'Hindi'] as LanguagePreference[]).map((lang) => (
                  <Pressable
                    key={lang}
                    style={[
                      styles.pillChoice,
                      selectedLang === lang && styles.pillChoiceActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedLang(lang);
                    }}
                  >
                    <Text style={[styles.pillChoiceText, selectedLang === lang && styles.pillChoiceTextActive]}>
                      {lang}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* STEP 4: PROTOCOL REVEAL & CALCULATED TARGETS                   */}
        {/* ============================================================== */}
        {currentStep === 4 && (
          <View style={styles.planRevealContainer}>
            <View style={styles.celebrationBadge}>
              <CheckCircle2 size={42} color={Colors.forestGreenLight} />
            </View>

            <Text style={styles.planHeadline}>{calculatedPlan.headline}</Text>
            <Text style={styles.planSubheadline}>{calculatedPlan.subheadline}</Text>

            {/* Target Numbers Banner */}
            <View style={styles.targetMatrixCard}>
              <View style={styles.matrixTopRow}>
                <View>
                  <Text style={styles.matrixTargetKcalLabel}>DAILY ENERGY BUDGET</Text>
                  <View style={styles.matrixKcalRow}>
                    <Text style={styles.matrixKcalValue}>{calculatedPlan.dailyCalories}</Text>
                    <Text style={styles.matrixKcalUnit}> kcal / day</Text>
                  </View>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {calculatedPlan.calorieAdjustment > 0
                      ? `+${calculatedPlan.calorieAdjustment} kcal Surplus`
                      : calculatedPlan.calorieAdjustment < 0
                      ? `${calculatedPlan.calorieAdjustment} kcal Deficit`
                      : 'Vitality Balance'}
                  </Text>
                </View>
              </View>

              {/* Macros Breakdown Grid */}
              <View style={styles.macroSplitGrid}>
                {/* Protein */}
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxLabel}>PROTEIN</Text>
                  <Text style={[styles.macroBoxValue, { color: Colors.coralCTA }]}>
                    {calculatedPlan.proteinGrams}g
                  </Text>
                  <Text style={styles.macroBoxSub}>
                    {isWeightGoal ? `${(calculatedPlan.proteinGrams / currentWeightKg).toFixed(1)}g / kg` : 'Cellular repair'}
                  </Text>
                </View>

                {/* Carbs */}
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxLabel}>CARBS</Text>
                  <Text style={[styles.macroBoxValue, { color: Colors.softYellow }]}>
                    {calculatedPlan.carbsGrams}g
                  </Text>
                  <Text style={styles.macroBoxSub}>Clean energy</Text>
                </View>

                {/* Fats */}
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxLabel}>FATS</Text>
                  <Text style={[styles.macroBoxValue, { color: Colors.lightSage }]}>
                    {calculatedPlan.fatGrams}g
                  </Text>
                  <Text style={styles.macroBoxSub}>Hormones</Text>
                </View>

                {/* Water */}
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxLabel}>WATER</Text>
                  <Text style={[styles.macroBoxValue, { color: '#4FA3E2' }]}>
                    {calculatedPlan.waterLiters}L
                  </Text>
                  <Text style={styles.macroBoxSub}>Hydration</Text>
                </View>
              </View>
            </View>

            {/* Core Action Principles */}
            <View style={styles.rulesSection}>
              <Text style={styles.sectionHeaderTitle}>Your Core Daily Principles</Text>
              {calculatedPlan.keyBenefits.map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <View style={styles.benefitNumberCircle}>
                    <Text style={styles.benefitNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Recommended Indian Foods */}
            <View style={styles.recommendedFoodsSection}>
              <Text style={styles.sectionHeaderTitle}>Recommended Indian Superfoods</Text>
              <View style={styles.foodsList}>
                {calculatedPlan.recommendedFoods.map((food, idx) => (
                  <View key={idx} style={styles.foodItemCard}>
                    <View style={styles.foodIconPill}>
                      <Utensils size={14} color={Colors.forestGreenLight} />
                    </View>
                    <View style={styles.foodInfoCol}>
                      <Text style={styles.foodNameText}>{food.name}</Text>
                      <Text style={styles.foodTagText}>{food.tag}</Text>
                    </View>
                    <View style={styles.foodMacroCol}>
                      <Text style={styles.foodProteinText}>{food.protein} Protein</Text>
                      <Text style={styles.foodCalText}>{food.cal}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Area */}
      <View
        style={[
          styles.bottomButtonContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <PrimaryButton
          title={currentStep === 4 ? 'Apply Plan & Open Dashboard' : 'Continue'}
          variant="coral"
          size="lg"
          onPress={handleNext}
          icon={currentStep < 4 ? <ArrowRight size={18} color="#FFFFFF" /> : <Sparkles size={18} color="#FFFFFF" />}
          iconPosition="right"
          style={styles.fullWidthBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceCard,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.coralCTA,
    borderRadius: 3,
  },
  stepBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.lightSage,
  },
  scrollContent: {
    flex: 1,
  },
  containerPadding: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  questionHeader: {
    marginBottom: Spacing.xl,
  },
  stepQuestion: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.h2,
    color: Colors.textPrimary,
    lineHeight: 32,
    marginBottom: Spacing.xs,
  },
  serifAccent: {
    fontFamily: Typography.fonts.serifRegular,
    color: Colors.lightSage,
    fontStyle: 'italic',
  },
  stepSubtitle: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  goalCardActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  goalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  goalTitleCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  goalCardTitle: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  goalCardSubtitle: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subOptionsContainer: {
    gap: Spacing.lg,
  },
  metricInputCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepperCenter: {
    alignItems: 'center',
  },
  stepperValue: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: 40,
    color: Colors.textPrimary,
  },
  stepperUnit: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  presetChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  presetChipActive: {
    backgroundColor: Colors.forestGreenLight,
  },
  presetChipText: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.sansBold,
  },
  deltaNoticeBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 113, 95, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.25)',
  },
  deltaNoticeText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.body,
    color: Colors.coralCTA,
  },
  deltaNoticeSub: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfCard: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  halfCardLabel: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  halfCardValue: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.h3,
    color: Colors.textPrimary,
  },
  miniStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  miniStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillChoiceRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  pillChoice: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pillChoiceActive: {
    backgroundColor: Colors.forestGreenLight,
    borderColor: Colors.lightSage,
  },
  pillChoiceText: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pillChoiceTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.sansBold,
  },
  pillChoiceColumn: {
    gap: Spacing.sm,
  },
  skinTypeCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  skinTypeCardActive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.lightSage,
  },
  skinTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skinTypeTitle: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  skinTypeTitleActive: {
    color: Colors.lightSage,
  },
  skinTypeDesc: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  concernsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  concernChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  concernChipActive: {
    backgroundColor: Colors.forestGreenDark,
    borderColor: Colors.forestGreenLight,
  },
  concernChipText: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
  },
  concernChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.sansBold,
  },
  planRevealContainer: {
    alignItems: 'center',
  },
  celebrationBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  planHeadline: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  planSubheadline: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  targetMatrixCard: {
    width: '100%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  matrixTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
  },
  matrixTargetKcalLabel: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  matrixKcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  matrixKcalValue: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: 34,
    color: Colors.textPrimary,
  },
  matrixKcalUnit: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 113, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.3)',
  },
  statusPillText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.coralCTA,
  },
  macroSplitGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  macroBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  macroBoxLabel: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  macroBoxValue: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.h3,
    marginVertical: 2,
  },
  macroBoxSub: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  rulesSection: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  sectionHeaderTitle: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  benefitNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.forestGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  benefitNumberText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  benefitText: {
    flex: 1,
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  recommendedFoodsSection: {
    width: '100%',
  },
  foodsList: {
    gap: Spacing.xs,
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  foodIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  foodInfoCol: {
    flex: 1,
  },
  foodNameText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  foodTagText: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: Typography.sizes.caption,
    color: Colors.forestGreenLight,
    marginTop: 1,
  },
  foodMacroCol: {
    alignItems: 'flex-end',
  },
  foodProteinText: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes.caption,
    color: Colors.coralCTA,
  },
  foodCalText: {
    fontFamily: Typography.fonts.sansRegular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  fullWidthBtn: {
    width: '100%',
  },
});
