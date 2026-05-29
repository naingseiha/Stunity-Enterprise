import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";

import { Avatar } from "@/components/common";
import { useThemeContext } from "@/contexts";
import { fetchProfileVisitors, type ProfileVisitor } from "@/api/profileApi";
import type { ProfileStackScreenProps } from "@/navigation/types";

type NavigationProp = ProfileStackScreenProps<"ProfileVisitors">["navigation"];
type RouteProp = ProfileStackScreenProps<"ProfileVisitors">["route"];

const PAGE_SIZE = 25;

function visitorName(visitor: ProfileVisitor) {
  return `${visitor.firstName || ""} ${visitor.lastName || ""}`.trim();
}

function relativeViewedAt(value: string) {
  const viewedAt = new Date(value).getTime();
  const diffMs = Date.now() - viewedAt;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ProfileVisitorsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, isDark } = useThemeContext();
  const initialVisitors = route.params?.initialVisitors || [];
  const [visitors, setVisitors] = useState<ProfileVisitor[]>(initialVisitors);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialVisitors.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadVisitors = useCallback(
    async (mode: "initial" | "refresh" | "more" = "initial") => {
      if (mode === "more" && (!nextCursor || loadingMore)) return;

      if (mode === "refresh") setRefreshing(true);
      else if (mode === "more") setLoadingMore(true);
      else setLoading(true);

      try {
        const page = await fetchProfileVisitors("me", {
          cursor: mode === "more" ? nextCursor : null,
          limit: PAGE_SIZE,
          excludeIds:
            mode === "more" ? visitors.map((visitor) => visitor.id) : [],
        });

        setNextCursor(page.nextCursor);
        setVisitors((current) => {
          if (mode !== "more") return page.visitors;

          const byId = new Map(current.map((visitor) => [visitor.id, visitor]));
          page.visitors.forEach((visitor) => byId.set(visitor.id, visitor));
          return Array.from(byId.values());
        });
      } catch (error) {
        if (__DEV__) { console.error("Failed to load profile visitors:", error); }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [loadingMore, nextCursor, visitors],
  );

  useEffect(() => {
    void loadVisitors("initial");
  }, []);

  const headerSubtitle = useMemo(() => {
    if (visitors.length === 0)
      return "People who viewed your profile appear here.";
    return `${visitors.length} recent visitor${visitors.length === 1 ? "" : "s"}`;
  }, [visitors.length]);

  const renderVisitor = useCallback(
    ({ item }: { item: ProfileVisitor }) => (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        activeOpacity={0.84}
        onPress={() => navigation.push("Profile", { userId: item.id })}
      >
        <Avatar
          uri={item.profilePictureUrl}
          name={visitorName(item)}
          size="lg"
          showBorder={false}
          gradientBorder="none"
        />
        <View style={styles.rowInfo}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {visitorName(item)}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.headline || item.professionalTitle || item.role}
          </Text>
          <View style={styles.signalRow}>
            <Ionicons name="eye-outline" size={13} color="#0891B2" />
            <Text style={styles.signalText}>
              {item.views30d} view{item.views30d === 1 ? "" : "s"} in 30 days
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {relativeViewedAt(item.viewedAt)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>
    ),
    [colors, navigation],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={isDark ? ["#000000", "#061512"] : ["#F8FEFF", "#EEF7FF"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.82}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>
            Profile views
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {headerSubtitle}
          </Text>
        </View>
      </View>

      {loading && visitors.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : (
        <FlashList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderVisitor}
          estimatedItemSize={72}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadVisitors("refresh")}
            />
          }
          onEndReachedThreshold={0.6}
          onEndReached={() => void loadVisitors("more")}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#0891B2" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="eye-outline"
                size={38}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No profile views yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Share learning posts and useful materials to bring learners back
                to your profile.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "900" },
  meta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },
  signalText: { color: "#0891B2", fontSize: 11, fontWeight: "800" },
  rowRight: { alignItems: "flex-end", gap: 8 },
  time: { fontSize: 11, fontWeight: "800" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  footerLoader: { paddingVertical: 18 },
  emptyCard: {
    marginTop: 36,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "900", marginTop: 12 },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "600",
  },
});
