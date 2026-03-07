import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getRecommendations, getPosterUrl, type Recommendation } from '@/services/recommendations';
import { getMoodRecommendations, getMoodPage, type MoodSearchResult } from '@/services/moodSearch';
import {
  getAvailableUsers,
  getActiveUserId,
  setActiveUser,
  addToWatchHistory,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  getWatchedMovieIds,
} from '@/services/storage';
import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  posterUrl as tmdbPosterUrl,
  backdropUrl as tmdbBackdropUrl,
  type MovieDetails,
  type Credits,
} from '@/services/tmdb';

const COLORS = {
  dark: {
    bg: '#0D0D0F',
    card: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    text: '#FAFAFA',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    accent: '#6366F1',
    accentSoft: 'rgba(99, 102, 241, 0.15)',
    inputBg: 'rgba(255, 255, 255, 0.06)',
    chip: 'rgba(99, 102, 241, 0.2)',
  },
  light: {
    bg: '#FAFAFA',
    card: 'rgba(0, 0, 0, 0.02)',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    text: '#1A1A1A',
    textMuted: 'rgba(0, 0, 0, 0.45)',
    accent: '#6366F1',
    accentSoft: 'rgba(99, 102, 241, 0.1)',
    inputBg: 'rgba(0, 0, 0, 0.04)',
    chip: 'rgba(99, 102, 241, 0.15)',
  },
};

