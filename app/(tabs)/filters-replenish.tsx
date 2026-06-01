import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { getFilterReferences, replenishFilterStock, type FilterLocation } from '../../utils/filterStockStorage';

export default function FiltersReplenishScreen() {
  const [location, setLocation] = useState<FilterLocation>('almacen');
  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadReferences = useCallback(async () => {
    try { setReferences(await getFilterReferences()); } catch (error) { console.error(error); }
  }, []);

  useEffect(() => { loadReferences(); }, [loadReferences]);

  const suggestions = useMemo(() => {
    const query = reference.trim().toUpperCase();
    if (!query) return references.slice(0, 8);
    return references.filter((item) => item.includes(query)).slice(0, 8);
  }, [reference, references]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const technicianJson = await AsyncStorage.getItem('current_technician');
      const technician = technicianJson ? JSON.parse(technicianJson) : null;
      await replenishFilterStock({ reference, quantity: Number(quantity), location, technicianName: technician?.name });
      Alert.alert('Stock actualizado', location === 'furgoneta' ? 'Se ha descontado del almacén y añadido a furgoneta.' : 'Se ha añadido al almacén.');
      setReference('');
      setQuantity('');
      await loadReferences();
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.message || 'Revisa los datos e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Header title="Reponer filtros" />
        <View style={styles.card}>
          <Text style={styles.label}>Destino de reposición</Text>
          <View style={styles.row}>
            <Chip selected={location === 'almacen'} onPress={() => setLocation('almacen')} style={styles.chip}>Almacén</Chip>
            <Chip selected={location === 'furgoneta'} onPress={() => setLocation('furgoneta')} style={styles.chip}>Furgoneta</Chip>
          </View>
          {location === 'furgoneta' && <Text style={styles.note}>La reposición de furgoneta se descuenta automáticamente del almacén.</Text>}

          <TextInput label="Referencia" value={reference} onChangeText={setReference} autoCapitalize="characters" mode="outlined" style={styles.input} />
          {suggestions.length > 0 && (
            <View style={styles.suggestions}>{suggestions.map((item) => <Chip key={item} compact onPress={() => setReference(item)} style={styles.suggestionChip}>{item}</Chip>)}</View>
          )}
          <TextInput label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
          <Button mode="contained" loading={saving} disabled={saving} onPress={handleSave} style={styles.button}>Guardar reposición</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  card: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 20, padding: SPACING.md, ...SHADOWS.card },
  label: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  chip: { marginRight: SPACING.xs },
  note: { color: BRAND_COLORS.grayText, marginBottom: SPACING.md, lineHeight: 20 },
  input: { marginTop: SPACING.md, backgroundColor: 'white' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  suggestionChip: { marginRight: 4, marginBottom: 4 },
  button: { marginTop: SPACING.lg, borderRadius: 12, paddingVertical: 4 },
});
