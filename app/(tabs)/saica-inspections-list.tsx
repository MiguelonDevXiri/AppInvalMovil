import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
  SaicaInspection,
  deleteSaicaInspection,
  getSaicaInspections,
  inspectionToParams,
} from '../../utils/saicaInspectionStorage';

interface CardProps {
  inspection: SaicaInspection;
  onPress: (i: SaicaInspection) => void;
  onMenuPress?: (i: SaicaInspection, e?: any) => void;
  onLongPress?: (i: SaicaInspection) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const SaicaCard = ({ inspection, onPress, onMenuPress, onLongPress, isSelectionMode, isSelected }: CardProps) => (
  <Pressable onPress={() => onPress(inspection)} onLongPress={() => onLongPress?.(inspection)} delayLongPress={500}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {isSelectionMode && (
        <View style={{ paddingLeft: SPACING.sm, justifyContent: 'center' }}>
          <MaterialCommunityIcons name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={isSelected ? '#7c3aed' : BRAND_COLORS.grayMedium} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.inspectionTitle} numberOfLines={1}>{inspection.clientName}</Title>
              {!isSelectionMode && onMenuPress && (
                <IconButton icon="dots-vertical" onPress={(e) => onMenuPress(inspection, e)} size={20} style={styles.menuButton} />
              )}
            </View>
            <Text>📅 {inspection.avisoDate}</Text>
            <Text>🚗 {inspection.licensePlate || 'Sin matrícula'}</Text>
            <Text>🧾 OT: {inspection.otNumber || 'Sin OT'}</Text>
            <Text>📍 {inspection.location || 'Sin ubicación'}</Text>
            <Text>⚙️ {inspection.machineBrand || 'Sin marca'}</Text>
            <Text style={{ color: '#7c3aed', fontWeight: '600', marginTop: SPACING.xs }}>🔧 {inspection.interventions?.length || 0} informe Saica(s)</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>Registrado: {new Date(inspection.createdAt).toLocaleDateString('es-ES')}</Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  </Pressable>
);

export default function SaicaInspectionsListScreen() {
  const insets = useSafeAreaInsets();
  const [inspections, setInspections] = useState<SaicaInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<SaicaInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<SaicaInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInspections();
    AsyncStorage.getItem('current_technician').then((json) => {
      if (json) { const tech = JSON.parse(json); setUserRole(tech.role || null); }
    });
  }, []);

  useFocusEffect(useCallback(() => { loadInspections(); }, []));

