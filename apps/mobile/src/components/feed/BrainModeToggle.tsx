/**
 * BrainModeToggle — the visible switch that flips the feed from
 * engagement-ranked → quality-ranked (Ed-Score desc).
 *
 * Pairs with the EdScoreBadge: once you can see quality scores, this lets
 * you re-rank by them. Closes the "Brain Mode" loop from the strategy doc.
 *
 * Prototype: client-side sort only. Production: a /feed/brain endpoint
 * that re-weights _scoreBreakdown.quality + academicRelevance + average
 * EducationalValueRating instead of engagement.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { ColorScale } from '@/config';
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
      <View style={styles.contextWrap}>
        <Text style={styles.contextText}>
          {active
            ? t('feed.brainMode.contextOn', {
                defaultValue: 'Sorted by educational value',
              })
            : t('feed.brainMode.contextOff', {
                defaultValue: 'Showing latest from your network',
              })}
        </Text>
      </View>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: active }}
        accessibilityLabel={t('feed.brainMode.label', {
          defaultValue: 'Brain Mode',
        })}
      >
        <Ionicons
          name="bulb"
          size={14}
          color={active ? '#FFFFFF' : ColorScale.primary[600]}
        />
        <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
          {t('feed.brainMode.label', { defaultValue: 'Brain Mode' })}
        </Text>
        {active ? (
          <View style={styles.onDot}>
            <Text style={styles.onDotText}>
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
  contextWrap: ViewStyle;
  contextText: TextStyle;
  pill: ViewStyle;
  pillInactive: ViewStyle;
  pillActive: ViewStyle;
  pillText: TextStyle;
  pillTextInactive: TextStyle;
  pillTextActive: TextStyle;
  onDot: ViewStyle;
  onDotText: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create<StyleMap>({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    contextWrap: {
      flex: 1,
      flexShrink: 1,
    },
    contextText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    pillInactive: {
      backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : ColorScale.primary[50],
      borderWidth: 1,
      borderColor: isDark ? 'rgba(14,165,233,0.30)' : ColorScale.primary[200],
    },
    pillActive: {
      backgroundColor: ColorScale.primary[500],
    },
    pillText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    pillTextInactive: {
      color: ColorScale.primary[700],
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    onDot: {
      backgroundColor: 'rgba(255,255,255,0.20)',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 2,
    },
    onDotText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.8,
    },
  });

export default BrainModeToggle;
