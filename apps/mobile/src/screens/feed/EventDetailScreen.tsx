import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { Avatar, EmptyState } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { FeedStackScreenProps } from '@/navigation/types';
import { CalendarEvent, RSVPStatus, getCalendarEvent, rsvpCalendarEvent } from '@/api/calendarApi';

type Props = FeedStackScreenProps<'EventDetail'>;

const EVENT_TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GENERAL: { icon: 'calendar-outline', color: '#475569', bg: '#E2E8F0' },
  ACADEMIC: { icon: 'book-outline', color: '#2563EB', bg: '#DBEAFE' },
  SPORTS: { icon: 'trophy-outline', color: '#059669', bg: '#D1FAE5' },
  CULTURAL: { icon: 'sparkles-outline', color: '#DB2777', bg: '#FCE7F3' },
  CLUB: { icon: 'people-outline', color: '#7C3AED', bg: '#EDE9FE' },
  WORKSHOP: { icon: 'construct-outline', color: '#D97706', bg: '#FFEDD5' },
  MEETING: { icon: 'chatbubble-ellipses-outline', color: '#0D9488', bg: '#CCFBF1' },
  HOLIDAY: { icon: 'sunny-outline', color: '#DC2626', bg: '#FEE2E2' },
  DEADLINE: { icon: 'time-outline', color: '#B91C1C', bg: '#FEE2E2' },
  COMPETITION: { icon: 'ribbon-outline', color: '#6D28D9', bg: '#EDE9FE' },
};

const RSVP_OPTIONS: Array<{ status: RSVPStatus; label: string; activeBg: string; activeText: string }> = [
  { status: 'GOING', label: 'Going', activeBg: '#DCFCE7', activeText: '#166534' },
  { status: 'MAYBE', label: 'Maybe', activeBg: '#FEF3C7', activeText: '#92400E' },
  { status: 'NOT_GOING', label: "Can't go", activeBg: '#F1F5F9', activeText: '#334155' },
];

const formatEventDate = (event: CalendarEvent) => {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;

  const datePart = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (event.allDay) return `${datePart} • All day`;

  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!end) return `${datePart} • ${startTime}`;

  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} • ${startTime} - ${endTime}`;
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const eventId = route.params?.eventId;

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState<RSVPStatus | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getCalendarEvent(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Failed to load event detail:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.userCard.eventsLoadFailed', 'Unable to load event details right now.')
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const attendeeSummary = useMemo(() => ({
    going: event?.attendeesByStatus?.going?.length ?? 0,
    maybe: event?.attendeesByStatus?.maybe?.length ?? 0,
    notGoing: event?.attendeesByStatus?.notGoing?.length ?? 0,
  }), [event]);

  const handleRSVP = useCallback(async (nextStatus: RSVPStatus) => {
    if (!eventId) return;

    setRsvpLoading(nextStatus);
    try {
      await rsvpCalendarEvent(eventId, nextStatus);
      await loadEvent();
    } catch (error: any) {
      console.error('Failed to RSVP on detail:', error);
      Alert.alert(t('common.error', 'Error'), error?.message || 'Unable to update RSVP.');
    } finally {
      setRsvpLoading(null);
    }
  }, [eventId, loadEvent, t]);

  const handleOpenLink = useCallback(async () => {
    if (!event?.virtualLink) return;

    try {
      await Linking.openURL(event.virtualLink);
    } catch (error) {
      console.error('Failed to open virtual link:', error);
      Alert.alert(t('common.error', 'Error'), 'Unable to open event link.');
    }
  }, [event?.virtualLink, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#09CFF7" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('feed.actions.viewDetails', 'Details')}</Text>
          <View style={styles.backButtonSpacer} />
        </View>
        <EmptyState
          type="generic"
          title={t('common.error', 'Error')}
          message={t('profile.userCard.eventsLoadFailed', 'Unable to load event details right now.')}
          icon="calendar-outline"
        />
      </SafeAreaView>
    );
  }

  const typeMeta = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.GENERAL;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('feed.actions.viewDetails', 'Details')}</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverWrap}>
          {event.coverImage ? (
            <Image source={{ uri: event.coverImage }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: isDark ? `${typeMeta.color}22` : typeMeta.bg }]}>
              <Ionicons name={typeMeta.icon} size={54} color={typeMeta.color} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.topBadgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: isDark ? `${typeMeta.color}22` : typeMeta.bg }]}>
              <Ionicons name={typeMeta.icon} size={13} color={typeMeta.color} />
              <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{event.eventType.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.privacyText}>{event.privacy.replace('_', ' ')}</Text>
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{formatEventDate(event)}</Text>
          </View>

          {!!event.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}

          {!!event.virtualLink && (
            <TouchableOpacity style={[styles.infoRow, styles.linkRow]} onPress={handleOpenLink} activeOpacity={0.72}>
              <Ionicons name="videocam-outline" size={16} color="#2563EB" />
              <Text style={[styles.infoText, styles.linkText]}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_677df190" /></Text>
              <Ionicons name="open-outline" size={14} color="#2563EB" />
            </TouchableOpacity>
          )}

          <View style={styles.organizerRow}>
            <Avatar
              uri={event.creator.profilePictureUrl || undefined}
              name={`${event.creator.lastName || ''} ${event.creator.firstName || ''}`.trim()}
              size="sm"
              showBorder={false}
              gradientBorder="none"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.organizerName}>
                {event.creator.lastName} {event.creator.firstName}
              </Text>
              <Text style={styles.organizerLabel}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_1be6668f" /></Text>
            </View>
          </View>

          {!!event.description && (
            <View style={styles.descriptionWrap}>
              <Text style={styles.sectionTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_d7d9cb42" /></Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_f46bae38" /></Text>
          <View style={styles.rsvpRow}>
            {RSVP_OPTIONS.map((option) => {
              const isActive = event.userRSVPStatus === option.status;
              const isLoading = rsvpLoading === option.status;
              return (
                <TouchableOpacity
                  key={option.status}
                  style={[
                    styles.rsvpChip,
                    isActive && { backgroundColor: option.activeBg, borderColor: option.activeBg },
                  ]}
                  onPress={() => handleRSVP(option.status)}
                  disabled={!!rsvpLoading}
                  activeOpacity={0.74}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={isActive ? option.activeText : colors.textSecondary} />
                  ) : (
                    <Text style={[styles.rsvpChipText, isActive && { color: option.activeText }]}>{option.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.attendeeSummary}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_91cda8d4" /></Text>
              <Text style={styles.summaryPillValue}>{attendeeSummary.going}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_99efdd25" /></Text>
              <Text style={styles.summaryPillValue}>{attendeeSummary.maybe}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventDetailScreen.k_dd831e65" /></Text>
              <Text style={styles.summaryPillValue}>{attendeeSummary.notGoing}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  coverWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  coverImage: {
    width: '100%',
    height: 190,
  },
  coverFallback: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  privacyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  linkRow: {
    backgroundColor: isDark ? '#0F2F37' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDark ? '#1D9BF0' : '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  organizerRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  organizerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  organizerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  descriptionWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rsvpChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rsvpChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  attendeeSummary: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryPillLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryPillValue: {
    marginTop: 2,
    fontSize: 14,
    color: colors.text,
    fontWeight: '800',
  },
});
