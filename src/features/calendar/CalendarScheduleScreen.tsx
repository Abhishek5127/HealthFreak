import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ChevronLeft,
  Check,
  Dumbbell,
} from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useApp } from '../../state/AppContext';
import { Typography } from '../../theme/typography';

export interface TrainingSession {
  id: string;
  time: string;
  title: string;
  trainer: string;
  category: 'yoga' | 'gym' | 'functional' | 'dance' | 'tennis' | 'other';
  calories: number;
  durationMins: number;
  joined: boolean;
}

const INITIAL_SESSIONS: TrainingSession[] = [
  {
    id: 'tr_1',
    time: '07:30 - 08:15',
    title: 'Yoga for balance',
    trainer: 'Anna Sedon',
    category: 'yoga',
    calories: 180,
    durationMins: 45,
    joined: false,
  },
  {
    id: 'tr_2',
    time: '12:00 - 13:00',
    title: 'Full body gym',
    trainer: 'Daniel Moore',
    category: 'gym',
    calories: 420,
    durationMins: 60,
    joined: false,
  },
  {
    id: 'tr_3',
    time: '16:00 - 17:00',
    title: 'Functional fitness',
    trainer: 'Ryan Cooper',
    category: 'functional',
    calories: 360,
    durationMins: 60,
    joined: false,
  },
  {
    id: 'tr_4',
    time: '18:30 - 19:15',
    title: 'Dance cardio',
    trainer: 'Sophia Martinez',
    category: 'dance',
    calories: 310,
    durationMins: 45,
    joined: false,
  },
  {
    id: 'tr_5',
    time: '19:30 - 20:10',
    title: 'Tennis training',
    trainer: 'Alex Johnson',
    category: 'tennis',
    calories: 290,
    durationMins: 40,
    joined: false,
  },
];

const WEEK_DAYS = [
  { day: 'Mon', date: 11, dayOfWeek: 1 },
  { day: 'Tue', date: 12, dayOfWeek: 2, isToday: true },
  { day: 'Wed', date: 13, dayOfWeek: 3 },
  { day: 'Thu', date: 14, dayOfWeek: 4 },
  { day: 'Fri', date: 15, dayOfWeek: 5 },
  { day: 'Sun', date: 16, dayOfWeek: 0 },
];

export const CalendarScheduleScreen: React.FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const { triggerHaptic } = useApp();

  const [selectedDate, setSelectedDate] = useState<number>(12);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sessions, setSessions] = useState<TrainingSession[]>(INITIAL_SESSIONS);
  const [activeSuccessToast, setActiveSuccessToast] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.trainer.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const handleToggleJoin = (id: string, title: string) => {
    triggerHaptic?.('success');
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, joined: !s.joined } : s))
    );

    const isJoining = !sessions.find((s) => s.id === id)?.joined;
    if (isJoining) {
      setActiveSuccessToast(`Joined "${title}"`);
      setTimeout(() => setActiveSuccessToast(null), 2500);
    }
  };

  const renderCategoryIcon = (category: TrainingSession['category']) => {
    switch (category) {
      case 'yoga':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {/* Meditating figure in yoga pose */}
            <Circle cx="12" cy="5" r="2.5" stroke="#72D995" strokeWidth="2" />
            <Path
              d="M12 8v5M7 11l5 2 5-2M6 18l3-2 3 3 3-3 3 2"
              stroke="#72D995"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'gym':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {/* Gym dumbbells */}
            <Path
              d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12"
              stroke="#72D995"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'functional':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {/* Functional runner figure */}
            <Circle cx="14" cy="5" r="2" stroke="#72D995" strokeWidth="2" />
            <Path
              d="M10 21l3-5-2-4 4-2 3 3M6 13l3-1 2 3M8 9l3-2"
              stroke="#72D995"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'dance':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {/* Dancing dynamic figure */}
            <Circle cx="12" cy="4" r="2" stroke="#72D995" strokeWidth="2" />
            <Path
              d="M7 9l5-2 5 2M12 7v7l-4 6M12 14l4 6"
              stroke="#72D995"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'tennis':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {/* Tennis racket / ball */}
            <Circle cx="12" cy="12" r="8" stroke="#72D995" strokeWidth="2" />
            <Path
              d="M6.3 6.3a8 8 0 0 1 11.4 11.4M6.3 17.7a8 8 0 0 0 11.4-11.4"
              stroke="#72D995"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        );
      default:
        return <Dumbbell size={20} color="#72D995" />;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} style={styles.navIconBtn}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.screenTitle}>Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Horizontal Date Picker Strip */}
      <View style={styles.dateStripContainer}>
        {WEEK_DAYS.map((item) => {
          const isSelected = selectedDate === item.date;
          return (
            <Pressable
              key={item.date}
              onPress={() => {
                triggerHaptic?.('selection');
                setSelectedDate(item.date);
              }}
              style={[styles.dateCard, isSelected && styles.dateCardActive]}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                {item.day}
              </Text>
              <Text style={[styles.dateNumber, isSelected && styles.dateNumberActive]}>
                {item.date}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={18} color="#7E8F82" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or training"
          placeholderTextColor="#7E8F82"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Date Subtitle Section */}
      <View style={styles.dateHeaderRow}>
        <Text style={styles.dateHeadingText}>Tuesday, December 12</Text>
      </View>

      {/* Toast Notification */}
      {activeSuccessToast && (
        <View style={styles.toastBanner}>
          <Check size={16} color="#4AB87A" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{activeSuccessToast}</Text>
        </View>
      )}

      {/* Sessions List */}
      <ScrollView
        style={styles.sessionsScroll}
        contentContainerStyle={[
          styles.sessionsContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredSessions.map((session) => {
          return (
            <View key={session.id} style={styles.sessionCard}>
              {/* Category Icon Badge */}
              <View style={styles.iconCircle}>{renderCategoryIcon(session.category)}</View>

              {/* Session Details */}
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTime}>{session.time}</Text>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionTrainer}>{session.trainer}</Text>
              </View>

              {/* Join Action Pill */}
              <Pressable
                onPress={() => handleToggleJoin(session.id, session.title)}
                style={({ pressed }) => [
                  styles.joinBtn,
                  session.joined && styles.joinBtnActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {session.joined ? (
                  <View style={styles.joinedContent}>
                    <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.joinBtnTextActive}>Joined</Text>
                  </View>
                ) : (
                  <Text style={styles.joinBtnText}>Join</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C100D',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamilies.serif,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dateStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    minWidth: 44,
  },
  dateCardActive: {
    backgroundColor: '#FF6243',
    shadowColor: '#FF6243',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#8A998E',
    marginBottom: 4,
  },
  dayLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateNumber: {
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#8A998E',
  },
  dateNumberActive: {
    color: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C18',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#232C25',
    marginBottom: 22,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  dateHeaderRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  dateHeadingText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1A2920',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#34523F',
    marginBottom: 12,
  },
  toastText: {
    color: '#72D995',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  sessionsScroll: {
    flex: 1,
  },
  sessionsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2320',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232C25',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#203226',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTime: {
    fontSize: 11,
    color: '#8A9B8F',
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 3,
  },
  sessionTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansSemiBold,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  sessionTrainer: {
    fontSize: 12,
    color: '#8A9B8F',
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  joinBtn: {
    backgroundColor: '#222B25',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#303D34',
  },
  joinBtnActive: {
    backgroundColor: '#FF6243',
    borderColor: '#FF6243',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  joinBtnTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  joinedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
