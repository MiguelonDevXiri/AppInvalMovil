import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, IconButton, Menu, Searchbar, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MachineCard from '../../components/MachineCard';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { deleteMachine, getMachines, Machine } from '../../utils/storage';

interface Filters {
  clientType: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export default function MachineListScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    clientType: null,
    dateFrom: null,
    dateTo: null,
  });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMachines();
    // Cargar rol del técnico
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
    filterMachines();
  }, [searchQuery, machines, filters]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const loadedMachines = await getMachines();
      setMachines(loadedMachines);
      setFilteredMachines(loadedMachines);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar las máquinas:', error);
      setLoading(false);
      Alert.alert('Error', 'No se pudieron cargar las máquinas registradas.');
    }
  };

  const filterMachines = () => {
    let result = [...machines];

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(machine =>
        machine.name.toLowerCase().includes(searchLower) ||
        machine.clientName.toLowerCase().includes(searchLower) ||
        (machine.model && machine.model.toLowerCase().includes(searchLower)) ||
        (machine.serialNumber && machine.serialNumber.toLowerCase().includes(searchLower))
      );
    }

    if (filters.clientType) {
      result = result.filter(machine => machine.clientType === filters.clientType);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(machine => new Date(machine.date) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(machine => new Date(machine.date) <= toDate);
    }

    setFilteredMachines(result);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleMachinePress = (machine: Machine) => {
    if (isSelectionMode) {
      toggleSelection(machine.id);
      return;
    }
    router.push({
      pathname: '/report',
      params: { machineId: machine.id }
    });
  };

  const handleLongPress = (machine: Machine) => {
    if (userRole !== 'admin') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([machine.id]));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
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
    setSelectedIds(new Set(filteredMachines.map(m => m.id)));
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Eliminar máquinas',
      `¿Eliminar ${count} máquina${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`,
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
                await deleteMachine(id);
              }
              await loadMachines();
              cancelSelection();
              Alert.alert('Eliminadas', `${count} máquina${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''} correctamente.`);
            } catch (error) {
              console.error('Error al eliminar máquinas:', error);
              Alert.alert('Error', 'No se pudieron eliminar todas las máquinas.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleMenuOpen = (machine: Machine, event?: any) => {
    const position = event && event.nativeEvent
      ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      : { x: 0, y: 0 };
    setMenuPosition(position);
    setSelectedMachine(machine);
    setMenuVisible(true);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
  };

  const handleEditMachine = () => {
    handleMenuClose();
    if (!selectedMachine) return;
    router.push({
      pathname: '/checklist',
      params: { machineId: selectedMachine.id }
    });
  };

  const handleFilterChange = (key: keyof Filters, value: string | null) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({ clientType: null, dateFrom: null, dateTo: null });
    setFilterVisible(false);
  };

  const renderMachineItem = ({ item }: { item: Machine }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {isSelectionMode && (
        <TouchableOpacity onPress={() => toggleSelection(item.id)} style={{ paddingLeft: SPACING.sm, justifyContent: 'center' }}>
          <MaterialCommunityIcons
            name={selectedIds.has(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={selectedIds.has(item.id) ? BRAND_COLORS.primaryBlue : BRAND_COLORS.grayMedium}
          />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <MachineCard
          machine={item}
          onPress={(m: Machine) => handleMachinePress(m)}
          onLongPress={(m: Machine) => handleLongPress(m)}
          onMenuPress={isSelectionMode ? undefined : handleMenuOpen}
        />
      </View>
    </View>
  );

  const hasActiveFilters = filters.clientType || filters.dateFrom || filters.dateTo;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Máquinas Registradas</Text>
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
            placeholder="Buscar máquina o cliente..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
          />
          <IconButton
            icon="filter-variant"
            onPress={() => setFilterVisible(!filterVisible)}
            style={[styles.filterButton, hasActiveFilters && styles.activeFilter]}
            iconColor={hasActiveFilters ? 'white' : BRAND_COLORS.primaryBlue}
          />
        </View>

        {filterVisible && (
          <Card style={styles.filterCard}>
            <Card.Content>
              <Text style={styles.filterTitle}>Filtros</Text>

              <Text style={styles.filterLabel}>Tipo de cliente:</Text>
              <View style={styles.chipContainer}>
                {['Particular', 'Empresa', 'Institución', 'Otro'].map(type => (
                  <Chip
                    key={type}
                    selected={filters.clientType === type}
                    onPress={() => handleFilterChange('clientType', filters.clientType === type ? null : type)}
                    style={[styles.filterChip, filters.clientType === type && styles.filterChipSelected]}
                    textStyle={filters.clientType === type ? { color: 'white' } : undefined}
                  >
                    {type}
                  </Chip>
                ))}
              </View>

              <Text style={styles.filterLabel}>Fecha desde:</Text>
              <TextInput
                mode="outlined"
                placeholder="YYYY-MM-DD"
                value={filters.dateFrom || ''}
                onChangeText={(text) => handleFilterChange('dateFrom', text || null)}
                style={styles.dateInput}
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />

              <Text style={styles.filterLabel}>Fecha hasta:</Text>
              <TextInput
                mode="outlined"
                placeholder="YYYY-MM-DD"
                value={filters.dateTo || ''}
                onChangeText={(text) => handleFilterChange('dateTo', text || null)}
                style={styles.dateInput}
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />

              <View style={styles.filterButtons}>
                <Button
                  mode="outlined"
                  onPress={clearFilters}
                  style={styles.filterButtonAction}
                  textColor={BRAND_COLORS.grayDark}
                >
                  Limpiar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setFilterVisible(false)}
                  style={[styles.filterButtonAction, { backgroundColor: BRAND_COLORS.primaryBlue }]}
                >
                  Aplicar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Cargando máquinas...</Text>
          </View>
        ) : filteredMachines.length > 0 ? (
          <FlatList
            data={filteredMachines}
            renderItem={renderMachineItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cog-off-outline" size={56} color={BRAND_COLORS.grayMedium} />
            <Text style={styles.emptyText}>No se encontraron máquinas registradas.</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/machine-type-selection')}
              style={styles.newButton}
              icon="plus-circle"
              buttonColor={BRAND_COLORS.primaryOrange}
            >
              Registrar Nueva Máquina
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
              <Text style={styles.overlayText}>Eliminando máquinas...</Text>
            </View>
          </View>
        </Modal>

        <Menu
          visible={menuVisible}
          onDismiss={handleMenuClose}
          anchor={menuPosition}
        >
          <Menu.Item
            onPress={() => {
              handleMenuClose();
              if (selectedMachine) {
                router.push({ pathname: '/report', params: { machineId: selectedMachine.id } });
              }
            }}
            title="Ver informe"
            leadingIcon="file-document"
          />
          {userRole !== 'technician' && (
            <Menu.Item
              onPress={handleEditMachine}
              title="Editar inspección"
              leadingIcon="pencil"
            />
          )}
        </Menu>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    marginLeft: 44,
    letterSpacing: 0.2,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 0,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  searchbar: {
    flex: 1,
    marginRight: SPACING.sm,
    backgroundColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 0,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  searchInput: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  filterButton: {
    margin: 0,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderWidth: 1,
    borderColor: BRAND_COLORS.lightBlue,
  },
  activeFilter: {
    backgroundColor: BRAND_COLORS.primaryBlue,
    borderColor: BRAND_COLORS.primaryBlue,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
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
  newButton: {
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  filterCard: {
    margin: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.card,
  },
  filterTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    marginBottom: SPACING.sm,
    color: BRAND_COLORS.primaryBlue,
  },
  filterLabel: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: BRAND_COLORS.grayDark,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    margin: SPACING.xs,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  filterChipSelected: {
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  dateInput: {
    marginBottom: SPACING.sm,
    backgroundColor: 'white',
    height: 44,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  filterButtonAction: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.darkBlue,
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
