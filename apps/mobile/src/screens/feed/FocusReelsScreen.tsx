import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

import { useThemeContext } from '@/contexts';
import { feedApi } from '@/api/client';
import { Haptics } from '@/services/haptics';
import { Avatar } from '@/components/common/Avatar';

const { width, height } = Dimensions.get('window');

interface PausePoint {
  time: number;
  question: string;
  options: string[];
  correctAnswer: number;
  xp: number;
}

interface FocusReel {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  subject: string;
  duration: number;
  pausePoints: PausePoint[];
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    role: string;
  };
  userAttempt: {
    completedAt: string;
    xpEarned: number;
  } | null;
}

// Online sample videos for graceful fallbacks
const fallbackReels: FocusReel[] = [
  {
    id: 'reel-physics-1',
    title: 'Quantum Wave-Particle Duality',
    description: 'Learn why light behaves as both a wave and a stream of particles, and how observation collapses the state.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-starry-outer-space-background-12891-large.mp4',
    thumbnailUrl: null,
    subject: 'Physics',
    duration: 30,
    creator: {
      id: 'teacher-1',
      firstName: 'Albert',
      lastName: 'Einstein',
      profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'TEACHER',
    },
    pausePoints: [
      {
        time: 5,
        question: 'What happens to a quantum wave function when it is measured/observed?',
        options: [
          'It splits into multiple parallel universes',
          'It collapses into a single definite particle state',
          'It gains momentum and speeds up',
          'It ceases to exist'
        ],
        correctAnswer: 1,
        xp: 15
      }
    ],
    userAttempt: null,
  },
  {
    id: 'reel-bio-1',
    title: 'Helicase & DNA Unwinding',
    description: 'Watch helicase separate double-stranded DNA into single strands to allow replication.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tunnel-of-futuristic-blue-lights-42234-large.mp4',
    thumbnailUrl: null,
    subject: 'Biology',
    duration: 40,
    creator: {
      id: 'teacher-2',
      firstName: 'Rosalind',
      lastName: 'Franklin',
      profilePictureUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      role: 'TEACHER',
    },
    pausePoints: [
      {
        time: 6,
        question: 'Which enzyme is responsible for unwinding the DNA double helix structure?',
        options: [
          'DNA Polymerase',
          'Helicase',
          'DNA Ligase',
          'Primase'
        ],
        correctAnswer: 1,
        xp: 15
      }
    ],
    userAttempt: null,
  }
];

export const FocusReelsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reels, setReels] = useState<FocusReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchReels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await feedApi.get<{ success: boolean; data: FocusReel[] }>('/reels');
      if (res.data?.success && res.data.data.length > 0) {
        setReels(res.data.data);
      } else {
        setReels(fallbackReels);
      }
    } catch (err) {
      console.warn('Failed to fetch reels, loading fallbacks:', err);
      setReels(fallbackReels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loaderText}>Loading Focus Reels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FlatList
        data={reels}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIndex}
            onBack={() => navigation.goBack()}
          />
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / height);
          setActiveIndex(index);
        }}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        decelerationRate="fast"
        snapToInterval={height}
        snapToAlignment="start"
      />
    </View>
  );
};

interface ReelItemProps {
  item: FocusReel;
  isActive: boolean;
  onBack: () => void;
}

