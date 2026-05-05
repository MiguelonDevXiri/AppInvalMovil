import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, Title, Paragraph, Searchbar, Chip, IconButton, Menu, Divider, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getMachines, deleteMachine } from '../utils/storage';
import { Machine } from '../utils/storage';
import MachineCard from './MachineCard';
import { BRAND_COLORS } from '../constants/Colors';

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

  // Cargar todas las máquinas
  useEffect(() => {
    loadMachines();
  }, []);

  // Recargar cuando la pantalla recibe foco (cuando volvemos a ella)
  useFocusEffect(
    useCallback(() => {
      loadMachines();
    }, [])
  );

  // Filtrar máquinas cuando cambia la búsqueda
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
    
    // Filtrar por texto de búsqueda
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(machine => 
        machine.name.toLowerCase().includes(searchLower) || 
        machine.clientName.toLowerCase().includes(searchLower) ||
        (machine.model && machine.model.toLowerCase().includes(searchLower)) ||
        (machine.serialNumber && machine.serialNumber.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtrar por tipo de cliente
    if (filters.clientType) {
      result = result.filter(machine => machine.clientType === filters.clientType);
    }
    
    // Filtrar por fecha
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(machine => new Date(machine.date) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Fin del día
      result = result.filter(machine => new Date(machine.date) <= toDate);
    }
    
    setFilteredMachines(result);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleMachinePress = (machine: Machine) => {
    router.push({
      pathname: '/report',
      params: { machineId: machine.id }
    });
  };

  const handleMenuOpen = (machine: Machine, event?: any) => {
    // Establecer la posición del menú basada en el evento
    const position = event && event.nativeEvent 
      ? { 
          x: event.nativeEvent.pageX, 
          y: event.nativeEvent.pageY 
        } 
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
    
    // Ir directo al checklist sin preguntar
    router.push({
      pathname: '/checklist',
      params: { machineId: selectedMachine.id }
    });
  };

  const handleDeleteMachine = async () => {
    try {
      handleMenuClose();
      
      if (!selectedMachine) return;
      
      // Confirmar antes de eliminar
      Alert.alert(
        'Eliminar máquina',
        `¿Estás seguro de que quieres eliminar "${selectedMachine.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Mostrar indicador de carga
                setLoading(true);
                
                // Eliminar la máquina y todos sus datos relacionados
                await deleteMachine(selectedMachine.id);
                
                // Actualizar la lista local
                await loadMachines();
                
                Alert.alert('Máquina eliminada', 'La máquina ha sido eliminada correctamente.');
              } catch (error) {
                console.error('Error al eliminar la máquina:', error);
                Alert.alert('Error', 'No se pudo eliminar la máquina. Inténtalo de nuevo.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al preparar eliminación de máquina:', error);
      Alert.alert('Error', 'No se pudo eliminar la máquina. Inténtalo de nuevo.');
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string | null) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    setFilters({
      clientType: null,
      dateFrom: null,
      dateTo: null
    });
    setFilterVisible(false);
  };

  const renderMachineItem = ({ item }: { item: Machine }) => (
    <MachineCard
      machine={item}
      onPress={() => handleMachinePress(item)}
      onMenuPress={handleMenuOpen}
      onLongPress={handleMenuOpen}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar máquina o cliente..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <IconButton
          icon="filter"
          onPress={() => setFilterVisible(!filterVisible)}
          style={[
            styles.filterButton,
            (filters.clientType || filters.dateFrom || filters.dateTo) ? styles.activeFilter : null
          ]}
        />
      </View>
      
      {filterVisible && (
        <Card style={styles.filterCard}>
          <Card.Content>
            <Title style={styles.filterTitle}>Filtros</Title>
            
            <Text style={styles.filterLabel}>Tipo de cliente:</Text>
            <View style={styles.chipContainer}>
              {['Particular', 'Empresa', 'Institución', 'Otro'].map(type => (
                <Chip
                  key={type}
                  selected={filters.clientType === type}
                  onPress={() => handleFilterChange('clientType', filters.clientType === type ? null : type)}
                  style={styles.filterChip}
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
            />
            
            <Text style={styles.filterLabel}>Fecha hasta:</Text>
            <TextInput
              mode="outlined"
              placeholder="YYYY-MM-DD"
              value={filters.dateTo || ''}
              onChangeText={(text) => handleFilterChange('dateTo', text || null)}
              style={styles.dateInput}
            />
            
            <View style={styles.filterButtons}>
              <Button 
                mode="outlined" 
                onPress={clearFilters}
                style={styles.filterButtonAction}
              >
                Limpiar Filtros
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => setFilterVisible(false)}
                style={styles.filterButtonAction}
              >
                Aplicar
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
      
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Cargando máquinas...</Text>
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
          <Text>No se encontraron máquinas registradas.</Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/machine-type-selection')}
            style={styles.newButton}
            icon="plus-circle"
          >
            Registrar Nueva Máquina
          </Button>
        </View>
      )}
      
      <Menu
        visible={menuVisible}
        onDismiss={handleMenuClose}
        anchor={menuPosition}
      >
        <Menu.Item 
          onPress={() => {
            handleMenuClose();
            if (selectedMachine) {
              router.push({
                pathname: '/report',
                params: { machineId: selectedMachine.id }
              });
            }
          }} 
          title="Ver informe" 
          leadingIcon="file-document"
        />
        <Menu.Item 
          onPress={handleEditMachine} 
          title="Editar inspección" 
          leadingIcon="pencil"
        />
        <Divider />
        <Menu.Item 
          onPress={handleDeleteMachine} 
          title="Eliminar" 
          leadingIcon="delete"
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
      
      <Button 
        mode="contained" 
        icon="plus"
        onPress={() => router.push('/machine-type-selection')}
        style={styles.fab}
      >
        Nueva Máquina
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    margin: 0,
  },
  filterButtonAction: {
    flex: 1,
    marginHorizontal: 8,
  },
  activeFilter: {
    backgroundColor: '#e3f2fd',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  newButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  filterCard: {
    margin: 16,
    marginTop: 0,
  },
  filterTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  filterLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    margin: 4,
  },
  dateInput: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});