  useEffect(() => { filterInspections(); }, [searchQuery, inspections]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await getSaicaInspections();
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInspections(sorted);
      setFilteredInspections(sorted);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las informes Saica.');
    } finally {
      setLoading(false);
    }
  };

  const filterInspections = () => {
    if (!searchQuery) { setFilteredInspections(inspections); return; }
    const q = searchQuery.toLowerCase();
    setFilteredInspections(inspections.filter(i =>
      i.clientName.toLowerCase().includes(q) ||
      i.licensePlate.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      (i.machineBrand && i.machineBrand.toLowerCase().includes(q)) ||
      ((i.otNumber || '').toLowerCase().includes(q))
    ));
  };

  const handlePress = (inspection: SaicaInspection) => {
    if (isSelectionMode) { toggleSelection(inspection.id); return; }
    router.push({ pathname: '/saica-report-view' as any, params: { inspectionId: inspection.id } });
  };

  const handleLongPress = (inspection: SaicaInspection) => {
    if (userRole !== 'admin') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([inspection.id]));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const selectAll = () => { setSelectedIds(new Set(filteredInspections.map(i => i.id))); };
  const cancelSelection = () => { setIsSelectionMode(false); setSelectedIds(new Set()); };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert('Eliminar informes Saica', `¿Eliminar ${count} informe Saica${count > 1 ? 's' : ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            setIsDeleting(true);
            for (const id of Array.from(selectedIds)) { await deleteSaicaInspection(id); }
            await loadInspections();
            cancelSelection();
            Alert.alert('Eliminadas', `${count} informe Saica${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''}.`);
          } catch { Alert.alert('Error', 'No se pudieron eliminar.'); }
          finally { setIsDeleting(false); }
        },
      },
    ]);
  };

  const handleMenuOpen = (inspection: SaicaInspection, event?: any) => {
    const pos = event?.nativeEvent ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : { x: 0, y: 0 };
    setMenuPosition(pos);
    setSelectedInspection(inspection);
    setMenuVisible(true);
  };

  const handleEditInspection = () => {
    setMenuVisible(false);
    if (!selectedInspection) return;
    const params = inspectionToParams(selectedInspection);
    router.push({ pathname: '/saica-machine-form' as any, params: { ...params, isEditing: 'true' } });
  };

  const handleDeleteSingle = () => {
    setMenuVisible(false);
    if (!selectedInspection) return;
    Alert.alert('Eliminar informe Saica', `¿Eliminar la informe Saica de "${selectedInspection.clientName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteSaicaInspection(selectedInspection.id);
            await loadInspections();
            Alert.alert('Eliminada', 'Informe Saica eliminada correctamente.');
          } catch { Alert.alert('Error', 'No se pudo eliminar.'); }
          finally { setLoading(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>Informes Saica Registradas</Title>
        </LinearGradient>

        {isSelectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={selectAll} style={styles.selectionButton}><Text style={styles.selectionButtonText}>Todos</Text></TouchableOpacity>
            <TouchableOpacity onPress={cancelSelection} style={styles.selectionButton}><Text style={styles.selectionButtonText}>Cancelar</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Searchbar placeholder="Buscar por cliente, matrícula, OT, ubicación o marca..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}><Text>Cargando informes Saica...</Text></View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            renderItem={({ item }) => (
              <SaicaCard inspection={item} onPress={handlePress} onMenuPress={isSelectionMode ? undefined : handleMenuOpen} onLongPress={handleLongPress} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text>No hay informes Saica registradas.</Text>
            <Button mode="contained" onPress={() => router.push('/saica-machine-form' as any)} style={styles.newButton} icon="plus-circle" buttonColor="#7c3aed">Nueva Informe Saica</Button>
          </View>
        )}

        {isSelectionMode && selectedIds.size > 0 && (
          <View style={[styles.deleteBar, { paddingBottom: insets.bottom + SPACING.md }]}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSelected}>
              <MaterialCommunityIcons name="delete" size={20} color="white" />
              <Text style={styles.deleteBtnText}>Eliminar seleccionados ({selectedIds.size})</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={isDeleting} transparent animationType="fade">
          <View style={styles.overlay}><View style={styles.overlayContent}><ActivityIndicator size="large" color="#7c3aed" /><Text style={styles.overlayText}>Eliminando...</Text></View></View>
        </Modal>

        <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={menuPosition}>
          <Menu.Item onPress={() => { setMenuVisible(false); if (selectedInspection) router.push({ pathname: '/saica-report-view' as any, params: { inspectionId: selectedInspection.id } }); }} title="Ver informe" leadingIcon="file-document" />
          {userRole !== 'technician' && <Menu.Item onPress={handleEditInspection} title="Editar informe Saica" leadingIcon="pencil" />}
          {userRole !== 'technician' && (<><Divider /><Menu.Item onPress={handleDeleteSingle} title="Eliminar" leadingIcon="delete" titleStyle={{ color: BRAND_COLORS.error }} /></>)}
        </Menu>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  header: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: 44 },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'white', ...SHADOWS.soft },
  searchbar: { elevation: 0, borderRadius: BORDER_RADIUS.xl, backgroundColor: BRAND_COLORS.grayLight, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium },
  listContent: { padding: SPACING.md, paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  newButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  card: { marginBottom: SPACING.sm + 2, borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 3, borderLeftColor: '#7c3aed', backgroundColor: 'white', ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inspectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, flex: 1, color: '#7c3aed', fontWeight: TYPOGRAPHY.weights.bold as any },
  menuButton: { margin: 0 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight },
  date: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6d28d9', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2 },
  selectionText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold as any, flex: 1 },
  selectionButton: { marginLeft: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BORDER_RADIUS.full },
  selectionButtonText: { color: 'white', fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium as any },
  deleteBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xl + 16, backgroundColor: 'white', ...SHADOWS.large },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_COLORS.error, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.medium },
  deleteBtnText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: SPACING.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  overlayContent: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.large },
  overlayText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.grayDark },
});
