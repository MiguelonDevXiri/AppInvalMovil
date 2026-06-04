import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { getFilterErrorMessage, getFilterStock, saveFilterStockCounts, type FilterStockCountDraft, type FilterStockItem } from '../../utils/filterStockStorage';

type CountState = Record<string, { warehouse: string; van: string; notes: string }>;

export default function FiltersAuditScreen() {
  const [items, setItems] = useState<FilterStockItem[]>([]);
  const [counts, setCounts] = useState<CountState>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      const stock = await getFilterStock();
      setItems(stock);
      setCounts(Object.fromEntries(stock.map((item) => [item.reference, {
        warehouse: String(item.warehouseQty),
        van: String(item.vanQty),
        notes: '',
      }])));
    } catch (error: unknown) {
      Alert.alert('No se pudo cargar el stock', getFilterErrorMessage(error, 'Revisa la conexión e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStock(); }, [loadStock]));

  const filteredItems = useMemo(() => {
    const value = query.trim().toUpperCase();
    if (!value) return items;
    return items.filter((item) => item.reference.includes(value) || item.description?.toUpperCase().includes(value));
  }, [items, query]);

  const differences = useMemo(() => items.reduce((total, item) => {
    const count = counts[item.reference];
    const warehouse = Number(count?.warehouse || 0) - item.warehouseQty;
    const van = Number(count?.van || 0) - item.vanQty;
    return total + Math.abs(warehouse) + Math.abs(van);
  }, 0), [counts, items]);

  const discrepancyReferences = useMemo(() => items.reduce((total, item) => {
    const count = counts[item.reference];
    const warehouse = Number(count?.warehouse || 0) - item.warehouseQty;
    const van = Number(count?.van || 0) - item.vanQty;
    return total + (warehouse !== 0 || van !== 0 ? 1 : 0);
  }, 0), [counts, items]);

  const updateCount = (reference: string, key: 'warehouse' | 'van' | 'notes', value: string) => {
    setCounts((current) => ({
      ...current,
      [reference]: {
        warehouse: current[reference]?.warehouse ?? '0',
        van: current[reference]?.van ?? '0',
        notes: current[reference]?.notes ?? '',
        [key]: value,
      },
    }));
  };

  const markOk = (item: FilterStockItem) => {
    setCounts((current) => ({
      ...current,
      [item.reference]: { warehouse: String(item.warehouseQty), van: String(item.vanQty), notes: current[item.reference]?.notes ?? '' },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const technicianJson = await AsyncStorage.getItem('current_technician');
      const technician = technicianJson ? (JSON.parse(technicianJson) as { name?: string | null }) : null;
      const drafts: FilterStockCountDraft[] = items.map((item) => ({
        reference: item.reference,
        expectedWarehouseQty: item.warehouseQty,
        expectedVanQty: item.vanQty,
        countedWarehouseQty: Number(counts[item.reference]?.warehouse || 0),
        countedVanQty: Number(counts[item.reference]?.van || 0),
        notes: counts[item.reference]?.notes || null,
      }));
      const invalid = drafts.find((draft) => !Number.isFinite(draft.countedWarehouseQty) || !Number.isFinite(draft.countedVanQty));
      if (invalid) throw new Error(`Cantidad no válida en ${invalid.reference}.`);
      await saveFilterStockCounts({ counts: drafts, technicianName: technician?.name });
      Alert.alert('Recuento guardado', differences > 0 ? `Se han guardado descuadres por ${differences} uds.` : 'Todo coincide con el stock esperado.');
      router.back();
    } catch (error: unknown) {
      Alert.alert('No se pudo guardar', getFilterErrorMessage(error, 'Revisa los datos e inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Header title="Comprobar stock" />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Descuadre total detectado</Text>
          <Text style={[styles.summaryValue, differences > 0 ? styles.warningText : styles.okText]}>{differences} uds</Text>
          <Text style={styles.summarySubvalue}>{discrepancyReferences} referencias con descuadre</Text>
          <Text style={styles.summaryHint}>Esto guarda el recuento físico. No corrige el stock automáticamente.</Text>
        </View>
        <TextInput label="Buscar referencia" value={query} onChangeText={setQuery} autoCapitalize="characters" mode="outlined" style={styles.search} />
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={BRAND_COLORS.primaryOrange} /> : null}
        {!loading && filteredItems.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Sin referencias</Text><Text style={styles.emptyText}>No hay stock para comprobar.</Text></View> : null}
        {filteredItems.map((item) => <AuditCard key={item.reference} item={item} count={counts[item.reference]} onChange={updateCount} onOk={markOk} />)}
        <Button mode="contained" loading={saving} disabled={saving || loading || items.length === 0} onPress={handleSave} style={styles.saveButton}>Guardar recuento físico</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuditCard({ item, count, onChange, onOk }: {
  item: FilterStockItem;
  count?: { warehouse: string; van: string; notes: string };
  onChange: (reference: string, key: 'warehouse' | 'van' | 'notes', value: string) => void;
  onOk: (item: FilterStockItem) => void;
}) {
  const realWarehouse = Number(count?.warehouse || 0);
  const realVan = Number(count?.van || 0);
  const warehouseDiff = realWarehouse - item.warehouseQty;
  const vanDiff = realVan - item.vanQty;
  const ok = warehouseDiff === 0 && vanDiff === 0;

  return (
    <View style={styles.auditCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reference}>{item.reference}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        </View>
        <View style={[styles.statusBadge, ok ? styles.okBadge : styles.warningBadge]}>
          <Text style={[styles.statusText, ok ? styles.okText : styles.warningText]}>{ok ? 'OK' : 'Descuadre'}</Text>
        </View>
      </View>
      <View style={styles.qtyGrid}>
        <QtyInput title="Almacén" expected={item.warehouseQty} value={count?.warehouse ?? '0'} diff={warehouseDiff} onChangeText={(value) => onChange(item.reference, 'warehouse', value)} />
        <QtyInput title="Furgoneta" expected={item.vanQty} value={count?.van ?? '0'} diff={vanDiff} onChangeText={(value) => onChange(item.reference, 'van', value)} />
      </View>
      <TextInput label="Nota si hay descuadre" value={count?.notes ?? ''} onChangeText={(value) => onChange(item.reference, 'notes', value)} mode="outlined" style={styles.noteInput} />
      <Button mode="outlined" onPress={() => onOk(item)} style={styles.okButton}>Marcar OK</Button>
    </View>
  );
}

function QtyInput({ title, expected, value, diff, onChangeText }: { title: string; expected: number; value: string; diff: number; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.qtyBox}>
      <Text style={styles.qtyTitle}>{title}</Text>
      <Text style={styles.expected}>Debería: {expected}</Text>
      <TextInput label="Real" value={value} onChangeText={onChangeText} keyboardType="numeric" mode="outlined" style={styles.qtyInput} />
      <Text style={[styles.diff, diff === 0 ? styles.okText : styles.warningText]}>{diff === 0 ? 'Coincide' : `${diff > 0 ? '+' : ''}${diff} uds`}</Text>
    </View>
  );
}

function Header({ title }: { title: string }) {
  return <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity><Text style={styles.headerTitle}>{title}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  scrollView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  container: { paddingBottom: SPACING.xxl },
  header: { backgroundColor: BRAND_COLORS.primaryBlue, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '800' },
  summaryCard: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.md, ...SHADOWS.soft },
  summaryLabel: { color: BRAND_COLORS.grayText, fontWeight: '800' },
  summaryValue: { fontSize: 34, fontWeight: '900', marginTop: 4 },
  summarySubvalue: { color: '#0f172a', fontWeight: '800', marginTop: 2 },
  summaryHint: { color: BRAND_COLORS.grayText, marginTop: 6, lineHeight: 20 },
  search: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: 'white' },
  auditCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.md, ...SHADOWS.soft },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  reference: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  description: { color: BRAND_COLORS.grayText, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  okBadge: { backgroundColor: '#dcfce7' },
  warningBadge: { backgroundColor: '#fff7ed' },
  statusText: { fontSize: 12, fontWeight: '900' },
  qtyGrid: { flexDirection: 'row', gap: SPACING.sm },
  qtyBox: { flex: 1, backgroundColor: BRAND_COLORS.surface, borderRadius: 14, padding: SPACING.sm },
  qtyTitle: { color: '#0f172a', fontWeight: '900' },
  expected: { color: BRAND_COLORS.grayText, fontSize: 12, marginTop: 2 },
  qtyInput: { marginTop: SPACING.sm, backgroundColor: 'white' },
  diff: { marginTop: 6, fontWeight: '900' },
  okText: { color: '#15803d' },
  warningText: { color: BRAND_COLORS.primaryOrange },
  noteInput: { marginTop: SPACING.md, backgroundColor: 'white' },
  okButton: { marginTop: SPACING.md, borderRadius: 12 },
  saveButton: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: 12, paddingVertical: 4, backgroundColor: BRAND_COLORS.primaryOrange },
  empty: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 18, padding: SPACING.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  emptyText: { color: BRAND_COLORS.grayText, marginTop: 6, textAlign: 'center' },
});
