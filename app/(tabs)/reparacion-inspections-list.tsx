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
  deleteReparacionInspection,
  getReparacionInspectionById,
  getReparacionesInspections,
  inspectionToParams,
  type ReparacionInspection,
} from '../../utils/reparacionesInspectionStorage';

interface CardProps {
  inspection: ReparacionInspection;
  onPress: (inspection: ReparacionInspection) => void;
  onMenuPress?: (inspection: ReparacionInspection, event?: any) => void;
  onLongPress?: (inspection: ReparacionInspection) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const getStatusLabel = (status?: string) => {
  if (status === 'completed') return '2ª parte cerrada';
  if (status === 'draft') return 'Borrador';
  return '1ª parte pendiente';
};

const ReparacionCard = ({
  inspection,
  onPress,
  onMenuPress,
  onLongPress,
  isSelectionMode,
  isSelected,
}: CardProps) => (
  <Pressable onPress={() => onPress(inspection)} onLongPress={() => onLongPress?.(inspection)} delayLongPress={500}>
    <View style={styles.cardRow}>
      {isSelectionMode ? (
        <View style={styles.checkboxColumn}>
          <MaterialCommunityIcons
            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isSelected ? '#b45309' : BRAND_COLORS.grayMedium}
          />
        </View>
      ) : null}

      <View style={styles.cardContentWrapper}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle} numberOfLines={1}>{inspection.clientName}</Title>
              {!isSelectionMode && onMenuPress ? (
                <IconButton
                  icon="dots-vertical"
                  onPress={(event) => onMenuPress(inspection, event)}
                  size={20}
                  style={styles.menuButton}
                />
              ) : null}
            </View>

            <Text>📅 {inspection.avisoDate}</Text>
            <Text>🚗 {inspection.licensePlate || 'Sin matrícula'}</Text>
            <Text>📍 {inspection.location || 'Sin ubicación'}</Text>
            <Text>⚙️ {inspection.machineBrand || 'Sin marca'}</Text>
            {inspection.otNumber ? <Text>🧾 OT {inspection.otNumber}</Text> : null}

            <View style={styles.metricsRow}>
              <Text style={styles.metricText}>Toca para cargar el detalle completo</Text>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.dateText}>
                Registrado: {new Date(inspection.createdAt).toLocaleDateString('es-ES')}
              </Text>
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>{getStatusLabel(inspection.exitStatus)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  </Pressable>
);

