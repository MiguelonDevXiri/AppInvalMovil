import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, IconButton, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
  AveriaInspection,
  deleteAveriaInspection,
  getAveriasInspections,
  inspectionToParams,
} from '../../utils/averiasInspectionStorage';

const AveriaInspectionCard = ({ inspection, onPress, onDelete }: { inspection: AveriaInspection; onPress: () => void; onDelete: () => void }) => (
  <Pressable onPress={onPress}>
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.inspectionTitle} numberOfLines={1}>{inspection.clientName}</Title>
          <IconButton icon="delete" onPress={onDelete} size={20} iconColor={BRAND_COLORS.error} style={styles.menuButton} />
        </View>
        <Text style={styles.cardDate}>📅 {inspection.avisoDate} {inspection.avisoTime}</Text>
        <Text style={styles.cardLocation}>📍 {inspection.location || 'Sin ubicación'}</Text>
        <Text style={styles.cardMachine}>⚙️ {inspection.machineType || 'Sin máquina'}</Text>
        <Text style={styles.cardDefects}>🔧 {inspection.defects?.length || 0} avería(s) registrada(s)</Text>
        {inspection.technicianName ? <Text style={styles.cardTech}>👷 {inspection.technicianName}</Text> : null}
      </Card.Content>
    </Card>
  </Pressable>
);

export default function AveriaInspectionsListScreen() {
  const [inspections, setInspections] = useState<AveriaInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<AveriaInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAveriasInspections();
      setInspections(data);
      filterInspections(data, searchQuery);
    } catch (error) {
      console.error('Error al cargar averías:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadInspections(); }, [loadInspections]));

  const filterInspections = (data: AveriaInspection[], query: string) => {
    if (!query.trim()) {
      setFilteredInspections(data);
    } else {
      const q = query.toLowerCase();
      setFilteredInspections(data.filter(i =>
        i.clientName.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.machineType.toLowerCase().includes(q) ||
        (i.technicianName && i.technicianName.toLowerCase().includes(q))
      ));
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterInspections(inspections, query);
  };

  const handlePress = (inspection: AveriaInspection) => {
    const params = inspectionToParams(inspection);
    router.push({ pathname: '/(tabs)/averia-report-view' as any, params: { ...params, isEditing: 'false' } });
  };

  const handleDelete = (inspection: AveriaInspection) => {
    Alert.alert('Eliminar avería', `¿Eliminar la avería de ${inspection.clientName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteAveriaInspection(inspection.id);
          if (success) {
            loadInspections();
          } else {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const handleEdit = (inspection: AveriaInspection) => {
    const params = inspectionToParams(inspection);
    router.push({ pathname: '/(tabs)/averia-machine-form' as any, params: { ...params, isEditing: 'true' } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Averías Registradas</Text>
        <Text style={styles.headerSubtitle}>{filteredInspections.length} registro(s)</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Searchbar
          placeholder="Buscar por cliente, ubicación..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Cargando averías...</Text>
          </View>
        ) : filteredInspections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color={BRAND_COLORS.grayMedium} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron resultados' : 'No hay averías registradas'}
            </Text>
            {!searchQuery && (
              <Button mode="contained" onPress={() => router.push('/averia-machine-form' as any)} buttonColor="#7c3aed" style={{ marginTop: SPACING.md }}>
                Nueva Inspección
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredInspections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AveriaInspectionCard
                inspection={item}
                onPress={() => handlePress(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  content: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  searchBar: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  searchInput: { fontSize: TYPOGRAPHY.sizes.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, color: BRAND_COLORS.grayText },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.grayText, marginTop: SPACING.md, textAlign: 'center' },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  card: { marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inspectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', flex: 1 },
  menuButton: { margin: 0 },
  cardDate: { fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText, marginTop: SPACING.xs },
  cardLocation: { fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText },
  cardMachine: { fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText },
  cardDefects: { fontSize: TYPOGRAPHY.sizes.sm, color: '#7c3aed', fontWeight: TYPOGRAPHY.weights.semibold as any, marginTop: SPACING.xs },
  cardTech: { fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText, marginTop: SPACING.xs },
});
