import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  UploadCloud,
  FileCheck,
  Info,
  Sparkles,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { mockRecentLabReport } from '../../mock-data/labReports';

export const LabReportsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { setActiveModal, triggerHaptic } = useApp();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>('Metabolic_Panel_Oct2026.pdf');
  const [expandedBiomarker, setExpandedBiomarker] = useState<string | null>('bio_4');

  const report = mockRecentLabReport;

  const handlePickDocument = async () => {
    try {
      triggerHaptic('selection');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file.name);
        simulateProcessing();
      }
    } catch {
      // Fallback simulation
      setSelectedFile('Comprehensive_Metabolic_Report.pdf');
      simulateProcessing();
    }
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setProcessingStep('Parsing diagnostic PDF text & lab ranges...');

    setTimeout(() => {
      setProcessingStep('Cross-referencing HbA1c, TSH, and Lipid markers...');
    }, 1200);

    setTimeout(() => {
      setProcessingStep('Generating personalized Disha metabolic roadmap...');
    }, 2400);

    setTimeout(() => {
      setIsProcessing(false);
      triggerHaptic('success');
    }, 3200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal':
        return { label: 'Optimal', color: '#4E9A6F', bg: 'rgba(78, 154, 111, 0.14)' };
      case 'normal':
        return { label: 'Normal', color: '#C9D9CA', bg: 'rgba(201, 217, 202, 0.12)' };
      case 'borderline':
        return { label: 'Attention', color: '#EAD66F', bg: 'rgba(234, 214, 111, 0.14)' };
      case 'attention':
      default:
        return { label: 'Action Needed', color: '#FF715F', bg: 'rgba(255, 113, 95, 0.14)' };
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable
          style={styles.backButtonCircle}
          onPress={() => setActiveModal(null)}
          hitSlop={10}
        >
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Diagnostic Lab Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload Action Card */}
        <Pressable
          style={styles.uploadCard}
          onPress={handlePickDocument}
        >
          <View style={styles.uploadIconCircle}>
            <UploadCloud size={24} color={Colors.coralCTA} />
          </View>
          <Text style={styles.uploadTitle}>
            {selectedFile ? 'Replace Uploaded Report' : 'Upload Diagnostic Blood Panel'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            Upload PDF or photo from Dr. Lal PathLabs, SRL, Thyrocare, or Apollo
          </Text>

          {selectedFile && (
            <View style={styles.selectedFilePill}>
              <FileCheck size={14} color={Colors.success} />
              <Text style={styles.selectedFileText}>{selectedFile}</Text>
            </View>
          )}
        </Pressable>

        {/* Simulated Processing Banner */}
        {isProcessing && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="small" color={Colors.coralCTA} />
            <Text style={styles.processingText}>{processingStep}</Text>
          </View>
        )}

        {/* AI Health Coach Synthesis Summary */}
        <View style={styles.coachSummaryCard}>
          <View style={styles.coachSummaryHeader}>
            <Sparkles size={18} color={Colors.softYellow} />
            <Text style={styles.coachSummaryTag}>Disha AI Analysis</Text>
          </View>
          <Text style={styles.coachSummaryTitle}>
            {report.title}
          </Text>
          <Text style={styles.coachSummaryBody}>
            {report.coachRecommendation}
          </Text>
        </View>

        {/* Biomarkers Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tracked Biomarkers ({report.biomarkers.length})</Text>
          <Text style={styles.sectionDate}>{report.date}</Text>
        </View>

        {report.biomarkers.map((bio) => {
          const badge = getStatusBadge(bio.status);
          const isExpanded = expandedBiomarker === bio.id;

          return (
            <Pressable
              key={bio.id}
              style={[
                styles.biomarkerCard,
                isExpanded && styles.biomarkerCardExpanded,
              ]}
              onPress={() => setExpandedBiomarker(isExpanded ? null : bio.id)}
            >
              <View style={styles.biomarkerTopRow}>
                <View style={styles.biomarkerNameCol}>
                  <Text style={styles.biomarkerName}>{bio.name}</Text>
                  <Text style={styles.biomarkerCategory}>{bio.category}</Text>
                </View>

                <View style={styles.biomarkerValueCol}>
                  <Text style={styles.biomarkerValue}>
                    {bio.value} <Text style={styles.biomarkerUnit}>{bio.unit}</Text>
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Reference Range Bar */}
              <View style={styles.rangeRow}>
                <Text style={styles.rangeLabel}>Normal reference: {bio.referenceRange}</Text>
              </View>

              {/* Expanded AI Insight */}
              {isExpanded && (
                <View style={styles.insightBox}>
                  <View style={styles.insightHeader}>
                    <Info size={14} color={Colors.lightSage} />
                    <Text style={styles.insightHeaderTitle}>Clinical Significance</Text>
                  </View>
                  <Text style={styles.insightText}>{bio.insight}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#202621',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  uploadCard: {
    backgroundColor: '#1C221E',
    borderRadius: Spacing.borderRadius.xl,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#37463B',
    marginBottom: 20,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 113, 95, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 4,
  },
  uploadSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  selectedFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#263129',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.borderRadius.round,
    marginTop: 12,
  },
  selectedFileText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#202823',
    borderRadius: Spacing.borderRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2F3C32',
  },
  processingText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  coachSummaryCard: {
    backgroundColor: '#1E2721',
    borderRadius: Spacing.borderRadius.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2D3D32',
  },
  coachSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  coachSummaryTag: {
    color: Colors.softYellow,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachSummaryTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.serif,
    marginBottom: 8,
  },
  coachSummaryBody: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 19,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  sectionDate: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  biomarkerCard: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  biomarkerCardExpanded: {
    borderColor: '#394B3D',
  },
  biomarkerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  biomarkerNameCol: {
    flex: 1,
    marginRight: 10,
  },
  biomarkerName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  biomarkerCategory: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  biomarkerValueCol: {
    alignItems: 'flex-end',
  },
  biomarkerValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  biomarkerUnit: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.borderRadius.round,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
  },
  rangeRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242B25',
  },
  rangeLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  insightBox: {
    backgroundColor: '#181E19',
    borderRadius: Spacing.borderRadius.sm,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#263328',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  insightHeaderTitle: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  insightText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 18,
  },
});

