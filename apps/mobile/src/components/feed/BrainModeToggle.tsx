/**
 * BrainModeToggle — the switch that flips the feed from
 * engagement-ranked → quality-ranked (Ed-Score desc).
 *
 * Designed as a clean feed header row sitting flush with the content,
 * featuring a left text section and a toggling pill button on the right.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export const BrainModeToggle: React.FC<Props> = ({ active, onToggle }) => {
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const styles = React.useMemo(
    () => createStyles(colors, isDark),
    [colors, isDark],
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: active }}
        accessibilityLabel={t('feed.brainMode.label', { defaultValue: 'Brain Mode' })}
      >
        <Ionicons
          name={active ? 'bulb' : 'bulb-outline'}
          size={14}
          color={active ? '#EAB308' : colors.textSecondary}
          style={styles.bulbIcon}
        />
        <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
          {t('feed.brainMode.label', { defaultValue: 'Brain Mode' })}
        </Text>
        {active ? (
          <View style={styles.onBadge}>
            <Text style={styles.onBadgeText}>
              {t('feed.brainMode.on', { defaultValue: 'ON' })}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

type StyleMap = {
  row: ViewStyle;
  pill: ViewStyle;
  pillActive: ViewStyle;
  pillInactive: ViewStyle;
  bulbIcon: TextStyle;
  pillText: TextStyle;
  pillTextActive: TextStyle;
  pillTextInactive: TextStyle;
  onBadge: ViewStyle;
  onBadgeText: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create<StyleMap>({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1.5,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: { elevation: 1 },
      }),
    },
    pillActive: {
      backgroundColor: colors.primary,
    },
    pillInactive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    },
    bulbIcon: {
      marginRight: 1,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    pillTextInactive: {
      color: colors.textSecondary,
    },
    onBadge: {
      backgroundColor: 'rgba(255,255,255,0.20)',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 2,
    },
    onBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

export default BrainModeToggle;
