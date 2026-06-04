import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { getFilterErrorMessage, getFilterStock, type FilterStockItem } from '../../utils/filterStockStorage';

const DEFAULT_LOW_STOCK_THRESHOLD = 2;

export default function FiltersStockScreen() {
  const [items, setItems] = useState<FilterStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadStock = useCallback(async () => {
    try {
      setItems(await getFilterStock());
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
    return items.filter((item) => item.reference.includes(value) || item.description?.toUpperCase().includes(value));
  }, [items, query]);

  const totals = useMemo(() => items.reduce((acc, item) => ({
    warehouse: acc.warehouse + item.warehouseQty,
    van: acc.van + item.vanQty,
    low: acc.low + ((item.warehouseQty + item.vanQty) <= (item.minimumQty ?? DEFAULT_LOW_STOCK_THRESHOLD) ? 1 : 0),
  }), { warehouse: 0, van: 0, low: 0 }), [items]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStock(); }} />}>
        <Header title="Stock filtros" />
        <View style={styles.summaryRow}>
          <Summary title="Almacén" value={totals.warehouse} icon="warehouse" />
          <Summary title="Furgoneta" value={totals.van} icon="van-utility" />
          <Summary title="Stock bajo" value={totals.low} icon="alert-outline" />
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

function StockCard({ item }: { item: FilterStockItem }) {
  const total = item.warehouseQty + item.vanQty;
  const minimumQty = item.minimumQty ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const isLow = total <= minimumQty;

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reference}>{item.reference}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.total}>{total} uds</Text>
          <View style={[styles.badge, isLow ? styles.badgeWarning : styles.badgeInfo]}>
            <Text style={[styles.badgeText, isLow ? styles.badgeWarningText : styles.badgeInfoText]}>
              {isLow ? 'Stock bajo' : `Mín. ${minimumQty}`}
            </Text>
          </View>
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
  stockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  reference: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  description: { color: BRAND_COLORS.grayText, marginTop: 4, lineHeight: 20 },
  total: { color: BRAND_COLORS.primaryOrange, fontWeight: '900' },
  qtyRow: { flexDirection: 'row', gap: SPACING.sm },
  qtyBox: { flex: 1, backgroundColor: BRAND_COLORS.surface, borderRadius: 14, padding: SPACING.md },
  qtyLabel: { color: BRAND_COLORS.grayText, fontWeight: '700' },
  qtyValue: { color: BRAND_COLORS.primaryBlue, fontSize: 22, fontWeight: '900' },
  badge: { marginTop: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeInfo: { backgroundColor: '#dbeafe' },
  badgeWarning: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  badgeInfoText: { color: BRAND_COLORS.primaryBlue },
  badgeWarningText: { color: BRAND_COLORS.primaryOrange },
  empty: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  emptyText: { color: BRAND_COLORS.grayText, marginTop: 6, textAlign: 'center' },
});
