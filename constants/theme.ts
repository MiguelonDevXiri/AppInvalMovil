import { DefaultTheme } from 'react-native-paper';
import { BRAND_COLORS } from './Colors';

export const appTheme = {
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
    notification: BRAND_COLORS.primaryOrange,
  },
  roundness: 0, // Sin bordes redondeados
};

export default appTheme;