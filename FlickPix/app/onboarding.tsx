import { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { searchMovies, getMovieDetails, posterUrl, type MovieSummary } from '@/services/tmdb';
import { completeOnboarding, type WatchedMovie } from '@/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = (SCREEN_WIDTH - 48 - 12) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const C = {
  bg: '#09090B',
  surface: '#18181B',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.1)',
  text: '#FAFAFA',
  muted: 'rgba(255,255,255,0.5)',
  dim: 'rgba(255,255,255,0.25)',
  accent: '#8B5CF6',
  accentDim: 'rgba(139,92,246,0.2)',
  input: 'rgba(255,255,255,0.07)',
};

interface SelectedMovie {
  movieId: number;
  title: string;
  posterPath: string | null;
  genres: number[];
}

export default function OnboardingScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'name' | 'movies'>('name');
  const [name, setName] = useState('');

  // Movie search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedMovie[]>([]);
  const [saving, setSaving] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchMovies(text, 1);
        setResults(res.results.filter((m) => m.poster_path));
      } catch {
        // silently ignore
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const toggleSelect = useCallback((movie: MovieSummary) => {
    setSelected((prev) => {
      const already = prev.find((m) => m.movieId === movie.id);
      if (already) {
        return prev.filter((m) => m.movieId !== movie.id);
      }
      return [
        ...prev,
        {
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          genres: movie.genre_ids,
        },
      ];
    });
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const movies: WatchedMovie[] = await Promise.all(
        selected.map(async (m) => {
          // Fetch full details to get accurate genre IDs
          try {
            const details = await getMovieDetails(m.movieId);
            return {
              movieId: m.movieId,
              title: m.title,
              rating: 8,
              watchedAt: new Date().toISOString().split('T')[0],
              genres: details.genres.map((g) => g.id),
              posterPath: m.posterPath,
            };
          } catch {
            return {
              movieId: m.movieId,
              title: m.title,
              rating: 8,
              watchedAt: new Date().toISOString().split('T')[0],
              genres: m.genres,
              posterPath: m.posterPath,
            };
          }
        })
      );
      await completeOnboarding(name, movies);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }, [name, selected, router]);

  const isMovieSelected = (id: number) => selected.some((m) => m.movieId === id);
  const canFinish = selected.length >= 3;

  // ── Step: Name ────────────────────────────────────────────────────────────

  if (step === 'name') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LinearGradient colors={['#1A0533', C.bg, C.bg]} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.namePage} keyboardShouldPersistTaps="handled">
            <View style={styles.logoRow}>
              <ThemedText style={styles.logoText}>FlickPix</ThemedText>
            </View>

            <ThemedText style={styles.welcomeTitle}>Welcome{'\n'}to FlickPix</ThemedText>
            <ThemedText style={styles.welcomeSub}>
              Your personal movie companion. Let's set up your taste profile.
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>What should we call you?</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor={C.dim}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => setStep('movies')}
                autoFocus
              />
            </View>

            <Pressable
              style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
              onPress={() => setStep('movies')}
              disabled={!name.trim()}
            >
              <LinearGradient
                colors={name.trim() ? ['#7C3AED', '#8B5CF6'] : ['#3A3A4A', '#3A3A4A']}
                style={styles.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ThemedText style={styles.primaryBtnText}>Continue</ThemedText>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // ── Step: Movies ──────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#1A0533', C.bg, C.bg]} style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.moviesPage}>
          {/* Header */}
          <View style={styles.moviesHeader}>
            <ThemedText style={styles.moviesTitle}>
              Hi {name.trim()}, pick your{'\n'}favorite movies
            </ThemedText>
            <ThemedText style={styles.moviesSub}>
              Select at least 3 — we'll use these to personalize your recommendations.
            </ThemedText>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies..."
              placeholderTextColor={C.dim}
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searching && (
              <ActivityIndicator style={styles.searchSpinner} color={C.accent} size="small" />
            )}
          </View>

          {/* Selected count badge */}
          {selected.length > 0 && (
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{selected.length} selected</ThemedText>
              </View>
            </View>
          )}

          {/* Results grid */}
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const sel = isMovieSelected(item.id);
              const uri = posterUrl(item.poster_path, 'w185');
              return (
                <Pressable style={styles.posterWrap} onPress={() => toggleSelect(item)}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
                  ) : (
                    <View style={[styles.poster, styles.posterPlaceholder]} />
                  )}
                  {sel && (
                    <View style={styles.checkOverlay}>
                      <ThemedText style={styles.checkMark}>✓</ThemedText>
                    </View>
                  )}
                  <View style={[styles.posterBorder, sel && styles.posterBorderSelected]} />
                  <ThemedText style={styles.posterTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !searching && query.length > 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyText}>No results for "{query}"</ThemedText>
                </View>
              ) : !query ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyHint}>
                    Search for movies you love — like{'\n'}"Inception", "The Notebook", or "Avatar"
                  </ThemedText>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />

          {/* Bottom action */}
          <View style={styles.bottomBar}>
            {!canFinish && (
              <ThemedText style={styles.bottomHint}>
                {3 - selected.length} more to go
              </ThemedText>
            )}
            <Pressable
              style={[styles.primaryBtn, !canFinish && styles.primaryBtnDisabled]}
              onPress={handleFinish}
              disabled={!canFinish || saving}
            >
              <LinearGradient
                colors={canFinish ? ['#7C3AED', '#8B5CF6'] : ['#3A3A4A', '#3A3A4A']}
                style={styles.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.primaryBtnText}>
                    Start Watching{canFinish ? ` (${selected.length})` : ''}
                  </ThemedText>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },

  // Name step
  namePage: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoRow: { marginBottom: 56 },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: C.text,
    lineHeight: 46,
    marginBottom: 16,
  },
  welcomeSub: {
    fontSize: 16,
    color: C.muted,
    lineHeight: 24,
    marginBottom: 48,
  },
  inputGroup: { marginBottom: 32 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: C.input,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: C.text,
  },

  // Movies step
  moviesPage: { flex: 1 },
  moviesHeader: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 20,
  },
  moviesTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    lineHeight: 36,
    marginBottom: 10,
  },
  moviesSub: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },

  searchRow: {
    marginHorizontal: 24,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: C.input,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
  },
  searchSpinner: { position: 'absolute', right: 14 },

  badgeRow: {
    paddingHorizontal: 24,
    marginBottom: 8,
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: C.accentDim,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
  },

  gridContent: { paddingHorizontal: 24, paddingBottom: 16 },
  gridRow: { gap: 6, marginBottom: 6 },

  posterWrap: {
    width: POSTER_WIDTH,
    alignItems: 'center',
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  posterPlaceholder: { backgroundColor: C.surface },
  posterBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  posterBorderSelected: { borderColor: C.accent },
  checkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  posterTitle: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
    width: POSTER_WIDTH,
  },

  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 14, color: C.muted },
  emptyHint: {
    fontSize: 14,
    color: C.dim,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Shared
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    gap: 8,
  },
  bottomHint: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnGrad: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
