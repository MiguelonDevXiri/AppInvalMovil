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
  
  // Colores terciarios (para fondos suaves)
  tertiaryBlue: '#eff6ff',            // Azul muy claro para fondos
  tertiaryOrange: '#fff7ed',          // Naranja muy claro para fondos
};

// Gradientes para LinearGradient (arrays de colores con puntos intermedios para suavidad)
export const GRADIENTS = {
  primary: ['#1e3a8a', '#2563eb', '#3b82f6'] as const,
  primaryDark: ['#1e3a8a', '#1e40af', '#2563eb'] as const,
  secondary: ['#ea580c', '#f97316', '#fb923c'] as const,
  success: ['#15803d', '#16a34a', '#22c55e'] as const,
  warning: ['#a16207', '#ca8a04', '#eab308'] as const,
  error: ['#b91c1c', '#dc2626', '#ef4444'] as const,
  surface: ['#f8fafc', '#f1f5f9'] as const,
  hero: ['#172554', '#1e3a8a', '#2563eb', '#3b82f6'] as const,
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

// Sombras y elevaciones — modernas y sutiles
export const SHADOWS = {
  small: {
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  soft: {
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
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

// Estilos comunes reutilizables
export const COMMON_STYLES = {
  screenBackground: BRAND_COLORS.surface,
  headerGradient: ['#1e3a8a', '#2563eb'] as readonly string[],
  bottomBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
};

export default {
  BRAND_COLORS,
  GRADIENTS,
  Colors,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  COMMON_STYLES,
};