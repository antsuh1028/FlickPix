import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Image,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

const RECENT_RATINGS = [
  { id: 550, title: 'Fight Club', rating: 9, poster: null },
  { id: 155, title: 'The Dark Knight', rating: 10, poster: null },
  { id: 680, title: 'Pulp Fiction', rating: 8, poster: null },
  { id: 13, title: 'Forrest Gump', rating: 9, poster: null },
  { id: 238, title: 'The Godfather', rating: 10, poster: null },
];

const FAVORITE_GENRES = [
  { name: 'Sci-Fi', count: 12, color: '#8B5CF6' },
  { name: 'Thriller', count: 9, color: '#EC4899' },
  { name: 'Drama', count: 8, color: '#3B82F6' },
  { name: 'Action', count: 6, color: '#F59E0B' },
];

const WATCHLIST = [
  { id: 27205, title: 'Inception', year: '2010', poster: null },
  { id: 157336, title: 'Interstellar', year: '2014', poster: null },
  { id: 424, title: "Schindler's List", year: '1993', poster: null },
];

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const colorScheme = useColorScheme();
  const theme = COLORS[colorScheme ?? 'dark'];

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
            Movie Buff
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
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statValue, { color: theme.accent }]}>47</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Watched</ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statValue, { color: theme.green }]}>8.2</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Avg Rating</ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ThemedText style={[styles.statValue, { color: theme.orange }]}>12</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Watchlist</ThemedText>
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
            {FAVORITE_GENRES.map((genre, index) => (
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
                        width: `${(genre.count / 12) * 100}%`,
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
            {RECENT_RATINGS.map((movie) => (
              <Pressable 
                key={movie.id}
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
                See all ({WATCHLIST.length})
              </ThemedText>
            </Pressable>
          </View>
          
          <View style={[styles.watchlistCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {WATCHLIST.map((movie, index) => (
              <View key={movie.id}>
                <View style={styles.watchlistItem}>
                  <View style={[styles.watchlistPoster, { backgroundColor: theme.posterBg }]}>
                    <ThemedText style={styles.watchlistPosterEmoji}>🎬</ThemedText>
                  </View>
                  <View style={styles.watchlistInfo}>
                    <ThemedText style={[styles.watchlistTitle, { color: theme.text }]}>
                      {movie.title}
                    </ThemedText>
                    <ThemedText style={[styles.watchlistYear, { color: theme.textMuted }]}>
                      {movie.year}
                    </ThemedText>
                  </View>
                  <Pressable style={[styles.watchlistButton, { backgroundColor: theme.accent }]}>
                    <ThemedText style={styles.watchlistButtonText}>▶</ThemedText>
                  </Pressable>
                </View>
                {index < WATCHLIST.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                )}
              </View>
            ))}
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
});