import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, PaperProvider } from 'react-native-paper';
import { BORDER_RADIUS, BRAND_COLORS } from '../../constants/Colors';

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

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={BRAND_COLORS.primaryBlue} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: BRAND_COLORS.surface,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="machine-list" />
        <Stack.Screen name="machine-type-selection" />
        <Stack.Screen name="new-machine" />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="checklist-materials" />
        <Stack.Screen name="comments" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="report" />
        <Stack.Screen name="exit-machine-list" />
        <Stack.Screen name="exit-management" />
        <Stack.Screen name="exit-inspection" />
        <Stack.Screen name="exit-photos" />

        <Stack.Screen name="acteco-report-form" />
        <Stack.Screen name="acteco-general-photo" />
        <Stack.Screen name="acteco-averia-form" />
        <Stack.Screen name="acteco-averia-photo" />
        <Stack.Screen name="acteco-final-form" />
        <Stack.Screen name="acteco-report-view" />
        <Stack.Screen name="acteco-solucion-materiales" />
        <Stack.Screen name="acteco-inspections-list" />

        <Stack.Screen name="averia-machine-form" />
        <Stack.Screen name="averia-defects-form" />
        <Stack.Screen name="averia-solucion-form" />
        <Stack.Screen name="averia-materiales-form" />
        <Stack.Screen name="averia-final-form" />
        <Stack.Screen name="averia-report-view" />
        <Stack.Screen name="averia-inspections-list" />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
