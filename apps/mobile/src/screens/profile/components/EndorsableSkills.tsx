import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { fetchUserSkills, endorseSkill, unendorseSkill, type UserSkill } from '@/api/skills';
import { useFeatureFlag } from '@/config/featureFlags';

interface EndorsableSkillsProps {
  userId: string;
  isOwnProfile: boolean;
}

/**
 * Skills with endorsements (UserSkill model). On other people's profiles each
 * skill has a one-tap endorse toggle; on your own it shows endorsement counts.
 * Renders nothing when the user has no structured skills (the plain string-tag
 * SkillsSection still covers that case).
 */
export function EndorsableSkills({ userId, isOwnProfile }: EndorsableSkillsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const flagOn = useFeatureFlag('endorsements');
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!flagOn) { setLoading(false); return; }
    let cancelled = false;
    fetchUserSkills(userId)
      .then((s) => { if (!cancelled) setSkills(s); })
      .catch(() => { /* optional section */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, flagOn]);

  const toggleEndorse = useCallback(async (skill: UserSkill) => {
    if (pending[skill.id]) return;
    const wasEndorsed = skill.endorsedByMe;

    // Optimistic update
    setSkills((prev) => prev.map((s) =>
      s.id === skill.id
        ? { ...s, endorsedByMe: !wasEndorsed, endorsementCount: Math.max(0, s.endorsementCount + (wasEndorsed ? -1 : 1)) }
        : s,
    ));
    setPending((p) => ({ ...p, [skill.id]: true }));

    try {
      if (wasEndorsed) {
        await unendorseSkill(skill.id);
      } else {
        await endorseSkill(skill.id);
      }
    } catch {
      // Revert on failure
      setSkills((prev) => prev.map((s) =>
        s.id === skill.id
          ? { ...s, endorsedByMe: wasEndorsed, endorsementCount: Math.max(0, s.endorsementCount + (wasEndorsed ? 1 : -1)) }
          : s,
      ));
    } finally {
      setPending((p) => ({ ...p, [skill.id]: false }));
    }
  }, [pending]);

  if (!flagOn || loading || skills.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="ribbon-outline" size={18} color="#0EA5E9" />
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.about.skills')}</Text>
      </View>

      <View style={styles.list}>
        {skills.map((skill) => (
          <View key={skill.id} style={[styles.row, { borderColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Text style={[styles.skillName, { color: colors.text }]} numberOfLines={1}>
                {skill.skillName}
              </Text>
              {skill.endorsementCount > 0 ? (
                <Text style={[styles.count, { color: colors.textSecondary }]}>
                  {t('profile.about.endorsementCount', { count: skill.endorsementCount })}
                </Text>
              ) : null}
            </View>

            {!isOwnProfile ? (
              <Pressable
                onPress={() => toggleEndorse(skill)}
                disabled={pending[skill.id]}
                hitSlop={6}
                style={[
                  styles.endorseBtn,
                  skill.endorsedByMe
                    ? { backgroundColor: isDark ? '#0F2F37' : '#E0F2FE', borderColor: '#0EA5E9' }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
              >
                {pending[skill.id] ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
                ) : (
                  <>
                    <Ionicons
                      name={skill.endorsedByMe ? 'checkmark-circle' : 'add-circle-outline'}
                      size={16}
                      color="#0EA5E9"
                    />
                    <Text style={styles.endorseText}>
                      {skill.endorsedByMe ? t('profile.about.endorsed') : t('profile.about.endorse')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowLeft: { flex: 1 },
  skillName: { fontSize: 14, fontWeight: '600' },
  count: { fontSize: 12, marginTop: 2 },
  endorseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 96,
    justifyContent: 'center',
  },
  endorseText: { fontSize: 13, fontWeight: '700', color: '#0EA5E9' },
});
