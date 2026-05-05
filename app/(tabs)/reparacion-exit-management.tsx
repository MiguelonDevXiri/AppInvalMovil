import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Divider, Menu, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
  deleteReparacionExit,
  getReparacionesInspections,
  type ReparacionInspection,
} from '../../utils/reparacionesInspectionStorage';

export default function ReparacionExitManagementScreen() {
  const [inspections, setInspections] = useState<ReparacionInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<ReparacionInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await getReparacionesInspections();
      const completed = data.filter((item) => item.exitStatus === 'completed');
      setInspections(completed);
      setFilteredInspections(completed);
    } catch (error) {
      console.error('Error al cargar salidas de reparación:', error);
      Alert.alert('Error', 'No se pudieron cargar las salidas de reparación.');
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

  const handleDeleteExit = (inspection: ReparacionInspection) => {
    Alert.alert(
      'Borrar salida',
      `¿Borrar la salida de reparación de "${inspection.clientName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReparacionExit(inspection.id);
            if (success) {
              await loadInspections();
              Alert.alert('Salida borrada', 'La salida de reparación se ha borrado correctamente.');
            } else {
              Alert.alert('Error', 'No se pudo borrar la salida de reparación.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient colors={['#0891b2', '#22d3ee'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar salidas reparación</Text>
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
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>Cargando salidas...</Text></View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/reparacion-report-view' as any, params: { inspectionId: item.id } })}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{item.clientName}</Text>
                      <Menu
                        visible={menuVisible === item.id}
                        onDismiss={() => setMenuVisible(null)}
                        anchor={
                          <TouchableOpacity onPress={() => setMenuVisible(item.id)} style={styles.menuBtn}>
                            <MaterialCommunityIcons name="dots-vertical" size={22} color={BRAND_COLORS.grayText} />
                          </TouchableOpacity>
                        }
                      >
                        <Menu.Item
                          onPress={() => {
                            setMenuVisible(null);
                            router.push({ pathname: '/reparacion-report-view' as any, params: { inspectionId: item.id } });
                          }}
                          title="Ver informe"
                          leadingIcon="file-document"
                        />
                        <Menu.Item
                          onPress={() => {
                            setMenuVisible(null);
                            router.push({ pathname: '/reparacion-exit-form' as any, params: { inspectionId: item.id } });
                          }}
                          title="Editar salida"
                          leadingIcon="pencil"
                        />
                        <Divider />
                        <Menu.Item
                          onPress={() => {
                            setMenuVisible(null);
                            handleDeleteExit(item);
                          }}
                          title="Borrar salida"
                          leadingIcon="delete"
                          titleStyle={{ color: BRAND_COLORS.error }}
                        />
                      </Menu>
                    </View>
                    <Text style={styles.detail}>Máquina: {item.machineBrand || item.machineType || '—'}</Text>
                    <Text style={styles.detail}>Matrícula: {item.licensePlate || '—'}</Text>
                    <Text style={styles.detail}>OT: {item.otNumber || '—'}</Text>
                    <Text style={styles.detail}>Ubicación: {item.location || '—'}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.dateText}>{item.avisoDate}</Text>
                      <Chip style={styles.chip} textStyle={styles.chipText}>Completada</Chip>
                    </View>
                  </Card.Content>
                </TouchableOpacity>
              </Card>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-check-outline" size={56} color={BRAND_COLORS.grayMedium} />
            <Text style={styles.emptyText}>No hay salidas de reparación guardadas.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0891b2' },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  header: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: 44 },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'white', ...SHADOWS.soft },
  searchbar: { elevation: 0, borderRadius: BORDER_RADIUS.xl, backgroundColor: BRAND_COLORS.grayLight, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium },
  listContent: { padding: SPACING.md, paddingBottom: 80 },
  card: { marginBottom: SPACING.sm + 2, borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 3, borderLeftColor: '#0891b2', backgroundColor: 'white', ...SHADOWS.card },
  cardContent: { paddingVertical: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: 4 },
  menuBtn: { padding: 4 },
  detail: { color: BRAND_COLORS.grayDark, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight },
  dateText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  chip: { borderRadius: BORDER_RADIUS.full, backgroundColor: '#dbeafe' },
  chipText: { color: '#1d4ed8', fontSize: TYPOGRAPHY.sizes.xs },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyText: { color: BRAND_COLORS.grayText, fontSize: TYPOGRAPHY.sizes.md, textAlign: 'center', marginTop: SPACING.md },
});
