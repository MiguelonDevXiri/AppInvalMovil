import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';
import {
  deleteInstalacionInspection,
  getInstalacionesInspections,
  inspectionToParams,
  type InstalacionInspection,
} from '../../utils/instalacionesInspectionStorage';

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const INSTALLATION_DARK = '#0f5f59';

interface CardProps {
  inspection: InstalacionInspection;
  onPress: (inspection: InstalacionInspection) => void;
  onMenuPress?: (inspection: InstalacionInspection, event?: any) => void;
  onLongPress?: (inspection: InstalacionInspection) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const InstalacionCard = ({
  inspection,
  onPress,
  onMenuPress,
  onLongPress,
  isSelectionMode,
  isSelected,
}: CardProps) => (
  <Pressable
    onPress={() => onPress(inspection)}
    onLongPress={() => onLongPress?.(inspection)}
    delayLongPress={500}
  >
    <View style={styles.cardRow}>
      {isSelectionMode && (
        <View style={styles.checkboxColumn}>
          <MaterialCommunityIcons
            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isSelected ? INSTALLATION_PRIMARY : BRAND_COLORS.grayMedium}
          />
        </View>
      )}
      <View style={styles.cardContentWrapper}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle} numberOfLines={1}>
                {inspection.clientName}
              </Title>
              {!isSelectionMode && onMenuPress && (
                <IconButton
                  icon="dots-vertical"
                  onPress={(event) => onMenuPress(inspection, event)}
                  size={20}
                  style={styles.menuButton}
                />
              )}
            </View>
            <Text>📅 {inspection.avisoDate} {inspection.avisoTime}</Text>
            <Text>🚗 {inspection.licensePlate || 'Sin matrícula'}</Text>
            <Text>📍 {inspection.location || 'Sin ubicación'}</Text>
            <Text>⚙️ {inspection.machineBrand || 'Sin marca'}</Text>
            <Text style={styles.workDescription} numberOfLines={2}>
              🛠️ {inspection.workDescription || 'Sin faena descrita'}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.dateText}>
                Registrado: {new Date(inspection.createdAt).toLocaleDateString('es-ES')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  </Pressable>
);

export default function InstalacionInspectionsListScreen() {
  const [inspections, setInspections] = useState<InstalacionInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<InstalacionInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<InstalacionInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInspections();
    AsyncStorage.getItem('current_technician').then((json) => {
      if (!json) return;
      const technician = JSON.parse(json);
      setUserRole(technician.role || null);
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
      const data = await getInstalacionesInspections();
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInspections(sorted);
      setFilteredInspections(sorted);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las instalaciones.');
    } finally {
      setLoading(false);
    }
  };

  const filterInspections = () => {
    if (!searchQuery) {
      setFilteredInspections(inspections);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredInspections(
      inspections.filter((inspection) =>
        inspection.clientName.toLowerCase().includes(query) ||
        inspection.licensePlate.toLowerCase().includes(query) ||
        inspection.location.toLowerCase().includes(query) ||
        inspection.machineBrand.toLowerCase().includes(query) ||
        inspection.workDescription.toLowerCase().includes(query)
      )
    );
  };

  const handlePress = (inspection: InstalacionInspection) => {
    if (isSelectionMode) {
      toggleSelection(inspection.id);
      return;
    }

    router.push({
      pathname: '/instalacion-report-view' as any,
      params: { inspectionId: inspection.id },
    });
  };

  const handleLongPress = (inspection: InstalacionInspection) => {
    if (userRole !== 'admin') return;

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

  const selectAll = () => {
    setSelectedIds(new Set(filteredInspections.map((inspection) => inspection.id)));
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;

    Alert.alert(
      'Eliminar instalaciones',
      `¿Eliminar ${count} instalación${count > 1 ? 'es' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              for (const id of Array.from(selectedIds)) {
                await deleteInstalacionInspection(id);
              }
              await loadInspections();
              cancelSelection();
              Alert.alert(
                'Eliminadas',
                `${count} instalación${count > 1 ? 'es' : ''} eliminada${count > 1 ? 's' : ''}.`
              );
            } catch {
              Alert.alert('Error', 'No se pudieron eliminar las instalaciones seleccionadas.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleMenuOpen = (inspection: InstalacionInspection, event?: any) => {
    const position = event?.nativeEvent
      ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      : { x: 0, y: 0 };

    setMenuPosition(position);
    setSelectedInspection(inspection);
    setMenuVisible(true);
  };

  const handleEditInspection = () => {
    setMenuVisible(false);
    if (!selectedInspection) return;

    const params = inspectionToParams(selectedInspection);
    router.push({
      pathname: '/instalacion-machine-form' as any,
      params: { ...params, isEditing: 'true' },
    });
  };

  const handleDeleteSingle = () => {
    setMenuVisible(false);
    if (!selectedInspection) return;

    Alert.alert(
      'Eliminar instalación',
      `¿Eliminar la instalación de "${selectedInspection.clientName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteInstalacionInspection(selectedInspection.id);
              await loadInspections();
              Alert.alert('Eliminada', 'Instalación eliminada correctamente.');
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la instalación.');
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
          colors={INSTALLATION_GRADIENT as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>Instalaciones Registradas</Title>
        </LinearGradient>

        {isSelectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </Text>
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
            placeholder="Buscar por cliente, matrícula, ubicación o faena..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text>Cargando instalaciones...</Text>
          </View>
        ) : filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            renderItem={({ item }) => (
              <InstalacionCard
                inspection={item}
                onPress={handlePress}
                onMenuPress={isSelectionMode ? undefined : handleMenuOpen}
                onLongPress={handleLongPress}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text>No hay instalaciones registradas.</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/instalacion-machine-form' as any)}
              style={styles.newButton}
              icon="plus-circle"
              buttonColor={INSTALLATION_PRIMARY}
            >
              Nueva Instalación
            </Button>
          </View>
        )}

        {isSelectionMode && selectedIds.size > 0 && (
          <View style={styles.deleteBar}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSelected}>
              <MaterialCommunityIcons name="delete" size={20} color="white" />
              <Text style={styles.deleteBtnText}>
                Eliminar seleccionados ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={isDeleting} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={INSTALLATION_PRIMARY} />
              <Text style={styles.overlayText}>Eliminando...</Text>
            </View>
          </View>
        </Modal>

        <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={menuPosition}>
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              if (selectedInspection) {
                router.push({
                  pathname: '/instalacion-report-view' as any,
                  params: { inspectionId: selectedInspection.id },
                });
              }
            }}
            title="Ver informe"
            leadingIcon="file-document"
          />
          {userRole !== 'technician' && (
            <Menu.Item
              onPress={handleEditInspection}
              title="Editar instalación"
              leadingIcon="pencil"
            />
          )}
          {userRole !== 'technician' && (
            <>
              <Divider />
              <Menu.Item
                onPress={handleDeleteSingle}
                title="Eliminar"
                leadingIcon="delete"
                titleStyle={{ color: BRAND_COLORS.error }}
              />
            </>
          )}
        </Menu>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: INSTALLATION_PRIMARY,
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
    borderLeftColor: INSTALLATION_PRIMARY,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    flex: 1,
    color: INSTALLATION_PRIMARY,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  menuButton: {
    margin: 0,
  },
  workDescription: {
    color: INSTALLATION_DARK,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    marginTop: SPACING.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  dateText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INSTALLATION_DARK,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.full,
  },
  selectionButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
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
