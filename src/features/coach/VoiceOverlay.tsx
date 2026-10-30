import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, MicOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { DishaLogoEmblem } from '../../components/illustrations/DishaLogo';

interface VoiceOverlayProps {
  onClose: () => void;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Listening...');

  const waveScale1 = useSharedValue(1);
  const waveScale2 = useSharedValue(1);

  useEffect(() => {
    waveScale1.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    waveScale2.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Simulate conversational turn after 3s
    const timer = setTimeout(() => {
      setVoiceStatus('Disha speaking: "Your recovery heart rate was excellent..."');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const animatedWave1 = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale1.value }],
  }));

  const animatedWave2 = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale2.value }],
  }));

  return (
    <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <X size={24} color={Colors.textPrimary} />
      </Pressable>

      <Text style={styles.voiceTitle}>Disha Live Voice</Text>
      <Text style={styles.voiceSubtitle}>Speak naturally about how your body feels</Text>

      {/* Animated Soundwave Center */}
      <View style={styles.sphereContainer}>
        <Animated.View style={[styles.waveCircle, styles.waveOuter, animatedWave2]} />
        <Animated.View style={[styles.waveCircle, styles.waveMiddle, animatedWave1]} />
        <View style={styles.coreCircle}>
          <DishaLogoEmblem size={64} />
        </View>
      </View>

      {/* Live Status Caption */}
      <View style={styles.transcriptBox}>
        <Text style={styles.statusIndicatorText}>{voiceStatus}</Text>
      </View>

      {/* Voice Controls */}
      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <MicOff size={22} color={Colors.coralCTA} />
          ) : (
            <Mic size={22} color={Colors.textPrimary} />
          )}
        </Pressable>

        <Pressable style={styles.endCallBtn} onPress={onClose}>
          <Text style={styles.endCallText}>End Conversation</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 19, 17, 0.96)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  voiceTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
    marginTop: 10,
  },
  voiceSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
  },
  sphereContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  waveCircle: {
    position: 'absolute',
    borderRadius: 130,
    borderWidth: 1.5,
  },
  waveOuter: {
    width: 250,
    height: 250,
    borderColor: 'rgba(56, 93, 75, 0.25)',
    backgroundColor: 'rgba(56, 93, 75, 0.05)',
  },
  waveMiddle: {
    width: 190,
    height: 190,
    borderColor: 'rgba(201, 217, 202, 0.35)',
    backgroundColor: 'rgba(201, 217, 202, 0.08)',
  },
  coreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1C2620',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.forestGreenLight,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  transcriptBox: {
    backgroundColor: '#1C201D',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#262D28',
    width: '100%',
    alignItems: 'center',
  },
  statusIndicatorText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    width: '100%',
  },
  muteBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  muteBtnActive: {
    borderColor: Colors.coralCTA,
  },
  endCallBtn: {
    flex: 1,
    backgroundColor: Colors.coralCTA,
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});
