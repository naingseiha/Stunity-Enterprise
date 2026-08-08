import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remove user-scoped data that must not survive logout or an account switch.
 * Preferences and the anonymous device identifier are intentionally retained.
 */
export async function clearUserScopedSessionCache(userId?: string | null): Promise<void> {
  const scopedKeys = userId
    ? [
        `feed:cached_posts:${userId}`,
        `feed:cached_at:${userId}`,
        `classes:academic_years:${userId}`,
        `classes:academic_years_at:${userId}`,
        `classes:my:${userId}`,
        `classes:my_at:${userId}`,
        `class-detail:bundle:${userId}`,
        `class-detail:at:${userId}`,
        `class-detail:key:${userId}`,
        `reels:cached_feed:${userId}`,
        `reels:cached_at:${userId}`,
        `clubs:landing_data:${userId}`,
        `clubs:landing_at:${userId}`,
        `learn:hub_data:${userId}`,
        `learn:hub_at:${userId}`,
        `learn:home_data:${userId}`,
        `learn:home_at:${userId}`,
        `profile:data:${userId}`,
        `profile:at:${userId}`,
      ]
    : [];

  await AsyncStorage.multiRemove([
    ...scopedKeys,
    // Remove pre-user-scoping cache keys created by older app versions.
    'feed:cached_posts',
    'feed:cached_at',
  ]);
}
