import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, PaperProvider } from 'react-native-paper';
import { BORDER_RADIUS, BRAND_COLORS } from '../constants/Colors';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BRAND_COLORS.primaryBlue,
    accent: BRAND_COLORS.primaryOrange,
    background: BRAND_COLORS.surface,
    surface: BRAND_COLORS.background,
    error: BRAND_COLORS.error,
    text: '#0f172a',
    onSurface: '#0f172a',
  },
  roundness: BORDER_RADIUS.md,
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={BRAND_COLORS.primaryBlue} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: BRAND_COLORS.surface,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </PaperProvider>
  );
}
