import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '@/services/haptics';

import { useThemeContext } from '@/contexts';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface PostOptionAction {
  key: string;
  label: string;
  icon: IconName;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface PostOptionsSheetProps {
  visible: boolean;
  title?: string;
  actions: PostOptionAction[];
  onClose: () => void;
}

const PostOptionsSheet: React.FC<PostOptionsSheetProps> = ({
  visible,
  title,
  actions,
  onClose,
}) => {
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [mounted, setMounted] = useState(visible);
  const sheetProgress = useRef(new Animated.Value(0)).current;

  const animateOut = useCallback((afterClose?: () => void) => {
    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onClose();
      afterClose?.();
    });
  }, [onClose, sheetProgress]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      sheetProgress.setValue(0);
      Animated.spring(sheetProgress, {
        toValue: 1,
        damping: 22,
        stiffness: 260,
        mass: 0.85,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      animateOut();
    }
  }, [animateOut, mounted, sheetProgress, visible]);

  const handleAction = useCallback((action: PostOptionAction) => {
    Haptics.selectionAsync();
    animateOut(action.onPress);
  }, [animateOut]);

  if (!mounted) return null;

  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.5 : 0.34],
  });
  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });
  const scale = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={() => animateOut()}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => animateOut()}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.actions}>
            {actions.map((action, index) => {
              const color = action.destructive ? '#EF4444' : action.color || colors.text;
              return (
                <Pressable
                  key={action.key}
                  onPress={() => handleAction(action)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    index > 0 && styles.actionBorder,
                    pressed && styles.actionRowPressed,
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: action.destructive ? 'rgba(239,68,68,0.12)' : `${color}18` }]}>
                    <Ionicons name={action.icon} size={20} color={color} />
                  </View>
                  <Text style={[styles.actionText, { color }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: isDark ? 0.38 : 0.14,
    shadowRadius: 22,
    elevation: 24,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: isDark ? colors.border : '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
    paddingHorizontal: 8,
    paddingBottom: 8,
    textTransform: Platform.OS === 'ios' ? 'uppercase' : 'none',
  },
  actions: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  actionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionRowPressed: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default memo(PostOptionsSheet);
