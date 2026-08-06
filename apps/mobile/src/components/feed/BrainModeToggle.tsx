/**
 * BrainModeToggle — the switch that flips the feed from
 * engagement-ranked → quality-ranked (Ed-Score desc).
 *
 * Compact header row: context hint only when active, pill toggle on the right.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ScalePressable } from '@/components/common';

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
      {active ? (
        <Text style={styles.contextText} numberOfLines={1}>
          {t('feed.brainMode.contextOnShort', {
            defaultValue: 'Sorted by educational value',
          })}
        </Text>
      ) : (
        <View style={styles.leftSpacer} />
      )}

      <ScalePressable
        onPress={handlePress}
        pressScale={0.94}
        style={[
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: active }}
        accessibilityLabel={t('feed.brainMode.label', { defaultValue: 'Brain Mode' })}
      >
        <Ionicons
          name={active ? 'bulb' : 'bulb-outline'}
          size={13}
          color={active ? '#EAB308' : colors.textSecondary}
        />
        <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
          {t('feed.brainMode.label', { defaultValue: 'Brain Mode' })}
        </Text>
      </ScalePressable>
    </View>
  );
};

type StyleMap = {
  row: ViewStyle;
  leftSpacer: ViewStyle;
  contextText: TextStyle;
  pill: ViewStyle;
  pillActive: ViewStyle;
  pillInactive: ViewStyle;
  pillText: TextStyle;
  pillTextActive: TextStyle;
  pillTextInactive: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create<StyleMap>({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
      minHeight: 36,
    },
    leftSpacer: {
      flex: 1,
    },
    contextText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
      color: colors.textTertiary,
      marginRight: 10,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9999,
    },
    pillActive: {
      backgroundColor: colors.primary,
    },
    pillInactive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.05,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    pillTextInactive: {
      color: colors.textSecondary,
    },
  });

export default BrainModeToggle;
