import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { classesApi } from '@/api';
import type { ClubsStackParamList } from '@/navigation/types';
import { useThemeContext } from '@/contexts';
import { Colors, Shadows } from '@/config';

const BRAND_TEAL = '#09CFF7';

type Props = NativeStackScreenProps<ClubsStackParamList, 'DisciplineWorkbench'>;

const statusOrder = ['ABSENT', 'PERMISSION', 'LATE', 'EXCUSED'] as const;
/** Order in the status picker: Present first when permitted, so Excused can be cleared. */
const modalStatusOrder = ['PRESENT', 'ABSENT', 'PERMISSION', 'LATE', 'EXCUSED'] as const;

const avatarLetter = (first?: string, last?: string) => {
  const c = (first || last || '?').trim();
  return c ? c.charAt(0).toUpperCase() : '?';
};

const statusLetter = (s: (typeof statusOrder)[number]) =>
  s === 'PERMISSION' ? 'P' : s === 'ABSENT' ? 'A' : s === 'LATE' ? 'L' : 'E';

const modalStatusCodeAndLabel = (s: (typeof modalStatusOrder)[number], t: TFunction) => {
  if (s === 'PRESENT') return { code: '✓', label: t('attendance.status.present') };
  const code = statusLetter(s);
  if (s === 'ABSENT') return { code, label: t('attendance.status.absent') };
  if (s === 'PERMISSION') return { code, label: t('attendance.status.permission') };
  if (s === 'LATE') return { code, label: t('attendance.status.late') };
  return { code, label: t('attendance.status.excused') };
};

const statusMeta = (status?: string) => {
  const value = status || 'PRESENT';
  if (value === 'ABSENT') return { code: 'A', bg: '#FEF2F2', color: '#DC2626' };
  if (value === 'PERMISSION') return { code: 'P', bg: '#F5F3FF', color: '#7C3AED' };
  if (value === 'LATE') return { code: 'L', bg: '#FFFBEB', color: '#D97706' };
  if (value === 'EXCUSED') return { code: 'E', bg: '#ECFEFF', color: '#0F766E' };
  return { code: '✓', bg: '#ECFDF5', color: '#059669' };
};

