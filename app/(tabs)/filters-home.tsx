import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

const actions = [
  {
    title: 'Reponer',
    subtitle: 'Entrada de filtros nuevos o carga de furgoneta',
    icon: 'package-variant-plus',
    colors: ['#15803d', '#16a34a', '#22c55e'],
    route: '/filters-replenish' as Href,
  },
  {
    title: 'Extraer',
    subtitle: 'Salida para taller o preventivos',
    icon: 'package-variant-minus',
    colors: ['#ea580c', '#f97316', '#fb923c'],
    route: '/filters-extract' as Href,
  },
  {
    title: 'Cruces',
    subtitle: 'Buscar equivalencias de referencias (preparado)',
    icon: 'swap-horizontal-bold',
    colors: ['#7c3aed', '#8b5cf6', '#a78bfa'],
    route: '/filters-crosses' as Href,
  },
  {
    title: 'Comprobar stock',
    subtitle: 'Recuento físico y descuadres no apuntados',
    icon: 'clipboard-check-outline',
    colors: ['#b45309', '#d97706', '#f59e0b'],
    route: '/filters-audit' as Href,
  },
  {
    title: 'Ver stock',
    subtitle: 'Almacén y furgoneta preventivo',
    icon: 'warehouse',
    colors: ['#0f2f57', '#2563eb', '#60a5fa'],
    route: '/filters-stock' as Href,
  },
] as const;

export default function FiltersHomeScreen() {
  const navigate = useCallback((route: Href) => router.push(route), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <LinearGradient colors={GRADIENTS.hero as unknown as [string, string, ...string[]]} style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="air-filter" size={42} color="white" />
          <Text style={styles.heroTitle}>Filtros hidráulicos</Text>
          <Text style={styles.heroSubtitle}>Control de stock de almacén y furgoneta preventivo</Text>
        </LinearGradient>

        <View style={styles.grid}>
          {actions.map((action) => (
            <TouchableOpacity key={action.title} onPress={() => navigate(action.route)} activeOpacity={0.86} style={styles.cardWrapper}>
              <LinearGradient colors={action.colors as unknown as [string, string, ...string[]]} style={styles.card}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name={action.icon as any} size={34} color="white" />
                </View>
                <Text style={styles.cardTitle}>{action.title}</Text>
                <Text style={styles.cardSubtitle}>{action.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  scrollView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  container: { paddingBottom: SPACING.xxl },
  hero: { padding: SPACING.lg, paddingTop: SPACING.xl, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { position: 'absolute', top: SPACING.lg, left: SPACING.md, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  heroTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.title, fontWeight: '800', marginTop: SPACING.sm },
  heroSubtitle: { color: 'rgba(255,255,255,0.86)', textAlign: 'center', marginTop: 6, fontSize: TYPOGRAPHY.sizes.md },
  grid: { padding: SPACING.md, gap: SPACING.md },
  cardWrapper: { borderRadius: 24, overflow: 'hidden', ...SHADOWS.card },
  card: { minHeight: 150, padding: SPACING.lg, justifyContent: 'space-between' },
  iconCircle: { width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: SPACING.md },
  cardSubtitle: { color: 'rgba(255,255,255,0.86)', fontSize: TYPOGRAPHY.sizes.md, lineHeight: 22 },
});
