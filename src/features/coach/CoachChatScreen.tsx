import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  Mic,
  Sparkles,
  Paperclip,
  ArrowUpRight,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { DishaLogoEmblem } from '../../components/illustrations/DishaLogo';
import { VoiceOverlay } from './VoiceOverlay';
import { voiceClient } from '../../services/voiceClient';

export const CoachChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    chatMessages,
    isCoachTyping,
    sendChatMessage,
    setActiveTab,
    setActiveModal,
    isVoiceActive,
    setIsVoiceActive,
  } = useApp();

  const [inputText, setInputText] = useState<string>('');
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [chatMessages, isCoachTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleSuggestionPress = (prompt: string) => {
    sendChatMessage(prompt);
  };

  const handleActionLink = (type: string) => {
    if (type === 'open_plan') {
      setActiveTab('plan');
    } else if (type === 'open_labs') {
      setActiveModal('lab_report');
    } else if (type === 'open_checkin') {
      setActiveModal('checkin');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Header with Coach Identity */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.coachHeaderProfile}>
          <View style={styles.coachAvatar}>
            <DishaLogoEmblem size={24} />
          </View>
          <View>
            <View style={styles.coachNameRow}>
              <Text style={styles.coachName}>Disha Coach</Text>
              <View style={styles.activeDot} />
            </View>
            <Text style={styles.coachStatus}>Personalized AI Health Partner</Text>
          </View>
        </View>

        {/* Voice Mode Button */}
        <Pressable
          style={styles.voiceButton}
          onPress={() => {
            voiceClient.unlockAudio();
            setIsVoiceActive(true);
          }}
          hitSlop={8}
        >
          <Mic size={18} color={Colors.coralCTA} />
        </Pressable>
      </View>

      {/* 2. Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScrollView}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: Spacing.layout.tabBarHeight + 70 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowCoach,
              ]}
            >
              {!isUser && (
                <View style={styles.bubbleMiniAvatar}>
                  <Sparkles size={14} color={Colors.softYellow} />
                </View>
              )}

              <View
                style={[
                  styles.bubbleContainer,
                  isUser ? styles.bubbleUser : styles.bubbleCoach,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextCoach,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Optional Action Link inside message */}
                {msg.actionLink && (
                  <Pressable
                    style={styles.actionLinkButton}
                    onPress={() => handleActionLink(msg.actionLink!.type)}
                  >
                    <Text style={styles.actionLinkLabel}>
                      {msg.actionLink.label}
                    </Text>
                    <ArrowUpRight size={14} color={Colors.coralCTA} />
                  </Pressable>
                )}

                <Text
                  style={[
                    styles.timestampText,
                    isUser ? styles.timestampUser : styles.timestampCoach,
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Animated Typing Indicator */}
        {isCoachTyping && (
          <View style={[styles.messageRow, styles.messageRowCoach]}>
            <View style={styles.bubbleMiniAvatar}>
              <Sparkles size={14} color={Colors.softYellow} />
            </View>
            <View style={[styles.bubbleContainer, styles.bubbleCoach, styles.typingBubble]}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          </View>
        )}

        {/* Suggested Quick Reply Chips */}
        {chatMessages.length > 0 &&
          chatMessages[chatMessages.length - 1].suggestions && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggested Prompts</Text>
              <View style={styles.chipsRow}>
                {chatMessages[chatMessages.length - 1].suggestions!.map((prompt, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(prompt)}
                  >
                    <Text style={styles.chipText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
      </ScrollView>

      {/* 3. Input Toolbar anchored above bottom tab bar */}
      <View
        style={[
          styles.inputToolbar,
          { bottom: Math.max(insets.bottom, 12) + Spacing.layout.tabBarHeight + 6 },
        ]}
      >
        <Pressable
          style={styles.attachButton}
          onPress={() => setActiveModal('lab_report')}
          hitSlop={8}
        >
          <Paperclip size={18} color={Colors.textSecondary} />
        </Pressable>

        <TextInput
          style={styles.textInput}
          placeholder="Ask Disha about nutrition, labs, routines..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        <Pressable
          style={[
            styles.sendButton,
            inputText.trim().length > 0 && styles.sendButtonActive,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send
            size={18}
            color={inputText.trim().length > 0 ? '#FFFFFF' : Colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Voice Mode Modal Overlay */}
      {isVoiceActive && <VoiceOverlay onClose={() => setIsVoiceActive(false)} />}
    </KeyboardAvoidingView>
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
  coachHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1C241E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2F3C32',
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  coachStatus: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.25)',
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowCoach: {
    justifyContent: 'flex-start',
  },
  bubbleMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubbleContainer: {
    maxWidth: '82%',
    borderRadius: Spacing.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: '#26332A',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#37483B',
  },
  bubbleCoach: {
    backgroundColor: '#1A1E1B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#282F2A',
  },
  messageText: {
    fontSize: Typography.fontSizes.sm + 0.5,
    lineHeight: 21,
  },
  messageTextUser: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  messageTextCoach: {
    color: '#EDEAE1',
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  actionLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 113, 95, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.borderRadius.round,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.25)',
  },
  actionLinkLabel: {
    color: Colors.coralCTA,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: Colors.textMuted,
  },
  timestampCoach: {
    color: Colors.textMuted,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.lightSage,
    opacity: 0.6,
  },
  typingDotDelay1: {
    opacity: 0.8,
  },
  typingDotDelay2: {
    opacity: 1,
  },
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  suggestionsTitle: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  chipText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  inputToolbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2D352E',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9998,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#262D27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.coralCTA,
  },
});
