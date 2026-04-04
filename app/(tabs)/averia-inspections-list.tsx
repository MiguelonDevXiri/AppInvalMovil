import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
  AveriaInspection,
  deleteAveriaInspection,
  getAveriasInspections,
  inspectionToParams,
} from '../../utils/averiasInspectionStorage';

interface AveriaInspectionCardProps {
  inspection: AveriaInspection;
  onPress: (inspection: AveriaInspection) => void;
  onMenuPress?: (inspection: AveriaInspection, event?: any) => void;
  onLongPress?: (inspection: AveriaInspection) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const AveriaInspectionCard = ({ inspection, onPress, onMenuPress, onLongPress, isSelectionMode, isSelected }: AveriaInspectionCardProps) => (
  <Pressable
    onPress={() => onPress(inspection)}
    onLongPress={() => onLongPress?.(inspection)}
    delayLongPress={500}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {isSelectionMode && (
        <View style={{ paddingLeft: SPACING.sm, justifyContent: 'center' }}>
          <MaterialCommunityIcons
            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isSelected ? '#7c3aed' : BRAND_COLORS.grayMedium}
          />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.inspectionTitle} numberOfLines={1}>
                {inspection.clientName}
              </Title>
              {!isSelectionMode && onMenuPress && (
                <IconButton
                  icon="dots-vertical"
                  onPress={(e) => onMenuPress(inspection, e)}
                  size={20}
                  style={styles.menuButton}
                />
              )}
            </View>
            <Text>Fecha: {inspection.avisoDate} {inspection.avisoTime}</Text>
            <Text>Ubicación: {inspection.location}</Text>
            <Text>Máquina: {inspection.machineType}</Text>
            <Text>Averías: {inspection.defects?.length || 0}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>
                Registrado: {new Date(inspection.createdAt).toLocaleDateString('es-ES')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  </Pressable>
);

export default function AveriaInspectionsListScreen() {
  const [inspections, setInspections] = useState<AveriaInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<AveriaInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<AveriaInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInspections();
    AsyncStorage.getItem('current_technician').then((json) => {
      if (json) {
        const tech = JSON.parse(json);
        setUserRole(tech.role || null);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInspections();
    }, [])
  );

  useEffect(() => {
    filterInspections();
  }, [searchQuery, inspections]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const loaded = await getAveriasInspections();
      const sorted = loaded.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInspections(sorted);
      setFilteredInspections(sorted);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al cargar inspecciones:', error);
      setLoading(false);
      Alert.alert('Error', 'No se pudieron cargar las inspecciones.');
    }
  };

  const filterInspections = () => {
    let result = [...inspections];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.clientName.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.machineType.toLowerCase().includes(q) ||
        (i.machineBrand && i.machineBrand.toLowerCase().includes(q)) ||
        (i.machineModel && i.machineModel.toLowerCase().includes(q))
      );
    }
    setFilteredInspections(result);
  };

  const handleInspectionPress = (inspection: AveriaInspection) => {
    if (isSelectionMode) {
      toggleSelection(inspection.id);
      return;
    }
    router.push({
      pathname: '/averia-report-view',
      params: { inspectionId: inspection.id },
    });
  };

  const handleLongPress = (inspection: AveriaInspection) => {
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

  const selectAll = () => setSelectedIds(new Set(filteredInspections.map(i => i.id)));
  const cancelSelection = () => { setIsSelectionMode(false); setSelectedIds(new Set()); };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert('Eliminar inspecciones', `¿Eliminar ${count} inspección${count > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            setIsDeleting(true);
            for (const id of Array.from(selectedIds)) {
              await deleteAveriaInspection(id);
            }
            await loadInspections();
            cancelSelection();
            Alert.alert('Eliminadas', `${count} inspección${count > 1 ? 'es' : ''} eliminada${count > 1 ? 's' : ''} correctamente.`);
          } catch (error) {
            Alert.alert('Error', 'No se pudieron eliminar todas las inspecciones.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const handleMenuOpen = (inspection: AveriaInspection, event?: any) => {
    const position = event && event.nativeEvent
      ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      : { x: 0, y: 0 };
    setMenuPosition(position);
    setSelectedInspection(inspection);
    setMenuVisible(true);
  };

  const handleMenuClose = () => setMenuVisible(false);

  const handleEditInspection = () => {
    handleMenuClose();
    if (!selectedInspection) return;
    const p = inspectionToParams(selectedInspection);
    router.push({
      pathname: '/averia-machine-form',
      params: { ...p, isEditing: 'true' },
    });
  };

  const handleDeleteInspection = () => {
    handleMenuClose();
    if (!selectedInspection) return;
    Alert.alert('Eliminar inspección', `¿Eliminar la inspección de "${selectedInspection.clientName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteAveriaInspection(selectedInspection.id);
            await loadInspections();
            Alert.alert('Eliminada', 'Inspección eliminada correctamente.');
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la inspección.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AveriaInspection }) => (
    <AveriaInspectionCard
      inspection={item}
      onPress={handleInspectionPress}
      onMenuPress={isSelectionMode ? undefined : handleMenuOpen}
      onLongPress={handleLongPress}
      isSelectionMode={isSelectionMode}
      isSelected={selectedIds.has(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>Inspecciones AVERÍAS</Title>
        </LinearGradient>

        {isSelectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Seleccionar todos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSelection} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, ubicación o máquina..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text>Cargando inspecciones...</Text>
          </View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text>No se encontraron inspecciones registradas.</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/averia-machine-form')}
              style={styles.newButton}
              icon="plus-circle"
            >
              Nueva Inspección Averías
            </Button>
          </View>
        )}

        {isSelectionMode && selectedIds.size > 0 && (
          <View style={styles.deleteBar}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
              <MaterialCommunityIcons name="delete" size={20} color="white" />
              <Text style={styles.deleteButtonText}>Eliminar seleccionados ({selectedIds.size})</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={isDeleting} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
              <Text style={styles.overlayText}>Eliminando inspecciones...</Text>
            </View>
          </View>
        </Modal>

        <Menu visible={menuVisible} onDismiss={handleMenuClose} anchor={menuPosition}>
          <Menu.Item
            onPress={() => { handleMenuClose(); if (selectedInspection) router.push({ pathname: '/averia-report-view', params: { inspectionId: selectedInspection.id } }); }}
            title="Ver informe"
            leadingIcon="file-document"
          />
          {userRole !== 'technician' && (
            <Menu.Item onPress={handleEditInspection} title="Editar inspección" leadingIcon="pencil" />
          )}
          {userRole !== 'technician' && (
            <>
              <Divider />
              <Menu.Item onPress={handleDeleteInspection} title="Eliminar" leadingIcon="delete" titleStyle={{ color: BRAND_COLORS.error }} />
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
  header: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  backArrow: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: 44, letterSpacing: 0.2 },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'white', ...SHADOWS.soft },
  searchbar: { elevation: 0, borderRadius: BORDER_RADIUS.xl, backgroundColor: BRAND_COLORS.grayLight, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium },
  listContent: { padding: SPACING.md, paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  newButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  card: { marginBottom: SPACING.sm + 2, borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 3, borderLeftColor: '#7c3aed', backgroundColor: 'white', ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inspectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, flex: 1, color: BRAND_COLORS.primaryBlue, fontWeight: TYPOGRAPHY.weights.bold as any },
  menuButton: { margin: 0 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight },
  date: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5b21b6', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2 },
  selectionText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold as any, flex: 1 },
  selectionButton: { marginLeft: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BORDER_RADIUS.full },
  selectionButtonText: { color: 'white', fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium as any },
  deleteBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xl + 16, backgroundColor: 'white', ...SHADOWS.large },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_COLORS.error, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.medium },
  deleteButtonText: { color: 'white', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, marginLeft: SPACING.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  overlayContent: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.large },
  overlayText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.grayDark },
});
