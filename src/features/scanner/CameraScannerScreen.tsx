import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CameraView,
  CameraType,
  FlashMode,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Utensils,
  ChevronLeft,
} from 'lucide-react-native';

import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { MealScannerService } from '../../services/mealScannerService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

export const CameraScannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { setActiveModal, openMealResult, triggerHaptic, userProfile } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  // Scanning stages: idle -> uploading -> identifying -> estimating -> calculating -> done
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<number>(0);

  // Laser scanner animation
  const [laserAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Oscillating laser scan line
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: VIEWFINDER_SIZE - 20,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [laserAnim]);

  // Stage advancement effect during analysis
  useEffect(() => {
    let t0: any, t1: any, t2: any, t3: any;
    if (isAnalyzing) {
      t0 = setTimeout(() => setAnalysisStage(1), 0); // Uploading
      t1 = setTimeout(() => setAnalysisStage(2), 1200); // Identifying
      t2 = setTimeout(() => setAnalysisStage(3), 2400); // Estimating
      t3 = setTimeout(() => setAnalysisStage(4), 3600); // Calculating
    }
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isAnalyzing]);

  // Handle Photo Capture
  const handleCapture = async () => {
    triggerHaptic('impact');

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: Platform.OS === 'android',
        });
        if (photo?.uri) {
          console.log('[Camera] Captured real photo:', photo.uri);
          setCapturedPhotoUri(photo.uri);
          return;
        }
      }
    } catch (err) {
      console.warn('[Camera] takePictureAsync failed, launching picker:', err);
      await handlePickFromGallery();
    }
  };

  // Handle Gallery Pick
  const handlePickFromGallery = async () => {
    triggerHaptic('selection');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[Camera] ImagePicker failed:', err);
    }
  };

  // Run AI Analysis
  const handleRunAnalysis = async () => {
    if (!capturedPhotoUri) return;

    triggerHaptic('impact');
    setIsAnalyzing(true);

    try {
      const result = await MealScannerService.analyzeMeal(
        capturedPhotoUri,
        userProfile.name,
        userProfile.healthConditions || ['Metabolic fitness', 'Weight management']
      );

      triggerHaptic('success');
      setIsAnalyzing(false);
      openMealResult(result);
    } catch (err) {
      console.error('[Camera] Analysis failed:', err);
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    triggerHaptic('selection');
    setCapturedPhotoUri(null);
    setIsAnalyzing(false);
  };

  // If permissions not yet decided
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.forestGreenLight} size="large" />
      </View>
    );
  }

  // If permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.closeButtonAbsolute}
          onPress={() => setActiveModal(null)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X color={Colors.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.permissionCard}>
          <View style={styles.permissionIconCircle}>
            <Utensils color={Colors.lightSage} size={36} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            HealthFreak uses your camera to scan meals, recognize distinct dishes, and calculate nutrition in real time.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Camera Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickFromGallery}>
            <ImageIcon color={Colors.lightSage} size={18} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText}>Choose from Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Camera View or Photo Preview */}
      {!capturedPhotoUri ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
        >
          {/* Viewfinder Overlay */}
          <View style={styles.overlayContainer}>
            {/* Top Bar Controls */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                style={styles.iconCircleButton}
                onPress={() => setActiveModal(null)}
              >
                <X color={Colors.textPrimary} size={22} />
              </TouchableOpacity>

              <View style={styles.topRightControls}>
                <TouchableOpacity
                  style={[styles.iconCircleButton, flash === 'on' && styles.iconActive]}
                  onPress={() => setFlash(flash === 'on' ? 'off' : 'on')}
                >
                  {flash === 'on' ? (
                    <Zap color={Colors.softYellow} size={20} />
                  ) : (
                    <ZapOff color={Colors.textPrimary} size={20} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconCircleButton, { marginLeft: 12 }]}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                >
                  <SwitchCamera color={Colors.textPrimary} size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Instruction Banner */}
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionTitle}>What&apos;s on your plate?</Text>
              <Text style={styles.instructionSubtitle}>
                Center your plate to discover calories & macros
              </Text>
            </View>

            {/* Framing Box Reticle */}
            <View style={styles.reticleContainer}>
              <View style={[styles.viewfinderBox, { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE }]}>
                {/* 4 Corner Accents */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated Laser Scanning Beam */}
                <Animated.View
                  style={[
                    styles.laserBeam,
                    {
                      width: VIEWFINDER_SIZE - 16,
                      transform: [{ translateY: laserAnim }],
                    },
                  ]}
                />
              </View>
            </View>

            {/* Bottom Bar Shutter & Controls */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
              {/* Gallery Pick */}
              <TouchableOpacity
                style={styles.secondaryCircleBtn}
                onPress={handlePickFromGallery}
              >
                <ImageIcon color={Colors.textPrimary} size={22} />
              </TouchableOpacity>

              {/* Large Shutter Button */}
              <TouchableOpacity
                style={styles.shutterOuterRing}
                onPress={handleCapture}
                activeOpacity={0.8}
              >
                <View style={styles.shutterInnerCircle} />
              </TouchableOpacity>

              {/* Camera Flip */}
              <TouchableOpacity
                style={styles.secondaryCircleBtn}
                onPress={() => {
                  triggerHaptic('selection');
                  setFacing(facing === 'back' ? 'front' : 'back');
                }}
              >
                <SwitchCamera color={Colors.textPrimary} size={22} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        /* Photo Preview Mode */
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: capturedPhotoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          <View style={styles.previewGradientOverlay}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                style={styles.iconCircleButton}
                onPress={handleRetake}
                disabled={isAnalyzing}
              >
                <ChevronLeft color={Colors.textPrimary} size={24} />
              </TouchableOpacity>

              <View style={styles.previewTag}>
                <Sparkles color={Colors.lightSage} size={14} style={{ marginRight: 6 }} />
                <Text style={styles.previewTagText}>Photo Ready</Text>
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Bottom Action Card */}
            <View style={[styles.previewActionCard, { paddingBottom: insets.bottom + 16 }]}>
              {!isAnalyzing ? (
                <>
                  <Text style={styles.previewHeading}>Ready to analyze your meal?</Text>
                  <Text style={styles.previewSubheading}>
                    Gemini Multimodal Vision will identify every visible item and calculate exact nutrients.
                  </Text>

                  <View style={styles.previewButtonsRow}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={handleRetake}
                    >
                      <RotateCcw color={Colors.textSecondary} size={18} style={{ marginRight: 6 }} />
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.analyzeBtn}
                      onPress={handleRunAnalysis}
                    >
                      <Sparkles color={Colors.textInverted} size={18} style={{ marginRight: 8 }} />
                      <Text style={styles.analyzeBtnText}>Analyze Meal</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* Scanning Stages Progress Card */
                <View style={styles.scanningProgressContainer}>
                  <View style={styles.pulseHeaderRow}>
                    <ActivityIndicator size="small" color={Colors.forestGreenLight} style={{ marginRight: 10 }} />
                    <Text style={styles.scanningHeaderTitle}>Analyzing Meal Composition...</Text>
                  </View>

                  <View style={styles.stagesList}>
                    <View style={styles.stageItem}>
                      <CheckCircle2
                        color={analysisStage >= 1 ? Colors.success : Colors.textMuted}
                        size={16}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.stageText, analysisStage >= 1 && styles.stageTextActive]}>
                        Preprocessing & uploading photo
                      </Text>
                    </View>

                    <View style={styles.stageItem}>
                      <CheckCircle2
                        color={analysisStage >= 2 ? Colors.success : Colors.textMuted}
                        size={16}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.stageText, analysisStage >= 2 && styles.stageTextActive]}>
                        Recognizing foods & dishes with Gemini Vision
                      </Text>
                    </View>

                    <View style={styles.stageItem}>
                      <CheckCircle2
                        color={analysisStage >= 3 ? Colors.success : Colors.textMuted}
                        size={16}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.stageText, analysisStage >= 3 && styles.stageTextActive]}>
                        Estimating portion weights & ingredients
                      </Text>
                    </View>

                    <View style={styles.stageItem}>
                      <CheckCircle2
                        color={analysisStage >= 4 ? Colors.success : Colors.textMuted}
                        size={16}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.stageText, analysisStage >= 4 && styles.stageTextActive]}>
                        Calculating IFCT macros & micronutrients
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
  },
  permissionCard: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.forestGreenDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.forestGreenLight,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  secondaryBtnText: {
    color: Colors.lightSage,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButtonAbsolute: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 28, 26, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconActive: {
    backgroundColor: 'rgba(234, 214, 111, 0.25)',
    borderColor: Colors.softYellow,
  },
  instructionBanner: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 8,
  },
  instructionTitle: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  instructionSubtitle: {
    fontSize: 13,
    color: Colors.lightSage,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  viewfinderBox: {
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 217, 202, 0.25)',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.lightSage,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  laserBeam: {
    height: 3,
    backgroundColor: Colors.coralCTA,
    borderRadius: 2,
    marginHorizontal: 8,
    shadowColor: Colors.coralCTA,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  secondaryCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(25, 28, 26, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  shutterOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: Colors.lightSage,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 217, 202, 0.15)',
  },
  shutterInnerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.textPrimary,
  },
  previewGradientOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 28, 26, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lightSage,
  },
  previewActionCard: {
    backgroundColor: Colors.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewHeading: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  previewSubheading: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  previewButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  retakeBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  analyzeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.lightSage,
  },
  analyzeBtnText: {
    color: Colors.textInverted,
    fontSize: 15,
    fontWeight: '700',
  },
  scanningProgressContainer: {
    paddingVertical: Spacing.md,
  },
  pulseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  scanningHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stagesList: {
    gap: 10,
    paddingHorizontal: Spacing.sm,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  stageTextActive: {
    color: Colors.lightSage,
    fontWeight: '600',
  },
});
