import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { ratingColor, ratingBg } from '@/utils/ratingColors';
import {
  getGenres,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  posterUrl as tmdbPosterUrl,
  backdropUrl as tmdbBackdropUrl,
  type MovieDetails,
  type Credits,
} from '@/services/tmdb';
import {
  getUserProfile,
  getUserName,
  clearCache,
  getWatchlist,
  removeFromWatchHistory,
  removeFromWatchlist,
  addToWatchHistory,
  addToWatchlist,
  isInWatchlist,
  getWatchedMovieIds,
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


const GENRE_COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

function deriveTopGenres(watchHistory: WatchedMovie[], genreMap: Record<number, string>) {
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
      name: genreMap[Number(id)] || `Genre ${id}`,
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
  const [displayName, setDisplayName] = useState('You');
  const [genreMap, setGenreMap] = useState<Record<number, string>>({});
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  useFocusEffect(
    useCallback(() => {
      clearCache();
      getUserProfile().then(setProfile);
      getWatchlist().then(setWatchlist);
      getUserName().then(setDisplayName);
      getGenres().then((genres) => {
        const map: Record<number, string> = {};
        for (const g of genres) map[g.id] = g.name;
        setGenreMap(map);
      });
    }, [])
  );

  const watchHistory = profile?.watchHistory ?? [];
  const watchedCount = watchHistory.length;
  const avgRating = watchedCount > 0
    ? (watchHistory.reduce((sum, m) => sum + m.rating, 0) / watchedCount).toFixed(1)
    : '—';
  const topGenres = deriveTopGenres(watchHistory, genreMap);
  const maxGenreCount = topGenres.length > 0 ? topGenres[0].count : 1;
  const recentRatings = [...watchHistory].reverse().slice(0, 5);

  const activeUserName = displayName;

  // ── Movie detail modal state ────────────────────────────────────────────────
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetails | null>(null);
  const [movieCredits, setMovieCredits] = useState<Credits | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [movieDetailLoading, setMovieDetailLoading] = useState(false);
  const [movieDetailError, setMovieDetailError] = useState<string | null>(null);
  const [movieInWatchlist, setMovieInWatchlist] = useState(false);
  const [movieWatched, setMovieWatched] = useState(false);
  const [showRatingPicker, setShowRatingPicker] = useState(false);

  useEffect(() => {
    if (!selectedMovieId) {
      setMovieDetail(null);
      setMovieCredits(null);
      setTrailerKey(null);
      setMovieDetailError(null);
      setShowRatingPicker(false);
      return;
    }
    setMovieDetailLoading(true);
    setMovieDetailError(null);
    Promise.all([
      getMovieDetails(selectedMovieId),
      getMovieCredits(selectedMovieId),
      getMovieVideos(selectedMovieId),
      isInWatchlist(selectedMovieId),
      getWatchedMovieIds(),
    ]).then(([details, credits, videos, inList, watchedIds]) => {
      setMovieDetail(details);
      setMovieCredits(credits);
      const trailer = videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
      setTrailerKey(trailer?.key ?? null);
      setMovieInWatchlist(inList);
      setMovieWatched(watchedIds.includes(selectedMovieId));
    }).catch((e) => {
      setMovieDetailError(e instanceof Error ? e.message : 'Failed to load movie');
    }).finally(() => {
      setMovieDetailLoading(false);
    });
  }, [selectedMovieId]);

  const openTrailer = useCallback(() => {
    if (trailerKey) Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
  }, [trailerKey]);

  const handleDetailWatchlistPress = useCallback(async () => {
    if (!movieDetail) return;
    if (movieInWatchlist) {
      setMovieInWatchlist(false);
      await removeFromWatchlist(movieDetail.id);
    } else {
      setMovieInWatchlist(true);
      await addToWatchlist({ movieId: movieDetail.id, title: movieDetail.title, posterPath: movieDetail.poster_path });
    }
    refreshLists();
  }, [movieDetail, movieInWatchlist]);

  const handleDetailAddToWatched = useCallback(async (rating: number) => {
    if (!movieDetail) return;
    setShowRatingPicker(false);
    setMovieWatched(true);
    await addToWatchHistory({
      movieId: movieDetail.id,
      title: movieDetail.title,
      rating,
      watchedAt: new Date().toISOString().split('T')[0],
      genres: movieDetail.genres.map((g) => g.id),
      posterPath: movieDetail.poster_path,
    });
    refreshLists();
  }, [movieDetail]);

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
            <ThemedText style={[styles.statValue, styles.statValueGenre, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {topGenres[0]?.name ?? '—'}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Top Genre</ThemedText>
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
            <Pressable onPress={() => setListModal('watched')}>
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
            {recentRatings.map((movie) => {
              const posterUri = movie.posterPath
                ? `https://image.tmdb.org/t/p/w185${movie.posterPath}`
                : null;
              return (
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
                  onPress={() => setSelectedMovieId(movie.movieId)}
                >
                  <View style={[styles.miniPoster, { backgroundColor: theme.posterBg }]}>
                    {posterUri ? (
                      <Image source={{ uri: posterUri }} style={styles.miniPosterImage} />
                    ) : (
                      <ThemedText style={styles.miniPosterEmoji}>🎬</ThemedText>
                    )}
                  </View>
                  <ThemedText
                    style={[styles.ratingCardTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {movie.title}
                  </ThemedText>
                  <View style={[styles.ratingBadge, { backgroundColor: ratingBg(movie.rating) }]}>
                    <ThemedText style={[styles.ratingBadgeText, { color: ratingColor(movie.rating) }]}>
                      ★ {movie.rating}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Watchlist Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Watchlist
            </ThemedText>
            <Pressable onPress={() => setListModal('watchlist')}>
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
              watchlist.map((movie, index) => {
                const posterUri = movie.posterPath
                  ? `https://image.tmdb.org/t/p/w185${movie.posterPath}`
                  : null;
                return (
                <View key={movie.movieId}>
                  <Pressable style={styles.watchlistItem} onPress={() => setSelectedMovieId(movie.movieId)}>
                    <View style={[styles.watchlistPoster, { backgroundColor: theme.posterBg }]}>
                      {posterUri ? (
                        <Image source={{ uri: posterUri }} style={styles.watchlistPosterImage} />
                      ) : (
                        <ThemedText style={styles.watchlistPosterEmoji}>🎬</ThemedText>
                      )}
                    </View>
                    <View style={styles.watchlistInfo}>
                      <ThemedText style={[styles.watchlistTitle, { color: theme.text }]}>
                        {movie.title}
                      </ThemedText>
                      <ThemedText style={[styles.watchlistYear, { color: theme.textMuted }]}>
                        {movie.addedAt ? new Date(movie.addedAt).getFullYear().toString() : '—'}
                      </ThemedText>
                    </View>
                    <View style={[styles.watchlistButton, { backgroundColor: theme.accent }]}>
                      <ThemedText style={styles.watchlistButtonText}>▶</ThemedText>
                    </View>
                  </Pressable>
                  {index < watchlist.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                  )}
                </View>
                );
              })
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

      {/* Movie Detail Modal */}
      <Modal
        visible={selectedMovieId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMovieId(null)}
      >
        <View style={styles.detailModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedMovieId(null)} />
          <View style={[styles.detailModalContent, { backgroundColor: theme.bg }]}>
            <Pressable
              style={[styles.detailModalClose, { backgroundColor: theme.card }]}
              onPress={() => setSelectedMovieId(null)}
            >
              <ThemedText style={[styles.detailModalCloseText, { color: theme.text }]}>✕</ThemedText>
            </Pressable>
            {movieDetailLoading ? (
              <View style={styles.detailModalLoading}>
                <ActivityIndicator size="large" color={theme.accent} />
                <ThemedText style={[styles.detailModalLoadingText, { color: theme.textMuted }]}>Loading...</ThemedText>
              </View>
            ) : movieDetailError ? (
              <View style={styles.detailModalLoading}>
                <ThemedText style={[styles.detailModalLoadingText, { color: theme.textMuted }]}>{movieDetailError}</ThemedText>
                <Pressable style={[styles.detailModalButton, { backgroundColor: theme.accent }]} onPress={() => setSelectedMovieId(null)}>
                  <ThemedText style={styles.detailModalButtonText}>Close</ThemedText>
                </Pressable>
              </View>
            ) : movieDetail ? (
              <ScrollView style={styles.detailModalScroll} contentContainerStyle={styles.detailModalScrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailModalBackdrop}>
                  {tmdbBackdropUrl(movieDetail.backdrop_path, 'w780') ? (
                    <Image source={{ uri: tmdbBackdropUrl(movieDetail.backdrop_path, 'w780')! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : tmdbPosterUrl(movieDetail.poster_path, 'w500') ? (
                    <Image source={{ uri: tmdbPosterUrl(movieDetail.poster_path, 'w500')! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : null}
                  <LinearGradient colors={['transparent', theme.bg]} style={styles.detailModalBackdropGradient} />
                </View>
                <View style={styles.detailModalBody}>
                  <ThemedText style={[styles.detailModalTitle, { color: theme.text }]}>{movieDetail.title}</ThemedText>
                  <View style={styles.detailModalMeta}>
                    <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>{movieDetail.release_date?.slice(0, 4) || '—'}</ThemedText>
                    <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                    <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>★ {movieDetail.vote_average.toFixed(1)}</ThemedText>
                    {movieDetail.runtime ? (
                      <>
                        <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                        <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>{movieDetail.runtime} min</ThemedText>
                      </>
                    ) : null}
                  </View>
                  {movieDetail.genres.length > 0 && (
                    <View style={styles.detailModalGenres}>
                      {movieDetail.genres.slice(0, 5).map((g) => (
                        <View key={g.id} style={[styles.detailGenreChip, { backgroundColor: theme.accentSoft, borderColor: theme.cardBorder }]}>
                          <ThemedText style={[styles.detailGenreChipText, { color: theme.accent }]}>{g.name}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                  {movieDetail.tagline ? (
                    <ThemedText style={[styles.detailTagline, { color: theme.textMuted }]}>{movieDetail.tagline}</ThemedText>
                  ) : null}
                  {movieDetail.overview ? (
                    <>
                      <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>SYNOPSIS</ThemedText>
                      <ThemedText style={[styles.detailOverview, { color: theme.text }]}>{movieDetail.overview}</ThemedText>
                    </>
                  ) : null}
                  {trailerKey ? (
                    <Pressable style={[styles.detailModalButton, styles.detailTrailerButton, { backgroundColor: theme.accent }]} onPress={openTrailer}>
                      <ThemedText style={styles.detailModalButtonText}>▶ Watch Trailer</ThemedText>
                    </Pressable>
                  ) : null}
                  {movieCredits && movieCredits.cast.length > 0 && (
                    <>
                      <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>CAST</ThemedText>
                      <ThemedText style={[styles.detailCastText, { color: theme.text }]}>
                        {movieCredits.cast.slice(0, 10).map((c) => c.name).join(' · ')}
                      </ThemedText>
                    </>
                  )}
                  <View style={styles.detailModalActions}>
                    {!movieWatched && !showRatingPicker && (
                      <Pressable style={[styles.detailModalActionButton, { backgroundColor: theme.accent }]} onPress={() => setShowRatingPicker(true)}>
                        <ThemedText style={styles.detailModalButtonText}>Add to Watched</ThemedText>
                      </Pressable>
                    )}
                    {!movieWatched && showRatingPicker && (
                      <View style={styles.detailRatingPicker}>
                        <ThemedText style={[styles.detailRatingLabel, { color: theme.textMuted }]}>Rate it:</ThemedText>
                        <View style={styles.detailRatingRow}>
                          {[1,2,3,4,5,6,7,8,9,10].map((r) => (
                            <Pressable key={r} style={[styles.detailRatingChip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]} onPress={() => handleDetailAddToWatched(r)}>
                              <ThemedText style={[styles.detailRatingChipText, { color: theme.accent }]}>{r}</ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                    {movieWatched && (
                      <View style={[styles.detailModalActionButton, { backgroundColor: theme.accentSoft }]}>
                        <ThemedText style={[styles.detailModalButtonText, { color: theme.accent }]}>✓ Watched</ThemedText>
                      </View>
                    )}
                    <Pressable
                      style={[styles.detailModalActionButton, { backgroundColor: movieInWatchlist ? theme.accentSoft : theme.card, borderColor: theme.cardBorder }]}
                      onPress={handleDetailWatchlistPress}
                    >
                      <ThemedText style={[styles.detailModalButtonText, { color: movieInWatchlist ? theme.accent : theme.text }]}>
                        {movieInWatchlist ? 'In Watchlist' : '+ Watchlist'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

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
                  watchHistory.map((movie) => {
                    const uri = movie.posterPath
                      ? `https://image.tmdb.org/t/p/w185${movie.posterPath}`
                      : null;
                    return (
                    <Pressable
                      key={movie.movieId}
                      style={[styles.listModalRow, { borderColor: theme.cardBorder }]}
                      onPress={() => { setListModal(null); setSelectedMovieId(movie.movieId); }}
                    >
                      <View style={[styles.listModalPoster, { backgroundColor: theme.posterBg }]}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.listModalPosterImage} />
                        ) : (
                          <ThemedText style={{ fontSize: 18 }}>🎬</ThemedText>
                        )}
                      </View>
                      <View style={styles.listModalRowInfo}>
                        <ThemedText style={[styles.listModalRowTitle, { color: theme.text }]} numberOfLines={1}>
                          {movie.title}
                        </ThemedText>
                        <ThemedText style={[styles.listModalRowSub, { color: ratingColor(movie.rating) }]}>
                          ★ {movie.rating} · {movie.watchedAt}
                        </ThemedText>
                      </View>
                      <Pressable
                        style={[styles.listModalRemoveBtn, { backgroundColor: theme.red }]}
                        onPress={(e) => { e.stopPropagation?.(); handleRemoveWatched(movie.movieId); }}
                      >
                        <ThemedText style={styles.listModalRemoveText}>Remove</ThemedText>
                      </Pressable>
                    </Pressable>
                    );
                  })
                )
              )}
              {listModal === 'watchlist' && (
                watchlist.length === 0 ? (
                  <ThemedText style={[styles.listModalEmpty, { color: theme.textMuted }]}>
                    No movies in watchlist.
                  </ThemedText>
                ) : (
                  watchlist.map((movie) => {
                    const uri = movie.posterPath
                      ? `https://image.tmdb.org/t/p/w185${movie.posterPath}`
                      : null;
                    return (
                    <Pressable
                      key={movie.movieId}
                      style={[styles.listModalRow, { borderColor: theme.cardBorder }]}
                      onPress={() => { setListModal(null); setSelectedMovieId(movie.movieId); }}
                    >
                      <View style={[styles.listModalPoster, { backgroundColor: theme.posterBg }]}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.listModalPosterImage} />
                        ) : (
                          <ThemedText style={{ fontSize: 18 }}>🎬</ThemedText>
                        )}
                      </View>
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
                        onPress={(e) => { e.stopPropagation?.(); handleRemoveWatchlist(movie.movieId); }}
                      >
                        <ThemedText style={styles.listModalRemoveText}>Remove</ThemedText>
                      </Pressable>
                    </Pressable>
                    );
                  })
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
  statValueGenre: {
    fontSize: 18,
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
  miniPosterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  watchlistPosterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  listModalPoster: {
    width: 48,
    height: 68,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  listModalPosterImage: {
    width: '100%',
    height: '100%',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailModalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalCloseText: { fontSize: 18, fontWeight: '600' },
  detailModalLoading: { padding: 48, alignItems: 'center', gap: 16 },
  detailModalLoadingText: { fontSize: 15, textAlign: 'center' },
  detailModalScroll: { maxHeight: '100%' },
  detailModalScrollContent: { paddingBottom: 32 },
  detailModalBackdrop: { height: 180, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)' },
  detailModalBackdropGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  detailModalBody: { padding: 20, gap: 10 },
  detailModalTitle: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  detailModalMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  detailMetaText: { fontSize: 14 },
  detailMetaDot: { fontSize: 12 },
  detailModalGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  detailGenreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  detailGenreChipText: { fontSize: 12, fontWeight: '600' },
  detailTagline: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 14, marginBottom: 4 },
  detailOverview: { fontSize: 15, lineHeight: 22 },
  detailModalButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  detailTrailerButton: { marginTop: 12 },
  detailModalButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  detailCastText: { fontSize: 14, lineHeight: 20 },
  detailModalActions: { flexDirection: 'row', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  detailModalActionButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  detailRatingPicker: { gap: 8 },
  detailRatingLabel: { fontSize: 13, fontWeight: '600' },
  detailRatingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailRatingChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  detailRatingChipText: { fontSize: 13, fontWeight: '700' },
});