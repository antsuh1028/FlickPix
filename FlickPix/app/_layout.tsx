import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { setApiKey } from '@/services/tmdb';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const envApiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const extraApiKey = (Constants.expoConfig?.extra as { tmdbApiKey?: string } | undefined)?.tmdbApiKey;
    const apiKey = envApiKey ?? extraApiKey;

    if (apiKey) {
      setApiKey(apiKey);
      return;
    }

    console.warn('TMDB API key is missing. Set EXPO_PUBLIC_TMDB_API_KEY in your .env file.');
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
