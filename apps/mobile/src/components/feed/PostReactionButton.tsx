/**
 * Like / reaction picker — long-press opens palette, tap toggles like.
 * Wired to POST /posts/:id/react via feedStore.reactToPost.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Haptics } from '@/services/haptics';
import { POST_REACTIONS, POST_REACTION_BY_TYPE } from '@/config/postReactions';
import { AnimatedActionButton } from './AnimatedActionButton';
import { ReactionSpark } from './ReactionSpark';

const pickerStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 10,
  },
  bar: {
    position: 'absolute',
    bottom: 42,
    left: -6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 20,
  },
  option: { padding: 3 },
});

export interface PostReactionButtonProps {
  liked: boolean;
  myReaction?: string | null;
  likeCount: number;
  onLike: () => void;
  onReact?: (type: string) => void;
  cardColor: string;
  textColor: string;
  size?: number;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
}

export const PostReactionButton = React.memo<PostReactionButtonProps>(function PostReactionButton({
  liked,
  myReaction,
  likeCount,
  onLike,
  onReact,
  cardColor,
  textColor,
  size = 24,
  textStyle,
  activeTextStyle,
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [spark, setSpark] = useState<{
    token: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  } | null>(null);

  const reactionMeta = myReaction ? POST_REACTION_BY_TYPE.get(myReaction) : null;

  const openPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickerOpen(true);
  }, []);

  const handleReactPick = useCallback(
    (type: string) => {
      Haptics.selectionAsync();
      setPickerOpen(false);
      const meta = POST_REACTION_BY_TYPE.get(type);
      if (meta && type !== 'LIKE') {
        setSpark((prev) => ({
          token: (prev?.token ?? 0) + 1,
          icon: meta.icon,
          color: meta.color,
        }));
      }
      onReact?.(type);
    },
    [onReact],
  );

  return (
    <View>
      {pickerOpen ? (
        <>
          <Pressable
            onPress={() => setPickerOpen(false)}
            style={pickerStyles.backdrop}
            accessibilityLabel={t('common.close')}
          />
          <Animated.View
            entering={ZoomIn.springify().damping(14).stiffness(220)}
            exiting={FadeOut.duration(120)}
            style={[pickerStyles.bar, { backgroundColor: cardColor }]}
          >
            {POST_REACTIONS.map((r, index) => (
              <Animated.View
                key={r.type}
                entering={ZoomIn.delay(40 + index * 35).springify().damping(12)}
              >
                <Pressable
                  onPress={() => handleReactPick(r.type)}
                  hitSlop={8}
                  style={pickerStyles.option}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                >
                  <Ionicons name={r.icon} size={22} color={r.color} />
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>
        </>
      ) : null}
      {spark ? (
        <ReactionSpark
          token={spark.token}
          icon={spark.icon}
          color={spark.color}
          onFinished={() => setSpark(null)}
        />
      ) : null}
      <AnimatedActionButton
        icon="heart-outline"
        activeIcon={reactionMeta ? reactionMeta.icon : 'heart'}
        active={liked}
        count={likeCount}
        color={textColor}
        activeColor={reactionMeta ? reactionMeta.color : '#EF4444'}
        onPress={() => {
          setPickerOpen(false);
          onLike();
        }}
        onLongPress={onReact ? openPicker : undefined}
        size={size}
        accessibilityLabel={t('feed.actions.like')}
        textStyle={textStyle}
        activeTextStyle={
          activeTextStyle ?? { color: reactionMeta ? reactionMeta.color : '#EF4444' }
        }
      />
    </View>
  );
});
