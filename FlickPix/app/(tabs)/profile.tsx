import { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Image,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getUserProfile,
  getAvailableUsers,
  getActiveUserId,
  clearCache,
  getWatchlist,
  removeFromWatchHistory,
  removeFromWatchlist,
  type UserProfile,
  type WatchedMovie,
} from '@/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MINI_POSTER_SIZE = 60;

const COLORS = {
  dark: {
    bg: '#0A0A0C',
    surface: '#141417',
    card: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    text: '#FAFAFA',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    textDim: 'rgba(255, 255, 255, 0.3)',
    accent: '#8B5CF6',
    accentSoft: 'rgba(139, 92, 246, 0.15)',
    green: '#10B981',
    orange: '#F59E0B',
    red: '#EF4444',
    posterBg: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    bg: '#F8F8FA',
    surface: '#FFFFFF',
    card: 'rgba(0, 0, 0, 0.02)',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    text: '#1A1A1A',
    textMuted: 'rgba(0, 0, 0, 0.5)',
    textDim: 'rgba(0, 0, 0, 0.3)',
    accent: '#7C3AED',
    accentSoft: 'rgba(124, 58, 237, 0.1)',
    green: '#059669',
    orange: '#D97706',
    red: '#DC2626',
    posterBg: 'rgba(0, 0, 0, 0.06)',
  },
};

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

const GENRE_COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

