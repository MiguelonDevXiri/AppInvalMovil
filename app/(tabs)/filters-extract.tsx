import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { extractFilterStock, getFilterErrorMessage, getFilterCatalogStock, type FilterExtractionDestination, type FilterLocation, type FilterStockItem } from '../../utils/filterStockStorage';

export default function FiltersExtractScreen() {
  const [destination, setDestination] = useState<FilterExtractionDestination>('taller');
  const [location, setLocation] = useState<FilterLocation>('almacen');
  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('');
  const [machineType, setMachineType] = useState('');
  const [stockItems, setStockItems] = useState<FilterStockItem[]>([]);
  const [saving, setSaving] = useState(false);

  const loadStock = useCallback(async () => {
    try {
      setStockItems(await getFilterCatalogStock());
    } catch (error: unknown) {
      console.error(error);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadStock();
  }, [loadStock]));

  const normalizedReference = reference.trim().toUpperCase();
  const selectedItem = useMemo(
    () => stockItems.find((item) => item.reference === normalizedReference || item.codes?.includes(normalizedReference) || item.equivalents?.includes(normalizedReference)),
    [normalizedReference, stockItems],
  );

  const suggestions = useMemo(() => {
    if (!normalizedReference) return stockItems.slice(0, 8);
    return stockItems
      .filter((item) => {
        const searchable = [item.reference, item.description || '', ...(item.codes || []), ...(item.equivalents || [])].join(' ').toUpperCase();
        return searchable.includes(normalizedReference);
      })
      .slice(0, 8);
  }, [normalizedReference, stockItems]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const technicianJson = await AsyncStorage.getItem('current_technician');
      const technician = technicianJson ? (JSON.parse(technicianJson) as { name?: string | null }) : null;
      await extractFilterStock({ reference: selectedItem?.reference || reference, quantity: Number(quantity), location, destination, machineType, technicianName: technician?.name });
      Alert.alert('Extracción registrada', 'Se ha descontado del stock seleccionado.');
      setReference('');
      setQuantity('');
      setMachineType('');
      await loadStock();
    } catch (error: unknown) {
      Alert.alert('No se pudo extraer', getFilterErrorMessage(error, 'Revisa los datos e inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Header title="Extraer filtros" />
        <View style={styles.card}>
          <Text style={styles.label}>Uso</Text>
          <View style={styles.row}>
            <Chip selected={destination === 'taller'} onPress={() => setDestination('taller')} style={styles.chip}>Taller</Chip>
            <Chip selected={destination === 'preventivo'} onPress={() => setDestination('preventivo')} style={styles.chip}>Preventivo</Chip>
          </View>

          <Text style={styles.label}>Origen</Text>
          <View style={styles.row}>
            <Chip selected={location === 'almacen'} onPress={() => setLocation('almacen')} style={styles.chip}>Almacén</Chip>
            <Chip selected={location === 'furgoneta'} onPress={() => setLocation('furgoneta')} style={styles.chip}>Furgoneta</Chip>
          </View>

          <TextInput label="Referencia" value={reference} onChangeText={setReference} autoCapitalize="characters" mode="outlined" style={styles.input} />
          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((item) => (
                <Chip key={item.reference} compact onPress={() => setReference(item.reference)} style={styles.suggestionChip}>
                  {item.reference}{item.equivalents?.length ? ` · ${item.equivalents.slice(0, 2).join(' / ')}` : item.codes?.length ? ` · ${item.codes[0]}` : ''}
                </Chip>
              ))}
            </View>
          )}
          {selectedItem ? (
            <View style={styles.stockHintCard}>
              <Text style={styles.stockHintTitle}>Disponible para extraer</Text>
              <Text style={styles.stockHintText}>
                {location === 'almacen' ? 'Almacén' : 'Furgoneta'}: {location === 'almacen' ? selectedItem.warehouseQty : selectedItem.vanQty} uds
              </Text>
              <Text style={styles.stockHintText}>Total referencia: {selectedItem.warehouseQty + selectedItem.vanQty} uds</Text>
              {selectedItem.reference !== normalizedReference ? <Text style={styles.stockHintEmphasis}>Se guardará como referencia principal: {selectedItem.reference}</Text> : null}
              {selectedItem.codes?.length ? <Text style={styles.stockHintText}>Código: {selectedItem.codes.join(' / ')}</Text> : null}
              {selectedItem.equivalents?.length ? <Text style={styles.stockHintText}>Alternativas: {selectedItem.equivalents.join(' / ')}</Text> : null}
              <Text style={styles.stockHintText}>Mínimo: {selectedItem.minimumQty ?? 2} uds · Recomendado: {selectedItem.recommendedQty ?? 4} uds</Text>
              {selectedItem.description ? <Text style={styles.stockHintText}>{selectedItem.description}</Text> : null}
            </View>
          ) : normalizedReference ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>Referencia no permitida. Elige una referencia de las sugerencias para evitar errores al escribir.</Text>
            </View>
          ) : null}
          <TextInput label="Cantidad usada" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
          <TextInput
            label="Tipo de máquina donde se usa"
            value={machineType}
            onChangeText={setMachineType}
            autoCapitalize="sentences"
            mode="outlined"
            style={styles.input}
            placeholder="Ej: carretilla, transpaleta, apilador..."
          />
          <Button mode="contained" loading={saving} disabled={saving || !selectedItem} onPress={handleSave} style={styles.button}>Registrar extracción</Button>
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
  label: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: SPACING.sm, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  chip: { marginRight: SPACING.xs },
  input: { marginTop: SPACING.md, backgroundColor: 'white' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  suggestionChip: { marginRight: 4, marginBottom: 4 },
  stockHintCard: { marginTop: SPACING.md, borderRadius: 14, padding: SPACING.md, backgroundColor: BRAND_COLORS.tertiaryOrange },
  stockHintTitle: { color: '#0f172a', fontWeight: '900' },
  stockHintText: { color: BRAND_COLORS.grayText, marginTop: 4, lineHeight: 20 },
  stockHintEmphasis: { color: BRAND_COLORS.primaryBlue, marginTop: 8, fontWeight: '800' },
  warningCard: { marginTop: SPACING.md, borderRadius: 14, padding: SPACING.md, backgroundColor: '#fff7ed' },
  warningText: { color: BRAND_COLORS.primaryOrange, fontWeight: '800', lineHeight: 20 },
  button: { marginTop: SPACING.lg, borderRadius: 12, paddingVertical: 4, backgroundColor: BRAND_COLORS.primaryOrange },
});