export default function HomeScreen() {
  const [movieInput, setMovieInput] = useState('');
  const [likedMovies, setLikedMovies] = useState<string[]>([]);
  const [picks, setPicks] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [moodInput, setMoodInput] = useState('');
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodExplanation, setMoodExplanation] = useState<string | null>(null);
  const [moodResults, setMoodResults] = useState<Recommendation[] | null>(null);
  const [moodError, setMoodError] = useState<string | null>(null);
  const [moodFilters, setMoodFilters] = useState<MoodSearchResult['filters'] | null>(null);
  const [moodPage, setMoodPage] = useState(1);
  const [forYouPage, setForYouPage] = useState(1);
  const [activeUser, setActiveUserState] = useState(getActiveUserId());
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetails | null>(null);
  const [movieCredits, setMovieCredits] = useState<Credits | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [movieDetailLoading, setMovieDetailLoading] = useState(false);
  const [movieDetailError, setMovieDetailError] = useState<string | null>(null);
  const [movieInWatchlist, setMovieInWatchlist] = useState(false);
  const [movieWatched, setMovieWatched] = useState(false);
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  const users = getAvailableUsers();
  const activeUserName = users.find((u) => u.id === activeUser)?.name ?? 'User';

  const loadRecommendations = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const recs = await getRecommendations({ limit: 10, page });
      setPicks(recs);
      setForYouPage(page);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load recommendations';
      setError(message);
      setPicks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations(1);
  }, [loadRecommendations]);

  useEffect(() => {
    if (!selectedMovieId) {
      setMovieDetail(null);
      setMovieCredits(null);
      setTrailerKey(null);
      setMovieDetailError(null);
      return;
    }
    let cancelled = false;
    setMovieDetailLoading(true);
    setMovieDetailError(null);
    Promise.all([
      getMovieDetails(selectedMovieId),
      getMovieCredits(selectedMovieId),
      getMovieVideos(selectedMovieId),
      isInWatchlist(selectedMovieId),
      getWatchedMovieIds(),
    ])
      .then(([details, credits, videos, inList, watchedIds]) => {
        if (cancelled) return;
        setMovieDetail(details);
        setMovieCredits(credits);
        const trailer = videos.results.find(
          (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        setTrailerKey(trailer?.key ?? null);
        setMovieInWatchlist(inList);
        setMovieWatched(watchedIds.includes(selectedMovieId));
      })
      .catch((err) => {
        if (!cancelled) {
          setMovieDetailError(err instanceof Error ? err.message : 'Failed to load movie');
        }
      })
      .finally(() => {
        if (!cancelled) setMovieDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMovieId]);

  const openTrailer = () => {
    if (trailerKey) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
    }
  };

  const handleAddToWatched = async () => {
    if (!movieDetail || !selectedMovieId) return;
    try {
      await addToWatchHistory({
        movieId: selectedMovieId,
        title: movieDetail.title,
        rating: 7,
        watchedAt: new Date().toISOString().slice(0, 10),
        genres: movieDetail.genres.map((g) => g.id),
      });
      setMovieWatched(true);
      loadRecommendations(forYouPage);
    } catch {
      // ignore
    }
  };

  const handleWatchlistPress = async () => {
    if (!selectedMovieId || !movieDetail) return;
    try {
      if (movieInWatchlist) {
        await removeFromWatchlist(selectedMovieId);
        setMovieInWatchlist(false);
      } else {
        await addToWatchlist({
          movieId: selectedMovieId,
          title: movieDetail.title,
          posterPath: movieDetail.poster_path,
        });
        setMovieInWatchlist(true);
      }
    } catch {
      // ignore
    }
  };

  const switchUser = (userId: string) => {
    setActiveUser(userId);
    setActiveUserState(userId);
    setShowUserMenu(false);
    loadRecommendations(1);
  };

  const searchByMood = useCallback(async () => {
    if (!moodInput.trim()) return;
    setMoodLoading(true);
    setMoodExplanation(null);
    setMoodResults(null);
    setMoodError(null);
    setMoodFilters(null);
    try {
      const { recommendations, moodExplanation: explanation, filters } =
        await getMoodRecommendations(moodInput.trim(), 10);
      setMoodResults(recommendations);
      setMoodExplanation(explanation);
      setMoodFilters(filters);
      setMoodPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mood search failed';
      if (msg.includes('insufficient_quota') || msg.includes('429')) {
        setMoodError('OpenAI API quota exceeded — add billing credits at platform.openai.com');
      } else {
        setMoodError(msg);
      }
    } finally {
      setMoodLoading(false);
    }
  }, [moodInput]);

  const loadMoodPage = useCallback(async (page: number) => {
    if (!moodFilters || !moodExplanation) return;
    setMoodLoading(true);
    setMoodError(null);
    try {
      const recs = await getMoodPage(moodFilters, moodExplanation, page, 10);
      setMoodResults(recs);
      setMoodPage(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load page';
      setMoodError(msg);
    } finally {
      setMoodLoading(false);
    }
  }, [moodFilters, moodExplanation]);

  const clearMoodResults = () => {
    setMoodResults(null);
    setMoodExplanation(null);
    setMoodError(null);
    setMoodFilters(null);
    setMoodInput('');
    setMoodPage(1);
  };

  const addMovie = () => {
    if (movieInput.trim() && !likedMovies.includes(movieInput.trim())) {
      setLikedMovies([...likedMovies, movieInput.trim()]);
      setMovieInput('');
    }
  };

  const removeMovie = (index: number) => {
    setLikedMovies(likedMovies.filter((_, i) => i !== index));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Subtle gradient orbs for depth */}
      <View style={styles.gradientOrb1}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.15)', 'transparent']}
          style={styles.orb}
        />
      </View>
      <View style={styles.gradientOrb2}>
        <LinearGradient
          colors={['rgba(168, 85, 247, 0.1)', 'transparent']}
          style={styles.orb}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.logoRow}>
              <View style={[styles.logoDot, { backgroundColor: theme.accent }]} />
              <ThemedText style={[styles.logoText, { color: theme.text }]}>
                FlickPix
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setShowUserMenu(true)}
              style={({ pressed }) => [
                styles.userButton,
                {
                  backgroundColor: theme.accentSoft,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.userButtonText, { color: theme.accent }]}>
                {activeUserName} ▾
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText style={[styles.tagline, { color: theme.textMuted }]}>
            Discover your next favorite film
          </ThemedText>
        </View>

        {/* User Switcher Modal */}
        <Modal
          visible={showUserMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUserMenu(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowUserMenu(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Switch User
              </ThemedText>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => switchUser(user.id)}
                  style={({ pressed }) => [
                    styles.modalOption,
                    {
                      backgroundColor: user.id === activeUser ? theme.accentSoft : 'transparent',
                      borderColor: theme.cardBorder,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      { color: user.id === activeUser ? theme.accent : theme.text },
                    ]}
                  >
                    {user.name}
                  </ThemedText>
                  {user.id === activeUser && (
                    <ThemedText style={{ color: theme.accent, fontSize: 16 }}>✓</ThemedText>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

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
                  <ThemedText style={[styles.detailModalLoadingText, { color: theme.textMuted }]}>
                    Loading...
                  </ThemedText>
                </View>
              ) : movieDetailError ? (
                <View style={styles.detailModalLoading}>
                  <ThemedText style={[styles.detailModalLoadingText, { color: theme.textMuted }]}>
                    {movieDetailError}
                  </ThemedText>
                  <Pressable
                    style={[styles.detailModalButton, { backgroundColor: theme.accent }]}
                    onPress={() => setSelectedMovieId(null)}
                  >
                    <ThemedText style={styles.detailModalButtonText}>Close</ThemedText>
                  </Pressable>
                </View>
              ) : movieDetail ? (
                <ScrollView
                  style={styles.detailModalScroll}
                  contentContainerStyle={styles.detailModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.detailModalBackdrop}>
                    {tmdbBackdropUrl(movieDetail.backdrop_path, 'w780') ? (
                      <Image
                        source={{ uri: tmdbBackdropUrl(movieDetail.backdrop_path, 'w780')! }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : tmdbPosterUrl(movieDetail.poster_path, 'w500') ? (
                      <Image
                        source={{ uri: tmdbPosterUrl(movieDetail.poster_path, 'w500')! }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : null}
                    <LinearGradient
                      colors={['transparent', theme.bg]}
                      style={styles.detailModalBackdropGradient}
                    />
                  </View>
                  <View style={styles.detailModalBody}>
                    <ThemedText style={[styles.detailModalTitle, { color: theme.text }]}>
                      {movieDetail.title}
                    </ThemedText>
                    <View style={styles.detailModalMeta}>
                      <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>
                        {movieDetail.release_date?.slice(0, 4) || '—'}
                      </ThemedText>
                      <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                      <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>
                        ★ {movieDetail.vote_average.toFixed(1)}
                      </ThemedText>
                      {movieDetail.runtime ? (
                        <>
                          <ThemedText style={[styles.detailMetaDot, { color: theme.textMuted }]}>•</ThemedText>
                          <ThemedText style={[styles.detailMetaText, { color: theme.textMuted }]}>
                            {movieDetail.runtime} min
                          </ThemedText>
                        </>
                      ) : null}
                    </View>
                    {movieDetail.genres.length > 0 && (
                      <View style={styles.detailModalGenres}>
                        {movieDetail.genres.slice(0, 5).map((g) => (
                          <View
                            key={g.id}
                            style={[styles.detailGenreChip, { backgroundColor: theme.accentSoft, borderColor: theme.cardBorder }]}
                          >
                            <ThemedText style={[styles.detailGenreChipText, { color: theme.accent }]}>
                              {g.name}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                    {movieDetail.tagline ? (
                      <ThemedText style={[styles.detailTagline, { color: theme.textMuted }]}>
                        {movieDetail.tagline}
                      </ThemedText>
                    ) : null}
                    {movieDetail.overview ? (
                      <>
                        <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>
                          SYNOPSIS
                        </ThemedText>
                        <ThemedText style={[styles.detailOverview, { color: theme.text }]}>
                          {movieDetail.overview}
                        </ThemedText>
                      </>
                    ) : null}
                    {trailerKey ? (
                      <Pressable
                        style={[styles.detailModalButton, styles.detailTrailerButton, { backgroundColor: theme.accent }]}
                        onPress={openTrailer}
                      >
                        <ThemedText style={styles.detailModalButtonText}>▶ Watch Trailer</ThemedText>
                      </Pressable>
                    ) : null}
                    {movieCredits && movieCredits.cast.length > 0 && (
                      <>
                        <ThemedText style={[styles.detailSectionLabel, { color: theme.textMuted }]}>
                          CAST
                        </ThemedText>
                        <ThemedText style={[styles.detailCastText, { color: theme.text }]}>
                          {movieCredits.cast.slice(0, 10).map((c) => c.name).join(' · ')}
                        </ThemedText>
                      </>
                    )}
                    <View style={styles.detailModalActions}>
                      {!movieWatched && (
                        <Pressable
                          style={[styles.detailModalActionButton, { backgroundColor: theme.accent }]}
                          onPress={handleAddToWatched}
                        >
                          <ThemedText style={styles.detailModalButtonText}>Add to Watched</ThemedText>
                        </Pressable>
                      )}
                      {movieWatched && (
                        <View style={[styles.detailModalActionButton, { backgroundColor: theme.accentSoft, borderColor: theme.cardBorder }]}>
                          <ThemedText style={[styles.detailModalButtonText, { color: theme.accent }]}>✓ Watched</ThemedText>
                        </View>
                      )}
                      <Pressable
                        style={[
                          styles.detailModalActionButton,
                          { backgroundColor: movieInWatchlist ? theme.accentSoft : theme.card, borderColor: theme.cardBorder },
                        ]}
                        onPress={handleWatchlistPress}
                      >
                        <ThemedText
                          style={[
                            styles.detailModalButtonText,
                            { color: movieInWatchlist ? theme.accent : theme.text },
                          ]}
                        >
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

        {/* Input Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
            MOVIES YOU LOVE
          </ThemedText>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Add a movie you enjoy..."
              placeholderTextColor={theme.textMuted}
              value={movieInput}
              onChangeText={setMovieInput}
              onSubmitEditing={addMovie}
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={addMovie}
            >
              <ThemedText style={styles.addButtonText}>+</ThemedText>
            </Pressable>
          </View>

          {likedMovies.length > 0 && (
            <View style={styles.chipContainer}>
              {likedMovies.map((movie, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: theme.chip,
                      borderColor: theme.cardBorder,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => removeMovie(index)}
                >
                  <ThemedText style={[styles.chipText, { color: theme.text }]}>
                    {movie}
                  </ThemedText>
                  <ThemedText style={[styles.chipX, { color: theme.textMuted }]}>
                    ×
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Mood Search */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
            WHAT ARE YOU IN THE MOOD FOR?
          </ThemedText>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="e.g. something cozy and heartwarming..."
              placeholderTextColor={theme.textMuted}
              value={moodInput}
              onChangeText={setMoodInput}
              onSubmitEditing={searchByMood}
              returnKeyType="search"
            />
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: moodLoading ? theme.textMuted : theme.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={searchByMood}
              disabled={moodLoading}
            >
              {moodLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText style={styles.addButtonText}>→</ThemedText>
              )}
            </Pressable>
          </View>

          {moodExplanation && (
            <View style={[styles.moodExplanation, { backgroundColor: theme.accentSoft, borderColor: theme.cardBorder }]}>
              <ThemedText style={[styles.moodExplanationText, { color: theme.accent }]}>
                {moodExplanation}
              </ThemedText>
              <Pressable onPress={clearMoodResults}>
                <ThemedText style={[styles.chipX, { color: theme.accent }]}>×</ThemedText>
              </Pressable>
            </View>
          )}

          {moodResults && moodResults.length > 0 && (
            <>
              <View style={styles.posterGrid}>
                {moodResults.map((movie) => {
                  const posterUri = getPosterUrl(movie.posterPath, 'w342');
                  return (
                    <Pressable
                      key={movie.id}
                      style={({ pressed }) => [
                        styles.posterCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.cardBorder,
                          opacity: pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                      onPress={() => setSelectedMovieId(movie.id)}
                    >
                      {posterUri ? (
                        <Image source={{ uri: posterUri }} style={styles.posterImage} />
                      ) : (
                        <View style={[styles.posterImage, styles.posterPlaceholder, { backgroundColor: theme.inputBg }]}>
                          <ThemedText style={[styles.posterPlaceholderText, { color: theme.textMuted }]}>
                            No Poster
                          </ThemedText>
                        </View>
                      )}
                      <View style={styles.posterInfo}>
                        <ThemedText style={[styles.posterTitle, { color: theme.text }]} numberOfLines={2}>
                          {movie.title}
                        </ThemedText>
                        <View style={styles.posterMeta}>
                          <ThemedText style={[styles.posterYear, { color: theme.textMuted }]}>
                            {movie.releaseDate?.slice(0, 4) || '—'}
                          </ThemedText>
                          <View style={[styles.ratingBadge, { backgroundColor: theme.accentSoft }]}>
                            <ThemedText style={[styles.ratingText, { color: theme.accent }]}>
                              {movie.voteAverage.toFixed(1)}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          style={[styles.posterReason, { color: theme.textMuted }]}
                          numberOfLines={2}
                        >
                          {movie.reason}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.pager}>
                <Pressable
                  onPress={() => loadMoodPage(moodPage - 1)}
                  disabled={moodPage <= 1 || moodLoading}
                  style={({ pressed }) => [
                    styles.pagerButton,
                    {
                      backgroundColor: moodPage <= 1 ? theme.inputBg : theme.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.pagerButtonText, { color: moodPage <= 1 ? theme.textMuted : theme.accent }]}>
                    Prev
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.pagerInfo, { color: theme.textMuted }]}>
                  Page {moodPage}
                </ThemedText>
                <Pressable
                  onPress={() => loadMoodPage(moodPage + 1)}
                  disabled={moodLoading}
                  style={({ pressed }) => [
                    styles.pagerButton,
                    {
                      backgroundColor: theme.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.pagerButtonText, { color: theme.accent }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {moodResults && moodResults.length === 0 && !moodError && (
            <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>
              No matches found — try describing your mood differently.
            </ThemedText>
          )}

          {moodError && (
            <View style={[styles.moodExplanation, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <ThemedText style={[styles.moodExplanationText, { color: '#EF4444', fontStyle: 'normal' }]}>
                {moodError}
              </ThemedText>
              <Pressable onPress={clearMoodResults}>
                <ThemedText style={[styles.chipX, { color: '#EF4444' }]}>×</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
              FOR YOU
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={[styles.badgeText, { color: theme.accent }]}>
                {picks.length} picks
              </ThemedText>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={theme.accent} />
              <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>Loading picks...</ThemedText>
            </View>
          ) : picks.length > 0 ? (
            <>
              <View style={styles.posterGrid}>
                {picks.map((movie) => {
                  const posterUri = getPosterUrl(movie.posterPath, 'w342');
                  return (
                    <Pressable
                      key={movie.id}
                      style={({ pressed }) => [
                        styles.posterCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.cardBorder,
                          opacity: pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                      onPress={() => setSelectedMovieId(movie.id)}
                    >
                      {posterUri ? (
                        <Image source={{ uri: posterUri }} style={styles.posterImage} />
                      ) : (
                        <View style={[styles.posterImage, styles.posterPlaceholder, { backgroundColor: theme.inputBg }]}>
                          <ThemedText style={[styles.posterPlaceholderText, { color: theme.textMuted }]}>
                            No Poster
                          </ThemedText>
                        </View>
                      )}
                      <View style={styles.posterInfo}>
                        <ThemedText style={[styles.posterTitle, { color: theme.text }]} numberOfLines={2}>
                          {movie.title}
                        </ThemedText>
                        <View style={styles.posterMeta}>
                          <ThemedText style={[styles.posterYear, { color: theme.textMuted }]}>
                            {movie.releaseDate?.slice(0, 4) || '—'}
                          </ThemedText>
                          <View style={[styles.ratingBadge, { backgroundColor: theme.accentSoft }]}>
                            <ThemedText style={[styles.ratingText, { color: theme.accent }]}>
                              {movie.voteAverage.toFixed(1)}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          style={[styles.posterReason, { color: theme.textMuted }]}
                          numberOfLines={2}
                        >
                          {movie.reason}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.pager}>
                <Pressable
                  onPress={() => loadRecommendations(forYouPage - 1)}
                  disabled={forYouPage <= 1 || isLoading}
                  style={({ pressed }) => [
                    styles.pagerButton,
                    {
                      backgroundColor: forYouPage <= 1 ? theme.inputBg : theme.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.pagerButtonText, { color: forYouPage <= 1 ? theme.textMuted : theme.accent }]}>
                    Prev
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.pagerInfo, { color: theme.textMuted }]}>
                  Page {forYouPage}
                </ThemedText>
                <Pressable
                  onPress={() => loadRecommendations(forYouPage + 1)}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.pagerButton,
                    {
                      backgroundColor: theme.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.pagerButtonText, { color: theme.accent }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>No recommendations yet.</ThemedText>
          )}
        </View>

        {/* Footer hint */}
        <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>
          {error ? error : 'Browse pages for more movies'}
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOrb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
  },
  gradientOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 350,
    height: 350,
  },
  orb: {
    flex: 1,
    borderRadius: 200,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    gap: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  userButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    marginTop: -2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipX: {
    fontSize: 18,
    fontWeight: '400',
  },
  posterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posterCard: {
    flexBasis: '18%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    fontSize: 9,
    fontWeight: '500',
  },
  posterInfo: {
    padding: 6,
    gap: 2,
  },
  posterTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 14,
  },
  posterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterYear: {
    fontSize: 10,
  },
  ratingBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '700',
  },
  posterReason: {
    fontSize: 9,
    lineHeight: 12,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  pagerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pagerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pagerInfo: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  loadingState: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 13,
  },
  moodExplanation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodExplanationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // Movie detail modal
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
  detailModalCloseText: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailModalLoading: {
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  detailModalLoadingText: {
    fontSize: 15,
    textAlign: 'center',
  },
  detailModalScroll: {
    maxHeight: '100%',
  },
  detailModalScrollContent: {
    paddingBottom: 32,
  },
  detailModalBackdrop: {
    height: 180,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  detailModalBackdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  detailModalBody: {
    padding: 20,
    gap: 10,
  },
  detailModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  detailModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailMetaText: {
    fontSize: 14,
  },
  detailMetaDot: {
    fontSize: 12,
  },
  detailModalGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  detailGenreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailGenreChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 4,
  },
  detailOverview: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  detailTrailerButton: {
    marginTop: 12,
  },
  detailModalButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  detailCastText: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  detailModalActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
});