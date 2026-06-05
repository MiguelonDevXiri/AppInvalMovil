import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { getFilterCatalogStock, getFilterErrorMessage, type FilterStockItem } from '../../utils/filterStockStorage';

const DEFAULT_LOW_STOCK_THRESHOLD = 2;
const DEFAULT_RECOMMENDED_STOCK_THRESHOLD = 4;

export default function FiltersStockScreen() {
  const [items, setItems] = useState<FilterStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadStock = useCallback(async () => {
    try {
      setItems(await getFilterCatalogStock());
    } catch (error: unknown) {
      Alert.alert('No se pudo cargar el stock', getFilterErrorMessage(error, 'Revisa la conexión e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStock(); }, [loadStock]));

  const filteredItems = useMemo(() => {
    const value = query.trim().toUpperCase();
    if (!value) return items;
    return items.filter((item) => {
      const searchable = [item.reference, item.description || '', ...(item.codes || []), ...(item.equivalents || [])].join(' ').toUpperCase();
      return searchable.includes(value);
    });
  }, [items, query]);

  const totals = useMemo(() => items.reduce((acc, item) => ({
    warehouse: acc.warehouse + item.warehouseQty,
    van: acc.van + item.vanQty,
    low: acc.low + ((item.warehouseQty + item.vanQty) <= (item.minimumQty ?? DEFAULT_LOW_STOCK_THRESHOLD) ? 1 : 0),
    recommended: acc.recommended + ((item.warehouseQty + item.vanQty) > (item.minimumQty ?? DEFAULT_LOW_STOCK_THRESHOLD) && (item.warehouseQty + item.vanQty) <= (item.recommendedQty ?? DEFAULT_RECOMMENDED_STOCK_THRESHOLD) ? 1 : 0),
  }), { warehouse: 0, van: 0, low: 0, recommended: 0 }), [items]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStock(); }} />}>
        <Header title="Stock filtros" />
        <View style={styles.summaryRow}>
          <Summary title="Almacén" value={totals.warehouse} icon="warehouse" />
          <Summary title="Furgoneta" value={totals.van} icon="van-utility" />
          <Summary title="Stock bajo" value={totals.low} icon="alert-outline" />
          <Summary title="Bajo recomendado" value={totals.recommended} icon="alert-circle-outline" />
        </View>
        <TextInput label="Buscar referencia" value={query} onChangeText={setQuery} autoCapitalize="characters" mode="outlined" style={styles.search} />
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={BRAND_COLORS.primaryOrange} /> : filteredItems.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Sin stock</Text><Text style={styles.emptyText}>Repón filtros para empezar a ver referencias.</Text></View>
        ) : filteredItems.map((item) => <StockCard key={item.reference} item={item} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity><Text style={styles.headerTitle}>{title}</Text></View>;
}

function Summary({ title, value, icon }: { title: string; value: number; icon: string }) {
  return <View style={styles.summaryCard}><MaterialCommunityIcons name={icon as any} size={24} color={BRAND_COLORS.primaryOrange} /><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryTitle}>{title}</Text></View>;
}

function getCleanDescription(item: FilterStockItem) {
  const description = item.description?.trim();
  if (!description) return null;
  return description
    .replace(/\s*·\s*Código:\s*[^·]+/i, '')
    .replace(/^Código:\s*[^·]+\s*·\s*/i, '')
    .replace(/^Código:\s*[^·]+$/i, '')
    .trim() || null;
}

function StockCard({ item }: { item: FilterStockItem }) {
  const total = item.warehouseQty + item.vanQty;
  const minimumQty = item.minimumQty ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const recommendedQty = Math.max(item.recommendedQty ?? DEFAULT_RECOMMENDED_STOCK_THRESHOLD, minimumQty);
  const isLow = total <= minimumQty;
  const isUnderRecommended = !isLow && total <= recommendedQty;
  const description = getCleanDescription(item);
  const codes = item.codes || [];
  const alternatives = item.equivalents || [];

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={styles.stockInfo}>
          <Text style={styles.reference}>{item.reference}</Text>
          {alternatives.length > 0 ? <Text style={styles.alternatives}>Alt. {alternatives.join(' / ')}</Text> : null}
          {codes.length > 0 ? <Text style={styles.code}>Código: {codes.join(' / ')}</Text> : null}
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.total}>{total} uds</Text>
          <View style={[styles.badge, isLow ? styles.badgeWarning : isUnderRecommended ? styles.badgeRecommended : styles.badgeInfo]}>
            <Text style={[styles.badgeText, isLow ? styles.badgeWarningText : isUnderRecommended ? styles.badgeRecommendedText : styles.badgeInfoText]}>
              {isLow ? 'Stock mínimo' : isUnderRecommended ? 'Bajo recomendado' : 'Correcto'}
            </Text>
          </View>
          <Text style={styles.thresholdText}>Mín. {minimumQty} · Rec. {recommendedQty}</Text>
        </View>
      </View>
      <View style={styles.qtyRow}>
        <View style={styles.qtyBox}><Text style={styles.qtyLabel}>Almacén</Text><Text style={styles.qtyValue}>{item.warehouseQty}</Text></View>
        <View style={styles.qtyBox}><Text style={styles.qtyLabel}>Furgoneta</Text><Text style={styles.qtyValue}>{item.vanQty}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  scrollView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  container: { paddingBottom: SPACING.xxl },
  header: { backgroundColor: BRAND_COLORS.primaryBlue, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, padding: SPACING.md },
  summaryCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: 'white', borderRadius: 18, padding: SPACING.md, alignItems: 'center', ...SHADOWS.soft },
  summaryValue: { color: '#0f172a', fontSize: 26, fontWeight: '900', marginTop: 4 },
  summaryTitle: { color: BRAND_COLORS.grayText, fontWeight: '700' },
  search: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: 'white' },
  stockCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.md, ...SHADOWS.soft },
  stockHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.md },
  stockInfo: { flex: 1 },
  totalBox: { alignItems: 'flex-end' },
  reference: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  alternatives: { color: BRAND_COLORS.primaryBlue, marginTop: 2, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  code: { color: '#334155', marginTop: 8, fontSize: 13, fontWeight: '900' },
  description: { color: BRAND_COLORS.grayText, marginTop: 4, lineHeight: 20 },
  total: { color: BRAND_COLORS.primaryOrange, fontWeight: '900' },
  qtyRow: { flexDirection: 'row', gap: SPACING.sm },
  qtyBox: { flex: 1, backgroundColor: BRAND_COLORS.surface, borderRadius: 14, padding: SPACING.md },
  qtyLabel: { color: BRAND_COLORS.grayText, fontWeight: '700' },
  qtyValue: { color: BRAND_COLORS.primaryBlue, fontSize: 22, fontWeight: '900' },
  badge: { marginTop: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeInfo: { backgroundColor: '#dbeafe' },
  badgeWarning: { backgroundColor: '#fff7ed' },
  badgeRecommended: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  badgeInfoText: { color: BRAND_COLORS.primaryBlue },
  badgeWarningText: { color: BRAND_COLORS.primaryOrange },
  badgeRecommendedText: { color: '#a16207' },
  thresholdText: { marginTop: 4, color: BRAND_COLORS.grayText, fontSize: 11, fontWeight: '800' },
  empty: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  emptyText: { color: BRAND_COLORS.grayText, marginTop: 6, textAlign: 'center' },
});
