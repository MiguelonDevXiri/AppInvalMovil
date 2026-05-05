import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getReparacionesInspections, type ReparacionInspection } from '../../utils/reparacionesInspectionStorage';

export default function ReparacionExitListScreen() {
  const [inspections, setInspections] = useState<ReparacionInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<ReparacionInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await getReparacionesInspections();
      const pending = data.filter((item) => item.exitStatus !== 'completed');
      setInspections(pending);
      setFilteredInspections(pending);
    } catch (error) {
      console.error('Error al cargar reparaciones pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar las reparaciones pendientes de salida.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInspections();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInspections();
    }, [])
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInspections(inspections);
      return;
    }

    const q = searchQuery.toLowerCase();
    setFilteredInspections(
      inspections.filter((item) =>
        item.clientName.toLowerCase().includes(q) ||
        item.licensePlate.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.machineBrand.toLowerCase().includes(q) ||
        (item.otNumber || '').toLowerCase().includes(q)
      )
    );
  }, [searchQuery, inspections]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient colors={['#16a34a', '#4ade80'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salida reparaciones</Text>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, matrícula, OT o ubicación..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Cargando reparaciones...</Text>
          </View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/reparacion-exit-form' as any, params: { inspectionId: item.id } })}
                >
                  <Card.Content style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.clientName}</Text>
                    <Text style={styles.detail}>Máquina: {item.machineBrand || item.machineType || '—'}</Text>
                    <Text style={styles.detail}>Matrícula: {item.licensePlate || '—'}</Text>
                    <Text style={styles.detail}>OT: {item.otNumber || '—'}</Text>
                    <Text style={styles.detail}>Ubicación: {item.location || '—'}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.dateText}>{item.avisoDate}</Text>
                      <Chip style={styles.chip} textStyle={styles.chipText}>Pendiente</Chip>
                    </View>
                  </Card.Content>
                </TouchableOpacity>
              </Card>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={56} color={BRAND_COLORS.grayMedium} />
            <Text style={styles.emptyText}>No hay reparaciones pendientes de salida.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  header: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: 44 },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'white', ...SHADOWS.soft },
  searchbar: { elevation: 0, borderRadius: BORDER_RADIUS.xl, backgroundColor: BRAND_COLORS.grayLight, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium },
  listContent: { padding: SPACING.md, paddingBottom: 80 },
  card: { marginBottom: SPACING.sm + 2, borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 3, borderLeftColor: '#16a34a', backgroundColor: 'white', ...SHADOWS.card },
  cardContent: { paddingVertical: SPACING.md },
  cardTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: 4 },
  detail: { color: BRAND_COLORS.grayDark, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight },
  dateText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  chip: { borderRadius: BORDER_RADIUS.full, backgroundColor: '#dcfce7' },
  chipText: { color: '#166534', fontSize: TYPOGRAPHY.sizes.xs },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyText: { color: BRAND_COLORS.grayText, fontSize: TYPOGRAPHY.sizes.md, textAlign: 'center', marginTop: SPACING.md },
});
