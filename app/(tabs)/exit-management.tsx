import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Divider, Menu, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { deleteExitInspection, getMachines, Machine } from '../../utils/storage';

export default function ExitManagementScreen() {
  const insets = useSafeAreaInsets();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const allMachines = await getMachines();
      const revisadas = allMachines.filter(
        (m) => m.inspectionStatus === 'revisada'
      );
      setMachines(revisadas);
      setFilteredMachines(revisadas);
    } catch (error) {
      console.error('Error al cargar máquinas:', error);
      Alert.alert('Error', 'No se pudieron cargar las máquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
    AsyncStorage.getItem('current_technician').then((json) => {
      if (json) {
        const tech = JSON.parse(json);
        setUserRole(tech.role || null);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMachines();
    }, [])
  );

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMachines(machines);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredMachines(
      machines.filter(
        (m) =>
          m.clientName.toLowerCase().includes(q) ||
          (m.licensePlate && m.licensePlate.toLowerCase().includes(q)) ||
          (m.brand && m.brand.toLowerCase().includes(q)) ||
          m.name.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, machines]);

  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const handleMachinePress = (machine: Machine) => {
    if (isSelectionMode) {
      toggleSelection(machine.id);
      return;
    }
    router.push({
      pathname: '/report' as any,
      params: { machineId: machine.id },
    });
  };

  const handleDeleteSingleExit = (machine: Machine) => {
    Alert.alert(
      'Eliminar inspección de salida',
      `¿Eliminar la inspección de salida de "${machine.name}"? La máquina volverá al estado "Entrada".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExitInspection(machine.id);
              await loadMachines();
              Alert.alert('Eliminada', 'La inspección de salida ha sido eliminada correctamente.');
            } catch (error) {
              console.error('Error al eliminar inspección:', error);
              Alert.alert('Error', 'No se pudo eliminar la inspección de salida.');
            }
          },
        },
      ],
    );
  };

  const handleLongPress = (machine: Machine) => {
    if (userRole !== 'admin') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([machine.id]));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
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
    setSelectedIds(new Set(filteredMachines.map((m) => m.id)));
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Eliminar inspecciones de salida',
      `¿Eliminar ${count} inspección${count > 1 ? 'es' : ''} de salida? Las máquinas volverán al estado "Entrada".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const ids = Array.from(selectedIds);
              for (const id of ids) {
                await deleteExitInspection(id);
              }
              await loadMachines();
              cancelSelection();
              Alert.alert(
                'Eliminadas',
                `${count} inspección${count > 1 ? 'es' : ''} de salida eliminada${count > 1 ? 's' : ''} correctamente.`
              );
            } catch (error) {
              console.error('Error al eliminar inspecciones:', error);
              Alert.alert('Error', 'No se pudieron eliminar todas las inspecciones.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Machine }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {isSelectionMode && (
        <TouchableOpacity
          onPress={() => toggleSelection(item.id)}
          style={{ paddingLeft: SPACING.sm, justifyContent: 'center' }}
        >
          <MaterialCommunityIcons
            name={selectedIds.has(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={selectedIds.has(item.id) ? '#0891b2' : BRAND_COLORS.grayMedium}
          />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Card style={styles.card}>
          <TouchableOpacity
            onPress={() => handleMachinePress(item)}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={500}
            activeOpacity={0.85}
          >
            <Card.Content style={styles.cardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.machineName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
                <Menu
                  visible={menuVisible === item.id}
                  onDismiss={() => setMenuVisible(null)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setMenuVisible(item.id)}
                      style={{ padding: 4 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="dots-vertical" size={22} color={BRAND_COLORS.grayText} />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      router.push({ pathname: '/report' as any, params: { machineId: item.id } });
                    }}
                    title="Ver informe"
                    leadingIcon="file-document"
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      router.push({ pathname: '/exit-inspection' as any, params: { machineId: item.id } });
                    }}
                    title="Editar inspección de salida"
                    leadingIcon="pencil"
                  />
                  {userRole === 'admin' && (
                    <>
                      <Divider />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          handleDeleteSingleExit(item);
                        }}
                        title="Eliminar salida"
                        leadingIcon="delete"
                        titleStyle={{ color: BRAND_COLORS.error }}
                      />
                    </>
                  )}
                </Menu>
              </View>
              {item.brand && (
                <Text style={styles.detail}>Marca: {item.brand}</Text>
              )}
              <Text style={styles.detail}>Cliente: {item.clientName}</Text>
              {item.licensePlate && (
                <Text style={styles.detail}>Matrícula: {item.licensePlate}</Text>
              )}
              {item.reviewedBy && (
                <Text style={styles.detail}>Técnico revisor: {item.reviewedBy}</Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.date}>
                  {new Date(item.date).toLocaleDateString('es-ES')}
                </Text>
                <Chip
                  style={[styles.chip, { backgroundColor: '#dcfce7' }]}
                  textStyle={[styles.chipText, { color: '#16a34a' }]}
                >
                  Revisada
                </Chip>
              </View>
            </Card.Content>
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0891b2', '#22d3ee'] as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar salidas renoves</Text>
        </LinearGradient>

        {isSelectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </Text>
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
            placeholder="Buscar por cliente, matrícula, marca..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Cargando máquinas...</Text>
          </View>
        ) : filteredMachines.length > 0 ? (
          <FlatList
            data={filteredMachines}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={56}
              color={BRAND_COLORS.grayMedium}
            />
            <Text style={styles.emptyText}>
              No hay inspecciones de salida registradas.
            </Text>
          </View>
        )}

        {isSelectionMode && selectedIds.size > 0 && (
          <View style={[styles.deleteBar, { paddingBottom: insets.bottom + SPACING.md }]}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
              <MaterialCommunityIcons name="delete" size={20} color="white" />
              <Text style={styles.deleteButtonText}>
                Eliminar seleccionados ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={isDeleting} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color="#0891b2" />
              <Text style={styles.overlayText}>Eliminando inspecciones...</Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0891b2',
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  backButton: {
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
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    marginLeft: 44,
    letterSpacing: 0.2,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065666',
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
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'white',
    ...SHADOWS.soft,
  },
  searchbar: {
    backgroundColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 0,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  searchInput: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    marginBottom: SPACING.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: '#0891b2',
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardContent: {
    paddingVertical: SPACING.md,
  },
  machineName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 4,
  },
  detail: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
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
  date: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
  },
  chip: {
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.md,
    textAlign: 'center',
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
    borderTopWidth: 0,
    ...SHADOWS.large,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  deleteButtonText: {
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
