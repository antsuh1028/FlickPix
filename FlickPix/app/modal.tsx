import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ModalScreen() {
  const cardColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const mutedText = useThemeColor({}, 'muted');

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <ThemedText type="title" style={styles.title}>
          Quick Tip
        </ThemedText>
        <ThemedText style={[styles.description, { color: mutedText }]}>
          You can switch profiles on Home to get different recommendation vibes.
        </ThemedText>
        <Link href="/" dismissTo asChild>
          <Pressable style={styles.link}>
            <ThemedText type="link" style={styles.linkText}>
              Back to home
            </ThemedText>
          </Pressable>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  linkText: {
    lineHeight: 20,
  },
});
