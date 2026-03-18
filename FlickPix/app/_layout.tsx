import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useState, useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setApiKey } from '@/services/tmdb';
import { setOpenAIKey } from '@/services/moodSearch';
import { hasCompletedOnboardingSync, hasCompletedOnboarding } from '@/services/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Synchronous check for web (localStorage); async fallback for native
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboardingSync());

  const darkNavigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.tint,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.tint,
    },
  };

  useEffect(() => {
    const envApiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const extraApiKey = (Constants.expoConfig?.extra as { tmdbApiKey?: string } | undefined)?.tmdbApiKey;
    const apiKey = envApiKey ?? extraApiKey;

    if (apiKey) {
      setApiKey(apiKey);
    } else {
      console.warn('TMDB API key is missing. Set EXPO_PUBLIC_TMDB_API_KEY in your .env file.');
    }

    const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (openaiKey) {
      setOpenAIKey(openaiKey);
    }

    // Async check for native (AsyncStorage)
    hasCompletedOnboarding().then(setOnboarded);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? darkNavigationTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {!onboarded && <Redirect href="/onboarding" />}
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
