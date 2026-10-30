import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Flame,
  TrendingUp,
  FileText,
  Activity,
  Heart,
  Moon,
  Droplet,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ProgressRing } from '../../components/illustrations/ProgressRing';
import { MetricLineChart } from '../../components/illustrations/MetricLineChart';

export const ProgressScreen: React.FC = () => {
  const { userProfile, setActiveModal } = useApp();
  const [timeRange, setTimeRange] = useState<'Week' | 'Month'>('Week');

  return (
    <ScreenContainer scrollable={true}>
      {/* Header with Time Range Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Progress & Insights</Text>
          <Text style={styles.pageSubtitle}>Long-term metabolic & habit trajectory</Text>
        </View>

        {/* Range Toggle */}
        <View style={styles.rangeToggle}>
          <Pressable
            style={[styles.rangeBtn, timeRange === 'Week' && styles.rangeBtnActive]}
            onPress={() => setTimeRange('Week')}
          >
            <Text
              style={[
                styles.rangeBtnText,
                timeRange === 'Week' && styles.rangeBtnTextActive,
              ]}
            >
              Week
            </Text>
          </Pressable>

          <Pressable
            style={[styles.rangeBtn, timeRange === 'Month' && styles.rangeBtnActive]}
            onPress={() => setTimeRange('Month')}
          >
            <Text
              style={[
                styles.rangeBtnText,
                timeRange === 'Month' && styles.rangeBtnTextActive,
              ]}
            >
              Month
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Consistency Hero Banner */}
      <View style={styles.consistencyBanner}>
        <View style={styles.consistencyLeft}>
          <View style={styles.streakCrownRow}>
            <Flame size={20} color={Colors.coralCTA} />
            <Text style={styles.streakCountText}>{userProfile.streakDays} Days</Text>
          </View>
          <Text style={styles.consistencyTitle}>Unbroken Streak</Text>
          <Text style={styles.consistencySubtitle}>
            Your daily routines have sustained optimal insulin stabilization for 3 consecutive weeks.
          </Text>
        </View>

        <ProgressRing
          size={84}
          strokeWidth={7}
          percentage={0.88}
          color={Colors.forestGreenLight}
          bgColor="#28342C"
        >
          <View style={styles.ringCenterText}>
            <Text style={styles.ringPercentNumber}>88%</Text>
            <Text style={styles.ringPercentLabel}>Score</Text>
          </View>
        </ProgressRing>
      </View>

      {/* Interactive Activity Trend Line Chart */}
      <SectionHeader
        title="Weekly Activity Volume"
        actionText="Detailed log"
        onActionPress={() => {}}
      />
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartMetricValue}>5,680</Text>
            <Text style={styles.chartMetricSub}>Daily average steps</Text>
          </View>
          <View style={styles.trendPill}>
            <TrendingUp size={14} color={Colors.success} />
            <Text style={styles.trendPillText}>+14.2% vs last week</Text>
          </View>
        </View>

        <MetricLineChart
          data={[3400, 4200, 6100, 4900, 6800, 7500, 8200]}
          labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
          color={Colors.coralCTA}
          height={160}
          width={330}
        />
      </View>

      {/* Key Biomarkers & Wellness Metrics Grid */}
      <SectionHeader title="Holistic Biomarkers" />
      <View style={styles.metricsGrid}>
        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(234, 214, 111, 0.12)' }]}>
            <Heart size={18} color={Colors.softYellow} />
          </View>
          <Text style={styles.gridValue}>64 bpm</Text>
          <Text style={styles.gridLabel}>Resting Heart Rate</Text>
          <Text style={styles.gridStatus}>• Optimal balance</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(78, 154, 111, 0.12)' }]}>
            <Moon size={18} color={Colors.success} />
          </View>
          <Text style={styles.gridValue}>7h 45m</Text>
          <Text style={styles.gridLabel}>Deep Sleep Phase</Text>
          <Text style={styles.gridStatus}>• 92% recovery</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(55, 104, 165, 0.15)' }]}>
            <Droplet size={18} color="#5B9FE2" />
          </View>
          <Text style={styles.gridValue}>2.6 L</Text>
          <Text style={styles.gridLabel}>Cellular Hydration</Text>
          <Text style={styles.gridStatus}>• Goal met</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(255, 113, 95, 0.12)' }]}>
            <Activity size={18} color={Colors.coralCTA} />
          </View>
          <Text style={styles.gridValue}>86 mg/dL</Text>
          <Text style={styles.gridLabel}>Fasting Glucose</Text>
          <Text style={styles.gridStatus}>• Healthy baseline</Text>
        </View>
      </View>

      {/* Lab Reports Link Card */}
      <Pressable
        style={styles.labReportBanner}
        onPress={() => setActiveModal('lab_report')}
      >
        <View style={styles.labReportIconCircle}>
          <FileText size={20} color={Colors.coralCTA} />
        </View>
        <View style={styles.labReportTextCol}>
          <Text style={styles.labReportTitle}>Review Diagnostic Lab Reports</Text>
          <Text style={styles.labReportSubtitle}>
            HbA1c, Fasting Insulin, Thyroid (TSH) & Vitamin D interpretations
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  pageSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.round,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadius.round,
  },
  rangeBtnActive: {
    backgroundColor: '#355544',
  },
  rangeBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  consistencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2521',
    borderRadius: Spacing.borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A362E',
  },
  consistencyLeft: {
    flex: 1,
    paddingRight: 14,
  },
  streakCrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  streakCountText: {
    color: Colors.coralCTA,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consistencyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
  },
  consistencySubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    lineHeight: 17,
  },
  ringCenterText: {
    alignItems: 'center',
  },
  ringPercentNumber: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  ringPercentLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  chartCard: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262D28',
    alignItems: 'center',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  chartMetricValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  chartMetricSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(78, 154, 111, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadius.round,
  },
  trendPillText: {
    color: Colors.success,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  gridLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  gridStatus: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 6,
  },
  labReportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202722',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2D382F',
  },
  labReportIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2B352E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  labReportTextCol: {
    flex: 1,
  },
  labReportTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.serif,
  },
  labReportSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
    lineHeight: 16,
  },
});

