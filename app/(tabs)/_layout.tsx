import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, PaperProvider } from 'react-native-paper';
import { BRAND_COLORS } from '../../constants/Colors';

// Tema personalizado
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

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={BRAND_COLORS.primaryBlue} />
      <Stack 
        screenOptions={{
          headerShown: false, // Esto elimina completamente el header
          contentStyle: {
            backgroundColor: '#f5f5f5',
          },
          animation: 'fade',
        }}
      >
        {/* RUTAS ORIGINALES DEL SISTEMA DE INSPECCIÓN */}
        <Stack.Screen name="index" />
        <Stack.Screen name="machine-list" />
        <Stack.Screen name="machine-type-selection" />
        <Stack.Screen name="new-machine" />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="comments" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="report" />
        
        {/* RUTAS AUTOMISA */}
        <Stack.Screen name="automisa-login" />
        <Stack.Screen name="automisa-home" />
        <Stack.Screen name="automisa-checklist" />

        {/* NUEVAS RUTAS DEL SISTEMA ACTECO */}
        <Stack.Screen name="acteco-report-form" />
        <Stack.Screen name="acteco-general-photo" />
        <Stack.Screen name="acteco-averia-form" />
        <Stack.Screen name="acteco-averia-photo" />
        <Stack.Screen name="acteco-final-form" />
        <Stack.Screen name="acteco-report-view" />
      </Stack>
    </PaperProvider>
  );
}
