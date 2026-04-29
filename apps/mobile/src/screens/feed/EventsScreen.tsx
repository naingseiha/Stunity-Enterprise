import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common';
import { useNavigationContext } from '@/contexts';
import { FeedStackScreenProps } from '@/navigation/types';
import {
  CalendarEvent,
  RSVPStatus,
  getUpcomingCalendarEvents,
  listCalendarEvents,
  rsvpCalendarEvent,
} from '@/api/calendarApi';

type Props = FeedStackScreenProps<'Events'>;

type TabKey = 'upcoming' | 'my-events';

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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (event.allDay) {
    return end ? `${datePart} • All day` : `${datePart} • All day`;
  }

  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!end) return `${datePart} • ${startTime}`;

  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} • ${startTime} - ${endTime}`;
};

const updateEventRSVP = (event: CalendarEvent, nextStatus: RSVPStatus): CalendarEvent => {
  const previousStatus = event.userRSVPStatus;
  let attendeeCount = event._count?.attendees ?? 0;

  if (previousStatus === 'GOING' && nextStatus !== 'GOING') attendeeCount = Math.max(0, attendeeCount - 1);
  if (previousStatus !== 'GOING' && nextStatus === 'GOING') attendeeCount += 1;

  return {
    ...event,
    userRSVPStatus: nextStatus,
    _count: {
      ...event._count,
      attendees: attendeeCount,
    },
  };
};

export default function EventsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { openSidebar } = useNavigationContext();

  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpLoadingKey, setRsvpLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [eventsResponse, upcoming] = await Promise.all([
        listCalendarEvents({
          page: 1,
          limit: 40,
          myEvents: activeTab === 'my-events',
          search: debouncedSearch || undefined,
          startAfter: startOfToday.toISOString(),
        }),
        getUpcomingCalendarEvents(8),
      ]);

      setEvents(eventsResponse.events || []);
      setUpcomingEvents(upcoming || []);
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.userCard.eventsLoadFailed', 'Unable to load events right now. Please try again.')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, t]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents(true);
  }, [loadEvents]);

  const applyRSVPUpdate = useCallback((eventId: string, nextStatus: RSVPStatus) => {
    setEvents((prev) => prev.map((event) => (
      event.id === eventId ? updateEventRSVP(event, nextStatus) : event
    )));

    setUpcomingEvents((prev) => prev.map((event) => (
      event.id === eventId ? updateEventRSVP(event, nextStatus) : event
    )));
  }, []);

  const handleRSVP = useCallback(async (eventId: string, nextStatus: RSVPStatus) => {
    const loadingKey = `${eventId}-${nextStatus}`;
    setRsvpLoadingKey(loadingKey);

    try {
      await rsvpCalendarEvent(eventId, nextStatus);
      applyRSVPUpdate(eventId, nextStatus);
    } catch (error: any) {
      console.error('Failed to RSVP:', error);
      Alert.alert(
        t('common.error', 'Error'),
        error?.message || t('profile.userCard.rsvpFailed', 'Unable to update RSVP right now.')
      );
    } finally {
      setRsvpLoadingKey(null);
    }
  }, [applyRSVPUpdate, t]);

  const tabs = useMemo(
    () => [
      { id: 'upcoming' as const, label: t('profile.userCard.upcomingEvents', 'Upcoming') },
      { id: 'my-events' as const, label: t('profile.userCard.myEvents', 'My Events') },
    ],
    [t]
  );

  const renderEventCard = ({ item }: { item: CalendarEvent }) => {
    const typeMeta = EVENT_TYPE_META[item.eventType] ?? EVENT_TYPE_META.GENERAL;

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventMetaTop}>
          <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={13} color={typeMeta.color} />
            <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{item.eventType.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.privacyText}>{item.privacy.replace('_', ' ')}</Text>
        </View>

        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDate}>{formatEventDate(item)}</Text>

        {!!item.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        )}

        {!!item.virtualLink && (
          <View style={styles.metaRow}>
            <Ionicons name="videocam-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventsScreen.k_ea8e6841" /></Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>{item._count?.attendees ?? 0} <AutoI18nText i18nKey="auto.mobile.screens_feed_EventsScreen.k_52d38be9" /></Text>
        </View>

        <View style={styles.rsvpRow}>
          {RSVP_OPTIONS.map((option) => {
            const isActive = item.userRSVPStatus === option.status;
            const key = `${item.id}-${option.status}`;
            const isLoading = rsvpLoadingKey === key;
            return (
              <TouchableOpacity
                key={option.status}
                style={[
                  styles.rsvpChip,
                  isActive && { backgroundColor: option.activeBg, borderColor: option.activeBg },
                ]}
                onPress={() => handleRSVP(item.id, option.status)}
                disabled={isLoading}
                activeOpacity={0.72}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isActive ? option.activeText : '#64748B'} />
                ) : (
                  <Text style={[styles.rsvpChipText, isActive && { color: option.activeText }]}>{option.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          activeOpacity={0.78}
        >
          <Text style={styles.detailsBtnText}>{t('feed.actions.viewDetails', 'View Details')}</Text>
          <Ionicons name="chevron-forward" size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.headerButton} activeOpacity={0.75}>
          <Ionicons name="menu-outline" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.userCard.eventsMenu', 'Events')}</Text>
        <View style={styles.headerButtonSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('common.search', 'Search')}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#09CFF7" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      ) : (
        <FlashList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          estimatedItemSize={260}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={(
            <View style={styles.upcomingWrap}>
              <Text style={styles.upcomingTitle}>{t('profile.userCard.upcomingEvents', 'Upcoming Events')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRow}>
                {upcomingEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.upcomingCard}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    activeOpacity={0.78}
                  >
                    <Text style={styles.upcomingCardTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={styles.upcomingCardDate}>{formatEventDate(event)}</Text>
                    <View style={styles.upcomingMeta}>
                      <Ionicons name="people-outline" size={12} color="#64748B" />
                      <Text style={styles.upcomingMetaText}>{event._count?.attendees ?? 0}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {upcomingEvents.length === 0 && (
                  <View style={styles.noUpcomingCard}>
                    <Text style={styles.noUpcomingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_EventsScreen.k_470049d5" /></Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          ListEmptyComponent={(
            <EmptyState
              type="generic"
              title={t('feed.noPosts', 'No Posts Yet')}
              message={t('profile.userCard.noEvents', 'No events found for the selected filter.')}
              icon="calendar-outline"
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0284C7',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  upcomingWrap: {
    marginBottom: 14,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  upcomingRow: {
    gap: 10,
    paddingRight: 6,
  },
  upcomingCard: {
    width: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  upcomingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  upcomingCardDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingMetaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  noUpcomingCard: {
    width: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUpcomingText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 12,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
  },
  eventMetaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#64748B',
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  eventDate: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rsvpChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 4,
  },
  rsvpChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  detailsBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});
