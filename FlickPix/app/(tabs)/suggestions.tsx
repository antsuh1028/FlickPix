import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getRecommendations } from '@/services/recommendations';
import { getGenres } from '@/services/tmdb';

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

const GENRES = [
  { id: 1, name: 'All', active: true },
  { id: 28, name: 'Action', active: false },
  { id: 878, name: 'Sci-Fi', active: false },
  { id: 53, name: 'Thriller', active: false },
  { id: 18, name: 'Drama', active: false },
  { id: 35, name: 'Comedy', active: false },
];

interface Movie {
  id: number;
  title: string;
  year: string;
  rating: number;
  matchScore: number;
  poster: string | null;
  reason: string;
  genres: string[];
}

function SuggestionCard({ movie, theme, onPress }: { movie: Movie; theme: typeof COLORS.dark; onPress: () => void }) {
  const [imageError, setImageError] = useState(false);
  
  const posterUrl = movie.poster 
    ? `https://image.tmdb.org/t/p/w500${movie.poster}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestionCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {/* Poster */}
      <View style={[styles.cardPoster, { backgroundColor: theme.posterBg }]}>
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
      </View>

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

        {/* Actions */}
        <View style={styles.cardActions}>
          <Pressable style={[styles.addButton, { backgroundColor: theme.accent }]}>
            <ThemedText style={styles.addButtonText}>+ Watchlist</ThemedText>
          </Pressable>
          <Pressable style={[styles.seenButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.seenButtonText, { color: theme.text }]}>Seen it</ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function SuggestionsScreen() {
  const [activeGenre, setActiveGenre] = useState(1);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [recommendations, genres] = await Promise.all([
        getRecommendations({ limit: 12 }),
        getGenres(),
      ]);

      const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));

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
    if (activeGenre === 1) {
      return suggestions;
    }

    const selectedGenre = GENRES.find((genre) => genre.id === activeGenre)?.name;
    if (!selectedGenre) {
      return suggestions;
    }

    return suggestions.filter((movie) => movie.genres.includes(selectedGenre));
  }, [activeGenre, suggestions]);

  const averageMatch = useMemo(() => {
    if (suggestions.length === 0) return 0;
    const total = suggestions.reduce((sum, movie) => sum + movie.matchScore, 0);
    return Math.round(total / suggestions.length);
  }, [suggestions]);

  const uniqueGenresCount = useMemo(() => {
    return new Set(suggestions.flatMap((movie) => movie.genres)).size;
  }, [suggestions]);

  const handleMoviePress = (movie: Movie) => {
    console.log('Selected:', movie.title);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[
          colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(124, 58, 237, 0.04)',
          'transparent',
        ]}
        style={styles.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            For You ✨
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Personalized picks based on your taste
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statNumber, { color: theme.accent }]}>{suggestions.length}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Movies rated</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statNumber, { color: theme.green }]}>{averageMatch}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Avg match</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statNumber, { color: theme.text }]}>{uniqueGenresCount}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Top genres</ThemedText>
          </View>
        </View>

        {/* Genre filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreFilter}
        >
          {GENRES.map((genre) => (
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
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Top Picks
            </ThemedText>
            <Pressable onPress={loadSuggestions}>
              <ThemedText style={[styles.refreshText, { color: theme.accent }]}>
                Refresh
              </ThemedText>
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
                onPress={() => handleMoviePress(movie)}
              />
            ))
          )}
        </View>

        {/* More suggestions prompt */}
        <View style={[styles.morePrompt, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <ThemedText style={styles.morePromptEmoji}>🎯</ThemedText>
          <ThemedText style={[styles.morePromptTitle, { color: theme.text }]}>
            Want better recommendations?
          </ThemedText>
          <ThemedText style={[styles.morePromptText, { color: theme.textMuted }]}>
            Rate more movies to improve your suggestions
          </ThemedText>
          <Pressable style={[styles.morePromptButton, { backgroundColor: theme.accent }]}>
            <ThemedText style={styles.morePromptButtonText}>Rate Movies</ThemedText>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    height: 300,
  },
  scrollContent: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  genreFilter: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
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
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
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
});