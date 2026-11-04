import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Footprints, ShieldCheck, X } from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { PrimaryButton } from '../../../components/common/PrimaryButton';

interface PedometerPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
}

export const PedometerPermissionModal: React.FC<PedometerPermissionModalProps> = ({
  visible,
  onClose,
  onRequestPermission,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close Icon */}
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>

          {/* Icon Badge */}
          <View style={styles.iconBadge}>
            <Footprints size={36} color={Colors.coralCTA} />
          </View>

          {/* Title & Copy */}
          <Text style={styles.title}>Enable Step Tracking</Text>
          <Text style={styles.description}>
            HealthFreak needs access to your device&apos;s motion sensors to count your steps, active minutes, and walking distance accurately.
          </Text>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <ShieldCheck size={16} color="#4AB87A" style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>
              100% Privacy-Preserved: No GPS tracking, no background location tracking, and no external advertising data sharing.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <PrimaryButton
              title="Enable Step Tracking"
              onPress={() => {
                onRequestPermission();
                onClose();
              }}
              variant="coral"
            />

            <Pressable onPress={onClose} style={styles.notNowBtn}>
              <Text style={styles.notNowText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181D1A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262E28',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#242B26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.serif,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A16',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#212A23',
    marginBottom: 20,
  },
  privacyText: {
    flex: 1,
    color: '#8EA393',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 16,
  },
  buttonStack: {
    width: '100%',
    gap: 8,
  },
  notNowBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});
