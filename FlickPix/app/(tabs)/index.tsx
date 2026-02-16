import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import { getRecommendations, type Recommendation } from '@/services/recommendations';
import { getAvailableUsers, getActiveUserId, setActiveUser } from '@/services/storage';

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
  const [activeUser, setActiveUserState] = useState(getActiveUserId());
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

  const users = getAvailableUsers();
  const activeUserName = users.find((u) => u.id === activeUser)?.name ?? 'User';

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const recs = await getRecommendations({ limit: 6 });
      setPicks(recs);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load recommendations';
      setError(message);
      setPicks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const switchUser = (userId: string) => {
    setActiveUser(userId);
    setActiveUserState(userId);
    setShowUserMenu(false);
    loadRecommendations();
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

          <View style={styles.cardStack}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.accent} />
                <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>Loading picks...</ThemedText>
              </View>
            ) : picks.length > 0 ? (
              picks.map((movie) => (
                <Pressable
                  key={movie.id}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardMain}>
                      <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
                        {movie.title}
                      </ThemedText>
                      <ThemedText style={[styles.cardYear, { color: theme.textMuted }]}> 
                        {movie.releaseDate?.slice(0, 4) || '—'}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.cardReason, { color: theme.textMuted }]}
                      numberOfLines={2}
                    >
                      {movie.reason}
                    </ThemedText>
                  </View>
                  <View style={[styles.cardAccent, { backgroundColor: theme.accent }]} />
                </Pressable>
              ))
            ) : (
              <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>No recommendations yet.</ThemedText>
            )}
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={loadRecommendations}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>
            {isLoading ? 'Refreshing...' : 'Get new recommendations'}
          </ThemedText>
        </Pressable>

        {/* Footer hint */}
        <ThemedText style={[styles.footerHint, { color: theme.textMuted }]}>
          {error ? error : 'Add more movies for better suggestions'}
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
  cardStack: {
    gap: 12,
  },
  loadingState: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardContent: {
    flex: 1,
    padding: 18,
    gap: 8,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  cardYear: {
    fontSize: 14,
  },
  cardReason: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardAccent: {
    width: 4,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 13,
  },
});