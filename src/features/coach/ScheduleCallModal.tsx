import React, { useState, useEffect } from 'react';
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
  Calendar,
  Clock,
  Sparkles,
  X,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../../theme/typography';
import { AICallService, ScheduledAICall } from '../../services/aiCallService';
import { useAuth } from '../../state/AuthContext';

interface ScheduleCallModalProps {
  onClose: () => void;
  onCallTriggered?: (call: ScheduledAICall) => void;
}

export const ScheduleCallModal: React.FC<ScheduleCallModalProps> = ({
  onClose,
  onCallTriggered,
}) => {
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const userId = session?.user?.id || profile?.id || 'usr_synthetic_alex';

  const [selectedTiming, setSelectedTiming] = useState<'15s' | '5m' | 'tonight' | 'tomorrow'>('15s');
  const [selectedTopic, setSelectedTopic] = useState<string>('Daily Nutrition & Food Diary Review');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hinglish' | 'Hindi'>('English');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scheduledSuccess, setScheduledSuccess] = useState<boolean>(false);
  const [upcomingCalls, setUpcomingCalls] = useState<ScheduledAICall[]>([]);

  const loadUpcoming = async () => {
    const list = await AICallService.getUpcomingCalls(userId);
    setUpcomingCalls(list);
  };

  useEffect(() => {
    let active = true;
    AICallService.getUpcomingCalls(userId).then((list) => {
      if (active) {
        setUpcomingCalls(list);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const getTargetTimestamp = (): string => {
    const now = new Date();
    if (selectedTiming === '15s') {
      return new Date(now.getTime() + 15 * 1000).toISOString();
    } else if (selectedTiming === '5m') {
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    } else if (selectedTiming === 'tonight') {
      const tonight = new Date();
      tonight.setHours(20, 0, 0, 0);
      if (tonight.getTime() <= now.getTime()) {
        tonight.setDate(tonight.getDate() + 1);
      }
      return tonight.toISOString();
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      return tomorrow.toISOString();
    }
  };

  const handleSchedulePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsLoading(true);
    const scheduledTime = getTargetTimestamp();

    const res = await AICallService.scheduleCall({
      userId,
      scheduledTime,
      topic: selectedTopic,
      language: selectedLanguage,
    });

    setIsLoading(false);

    if (res.success && res.call) {
      setScheduledSuccess(true);
      loadUpcoming();
      setTimeout(() => {
        setScheduledSuccess(false);
      }, 3500);
    }
  };

  const handleInstantTestCall = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    setIsLoading(true);
    const res = await AICallService.triggerTestCall(userId, 0);
    setIsLoading(false);
    if (res.success) {
      onClose();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleBadge}>
            <Sparkles size={14} color="#4AB87A" />
            <Text style={styles.titleBadgeText}>AI Health Partner</Text>
          </View>
          <Text style={styles.screenTitle}>Schedule an AI Call</Text>
          <Text style={styles.screenSubtitle}>
            No phone number required. The app will automatically call you via high-definition WebRTC at your scheduled time.
          </Text>
        </View>

        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <X size={20} color="#9EAEA0" />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Instant Test Call Button */}
        <Pressable style={styles.instantTestCard} onPress={handleInstantTestCall}>
          <View style={styles.instantLeft}>
            <View style={styles.zapIconCircle}>
              <Zap size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.instantTitle}>Test Incoming Call Now</Text>
              <Text style={styles.instantSubtitle}>Simulate incoming Instagram/WhatsApp-style call immediately</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9EAEA0" />
        </Pressable>

        {/* Section 1: When should HealthFreak call? */}
        <Text style={styles.sectionHeading}>1. When should HealthFreak call you?</Text>
        <View style={styles.timingGrid}>
          <Pressable
            style={[styles.timingOption, selectedTiming === '15s' && styles.timingOptionActive]}
            onPress={() => setSelectedTiming('15s')}
          >
            <Clock size={18} color={selectedTiming === '15s' ? '#4AB87A' : '#7C8E7F'} />
            <Text style={[styles.timingTitle, selectedTiming === '15s' && styles.timingTitleActive]}>
              In 15 seconds
            </Text>
            <Text style={styles.timingDesc}>Quick hands-on demo</Text>
          </Pressable>

          <Pressable
            style={[styles.timingOption, selectedTiming === '5m' && styles.timingOptionActive]}
            onPress={() => setSelectedTiming('5m')}
          >
            <Clock size={18} color={selectedTiming === '5m' ? '#4AB87A' : '#7C8E7F'} />
            <Text style={[styles.timingTitle, selectedTiming === '5m' && styles.timingTitleActive]}>
              In 5 minutes
            </Text>
            <Text style={styles.timingDesc}>Short check-in</Text>
          </Pressable>

          <Pressable
            style={[styles.timingOption, selectedTiming === 'tonight' && styles.timingOptionActive]}
            onPress={() => setSelectedTiming('tonight')}
          >
            <Calendar size={18} color={selectedTiming === 'tonight' ? '#4AB87A' : '#7C8E7F'} />
            <Text style={[styles.timingTitle, selectedTiming === 'tonight' && styles.timingTitleActive]}>
              Tonight (8 PM)
            </Text>
            <Text style={styles.timingDesc}>Daily dinner review</Text>
          </Pressable>

          <Pressable
            style={[styles.timingOption, selectedTiming === 'tomorrow' && styles.timingOptionActive]}
            onPress={() => setSelectedTiming('tomorrow')}
          >
            <Calendar size={18} color={selectedTiming === 'tomorrow' ? '#4AB87A' : '#7C8E7F'} />
            <Text style={[styles.timingTitle, selectedTiming === 'tomorrow' && styles.timingTitleActive]}>
              Tomorrow (10 AM)
            </Text>
            <Text style={styles.timingDesc}>Morning kickoff</Text>
          </Pressable>
        </View>

        {/* Section 2: Call Focus Topic */}
        <Text style={styles.sectionHeading}>2. Select Call Topic</Text>
        {[
          'Daily Nutrition & Food Diary Review',
          'Workout, Movement & Posture Check',
          'Energy, Sleep & Stress Optimization',
          'Weekly Wellness Milestone Review',
        ].map((topic) => (
          <Pressable
            key={topic}
            style={[styles.topicRow, selectedTopic === topic && styles.topicRowActive]}
            onPress={() => setSelectedTopic(topic)}
          >
            <Text style={[styles.topicText, selectedTopic === topic && styles.topicTextActive]}>
              {topic}
            </Text>
            {selectedTopic === topic && <CheckCircle2 size={18} color="#4AB87A" />}
          </Pressable>
        ))}

        {/* Section 3: Preferred Voice Language */}
        <Text style={styles.sectionHeading}>3. Preferred Voice Language</Text>
        <View style={styles.languageRow}>
          {(['English', 'Hinglish', 'Hindi'] as const).map((lang) => (
            <Pressable
              key={lang}
              style={[styles.langChip, selectedLanguage === lang && styles.langChipActive]}
              onPress={() => setSelectedLanguage(lang)}
            >
              <Text style={[styles.langChipText, selectedLanguage === lang && styles.langChipTextActive]}>
                {lang}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Schedule Action Button */}
        {scheduledSuccess ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={20} color="#4AB87A" />
            <Text style={styles.successBannerText}>
              Call scheduled! You will receive an incoming call directly on this app at your chosen time.
            </Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.scheduleBtn,
              pressed && styles.btnPressed,
              isLoading && styles.btnDisabled,
            ]}
            onPress={handleSchedulePress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0E1610" />
            ) : (
              <>
                <PhoneCall size={20} color="#0E1610" />
                <Text style={styles.scheduleBtnText}>Schedule AI Incoming Call</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Upcoming Scheduled Calls List */}
        {upcomingCalls.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionHeading}>Upcoming Calls</Text>
            {upcomingCalls.map((item) => (
              <View key={item.id} style={styles.upcomingCard}>
                <View style={styles.upcomingHeader}>
                  <Text style={styles.upcomingTopic}>{item.topic || 'Wellness Call'}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.upcomingTime}>
                  Scheduled: {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(item.scheduledTime).toLocaleDateString()})
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1411',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2A21',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  titleBadgeText: {
    color: '#4AB87A',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  screenSubtitle: {
    color: '#8A9D8D',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    maxWidth: 290,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instantTestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
    marginBottom: 20,
  },
  instantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  zapIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4AB87A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  instantSubtitle: {
    color: '#9EAEA0',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
    maxWidth: 220,
  },
  sectionHeading: {
    color: '#D4E2D6',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: 16,
    marginBottom: 12,
  },
  timingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timingOption: {
    width: '48%',
    backgroundColor: '#172019',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#233226',
    gap: 4,
  },
  timingOptionActive: {
    borderColor: '#4AB87A',
    backgroundColor: 'rgba(74, 184, 122, 0.08)',
  },
  timingTitle: {
    color: '#E0EDE2',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginTop: 4,
  },
  timingTitleActive: {
    color: '#4AB87A',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  timingDesc: {
    color: '#6E8071',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#172019',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#233226',
    marginBottom: 8,
  },
  topicRowActive: {
    borderColor: '#4AB87A',
    backgroundColor: 'rgba(74, 184, 122, 0.08)',
  },
  topicText: {
    color: '#CFDFD2',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  topicTextActive: {
    color: '#4AB87A',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  langChip: {
    flex: 1,
    backgroundColor: '#172019',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#233226',
  },
  langChipActive: {
    backgroundColor: '#4AB87A',
    borderColor: '#4AB87A',
  },
  langChipText: {
    color: '#A0B1A3',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  langChipTextActive: {
    color: '#0E1610',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4AB87A',
    paddingVertical: 15,
    borderRadius: 24,
    gap: 10,
    marginTop: 10,
    elevation: 4,
  },
  scheduleBtnText: {
    color: '#0E1610',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.35)',
    gap: 10,
    marginTop: 10,
  },
  successBannerText: {
    color: '#D4E2D6',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansRegular,
    flex: 1,
    lineHeight: 18,
  },
  upcomingSection: {
    marginTop: 16,
  },
  upcomingCard: {
    backgroundColor: '#172019',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#233226',
    marginBottom: 8,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingTopic: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  statusBadge: {
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: '#4AB87A',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  upcomingTime: {
    color: '#7C8E7F',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
});
