import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const picks = [
    { title: 'Inception', reason: 'Mind-bending sci-fi thriller' },
    { title: 'The Dark Knight', reason: 'Action with strong story' },
    { title: 'Interstellar', reason: 'Emotional space adventure' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">FlickPix</ThemedText>
        <ThemedText>Movie picks based on what you like.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Today&apos;s picks</ThemedText>
        {picks.map((movie) => (
          <ThemedView key={movie.title} style={styles.card}>
            <ThemedText type="defaultSemiBold">{movie.title}</ThemedText>
            <ThemedText>{movie.reason}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <Pressable style={styles.button}>
          <ThemedText type="defaultSemiBold">Get new recommendations</ThemedText>
        </Pressable>
        <Pressable style={styles.button}>
          <ThemedText type="defaultSemiBold">View watch history</ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  section: {
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    gap: 4,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
});
