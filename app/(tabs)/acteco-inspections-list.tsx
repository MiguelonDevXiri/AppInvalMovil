import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Menu, Searchbar, Text, Title } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
    ActecoInspection,
    deleteActecoInspection,
    getActecoInspections,
    inspectionToParams
} from '../../utils/actecoInspectionStorage';

interface ActecoInspectionCardProps {
  inspection: ActecoInspection;
  onPress: (inspection: ActecoInspection) => void;
  onMenuPress?: (inspection: ActecoInspection, event?: any) => void;
  onLongPress?: (inspection: ActecoInspection) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const ActecoInspectionCard = ({ inspection, onPress, onMenuPress, onLongPress, isSelectionMode, isSelected }: ActecoInspectionCardProps) => (
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
            color={isSelected ? BRAND_COLORS.primaryBlue : BRAND_COLORS.grayMedium}
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
            
            <Text>Fecha: {inspection.avisoDate}</Text>
            <Text>Tipo: {inspection.machineType || 'Sin tipo'}</Text>
            <Text>Matrícula: {inspection.licensePlate || 'Sin matrícula'}</Text>
            <Text>Ubicación: {inspection.location}</Text>
            <Text>Marca: {inspection.machineBrand || 'Sin marca'}</Text>
            <Text>OT: {inspection.otNumber || 'Sin OT'}</Text>
            
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

export default function ActecoInspectionsListScreen() {
  const insets = useSafeAreaInsets();
  const [inspections, setInspections] = useState<ActecoInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<ActecoInspection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<ActecoInspection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInspections();
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
        (inspection.licensePlate && inspection.licensePlate.toLowerCase().includes(searchLower)) ||
        (inspection.otNumber && inspection.otNumber.toLowerCase().includes(searchLower)) ||
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
    if (isSelectionMode) {
      toggleSelection(inspection.id);
      return;
    }
    console.log('📂 Abriendo inspección:', inspection.id);
    router.push({
      pathname: '/acteco-report-view',
      params: { inspectionId: inspection.id }
    });
  };

  const handleLongPress = (inspection: ActecoInspection) => {
    if (userRole !== 'admin') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([inspection.id]));
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
    setSelectedIds(new Set(filteredInspections.map(i => i.id)));
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Eliminar inspecciones',
      `¿Eliminar ${count} inspección${count > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`,
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
                await deleteActecoInspection(id);
              }
              await loadInspections();
              cancelSelection();
              Alert.alert('Eliminadas', `${count} inspección${count > 1 ? 'es' : ''} eliminada${count > 1 ? 's' : ''} correctamente.`);
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
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>Inspecciones URGENCIAS</Title>
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
            placeholder="Buscar por cliente, tipo, matrícula, ubicación, marca u OT..."
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
        
        {isSelectionMode && selectedIds.size > 0 && (
          <View style={[styles.deleteBar, { paddingBottom: insets.bottom + SPACING.md }]}>
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
          {userRole !== 'technician' && (
            <Menu.Item 
              onPress={handleEditInspection} 
              title="Editar inspección" 
              leadingIcon="pencil"
            />
          )}
          {userRole !== 'technician' && (
            <>
              <Divider />
              <Menu.Item 
                onPress={handleDeleteInspection} 
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
    backgroundColor: BRAND_COLORS.primaryBlue,
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
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginLeft: 44,
    letterSpacing: 0.2,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 0,
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
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_COLORS.primaryOrange,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  card: {
    marginBottom: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    flex: 1,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  menuButton: {
    margin: 0,
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