export default function DisciplineWorkbenchScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classId, setClassId] = useState<string>(route.params?.classId || '');
  const [date, setDate] = useState<string>(() => route.params?.date || format(new Date(), 'yyyy-MM-dd'));
  const [classes, setClasses] = useState<classesApi.MyClassSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABSENT' | 'PERMISSION' | 'LATE' | 'EXCUSED'>('ALL');
  const [rows, setRows] = useState<any[]>([]);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [capabilitySource, setCapabilitySource] = useState<string>('none');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusPicker, setStatusPicker] = useState<{
    open: boolean;
    studentId?: string;
    currentStatus?: string;
    currentRemarks?: string;
  }>({ open: false });
  /** Excused reason is a second step inside the same modal (avoids iOS freeze from stacked Modals). */
  const [isExcusedReasonStep, setIsExcusedReasonStep] = useState(false);
  const [excusedDraft, setExcusedDraft] = useState('');
  const [policyMinLen, setPolicyMinLen] = useState(3);

  const closeAttendanceModal = useCallback(() => {
    setStatusPicker({ open: false });
    setIsExcusedReasonStep(false);
    setExcusedDraft('');
  }, []);

  const parsedDate = useMemo(() => {
    try {
      const d = parseISO(date);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [date]);

  useEffect(() => {
    const p = route.params;
    if (!p) return;
    if (p.classId) setClassId(p.classId);
    if (p.date) setDate(p.date);
  }, [route.params?.classId, route.params?.date]);

  const loadData = useCallback(
    async (opts?: { skipFullScreenSpinner?: boolean }) => {
      const quiet = opts?.skipFullScreenSpinner === true;
      if (!quiet) setLoading(true);
      try {
        const myClasses = await classesApi.getMyClasses({ force: true });
        setClasses(myClasses);
        let activeClassId = classId;
        if (!activeClassId || !myClasses.some((c) => c.id === activeClassId)) {
          activeClassId = myClasses[0]?.id || '';
          if (activeClassId !== classId) setClassId(activeClassId);
        }
        if (!activeClassId) {
          setRows([]);
          setAllowedStatuses([]);
          return;
        }
        const dateStr = date;
        const [daily, effective, policy] = await Promise.all([
          classesApi.getClassDailyAttendance(activeClassId, dateStr, true),
          classesApi.getDelegationEffectivePermission(activeClassId, dateStr),
          classesApi.getDisciplinePolicy(),
        ]);
        const base = parseISO(dateStr);
        if (!Number.isNaN(base.getTime())) {
          for (let offset = -3; offset <= 3; offset++) {
            if (offset === 0) continue;
            const d = addDays(base, offset);
            void classesApi.prefetchClassDailyAttendance(activeClassId, format(d, 'yyyy-MM-dd'));
          }
        }
        setRows(daily.students || []);
        setAllowedStatuses(effective.allowedStatuses || []);
        setCapabilitySource(effective.source || 'none');
        setPolicyMinLen(Math.max(1, policy?.mandatoryExcusedReasonMinLength || 3));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [classId, date]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const textMatch =
        !q ||
        `${r.firstName || ''} ${r.lastName || ''} ${r.studentNumber || ''}`.toLowerCase().includes(q);
      const rowStatus = r.morning?.status || 'PRESENT';
      const statusMatch = statusFilter === 'ALL' ? true : rowStatus === statusFilter;
      return textMatch && statusMatch;
    });
  }, [rows, search, statusFilter]);

  const canSetPresent = allowedStatuses.includes('PRESENT');

  const statusLegend = useMemo(
    () => [
      ...(canSetPresent
        ? [{ code: '✓', label: t('attendance.status.present'), color: '#059669', bg: '#ECFDF5' }]
        : []),
      { code: 'A', label: t('attendance.status.absent'), color: '#EF4444', bg: '#FEF2F2' },
      { code: 'P', label: t('attendance.status.permission'), color: '#7C3AED', bg: '#F5F3FF' },
      { code: 'L', label: t('attendance.status.late'), color: '#F59E0B', bg: '#FFFBEB' },
      { code: 'E', label: t('attendance.status.excused'), color: '#0F766E', bg: '#ECFEFF' },
    ],
    [t, canSetPresent]
  );

  const filterChips: Array<{ key: typeof statusFilter; label: string }> = useMemo(
    () => [
      { key: 'ALL', label: t('common.all') },
      { key: 'ABSENT', label: t('attendance.status.absent') },
      { key: 'PERMISSION', label: t('attendance.status.permission') },
      { key: 'LATE', label: t('attendance.status.late') },
      { key: 'EXCUSED', label: t('attendance.status.excused') },
    ],
    [t]
  );

  const modalStatuses = useMemo(
    () => modalStatusOrder.filter((s) => allowedStatuses.includes(s)),
    [allowedStatuses]
  );

  const applyStatus = useCallback(
    async (studentId: string, status: string, remarks?: string) => {
      if (!classId || !allowedStatuses.includes(status)) return;
      setSavingId(studentId);
      const prev = rows;
      setRows((curr) =>
        curr.map((r) =>
          r.studentId === studentId
            ? { ...r, morning: { ...(r.morning || {}), status, remarks: remarks ?? r.morning?.remarks } }
            : r
        )
      );
      try {
        await classesApi.bulkMarkAttendance(classId, date, 'MORNING', [{ studentId, status, remarks }]);
      } catch {
        setRows(prev);
      } finally {
        setSavingId(null);
      }
    },
    [allowedStatuses, classId, date, rows]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ skipFullScreenSpinner: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const shiftDate = useCallback((delta: number) => {
    const d = parsedDate;
    if (!d) return;
    setDate(format(addDays(d, delta), 'yyyy-MM-dd'));
  }, [parsedDate]);

  const renderRow = ({ item }: { item: any }) => {
    const active = item.morning?.status || 'PRESENT';
    const current = statusMeta(active);
    return (
      <View style={styles.studentCard}>
        <View style={styles.rowTop}>
          <View style={styles.studentInfo}>
            <View style={[styles.avatarFallback, { backgroundColor: colors.border }]}>
              <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>
                {avatarLetter(item.firstName, item.lastName)}
              </Text>
            </View>
            <View style={styles.nameWrap}>
              <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                {[item.lastName, item.firstName].filter(Boolean).join(' ')}
              </Text>
              {item.studentNumber ? (
                <Text style={[styles.studentId, { color: colors.textSecondary }]}>
                  {t('classScreens.members.idValue', { id: item.studentNumber })}
                </Text>
              ) : null}
              <View style={[styles.currentBadge, { backgroundColor: current.bg }]}>
                <Text style={[styles.currentBadgeText, { color: current.color }]}>
                  {isKhmer ? `ស្ថានភាពបច្ចុប្បន្ន៖ ${current.code}` : `Current: ${current.code}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.actionsWrap}>
          <TouchableOpacity
            disabled={Boolean(savingId) || allowedStatuses.length === 0}
            onPress={() => {
              setIsExcusedReasonStep(false);
              setExcusedDraft('');
              setStatusPicker({
                open: true,
                studentId: item.studentId,
                currentStatus: active,
                currentRemarks: item.morning?.remarks || '',
              });
            }}
            style={[
              styles.statusBtn,
              {
                borderColor: '#D7DFEA',
                backgroundColor: '#F8FAFC',
                minWidth: 120,
              },
            ]}
          >
            <Text style={[styles.statusTxt, { color: Colors.text }]} numberOfLines={2}>
              {t('attendance.disciplineWorkbench.changeStatusButton')}
            </Text>
          </TouchableOpacity>
          {savingId === item.studentId ? <ActivityIndicator size="small" color={BRAND_TEAL} /> : null}
        </View>
      </View>
    );
  };

  const dateLabel =
    parsedDate?.toLocaleDateString(i18n.language?.startsWith('km') ? 'km-KH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) || date;

  const listHeader = (
    <>
      <View style={styles.sectionLabelRow}>
        <MaterialCommunityIcons name="account-group-outline" size={16} color={BRAND_TEAL} />
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('attendance.disciplineWorkbench.pickClass')}</Text>
      </View>
      {classes.length === 0 ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('attendance.disciplineWorkbench.noClasses')}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {classes.map((c) => {
            const selected = classId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setClassId(c.id)}
                style={[
                  styles.classChip,
                  {
                    borderColor: selected ? BRAND_TEAL : '#E2E8F0',
                    backgroundColor: selected ? '#ECFEFF' : '#FFF',
                  },
                ]}
              >
                <Text style={[styles.classChipText, { color: colors.text }]} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('attendance.disciplineWorkbench.searchPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.searchInput,
          { borderColor: '#E2E8F0', color: colors.text, backgroundColor: '#FFF' },
        ]}
      />

      <View style={styles.sectionLabelRow}>
        <Ionicons name="funnel-outline" size={15} color={BRAND_TEAL} />
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('attendance.disciplineWorkbench.filterTitle')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {filterChips.map((chip) => {
          const selected = statusFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setStatusFilter(chip.key)}
              style={[
                styles.classChip,
                {
                  borderColor: selected ? BRAND_TEAL : '#E2E8F0',
                  backgroundColor: selected ? '#ECFEFF' : '#FFF',
                },
              ]}
            >
              <Text style={[styles.classChipText, { color: colors.text }]} numberOfLines={1}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.legendBlock}>
        <Text style={[styles.legendHeading, { color: colors.textSecondary }]}>
          {t('attendance.disciplineWorkbench.legendTitle')}
        </Text>
        <View style={styles.legendRow}>
          {statusLegend.map((item) => (
            <View key={item.code} style={styles.legendItem}>
              <View style={[styles.legendCode, { backgroundColor: item.bg }]}>
                <Text style={[styles.legendCodeText, { color: item.color }]}>{item.code}</Text>
              </View>
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {allowedStatuses.length === 0 && classId ? (
        <View style={styles.warnBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#92400E" />
          <Text style={styles.warnBannerText}>{t('attendance.disciplineWorkbench.noDelegatedPermission')}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F0FDFA', '#F8FAFC', '#F1F5F9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('attendance.disciplineWorkbench.title')}
            </Text>
            <View style={styles.headerSubtitleRow}>
              <MaterialCommunityIcons name="shield-check-outline" size={12} color={BRAND_TEAL} style={{ marginRight: 4 }} />
              <Text style={styles.headerSubtitle}>{t('attendance.disciplineWorkbench.subtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => void onRefresh()} style={styles.iconGhost} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={BRAND_TEAL} />
            ) : (
              <Ionicons name="refresh" size={22} color={BRAND_TEAL} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLine} numberOfLines={2}>
            {t('attendance.disciplineWorkbench.sourceLine', { source: capabilitySource })}
          </Text>
          <Text style={styles.metaLine} numberOfLines={2}>
            {t('attendance.disciplineWorkbench.allowedLine', {
              statuses: allowedStatuses.join(', ') || '—',
            })}
          </Text>
        </View>

        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateNavBtn}>
            <Ionicons name="chevron-back" size={20} color={BRAND_TEAL} />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={18} color={BRAND_TEAL} style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{dateLabel}</Text>
            {parsedDate && isToday(parsedDate) ? (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>{t('common.today')}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={BRAND_TEAL} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND_TEAL} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.studentId}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_TEAL} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('attendance.disciplineWorkbench.emptyListTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('attendance.disciplineWorkbench.emptyFiltered')}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={statusPicker.open}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closeAttendanceModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAttendanceModal}>
          <Pressable style={[styles.modalCard, { backgroundColor: '#FFF' }]} onPress={() => {}}>
            {!isExcusedReasonStep ? (
              <>
                <Text style={styles.modalTitle}>{t('attendance.updateStatus')}</Text>
                <Text style={styles.modalSubtitle}>{t('attendance.selectStatusFor', { session: t('attendance.morning') })}</Text>
                {modalStatuses.map((s) => {
                  const { code, label } = modalStatusCodeAndLabel(s, t);
                  const activeOption =
                    (s === 'PRESENT' && (!statusPicker.currentStatus || statusPicker.currentStatus === 'PRESENT')) ||
                    statusPicker.currentStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.modalOption, activeOption && styles.modalOptionActive]}
                      onPress={() => {
                        const studentId = statusPicker.studentId;
                        if (!studentId) return;
                        if (s === 'EXCUSED') {
                          setExcusedDraft(statusPicker.currentRemarks || '');
                          setIsExcusedReasonStep(true);
                          return;
                        }
                        closeAttendanceModal();
                        void applyStatus(studentId, s, s === 'PRESENT' ? '' : undefined);
                      }}
                    >
                      <Text style={[styles.modalOptionText, activeOption && styles.modalOptionTextActive]}>{`${code} · ${label}`}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.cancelGhost} onPress={closeAttendanceModal}>
                  <Text style={styles.cancelGhostText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{t('attendance.status.excused')}</Text>
                <TextInput
                  value={excusedDraft}
                  onChangeText={setExcusedDraft}
                  placeholder={t('attendance.requestPermission.reasonPlaceholder')}
                  multiline
                  autoFocus={isExcusedReasonStep}
                  style={[styles.reasonInput, styles.reasonInputAfterTitle]}
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    const studentId = statusPicker.studentId;
                    if (!studentId || excusedDraft.trim().length < policyMinLen) return;
                    void applyStatus(studentId, 'EXCUSED', excusedDraft.trim());
                    closeAttendanceModal();
                  }}
                >
                  <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelGhost}
                  onPress={() => {
                    setIsExcusedReasonStep(false);
                    setExcusedDraft('');
                  }}
                >
                  <Text style={styles.cancelGhostText}>{t('common.back')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadows.sm,
    zIndex: 10,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  iconGhost: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitleWrap: { alignItems: 'center', flex: 1, marginHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerSubtitle: { fontSize: 13, fontWeight: '700', color: BRAND_TEAL },
  metaBlock: { paddingHorizontal: 20, marginBottom: 4 },
  metaLine: { fontSize: 11, color: '#64748B', fontWeight: '600', lineHeight: 16 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  dateText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  todayPill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: BRAND_TEAL,
    borderRadius: 6,
  },
  todayPillText: { fontSize: 9, fontWeight: '800', color: '#FFF', textTransform: 'uppercase' },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800' },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 280,
    flexShrink: 0,
  },
  classChipText: { fontSize: 13, fontWeight: '700' },
  searchInput: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  legendBlock: { marginTop: 16, paddingHorizontal: 20 },
  legendHeading: { fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  legendCode: {
    minWidth: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  legendCodeText: { fontSize: 13, fontWeight: '900' },
  legendLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E', lineHeight: 17 },
  hint: { paddingHorizontal: 20, marginTop: 4, fontSize: 13 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  studentCard: {
    backgroundColor: '#FFF',
    padding: 13,
    borderRadius: 16,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarFallback: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  nameWrap: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentId: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  currentBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionsWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBtn: {
    minWidth: 44,
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTxt: { fontWeight: '900', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8, fontWeight: '600' },
  modalOption: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  modalOptionActive: {
    borderColor: BRAND_TEAL,
    backgroundColor: '#ECFEFF',
  },
  modalOptionText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  modalOptionTextActive: { color: '#0E7490' },
  reasonInput: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0F172A',
  },
  reasonInputAfterTitle: { marginTop: 12 },
  saveBtn: {
    marginTop: 12,
    backgroundColor: BRAND_TEAL,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelGhost: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelGhostText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
});
