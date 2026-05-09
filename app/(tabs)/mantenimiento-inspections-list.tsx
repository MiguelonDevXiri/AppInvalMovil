import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { deleteMantenimientoInspection, getMantenimientoInspections, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

export default function MantenimientoInspectionsListScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MantenimientoInspection[]>([]);
  const [filtered, setFiltered] = useState<MantenimientoInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MantenimientoInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMantenimientoInspections();
    const sorted = data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setItems(sorted);
    setFiltered(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('current_technician').then((json) => {
      if (!json) return;
      const tech = JSON.parse(json);
      setUserRole(tech.role || null);
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(items); return; }
    const q = searchQuery.toLowerCase();
    setFiltered(items.filter(i =>
      (i.clientName || '').toLowerCase().includes(q) ||
      (i.location || '').toLowerCase().includes(q) ||
      (i.reviewedBy || '').toLowerCase().includes(q) ||
      (i.brand || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q) ||
      (i.serialNumber || '').toLowerCase().includes(q)
    ));
  }, [searchQuery, items]);

  const handlePress = (item: MantenimientoInspection) => {
    if (isSelectionMode) { toggleSelection(item.id); return; }
    router.push({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: item.id } });
  };

  const handleLongPress = (item: MantenimientoInspection) => {
    if (userRole === 'technician') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([item.id]));
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

  const selectAll = () => { setSelectedIds(new Set(filtered.map(i => i.id))); };
  const cancelSelection = () => { setSelectedIds(new Set()); setIsSelectionMode(false); };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert('Eliminar mantenimientos', `¿Eliminar ${count} mantenimiento${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          setIsDeleting(true);
          for (const id of Array.from(selectedIds)) { await deleteMantenimientoInspection(id); }
          await load();
          cancelSelection();
          Alert.alert('Eliminados', `${count} mantenimiento${count > 1 ? 's' : ''} eliminado${count > 1 ? 's' : ''}.`);
        } catch { Alert.alert('Error', 'No se pudieron eliminar todos los mantenimientos.'); }
        finally { setIsDeleting(false); }
      }},
    ]);
  };

  const handleMenuOpen = (item: MantenimientoInspection, event?: any) => {
    const pos = event?.nativeEvent ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : { x: 0, y: 0 };
    setMenuPosition(pos);
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const handleDeleteSingle = () => {
    setMenuVisible(false);
    if (!selectedItem) return;
    Alert.alert('Eliminar mantenimiento', `¿Eliminar el mantenimiento de "${selectedItem.clientName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const ok = await deleteMantenimientoInspection(selectedItem.id);
        if (ok) load(); else Alert.alert('Error', 'No se pudo eliminar.');
      }},
    ]);
  };

  const renderItem = ({ item }: { item: MantenimientoInspection }) => (
    <Pressable onPress={() => handlePress(item)} onLongPress={() => handleLongPress(item)} delayLongPress={500}>
      <View style={styles.cardRow}>
        {isSelectionMode && (
          <View style={styles.checkboxCol}>
            <MaterialCommunityIcons
              name={selectedIds.has(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={selectedIds.has(item.id) ? BRAND_COLORS.primaryBlue : BRAND_COLORS.grayMedium}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.clientName || 'Sin cliente'}</Text>
                  <Text style={styles.subtitle}>{getMachineTypeById(item.machineType).name} · {item.date}</Text>
                  <Text style={styles.meta}>{item.location || 'Sin ubicación'} · {item.reviewedBy || 'Sin técnico'}</Text>
                </View>
                {!isSelectionMode && (
                  <IconButton icon="dots-vertical" onPress={(e) => handleMenuOpen(item, e)} size={20} style={{ margin: 0 }} />
                )}
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient colors={['#0f2f57', '#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mantenimientos registrados</Text>
          <Text style={styles.headerSubtitle}>Mantén pulsado para seleccionar</Text>
        </LinearGradient>

        {isSelectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSelection} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, ubicación, técnico..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#e87a20" /></View>
        ) : filtered.length > 0 ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            renderItem={renderItem}
          />
        ) : (
          <View style={styles.center}>
            <MaterialCommunityIcons name="tools" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No hay mantenimientos registrados</Text>
            <Button mode="contained" onPress={() => router.push('/mantenimiento-machine-type-selection' as any)} buttonColor={BRAND_COLORS.primaryOrange}>
              Crear mantenimiento
            </Button>
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
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
              <Text style={styles.overlayText}>Eliminando...</Text>
            </View>
          </View>
        </Modal>

        <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={menuPosition}>
          <Menu.Item
            onPress={() => { setMenuVisible(false); if (selectedItem) router.push({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: selectedItem.id } }); }}
            title="Ver informe"
            leadingIcon="file-document"
          />
          {userRole !== 'technician' && (
            <Menu.Item
              onPress={() => { setMenuVisible(false); if (selectedItem) router.push({ pathname: '/mantenimiento-form' as any, params: { inspectionId: selectedItem.id } }); }}
              title="Editar"
              leadingIcon="pencil"
            />
          )}
          {userRole !== 'technician' && (
            <>
              <Divider />
              <Menu.Item onPress={handleDeleteSingle} title="Eliminar" leadingIcon="delete" titleStyle={{ color: BRAND_COLORS.error }} />
            </>
          )}
        </Menu>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  header: { padding: SPACING.lg, borderBottomLeftRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginTop: SPACING.sm },
  headerSubtitle: { color: 'rgba(255,255,255,.85)' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND_COLORS.darkBlue, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2 },
  selectionText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold as any, flex: 1 },
  selectionButton: { marginLeft: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BORDER_RADIUS.full },
  selectionButtonText: { color: 'white', fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium as any },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'white', ...SHADOWS.soft },
  searchbar: { elevation: 0, borderRadius: BORDER_RADIUS.xl, backgroundColor: BRAND_COLORS.grayLight, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 12 },
  list: { padding: SPACING.md, paddingBottom: 120 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxCol: { paddingLeft: SPACING.sm, justifyContent: 'center' },
  card: { marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#0f172a' },
  subtitle: { color: '#334155', marginTop: 4 },
  meta: { color: '#64748b', marginTop: 2 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center' },
  deleteBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, backgroundColor: 'white', ...SHADOWS.large },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_COLORS.error, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.medium },
  deleteBtnText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: SPACING.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  overlayContent: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.large },
  overlayText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.grayDark },
});