const ReelItem: React.FC<ReelItemProps> = ({ item, isActive, onBack }) => {
  const { colors, isDark } = useThemeContext();
  const [questionPoint, setQuestionPoint] = useState<PausePoint | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [answeredTimes, setAnsweredTimes] = useState<Set<number>>(new Set());

  // Slide animation for interactive question popup
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Initialize expo-video player
  const player = useVideoPlayer(item.videoUrl, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = false;
  });

  // Play/pause based on screen active state
  useEffect(() => {
    if (isActive && !questionPoint) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, questionPoint, player]);

  // Listen to time updates to pause and show interactive question
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const currentTime = player.currentTime;
      const targetPoint = item.pausePoints.find(
        (p) => Math.abs(p.time - currentTime) < 0.8
      );

      if (targetPoint && !answeredTimes.has(targetPoint.time) && !questionPoint) {
        player.pause();
        setQuestionPoint(targetPoint);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Slide up modal
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, player, item.pausePoints, answeredTimes, questionPoint, slideAnim]);

  const handleOptionPress = (index: number) => {
    if (answerStatus !== 'idle') return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !questionPoint || submitting) return;

    setSubmitting(true);
    const isCorrect = selectedOption === questionPoint.correctAnswer;

    if (isCorrect) {
      setAnswerStatus('correct');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Call API to register answer and award XP
      try {
        const pointIdx = item.pausePoints.indexOf(questionPoint);
        await feedApi.post(`/reels/${item.id}/answer`, {
          pausePointIndex: pointIdx,
          answerIndex: selectedOption,
        });
      } catch (err) {
        console.error('Failed to submit reel answer to API:', err);
      }

      // Add to answered times
      setAnsweredTimes((prev) => new Set(prev).add(questionPoint.time));

      // Wait 1.5s, slide down, and resume
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          setQuestionPoint(null);
          setSelectedOption(null);
          setAnswerStatus('idle');
          setSubmitting(false);
          player.play();
        });
      }, 1500);
    } else {
      setAnswerStatus('incorrect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        setSelectedOption(null);
        setAnswerStatus('idle');
        setSubmitting(false);
      }, 1200);
    }
  };

  return (
    <View style={styles.reelContainer}>
      <VideoView
        player={player}
        style={styles.videoView}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Focus Reels</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Right Sidebar Info */}
      <View style={styles.rightSidebar}>
        <View style={styles.avatarWrap}>
          <Avatar
            uri={item.creator.profilePictureUrl}
            name={`${item.creator.lastName} ${item.creator.firstName}`}
            size="md"
          />
          <View style={styles.roleBadge}>
            <Ionicons name="school" size={10} color="#FFF" />
          </View>
        </View>

        <TouchableOpacity style={styles.sidebarIconBtn}>
          <Ionicons name="heart" size={30} color="#FFF" />
          <Text style={styles.sidebarText}>128</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarIconBtn}>
          <Ionicons name="chatbubble" size={28} color="#FFF" />
          <Text style={styles.sidebarText}>12</Text>
        </TouchableOpacity>

        <View style={styles.subjectPill}>
          <Text style={styles.subjectText}>{item.subject}</Text>
        </View>
      </View>

      {/* Bottom Info Details */}
      <View style={styles.bottomDetails}>
        <Text style={styles.creatorName}>
          @{item.creator.lastName} {item.creator.firstName}
        </Text>
        <Text style={styles.reelTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.reelDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {/* Interactive Question Overlay */}
      {questionPoint && (
        <Animated.View
          style={[
            styles.questionOverlay,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.blurCard}>
            <View style={styles.cardHeader}>
              <View style={styles.questionIconWrap}>
                <Ionicons name="help-circle" size={24} color="#C084FC" />
              </View>
              <Text style={styles.pauseTitle}>Interactive Pause Point</Text>
              <View style={styles.xpPill}>
                <Text style={styles.xpText}>+{questionPoint.xp} XP</Text>
              </View>
            </View>

            <Text style={styles.questionText}>{questionPoint.question}</Text>

            <View style={styles.optionsList}>
              {questionPoint.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOpt = index === questionPoint.correctAnswer;

                let optionStyle: any = styles.optionBtn;
                let textStyle: any = styles.optionText;

                if (isSelected) {
                  if (answerStatus === 'correct') {
                    optionStyle = [styles.optionBtn, styles.optionCorrect];
                    textStyle = [styles.optionText, styles.textWhite];
                  } else if (answerStatus === 'incorrect') {
                    optionStyle = [styles.optionBtn, styles.optionIncorrect];
                    textStyle = [styles.optionText, styles.textWhite];
                  } else {
                    optionStyle = [styles.optionBtn, styles.optionSelected];
                    textStyle = [styles.optionText, styles.textWhite];
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={optionStyle}
                    onPress={() => handleOptionPress(index)}
                    activeOpacity={0.8}
                  >
                    <Text style={textStyle}>{option}</Text>
                    {isSelected && answerStatus === 'correct' && (
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    )}
                    {isSelected && answerStatus === 'incorrect' && (
                      <Ionicons name="close-circle" size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                selectedOption === null && styles.submitBtnDisabled,
                answerStatus === 'correct' && styles.submitBtnSuccess,
              ]}
              onPress={handleSubmitAnswer}
              disabled={selectedOption === null || submitting || answerStatus === 'correct'}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : answerStatus === 'correct' ? (
                <Text style={styles.submitBtnText}>Solved! Resuming...</Text>
              ) : (
                <Text style={styles.submitBtnText}>Submit Answer</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#A78BFA',
    fontSize: 16,
    fontWeight: '600',
  },
  reelContainer: {
    width,
    height,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoView: {
    width,
    height,
    position: 'absolute',
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rightSidebar: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
    zIndex: 5,
  },
  avatarWrap: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 25,
    padding: 2,
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#000',
  },
  sidebarIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subjectPill: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  subjectText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomDetails: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 40,
    zIndex: 5,
    gap: 6,
  },
  creatorName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reelTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reelDescription: {
    color: '#E4E4E7',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  questionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    zIndex: 20,
    backgroundColor: 'rgba(15,15,20,0.85)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blurCard: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(192,132,252,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: {
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  xpPill: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  xpText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  questionText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    borderColor: '#A78BFA',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16,185,129,0.3)',
    borderColor: '#10B981',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderColor: '#EF4444',
  },
  optionText: {
    color: '#E4E4E7',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  textWhite: {
    color: '#FFF',
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  submitBtnSuccess: {
    backgroundColor: '#10B981',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
