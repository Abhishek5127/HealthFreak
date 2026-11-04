import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { X, Check, Droplet } from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { PrimaryButton } from '../../../components/common/PrimaryButton';

interface WaterTargetModalProps {
  visible: boolean;
  currentTargetMl: number;
  onClose: () => void;
  onSave: (targetMl: number) => void;
}

const PRESETS = [2000, 2500, 3000, 3200, 3500, 4000];

export const WaterTargetModal: React.FC<WaterTargetModalProps> = ({
  visible,
  currentTargetMl,
  onClose,
  onSave,
}) => {
  const [selectedMl, setSelectedMl] = useState<number>(currentTargetMl);
  const [customText, setCustomText] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(!PRESETS.includes(currentTargetMl));

  const handleSelectPreset = (ml: number) => {
    setSelectedMl(ml);
    setIsCustom(false);
    setCustomText('');
  };

  const handleCustomChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    setCustomText(text);
    if (!isNaN(num) && num > 0) {
      setSelectedMl(num);
    }
  };

  const handleConfirm = () => {
    if (selectedMl >= 500 && selectedMl <= 8000) {
      onSave(selectedMl);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Droplet size={18} color="#4FA3E2" />
              </View>
              <Text style={styles.title}>Daily Hydration Goal</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Adjust your daily water requirement based on your climate, activity level, and thirst signals.
          </Text>

          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const isSelected = !isCustom && selectedMl === preset;
              const liters = (preset / 1000).toFixed(1);
              return (
                <Pressable
                  key={preset}
                  style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                    {liters}L ({preset}ml)
                  </Text>
                  {isSelected && <Check size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.presetChip, isCustom && styles.presetChipSelected]}
              onPress={() => setIsCustom(true)}
            >
              <Text style={[styles.presetText, isCustom && styles.presetTextSelected]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {isCustom && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter ml (e.g. 2800)"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={customText}
                onChangeText={handleCustomChange}
                maxLength={5}
                autoFocus
              />
              <Text style={styles.inputUnit}>ml</Text>
            </View>
          )}

          <View style={{ marginTop: 18 }}>
            <PrimaryButton
              title={`Save Target: ${(selectedMl / 1000).toFixed(1)}L (${selectedMl}ml)`}
              onPress={handleConfirm}
              variant="coral"
            />
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181D1A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#262E28',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 163, 226, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.serif,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#242B26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 18,
    marginBottom: 18,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202622',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D3530',
  },
  presetChipSelected: {
    backgroundColor: '#2C82C9',
    borderColor: '#4FA3E2',
  },
  presetText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  presetTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131614',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D3530',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  inputUnit: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

