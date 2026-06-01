import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS, SHADOWS, SPACING } from '../../constants/Colors';
import { searchFilterCrosses } from '../../utils/filterStockStorage';

export default function FiltersCrossesScreen() {
  const [reference, setReference] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setResults(await searchFilterCrosses(reference));
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Header title="Cruces de filtros" />
        <View style={styles.card}>
          <MaterialCommunityIcons name="swap-horizontal-bold" size={38} color={BRAND_COLORS.primaryOrange} />
          <Text style={styles.title}>Buscador preparado</Text>
          <Text style={styles.text}>De momento queda la pantalla creada. Cuando pases la lista de cruces, aquí saldrán las referencias equivalentes.</Text>
          <TextInput label="Referencia" value={reference} onChangeText={setReference} autoCapitalize="characters" mode="outlined" style={styles.input} />
          <Button mode="contained" loading={loading} onPress={handleSearch} style={styles.button}>Buscar cruce</Button>
        </View>
        {results.map((item) => (
          <View key={item.id} style={styles.resultCard}>
            <Text style={styles.resultRef}>{item.reference} → {item.equivalent_reference}</Text>
            {item.brand ? <Text style={styles.text}>{item.brand}</Text> : null}
            {item.notes ? <Text style={styles.text}>{item.notes}</Text> : null}
          </View>
        ))}
        {!loading && reference.trim() && results.length === 0 ? <Text style={styles.empty}>Sin cruces cargados para esta referencia.</Text> : null}
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
  card: { margin: SPACING.md, backgroundColor: 'white', borderRadius: 20, padding: SPACING.lg, ...SHADOWS.card },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '900', marginTop: SPACING.sm },
  text: { color: BRAND_COLORS.grayText, marginTop: 6, lineHeight: 21 },
  input: { marginTop: SPACING.lg, backgroundColor: 'white' },
  button: { marginTop: SPACING.md, borderRadius: 12 },
  resultCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: 'white', borderRadius: 16, padding: SPACING.md, ...SHADOWS.soft },
  resultRef: { color: '#0f172a', fontWeight: '900', fontSize: 17 },
  empty: { color: BRAND_COLORS.grayText, textAlign: 'center', marginTop: SPACING.md },
});
