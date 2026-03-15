/**
 * Paleta de colores moderna y profesional para la aplicación Taller de Máquinas
 */

// Colores principales con gradientes y variaciones
export const BRAND_COLORS = {
  // Azules principales (más modernos)
  primaryBlue: '#1e3a8a',        // Azul profundo y profesional
  secondaryBlue: '#3b82f6',      // Azul vibrante
  lightBlue: '#dbeafe',          // Azul muy claro
  darkBlue: '#1e40af',           // Azul oscuro para contraste

  // Naranjas actualizados (más vibrantes)
  primaryOrange: '#ea580c',      // Naranja energético
  secondaryOrange: '#fb923c',    // Naranja suave
  lightOrange: '#fed7aa',        // Naranja claro
  darkOrange: '#c2410c',         // Naranja oscuro

  // Grises modernos
  grayLight: '#f8fafc',          // Gris muy claro
  grayMedium: '#e2e8f0',         // Gris medio
  grayDark: '#475569',           // Gris oscuro
  grayText: '#64748b',           // Gris para textos

  // Estados y utilidades
  success: '#16a34a',            // Verde para éxito
  successLight: '#dcfce7',       // Verde claro
  
  warning: '#ca8a04',            // Amarillo para advertencias
  warningLight: '#fef3c7',       // Amarillo claro
  
  error: '#dc2626',              // Rojo para errores
  errorLight: '#fecaca',         // Rojo claro
  
  info: '#0891b2',               // Azul para información
  infoLight: '#cffafe',          // Azul claro para información

  // Fondos y superficies
  background: '#ffffff',         // Fondo principal
  surface: '#f1f5f9',           // Superficie elevada
  surfaceDark: '#e2e8f0',       // Superficie oscura
  
  // Gradientes
  gradientPrimary: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  gradientSecondary: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
  gradientSuccess: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
  gradientWarning: 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)',
  gradientError: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
};

// Paleta para temas claro y oscuro
const tintColorLight = BRAND_COLORS.primaryBlue;
const tintColorDark = BRAND_COLORS.secondaryOrange;

export const Colors = {
  light: {
    text: '#0f172a',
    background: BRAND_COLORS.background,
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    primary: BRAND_COLORS.primaryBlue,
    accent: BRAND_COLORS.primaryOrange,
    surface: BRAND_COLORS.surface,
    border: BRAND_COLORS.grayMedium,
    placeholder: BRAND_COLORS.grayText,
  },
  dark: {
    text: '#f1f5f9',
    background: '#0f172a',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    primary: BRAND_COLORS.secondaryBlue,
    accent: BRAND_COLORS.secondaryOrange,
    surface: '#1e293b',
    border: '#334155',
    placeholder: '#64748b',
  },
};

// Sombras y elevaciones
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  card: {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Espaciado consistente
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Tipografía
export const TYPOGRAPHY = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
    header: 32,
  },
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

// Border radius consistente
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export default {
  BRAND_COLORS,
  Colors,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
};