export default function ReparacionInspectionsListScreen() {
  const insets = useSafeAreaInsets();
  const [inspections, setInspections] = useState<ReparacionInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<ReparacionInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<ReparacionInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReparacionesInspections({ includeChildren: false });
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInspections(sorted);
      setFilteredInspections(sorted);
    } catch (error) {
      console.error('Error al cargar reparaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las reparaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const filterInspections = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredInspections(inspections);
      return;
    }

    const q = searchQuery.toLowerCase();
    setFilteredInspections(
      inspections.filter((inspection) =>
        inspection.clientName.toLowerCase().includes(q) ||
        inspection.licensePlate.toLowerCase().includes(q) ||
        inspection.location.toLowerCase().includes(q) ||
        inspection.machineBrand.toLowerCase().includes(q) ||
        (inspection.otNumber || '').toLowerCase().includes(q)
      )
    );
  }, [inspections, searchQuery]);

  useEffect(() => {
    AsyncStorage.getItem('current_technician').then((json) => {
      if (!json) return;
      const technician = JSON.parse(json);
      setUserRole(technician.role || null);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInspections();
    }, [loadInspections])
  );

  useEffect(() => {
    filterInspections();
  }, [filterInspections]);

  const handlePress = (inspection: ReparacionInspection) => {
    if (isSelectionMode) {
      toggleSelection(inspection.id);
      return;
    }

    router.push({
      pathname: '/reparacion-report-view' as any,
      params: { inspectionId: inspection.id },
    });
  };

  const handleLongPress = (inspection: ReparacionInspection) => {
    if (userRole === 'technician') return;

    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([inspection.id]));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      if (next.size === 0) {
        setIsSelectionMode(false);
      }

      return next;
    });
  };

  const handleMenuOpen = (inspection: ReparacionInspection, event?: any) => {
    const position = event?.nativeEvent
      ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      : { x: 0, y: 0 };

    setMenuPosition(position);
    setSelectedInspection(inspection);
    setMenuVisible(true);
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredInspections.map((inspection) => inspection.id)));
  };

  const handleEditInspection = async () => {
    setMenuVisible(false);
    if (!selectedInspection) return;

    try {
      setLoading(true);
      const fullInspection = await getReparacionInspectionById(selectedInspection.id);
      router.push({
        pathname: '/reparacion-machine-form' as any,
        params: {
          ...inspectionToParams(fullInspection || selectedInspection),
          isEditing: 'true',
        },
      });
    } catch (error) {
      console.error('Error al cargar la reparación para editar:', error);
      Alert.alert('Error', 'No se pudo cargar la reparación completa para editar.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMany = async (ids: string[]) => {
    for (const id of ids) {
      await deleteReparacionInspection(id);
    }
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Eliminar reparaciones',
      `¿Eliminar ${count} reparación${count > 1 ? 'es' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteMany(Array.from(selectedIds));
              await loadInspections();
              cancelSelection();
              Alert.alert('Eliminadas', `${count} reparación${count > 1 ? 'es' : ''} eliminada${count > 1 ? 's' : ''}.`);
            } catch (error) {
              console.error('Error al eliminar reparaciones:', error);
              Alert.alert('Error', 'No se pudieron eliminar las reparaciones.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSingle = () => {
    setMenuVisible(false);
    if (!selectedInspection) return;

    Alert.alert(
      'Eliminar reparación',
      `¿Eliminar la reparación de "${selectedInspection.clientName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteReparacionInspection(selectedInspection.id);
              await loadInspections();
              Alert.alert('Eliminada', 'Reparación eliminada correctamente.');
            } catch (error) {
              console.error('Error al eliminar reparación:', error);
              Alert.alert('Error', 'No se pudo eliminar la reparación.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#78350f', '#b45309', '#f59e0b'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>Reparaciones registradas</Title>
        </LinearGradient>

        {isSelectionMode ? (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSelection} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, matrícula, ubicación u OT..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text>Cargando reparaciones...</Text>
          </View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item }) => (
              <ReparacionCard
                inspection={item}
                onPress={handlePress}
                onMenuPress={isSelectionMode ? undefined : handleMenuOpen}
                onLongPress={handleLongPress}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
              />
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text>No hay reparaciones registradas.</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/reparacion-machine-form' as any)}
              style={styles.newButton}
              icon="plus-circle"
              buttonColor="#b45309"
            >
              Nueva reparación
            </Button>
          </View>
        )}

        {isSelectionMode && selectedIds.size > 0 ? (
          <View style={[styles.deleteBar, { paddingBottom: insets.bottom + SPACING.md }]}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSelected}>
              <MaterialCommunityIcons name="delete" size={20} color="white" />
              <Text style={styles.deleteBtnText}>Eliminar seleccionadas ({selectedIds.size})</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Modal visible={isDeleting} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color="#b45309" />
              <Text style={styles.overlayText}>Eliminando...</Text>
            </View>
          </View>
        </Modal>

        <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={menuPosition}>
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              if (!selectedInspection) return;
              router.push({
                pathname: '/reparacion-report-view' as any,
                params: { inspectionId: selectedInspection.id },
              });
            }}
            title="Ver informe"
            leadingIcon="file-document"
          />
          {userRole !== 'technician' ? (
            <Menu.Item onPress={handleEditInspection} title="Editar reparación" leadingIcon="pencil" />
          ) : null}
          {userRole !== 'technician' ? (
            <>
              <Divider />
              <Menu.Item
                onPress={handleDeleteSingle}
                title="Eliminar"
                leadingIcon="delete"
                titleStyle={{ color: BRAND_COLORS.error }}
              />
            </>
          ) : null}
        </Menu>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#78350f',
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  header: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginLeft: 44,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#92400e',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  selectionText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    flex: 1,
  },
  selectionButton: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: BORDER_RADIUS.full,
  },
  selectionButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'white',
    ...SHADOWS.soft,
  },
  searchbar: {
    elevation: 0,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: BRAND_COLORS.grayLight,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  newButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxColumn: {
    paddingLeft: SPACING.sm,
    justifyContent: 'center',
  },
  cardContentWrapper: {
    flex: 1,
  },
  card: {
    marginBottom: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 3,
    borderLeftColor: '#b45309',
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  menuButton: {
    margin: 0,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  metricText: {
    color: '#92400e',
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
    gap: SPACING.sm,
  },
  dateText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
  },
  statusChip: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  deleteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl + 16,
    backgroundColor: 'white',
    ...SHADOWS.large,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  deleteBtnText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginLeft: SPACING.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  overlayText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.grayDark,
  },
});
