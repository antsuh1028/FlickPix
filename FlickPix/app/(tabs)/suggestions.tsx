import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getRecommendations } from '@/services/recommendations';
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
import { addToWatchlist, removeFromWatchlist, isInWatchlist, addToWatchHistory, removeFromWatchHistory, getWatchedMovieIds, getWatchHistory } from '@/services/storage';
import { ratingColor, ratingBg } from '@/utils/ratingColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = SCREEN_WIDTH * 0.28;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

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
    greenSoft: 'rgba(16, 185, 129, 0.15)',
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
    greenSoft: 'rgba(5, 150, 105, 0.1)',
    posterBg: 'rgba(0, 0, 0, 0.06)',
  },
};

const ALL_GENRE_ID = 0;

interface Movie {
  id: number;
  title: string;
  year: string;
  rating: number;
  matchScore: number;
  poster: string | null;
  reason: string;
  genres: string[];
  genreIds: number[];
}

const QUICK_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function SuggestionCard({ movie, theme, onPress }: { movie: Movie; theme: typeof COLORS.dark; onPress: () => void }) {
  const [imageError, setImageError] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  useEffect(() => {
    isInWatchlist(movie.id).then(setWatchlisted);
  }, [movie.id]);
  const [watched, setWatched] = useState(false);
  const [showRating, setShowRating] = useState(false);
  useEffect(() => {
    getWatchedMovieIds().then((ids) => setWatched(ids.includes(movie.id)));
  }, [movie.id]);

  const posterUrl = movie.poster
    ? `https://image.tmdb.org/t/p/w500${movie.poster}`
    : null;

  const handleWatchlist = useCallback(async () => {
    if (watchlisted) {
      setWatchlisted(false);
      await removeFromWatchlist(movie.id);
    } else {
      setWatchlisted(true);
      await addToWatchlist({ movieId: movie.id, title: movie.title, posterPath: movie.poster });
    }
  }, [watchlisted, movie]);

  const handleRate = useCallback(async (rating: number) => {
    setShowRating(false);
    setWatched(true);
    await addToWatchHistory({
      movieId: movie.id,
      title: movie.title,
      rating,
      watchedAt: new Date().toISOString().split('T')[0],
      genres: movie.genreIds,
      posterPath: movie.poster,
    });
  }, [movie]);

  return (
    <View
      style={[
        styles.suggestionCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      {/* Poster — tap to open detail */}
      <Pressable style={[styles.cardPoster, { backgroundColor: theme.posterBg }]} onPress={onPress}>
        {posterUrl && !imageError ? (
          <Image
            source={{ uri: posterUrl }}
            style={styles.cardPosterImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.cardPosterPlaceholder}>
            <ThemedText style={styles.cardPosterEmoji}>🎬</ThemedText>
          </View>
        )}
      </Pressable>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <ThemedText style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {movie.title}
          </ThemedText>
          <View style={[styles.matchBadge, { backgroundColor: theme.greenSoft }]}>
            <ThemedText style={[styles.matchText, { color: theme.green }]}>
              {movie.matchScore}% match
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <ThemedText style={[styles.cardYear, { color: theme.textMuted }]}>
            {movie.year}
          </ThemedText>
          <ThemedText style={[styles.cardDot, { color: theme.textDim }]}>•</ThemedText>
          <ThemedText style={[styles.cardRating, { color: theme.textMuted }]}>
            ★ {movie.rating}
          </ThemedText>
        </View>

        <View style={styles.genreTags}>
          {movie.genres.slice(0, 3).map((genre) => (
            <View key={genre} style={[styles.genreTag, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <ThemedText style={[styles.genreTagText, { color: theme.textMuted }]}>
                {genre}
              </ThemedText>
            </View>
          ))}
        </View>

        <ThemedText style={[styles.cardReason, { color: theme.textDim }]} numberOfLines={2}>
          {movie.reason}
        </ThemedText>

        {/* Inline rating picker */}
        {showRating && (
          <View style={styles.ratingPicker}>
            <ThemedText style={[styles.ratingPickerLabel, { color: theme.textMuted }]}>Rate it:</ThemedText>
            <View style={styles.ratingChips}>
              {QUICK_RATINGS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.ratingChip, { backgroundColor: ratingBg(r), borderColor: ratingColor(r) }]}
                  onPress={() => handleRate(r)}
                >
                  <ThemedText style={[styles.ratingChipText, { color: ratingColor(r) }]}>{r}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        {!showRating && (
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.addButton, { backgroundColor: watchlisted ? theme.accentSoft : theme.accent }]}
              onPress={handleWatchlist}
            >
              <ThemedText style={[styles.addButtonText, watchlisted && { color: theme.accent }]}>
                {watchlisted ? '✓ In Watchlist' : '+ Watchlist'}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.seenButton, { backgroundColor: watched ? theme.accentSoft : theme.card, borderColor: watched ? theme.accent : theme.cardBorder }]}
              onPress={async () => {
                if (watched) {
                  setWatched(false);
                  await removeFromWatchHistory(movie.id);
                } else {
                  setShowRating(true);
                }
              }}
            >
              <ThemedText style={[styles.seenButtonText, { color: watched ? theme.accent : theme.text }]}>
                {watched ? '✓ Watched' : 'Seen it'}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SuggestionsScreen() {
  const [activeGenre, setActiveGenre] = useState(ALL_GENRE_ID);
  const [genreChips, setGenreChips] = useState<{ id: number; name: string }[]>([{ id: ALL_GENRE_ID, name: 'All' }]);
  const [showGenresModal, setShowGenresModal] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  // ── Movie detail modal ───────────────────────────────────────────────────────
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetails | null>(null);
  const [movieCredits, setMovieCredits] = useState<Credits | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailInWatchlist, setDetailInWatchlist] = useState(false);
  const [detailWatched, setDetailWatched] = useState(false);
  const [detailRatingPicker, setDetailRatingPicker] = useState(false);
  const detailCancelRef = useRef(false);

  useEffect(() => {
    if (!selectedMovieId) {
      setMovieDetail(null); setMovieCredits(null); setTrailerKey(null);
      setDetailError(null); setDetailRatingPicker(false);
      return;
    }
    detailCancelRef.current = false;
    setDetailLoading(true);
    setDetailError(null);
    Promise.all([
      getMovieDetails(selectedMovieId),
      getMovieCredits(selectedMovieId),
      getMovieVideos(selectedMovieId),
      isInWatchlist(selectedMovieId),
      getWatchedMovieIds(),
    ]).then(([details, credits, videos, inList, watchedIds]) => {
      if (detailCancelRef.current) return;
      setMovieDetail(details);
      setMovieCredits(credits);
      const trailer = videos.results.find((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      setTrailerKey(trailer?.key ?? null);
      setDetailInWatchlist(inList);
      setDetailWatched(watchedIds.includes(selectedMovieId));
    }).catch((e) => {
      if (!detailCancelRef.current) setDetailError(e instanceof Error ? e.message : 'Failed to load');
    }).finally(() => {
      if (!detailCancelRef.current) setDetailLoading(false);
    });
    return () => { detailCancelRef.current = true; };
  }, [selectedMovieId]);

  const openTrailer = useCallback(() => {
    if (trailerKey) Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
  }, [trailerKey]);

  const handleDetailWatchlist = useCallback(async () => {
    if (!movieDetail) return;
    if (detailInWatchlist) {
      setDetailInWatchlist(false);
      await removeFromWatchlist(movieDetail.id);
    } else {
      setDetailInWatchlist(true);
      await addToWatchlist({ movieId: movieDetail.id, title: movieDetail.title, posterPath: movieDetail.poster_path });
    }
  }, [movieDetail, detailInWatchlist]);

  const handleDetailRate = useCallback(async (rating: number) => {
    if (!movieDetail) return;
    setDetailRatingPicker(false);
    setDetailWatched(true);
    await addToWatchHistory({
      movieId: movieDetail.id,
      title: movieDetail.title,
      rating,
      watchedAt: new Date().toISOString().split('T')[0],
      genres: movieDetail.genres.map((g) => g.id),
      posterPath: movieDetail.poster_path,
    });
  }, [movieDetail]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [recommendations, genres] = await Promise.all([
        getRecommendations({ limit: 12 }),
        getGenres(),
      ]);

      const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));

      // Build genre chips from user's watch history top genres
      const watchHistory = await getWatchHistory();
      const genreCounts: Record<number, number> = {};
      for (const m of watchHistory) {
        for (const gId of m.genres) {
          genreCounts[gId] = (genreCounts[gId] || 0) + 1;
        }
      }
      const topGenreIds = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => parseInt(id))
        .filter((id) => genreMap.has(id));
      setGenreChips([
        { id: ALL_GENRE_ID, name: 'All' },
        ...topGenreIds.map((id) => ({ id, name: genreMap.get(id)! })),
      ]);

      const mapped = recommendations.map((recommendation) => {
        const matchScore = Math.max(70, Math.min(99, Math.round(recommendation.voteAverage * 10)));

        return {
          id: recommendation.id,
          title: recommendation.title,
          year: recommendation.releaseDate?.slice(0, 4) || '—',
          rating: Number(recommendation.voteAverage.toFixed(1)),
          matchScore,
          poster: recommendation.posterPath,
          reason: recommendation.reason,
          genreIds: recommendation.genreIds,
          genres: recommendation.genreIds
            .map((id) => genreMap.get(id))
            .filter((name): name is string => !!name),
        };
      });

      setSuggestions(mapped);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load suggestions';
      setError(message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (activeGenre === ALL_GENRE_ID) {
      return suggestions;
    }
    return suggestions.filter((movie) => movie.genreIds.includes(activeGenre));
  }, [activeGenre, suggestions]);

  const averageMatch = useMemo(() => {
    if (suggestions.length === 0) return 0;
    const total = suggestions.reduce((sum, movie) => sum + movie.matchScore, 0);
    return Math.round(total / suggestions.length);
  }, [suggestions]);

  const bestMatch = useMemo(() => {
    if (suggestions.length === 0) return 0;
    return Math.max(...suggestions.map((m) => m.matchScore));
  }, [suggestions]);

  const uniqueGenresCount = useMemo(() => {
    return new Set(suggestions.flatMap((movie) => movie.genres)).size;
  }, [suggestions]);


  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Background gradient — taller & richer */}
      <LinearGradient
        colors={[
          colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(124, 58, 237, 0.08)',
          colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.04)' : 'rgba(124, 58, 237, 0.01)',
          'transparent',
        ]}
        style={styles.bgGradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <ThemedText style={[styles.headerBadgeText, { color: theme.accent }]}>✦ Curated for you</ThemedText>
          </View>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            For You
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Picks tuned to your taste profile
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statEmoji]}>🏆</ThemedText>
            <ThemedText style={[styles.statNumber, { color: theme.accent }]}>{bestMatch}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Best match</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statEmoji]}>⚡</ThemedText>
            <ThemedText style={[styles.statNumber, { color: theme.green }]}>{averageMatch}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Avg match</ThemedText>
          </View>
          <Pressable
            style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={() => setShowGenresModal(true)}
          >
            <ThemedText style={[styles.statEmoji]}>🎭</ThemedText>
            <ThemedText style={[styles.statNumber, { color: theme.text }]}>{uniqueGenresCount}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.accent }]}>Top genres ›</ThemedText>
          </Pressable>
        </View>

        {/* Top genres modal */}
        <Modal
          visible={showGenresModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGenresModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowGenresModal(false)}>
            <View style={[styles.genresModal, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <ThemedText style={[styles.genresModalTitle, { color: theme.text }]}>Your Top Genres</ThemedText>
              {genreChips.filter((g) => g.id !== ALL_GENRE_ID).length === 0 ? (
                <ThemedText style={[styles.genresModalEmpty, { color: theme.textMuted }]}>
                  Rate more movies to see your top genres.
                </ThemedText>
              ) : (
                genreChips.filter((g) => g.id !== ALL_GENRE_ID).map((g, i) => (
                  <View key={g.id} style={[styles.genresModalRow, { borderBottomColor: theme.cardBorder }]}>
                    <ThemedText style={[styles.genresModalRank, { color: theme.accent }]}>#{i + 1}</ThemedText>
                    <ThemedText style={[styles.genresModalName, { color: theme.text }]}>{g.name}</ThemedText>
                  </View>
                ))
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Genre filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreFilter}
        >
          {genreChips.map((genre) => (
            <Pressable
              key={genre.id}
              onPress={() => setActiveGenre(genre.id)}
              style={[
                styles.genreChip,
                {
                  backgroundColor: activeGenre === genre.id ? theme.accent : theme.surface,
                  borderColor: activeGenre === genre.id ? theme.accent : theme.cardBorder,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.genreChipText,
                  { color: activeGenre === genre.id ? '#FFF' : theme.textMuted },
                ]}
              >
                {genre.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Suggestions */}
        <View style={styles.suggestionsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Top Picks</ThemedText>
              {!isLoading && suggestions.length > 0 && (
                <ThemedText style={[styles.sectionSub, { color: theme.textDim }]}>
                  {filteredSuggestions.length} recommendation{filteredSuggestions.length !== 1 ? 's' : ''}
                </ThemedText>
              )}
            </View>
            <Pressable
              style={[styles.refreshBtn, { borderColor: theme.cardBorder }]}
              onPress={loadSuggestions}
            >
              <ThemedText style={[styles.refreshText, { color: theme.accent }]}>↻ Refresh</ThemedText>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="small" color={theme.accent} />
              <ThemedText style={[styles.stateText, { color: theme.textMuted }]}>Loading recommendations...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.stateContainer}>
              <ThemedText style={[styles.stateText, { color: theme.textMuted }]}>{error}</ThemedText>
            </View>
          ) : filteredSuggestions.length === 0 ? (
            <View style={styles.stateContainer}>
              <ThemedText style={[styles.stateText, { color: theme.textMuted }]}>No matches for this genre yet.</ThemedText>
            </View>
          ) : (
            filteredSuggestions.map((movie) => (
              <SuggestionCard
                key={movie.id}
                movie={movie}
                theme={theme}
                onPress={() => setSelectedMovieId(movie.id)}
              />
            ))
          )}
        </View>

        {/* More suggestions prompt */}
        <LinearGradient
          colors={[theme.accentSoft, 'transparent']}
          style={[styles.morePrompt, { borderColor: theme.accent + '40' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ThemedText style={styles.morePromptEmoji}>🎯</ThemedText>
          <ThemedText style={[styles.morePromptTitle, { color: theme.text }]}>
            Sharpen your picks
          </ThemedText>
          <ThemedText style={[styles.morePromptText, { color: theme.textMuted }]}>
            The more you rate, the smarter your feed gets
          </ThemedText>
          <Pressable
            style={[styles.morePromptButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <ThemedText style={styles.morePromptButtonText}>Rate Movies →</ThemedText>
          </Pressable>
        </LinearGradient>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Movie Detail Modal */}
      <Modal
        visible={selectedMovieId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMovieId(null)}
      >
        <View style={styles.detailOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedMovieId(null)} />
          <View style={[styles.detailContent, { backgroundColor: theme.bg }]}>
            <Pressable style={[styles.detailClose, { backgroundColor: theme.card }]} onPress={() => setSelectedMovieId(null)}>
              <ThemedText style={[styles.detailCloseText, { color: theme.text }]}>✕</ThemedText>
            </Pressable>
            {detailLoading ? (
              <View style={styles.detailStateBox}>
                <ActivityIndicator size="large" color={theme.accent} />
                <ThemedText style={[styles.detailStateText, { color: theme.textMuted }]}>Loading...</ThemedText>
              </View>
            ) : detailError ? (
              <View style={styles.detailStateBox}>
                <ThemedText style={[styles.detailStateText, { color: theme.textMuted }]}>{detailError}</ThemedText>
                <Pressable style={[styles.detailBtn, { backgroundColor: theme.accent }]} onPress={() => setSelectedMovieId(null)}>
                  <ThemedText style={styles.detailBtnText}>Close</ThemedText>
                </Pressable>
              </View>
            ) : movieDetail ? (
              <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                <View style={styles.detailBackdrop}>
                  {tmdbBackdropUrl(movieDetail.backdrop_path, 'w780') ? (
                    <Image source={{ uri: tmdbBackdropUrl(movieDetail.backdrop_path, 'w780')! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : tmdbPosterUrl(movieDetail.poster_path, 'w500') ? (
                    <Image source={{ uri: tmdbPosterUrl(movieDetail.poster_path, 'w500')! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : null}
                  <LinearGradient colors={['transparent', theme.bg]} style={styles.detailBackdropGradient} />
                </View>
                <View style={styles.detailBody}>
                  <ThemedText style={[styles.detailTitle, { color: theme.text }]}>{movieDetail.title}</ThemedText>
                  <View style={styles.detailMeta}>
                    <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>{movieDetail.release_date?.slice(0, 4) || '—'}</ThemedText>
                    <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                    <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>★ {movieDetail.vote_average.toFixed(1)}</ThemedText>
                    {movieDetail.runtime ? (<>
                      <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                      <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>{movieDetail.runtime} min</ThemedText>
                    </>) : null}
                  </View>
                  {movieDetail.genres.length > 0 && (
                    <View style={styles.detailGenres}>
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
                  {movieDetail.overview ? (<>
                    <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>SYNOPSIS</ThemedText>
                    <ThemedText style={[styles.detailOverview, { color: theme.text }]}>{movieDetail.overview}</ThemedText>
                  </>) : null}
                  {trailerKey ? (
                    <Pressable style={[styles.detailBtn, styles.detailTrailerBtn, { backgroundColor: theme.accent }]} onPress={openTrailer}>
                      <ThemedText style={styles.detailBtnText}>▶ Watch Trailer</ThemedText>
                    </Pressable>
                  ) : null}
                  {movieCredits && movieCredits.cast.length > 0 && (<>
                    <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>CAST</ThemedText>
                    <ThemedText style={[styles.detailCast, { color: theme.text }]}>
                      {movieCredits.cast.slice(0, 10).map((c) => c.name).join(' · ')}
                    </ThemedText>
                  </>)}
                  <View style={styles.detailActions}>
                    {!detailWatched && !detailRatingPicker && (
                      <Pressable style={[styles.detailActionBtn, { backgroundColor: theme.accent }]} onPress={() => setDetailRatingPicker(true)}>
                        <ThemedText style={styles.detailBtnText}>Add to Watched</ThemedText>
                      </Pressable>
                    )}
                    {!detailWatched && detailRatingPicker && (
                      <View style={styles.detailRatingPicker}>
                        <ThemedText style={[styles.detailRatingLabel, { color: theme.textMuted }]}>Rate it:</ThemedText>
                        <View style={styles.detailRatingRow}>
                          {[1,2,3,4,5,6,7,8,9,10].map((r) => (
                            <Pressable key={r} style={[styles.detailRatingChip, { backgroundColor: ratingBg(r), borderColor: ratingColor(r) }]} onPress={() => handleDetailRate(r)}>
                              <ThemedText style={[styles.detailRatingChipText, { color: ratingColor(r) }]}>{r}</ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                    {detailWatched && (
                      <View style={[styles.detailActionBtn, { backgroundColor: theme.accentSoft }]}>
                        <ThemedText style={[styles.detailBtnText, { color: theme.accent }]}>✓ Watched</ThemedText>
                      </View>
                    )}
                    <Pressable
                      style={[styles.detailActionBtn, { backgroundColor: detailInWatchlist ? theme.accentSoft : theme.card, borderColor: theme.cardBorder }]}
                      onPress={handleDetailWatchlist}
                    >
                      <ThemedText style={[styles.detailBtnText, { color: detailInWatchlist ? theme.accent : theme.text }]}>
                        {detailInWatchlist ? 'In Watchlist' : '+ Watchlist'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
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
    height: 420,
  },
  scrollContent: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  genreFilter: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 28,
  },
  genreChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 8,
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  suggestionsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stateContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 14,
  },
  suggestionCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  cardPoster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardPosterImage: {
    width: '100%',
    height: '100%',
  },
  cardPosterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPosterEmoji: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardYear: {
    fontSize: 13,
  },
  cardDot: {
    fontSize: 8,
  },
  cardRating: {
    fontSize: 13,
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  genreTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardReason: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  ratingPicker: {
    marginTop: 10,
    gap: 6,
  },
  ratingPickerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingChips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  ratingChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  seenButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  seenButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  morePrompt: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  morePromptEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  morePromptTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  morePromptText: {
    fontSize: 14,
    textAlign: 'center',
  },
  morePromptButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  morePromptButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  genresModal: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    gap: 4,
  },
  genresModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  genresModalEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  genresModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  genresModalRank: {
    fontSize: 14,
    fontWeight: '700',
    width: 28,
  },
  genresModalName: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailClose: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  detailCloseText: { fontSize: 18, fontWeight: '600' },
  detailStateBox: { padding: 48, alignItems: 'center', gap: 16 },
  detailStateText: { fontSize: 15, textAlign: 'center' },
  detailScroll: { maxHeight: '100%' },
  detailBackdrop: { height: 180, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)' },
  detailBackdropGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  detailBody: { padding: 20, gap: 10 },
  detailTitle: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  detailMetaText: { fontSize: 14 },
  detailMetaDot: { fontSize: 12 },
  detailGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  detailGenreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  detailGenreChipText: { fontSize: 12, fontWeight: '600' },
  detailTagline: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 14, marginBottom: 4 },
  detailOverview: { fontSize: 15, lineHeight: 22 },
  detailBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  detailTrailerBtn: { marginTop: 12 },
  detailBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  detailCast: { fontSize: 14, lineHeight: 20 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  detailActionBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  detailRatingPicker: { gap: 8 },
  detailRatingLabel: { fontSize: 13, fontWeight: '600' },
  detailRatingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailRatingChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  detailRatingChipText: { fontSize: 13, fontWeight: '700' },
});