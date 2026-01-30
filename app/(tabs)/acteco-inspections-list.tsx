import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import {
    ActecoInspection,
    deleteActecoInspection,
    getActecoInspections,
    inspectionToParams
} from '../../utils/actecoInspectionStorage';

interface ActecoInspectionCardProps {
  inspection: ActecoInspection;
  onPress: (inspection: ActecoInspection) => void;
  onMenuPress: (inspection: ActecoInspection, event?: any) => void;
}

const ActecoInspectionCard = ({ inspection, onPress, onMenuPress }: ActecoInspectionCardProps) => (
  <Card style={styles.card} onPress={() => onPress(inspection)}>
    <Card.Content>
      <View style={styles.cardHeader}>
        <Title style={styles.inspectionTitle} numberOfLines={1}>
          {inspection.clientName}
        </Title>
        <IconButton
          icon="dots-vertical"
          onPress={(e) => onMenuPress(inspection, e)}
          size={20}
          style={styles.menuButton}
        />
      </View>
      
      <Text>Fecha: {inspection.avisoDate} {inspection.avisoTime}</Text>
      <Text>Ubicación: {inspection.location}</Text>
      <Text>Máquina: {inspection.machineType}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          Registrado: {new Date(inspection.createdAt).toLocaleDateString('es-ES')}
        </Text>
      </View>
    </Card.Content>
  </Card>
);

export default function ActecoInspectionsListScreen() {
  const [inspections, setInspections] = useState<ActecoInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<ActecoInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<ActecoInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadInspections();
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
      console.log('📂 Cargando inspecciones...');
      setLoading(true);
      
      const loadedInspections = await getActecoInspections();
      console.log(`✅ ${loadedInspections.length} inspecciones cargadas`);
      
      // Ordenar por fecha de creación (más recientes primero)
      const sorted = loadedInspections.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setInspections(sorted);
      setFilteredInspections(sorted);
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al cargar las inspecciones:', error);
      setLoading(false);
      Alert.alert('Error', 'No se pudieron cargar las inspecciones.');
    }
  };

  const filterInspections = () => {
    let result = [...inspections];
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(inspection => 
        inspection.clientName.toLowerCase().includes(searchLower) || 
        inspection.location.toLowerCase().includes(searchLower) ||
        inspection.machineType.toLowerCase().includes(searchLower) ||
        (inspection.machineBrand && inspection.machineBrand.toLowerCase().includes(searchLower)) ||
        (inspection.machineModel && inspection.machineModel.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredInspections(result);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleInspectionPress = (inspection: ActecoInspection) => {
    console.log('📂 Abriendo inspección:', inspection.id);
    router.push({
      pathname: '/acteco-report-view',
      params: { inspectionId: inspection.id }
    });
  };

  const handleMenuOpen = (inspection: ActecoInspection, event?: any) => {
    const position = event && event.nativeEvent 
      ? { 
          x: event.nativeEvent.pageX, 
          y: event.nativeEvent.pageY 
        } 
      : { x: 0, y: 0 };
    
    setMenuPosition(position);
    setSelectedInspection(inspection);
    setMenuVisible(true);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
  };

  const handleEditInspection = () => {
    handleMenuClose();
    
    if (!selectedInspection) return;
    
    console.log('✏️ Editando inspección:', selectedInspection.id);
    
    // Convertir inspección a params para pasarlos al formulario
    const params = inspectionToParams(selectedInspection);
    
    // Navegar al formulario con los datos precargados
    router.push({
      pathname: '/acteco-report-form',
      params: {
        ...params,
        isEditing: 'true' // Flag para indicar que estamos editando
      }
    });
  };

  const handleDeleteInspection = async () => {
    try {
      handleMenuClose();
      
      if (!selectedInspection) return;
      
      Alert.alert(
        'Eliminar inspección',
        `¿Estás seguro de que quieres eliminar la inspección de "${selectedInspection.clientName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                
                console.log('🗑️ Eliminando inspección:', selectedInspection.id);
                await deleteActecoInspection(selectedInspection.id);
                
                await loadInspections();
                
                Alert.alert('Inspección eliminada', 'La inspección ha sido eliminada correctamente.');
              } catch (error) {
                console.error('❌ Error al eliminar la inspección:', error);
                Alert.alert('Error', 'No se pudo eliminar la inspección. Inténtalo de nuevo.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error al preparar eliminación de inspección:', error);
      Alert.alert('Error', 'No se pudo eliminar la inspección. Inténtalo de nuevo.');
    }
  };

  const renderInspectionItem = ({ item }: { item: ActecoInspection }) => (
    <ActecoInspectionCard
      inspection={item}
      onPress={handleInspectionPress}
      onMenuPress={handleMenuOpen}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Title style={styles.headerTitle}>Inspecciones URGENCIAS</Title>
        </View>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, ubicación o máquina..."
            onChangeText={handleSearch}
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
            renderItem={renderInspectionItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text>No se encontraron inspecciones registradas.</Text>
            <Button 
              mode="contained" 
              onPress={() => router.push('/acteco-report-form')}
              style={styles.newButton}
              icon="plus-circle"
            >
              Nueva Inspección URGENCIAS
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
              if (selectedInspection) {
                router.push({
                  pathname: '/acteco-report-view',
                  params: { inspectionId: selectedInspection.id }
                });
              }
            }} 
            title="Ver informe" 
            leadingIcon="file-document"
          />
          <Menu.Item 
            onPress={handleEditInspection} 
            title="Editar inspección" 
            leadingIcon="pencil"
          />
          <Divider />
          <Menu.Item 
            onPress={handleDeleteInspection} 
            title="Eliminar" 
            leadingIcon="delete"
            titleStyle={{ color: '#F44336' }}
          />
        </Menu>
        
        <Button 
          mode="contained" 
          icon="plus"
          onPress={() => router.push('/acteco-report-form')}
          style={styles.fab}
        >
          Nueva Inspección
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primaryBlue,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  backButton: {
    margin: 0,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchbar: {
    elevation: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectionTitle: {
    fontSize: 18,
    flex: 1,
    color: BRAND_COLORS.primaryBlue,
  },
  menuButton: {
    margin: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  date: {
    fontSize: 12,
    color: '#757575',
  },
});