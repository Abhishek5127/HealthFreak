import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { PrimaryButton } from '../../../components/common/PrimaryButton';

interface StepGoalModalProps {
  visible: boolean;
  currentGoal: number;
  onClose: () => void;
  onSave: (newGoal: number) => void;
}

const PRESETS = [3000, 5000, 7500, 10000, 12500];

export const StepGoalModal: React.FC<StepGoalModalProps> = ({
  visible,
  currentGoal,
  onClose,
  onSave,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<number>(currentGoal);
  const [customValue, setCustomValue] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(!PRESETS.includes(currentGoal));

  const handlePresetSelect = (val: number) => {
    setSelectedGoal(val);
    setIsCustom(false);
    setCustomValue('');
  };

  const handleCustomChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    setCustomValue(text);
    if (!isNaN(num) && num > 0) {
      setSelectedGoal(num);
    }
  };

  const handleConfirm = () => {
    if (selectedGoal >= 500 && selectedGoal <= 100000) {
      onSave(selectedGoal);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.contentCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Step Target</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Personalize your daily movement goal. A steady 7,500 - 10,000 steps optimizes insulin sensitivity and cardiovascular health.
          </Text>

          {/* Preset Buttons */}
          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const isSelected = !isCustom && selectedGoal === preset;
              return (
                <Pressable
                  key={preset}
                  style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                    {preset.toLocaleString()}
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

          {/* Custom Input */}
          {isCustom && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter steps (e.g. 8500)"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={customValue}
                onChangeText={handleCustomChange}
                maxLength={6}
                autoFocus
              />
              <Text style={styles.inputUnit}>steps</Text>
            </View>
          )}

          {/* Action Button */}
          <View style={{ marginTop: 20 }}>
            <PrimaryButton
              title={`Save ${selectedGoal.toLocaleString()} Steps Target`}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181D1A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#262E28',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#242B26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 18,
    marginBottom: 20,
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
    backgroundColor: '#222824',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D3530',
  },
  presetChipSelected: {
    backgroundColor: Colors.coralCTA,
    borderColor: Colors.coralCTA,
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
