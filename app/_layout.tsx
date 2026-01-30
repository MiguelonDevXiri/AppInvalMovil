import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, PaperProvider } from 'react-native-paper';
import { BRAND_COLORS } from '../constants/Colors';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BRAND_COLORS.primaryBlue,
    accent: BRAND_COLORS.primaryOrange,
    background: '#f5f5f5',
    surface: '#FFFFFF',
    error: '#B00020',
    text: '#000000',
    onSurface: '#000000',
    secondaryButton: BRAND_COLORS.primaryOrange,
    cardBorder: BRAND_COLORS.primaryOrange,
  },
  roundness: 0,
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={BRAND_COLORS.primaryBlue} />
      <Stack
        screenOptions={{
          headerShown: false, // Elimina el header en todas las pantallas
          contentStyle: {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </PaperProvider>
  );
}