function deriveTopGenres(watchHistory: WatchedMovie[]) {
  const counts: Record<number, number> = {};
  for (const movie of watchHistory) {
    for (const gid of movie.genres) {
      counts[gid] = (counts[gid] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, count], i) => ({
      name: GENRE_NAMES[Number(id)] || `#${id}`,
      count,
      color: GENRE_COLORS[i % GENRE_COLORS.length],
    }));
}

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watchlist, setWatchlist] = useState<Awaited<ReturnType<typeof getWatchlist>>>([]);
  const [listModal, setListModal] = useState<'watched' | 'watchlist' | null>(null);
  const [hoveredStat, setHoveredStat] = useState<'watched' | 'watchlist' | null>(null);
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  useFocusEffect(
    useCallback(() => {
      clearCache();
      getUserProfile().then(setProfile);
      getWatchlist().then(setWatchlist);
    }, [])
  );

  const watchHistory = profile?.watchHistory ?? [];
  const watchedCount = watchHistory.length;
  const avgRating = watchedCount > 0
    ? (watchHistory.reduce((sum, m) => sum + m.rating, 0) / watchedCount).toFixed(1)
    : '—';
  const topGenres = deriveTopGenres(watchHistory);
  const maxGenreCount = topGenres.length > 0 ? topGenres[0].count : 1;
  const recentRatings = [...watchHistory].reverse().slice(0, 5);

  const activeUserName = getAvailableUsers().find(
    (u) => u.id === getActiveUserId()
  )?.name ?? 'User';

  const refreshLists = useCallback(() => {
    getUserProfile().then(setProfile);
    getWatchlist().then(setWatchlist);
  }, []);

  const handleRemoveWatched = useCallback(async (movieId: number) => {
    await removeFromWatchHistory(movieId);
    refreshLists();
  }, [refreshLists]);

  const handleRemoveWatchlist = useCallback(async (movieId: number) => {
    await removeFromWatchlist(movieId);
    refreshLists();
  }, [refreshLists]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[theme.accent, 'transparent']}
        style={styles.bgGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={styles.avatarEmoji}>🎬</ThemedText>
          </View>
          <ThemedText style={[styles.username, { color: theme.text }]}>
            {activeUserName}
          </ThemedText>
          <ThemedText style={[styles.memberSince, { color: theme.textMuted }]}>
            Member since January 2024
          </ThemedText>
          
          <Pressable style={[styles.editProfileButton, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.editProfileText, { color: theme.text }]}>
              Edit Profile
            </ThemedText>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            onMouseEnter={() => setHoveredStat('watched')}
            onMouseLeave={() => setHoveredStat(null)}
            style={[styles.statBoxWrapper, Platform.OS === 'web' && { cursor: 'pointer' }]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.statBox,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{
                    scale: pressed ? 1.1 : hoveredStat === 'watched' ? 1.04 : 1.0,
                  }],
                },
              ]}
              onPress={() => setListModal('watched')}
            >
              <ThemedText style={[styles.statValue, { color: theme.accent }]}>{watchedCount}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Watched</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statValue, { color: theme.green }]}>{avgRating}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Avg Rating</ThemedText>
          </View>
          <View
            onMouseEnter={() => setHoveredStat('watchlist')}
            onMouseLeave={() => setHoveredStat(null)}
            style={[styles.statBoxWrapper, Platform.OS === 'web' && { cursor: 'pointer' }]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.statBox,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{
                    scale: pressed ? 1.1 : hoveredStat === 'watchlist' ? 1.04 : 1.0,
                  }],
                },
              ]}
              onPress={() => setListModal('watchlist')}
            >
              <ThemedText style={[styles.statValue, { color: theme.orange }]}>{watchlist.length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Watchlist</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statValue, { color: theme.text }]}>94h</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Watch Time</ThemedText>
          </View>
        </View>

        {/* Favorite Genres */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Top Genres
          </ThemedText>
          <View style={[styles.genresCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {topGenres.map((genre) => (
              <View key={genre.name} style={styles.genreRow}>
                <View style={styles.genreInfo}>
                  <View style={[styles.genreDot, { backgroundColor: genre.color }]} />
                  <ThemedText style={[styles.genreName, { color: theme.text }]}>
                    {genre.name}
                  </ThemedText>
                </View>
                <View style={styles.genreBarContainer}>
                  <View 
                    style={[
                      styles.genreBar, 
                      { 
                        backgroundColor: genre.color,
                        width: `${(genre.count / maxGenreCount) * 100}%`,
                      }
                    ]} 
                  />
                </View>
                <ThemedText style={[styles.genreCount, { color: theme.textMuted }]}>
                  {genre.count}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Ratings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Recent Ratings
            </ThemedText>
            <Pressable>
              <ThemedText style={[styles.seeAllText, { color: theme.accent }]}>
                See all
              </ThemedText>
            </Pressable>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ratingsScroll}
          >
            {recentRatings.map((movie) => (
              <Pressable 
                key={movie.movieId}
                style={({ pressed }) => [
                  styles.ratingCard,
                  { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.cardBorder,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  }
                ]}
              >
                <View style={[styles.miniPoster, { backgroundColor: theme.posterBg }]}>
                  <ThemedText style={styles.miniPosterEmoji}>🎬</ThemedText>
                </View>
                <ThemedText 
                  style={[styles.ratingCardTitle, { color: theme.text }]} 
                  numberOfLines={1}
                >
                  {movie.title}
                </ThemedText>
                <View style={[styles.ratingBadge, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText style={[styles.ratingBadgeText, { color: theme.accent }]}>
                    ★ {movie.rating}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Watchlist Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Watchlist
            </ThemedText>
            <Pressable>
              <ThemedText style={[styles.seeAllText, { color: theme.accent }]}>
                See all ({watchlist.length})
              </ThemedText>
            </Pressable>
          </View>
          
          <View style={[styles.watchlistCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {watchlist.length === 0 ? (
              <ThemedText style={[styles.watchlistEmpty, { color: theme.textMuted }]}>
                No movies in your watchlist yet. Add some from Home or Suggestions!
              </ThemedText>
            ) : (
              watchlist.map((movie, index) => (
                <View key={movie.movieId}>
                  <View style={styles.watchlistItem}>
                    <View style={[styles.watchlistPoster, { backgroundColor: theme.posterBg }]}>
                      <ThemedText style={styles.watchlistPosterEmoji}>🎬</ThemedText>
                    </View>
                    <View style={styles.watchlistInfo}>
                      <ThemedText style={[styles.watchlistTitle, { color: theme.text }]}>
                        {movie.title}
                      </ThemedText>
                      <ThemedText style={[styles.watchlistYear, { color: theme.textMuted }]}>
                        {movie.addedAt ? new Date(movie.addedAt).getFullYear().toString() : '—'}
                      </ThemedText>
                    </View>
                    <Pressable style={[styles.watchlistButton, { backgroundColor: theme.accent }]}>
                      <ThemedText style={styles.watchlistButtonText}>▶</ThemedText>
                    </Pressable>
                  </View>
                  {index < watchlist.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Settings
          </ThemedText>
          
          <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Pressable style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <ThemedText style={styles.settingsEmoji}>🔔</ThemedText>
                <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>
                  Notifications
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.card, true: theme.accentSoft }}
                thumbColor={notificationsEnabled ? theme.accent : theme.textMuted}
              />
            </Pressable>
            
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
            
            <Pressable style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <ThemedText style={styles.settingsEmoji}>🎨</ThemedText>
                <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>
                  Appearance
                </ThemedText>
              </View>
              <ThemedText style={[styles.settingsValue, { color: theme.textMuted }]}>
                Auto
              </ThemedText>
            </Pressable>
            
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
            
            <Pressable style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <ThemedText style={styles.settingsEmoji}>🔗</ThemedText>
                <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>
                  Connected Services
                </ThemedText>
              </View>
              <ThemedText style={[styles.settingsValue, { color: theme.textMuted }]}>
                TMDB
              </ThemedText>
            </Pressable>
            
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
            
            <Pressable style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <ThemedText style={styles.settingsEmoji}>📤</ThemedText>
                <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>
                  Export Data
                </ThemedText>
              </View>
              <ThemedText style={[styles.settingsChevron, { color: theme.textDim }]}>
                ›
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable 
          style={({ pressed }) => [
            styles.signOutButton,
            { 
              backgroundColor: theme.surface, 
              borderColor: theme.red,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <ThemedText style={[styles.signOutText, { color: theme.red }]}>
            Sign Out
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.version, { color: theme.textDim }]}>
          FlickPix v1.0.0
        </ThemedText>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* List modal (Watched / Watchlist) */}
      <Modal
        visible={listModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setListModal(null)}
      >
        <Pressable style={styles.listModalOverlay} onPress={() => setListModal(null)}>
          <Pressable
            style={[styles.listModalContent, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}
            onPress={() => {}}
          >
            <View style={[styles.listModalHeader, { borderBottomColor: theme.cardBorder }]}>
              <ThemedText style={[styles.listModalTitle, { color: theme.text }]}>
                {listModal === 'watched' ? 'Watched' : 'Watchlist'}
              </ThemedText>
              <Pressable
                style={[styles.listModalClose, { backgroundColor: theme.card }]}
                onPress={() => setListModal(null)}
              >
                <ThemedText style={[styles.listModalCloseText, { color: theme.text }]}>✕</ThemedText>
              </Pressable>
            </View>
            <ScrollView
              style={styles.listModalScroll}
              contentContainerStyle={styles.listModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {listModal === 'watched' && (
                watchHistory.length === 0 ? (
                  <ThemedText style={[styles.listModalEmpty, { color: theme.textMuted }]}>
                    No watched movies yet.
                  </ThemedText>
                ) : (
                  watchHistory.map((movie) => (
                    <View
                      key={movie.movieId}
                      style={[styles.listModalRow, { borderColor: theme.cardBorder }]}
                    >
                      <View style={styles.listModalRowInfo}>
                        <ThemedText style={[styles.listModalRowTitle, { color: theme.text }]} numberOfLines={1}>
                          {movie.title}
                        </ThemedText>
                        <ThemedText style={[styles.listModalRowSub, { color: theme.textMuted }]}>
                          ★ {movie.rating} · {movie.watchedAt}
                        </ThemedText>
                      </View>
                      <Pressable
                        style={[styles.listModalRemoveBtn, { backgroundColor: theme.red }]}
                        onPress={() => handleRemoveWatched(movie.movieId)}
                      >
                        <ThemedText style={styles.listModalRemoveText}>Remove</ThemedText>
                      </Pressable>
                    </View>
                  ))
                )
              )}
              {listModal === 'watchlist' && (
                watchlist.length === 0 ? (
                  <ThemedText style={[styles.listModalEmpty, { color: theme.textMuted }]}>
                    No movies in watchlist.
                  </ThemedText>
                ) : (
                  watchlist.map((movie) => (
                    <View
                      key={movie.movieId}
                      style={[styles.listModalRow, { borderColor: theme.cardBorder }]}
                    >
                      <View style={styles.listModalRowInfo}>
                        <ThemedText style={[styles.listModalRowTitle, { color: theme.text }]} numberOfLines={1}>
                          {movie.title}
                        </ThemedText>
                        <ThemedText style={[styles.listModalRowSub, { color: theme.textMuted }]}>
                          {movie.addedAt ? new Date(movie.addedAt).toLocaleDateString() : ''}
                        </ThemedText>
                      </View>
                      <Pressable
                        style={[styles.listModalRemoveBtn, { backgroundColor: theme.red }]}
                        onPress={() => handleRemoveWatchlist(movie.movieId)}
                      >
                        <ThemedText style={styles.listModalRemoveText}>Remove</ThemedText>
                      </Pressable>
                    </View>
                  ))
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    opacity: 0.15,
  },
  scrollContent: {
    paddingTop: 60,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 44,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statBoxWrapper: {
    width: (SCREEN_WIDTH - 50) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBox: {
    width: (SCREEN_WIDTH - 50) / 2,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  genresCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: 8,
  },
  genreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  genreName: {
    fontSize: 14,
    fontWeight: '500',
  },
  genreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  genreBar: {
    height: '100%',
    borderRadius: 4,
  },
  genreCount: {
    fontSize: 13,
    width: 24,
    textAlign: 'right',
  },
  ratingsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  ratingCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  miniPoster: {
    width: MINI_POSTER_SIZE,
    height: MINI_POSTER_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniPosterEmoji: {
    fontSize: 24,
  },
  ratingCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  watchlistCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  watchlistEmpty: {
    padding: 20,
    fontSize: 14,
    textAlign: 'center',
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  watchlistPoster: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchlistPosterEmoji: {
    fontSize: 22,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  watchlistYear: {
    fontSize: 13,
    marginTop: 2,
  },
  watchlistButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchlistButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  settingsCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsEmoji: {
    fontSize: 20,
  },
  settingsLabel: {
    fontSize: 15,
  },
  settingsValue: {
    fontSize: 14,
  },
  settingsChevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  signOutButton: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
  listModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listModalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  listModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  listModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listModalCloseText: {
    fontSize: 18,
    fontWeight: '600',
  },
  listModalScroll: {
    maxHeight: 400,
  },
  listModalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  listModalEmpty: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 15,
  },
  listModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 12,
  },
  listModalRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  listModalRowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listModalRowSub: {
    fontSize: 13,
    marginTop: 2,
  },
  listModalRemoveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  listModalRemoveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});