import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import checklistData from '../../data/checklistData';
import { getChecklistByMachineType } from '../../data/machineChecklists';
import { sharePDFReport } from '../../utils/reportGenerator';
import {
    ChecklistData,
    GeneralPhotosData,
    getChecklistByMachineId,
    getGeneralPhotosByMachineId,
    getMachineById,
    Machine
} from '../../utils/storage';

export default function ReportScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklistResults, setChecklistResults] = useState<ChecklistData | null>(null);
  const [generalPhotos, setGeneralPhotos] = useState<GeneralPhotosData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  
  const [dataLoaded, setDataLoaded] = useState({
    machine: false,
    checklist: false,
    photos: false
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        
        setLoading(true);
        console.log(`Cargando datos para máquina con ID: ${machineId}`);
        
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) {
          console.log(`Máquina encontrada: ${foundMachine.name} (${foundMachine.machineType || 'sin tipo'})`);
          setMachine(foundMachine);
          setDataLoaded(prev => ({...prev, machine: true}));
        } else {
          console.log('No se encontró la máquina');
        }
        
        console.log('Intentando cargar checklist...');
        const foundChecklist = await getChecklistByMachineId(machineId.toString());
        if (foundChecklist) {
          console.log(`Checklist encontrado con ${Object.keys(foundChecklist.results || {}).length} resultados`);
          console.log(`Checklist tiene ${Object.keys(foundChecklist.photos || {}).length} fotos`);
          setChecklistResults(foundChecklist);
          setDataLoaded(prev => ({...prev, checklist: true}));
        } else {
          console.log('No se encontró checklist para esta máquina');
        }
        
        const foundPhotos = await getGeneralPhotosByMachineId(machineId.toString());
        if (foundPhotos) {
          console.log('Fotos generales encontradas');
          setGeneralPhotos(foundPhotos);
          setDataLoaded(prev => ({...prev, photos: true}));
        } else {
          console.log('No se encontraron fotos generales');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [machineId]);

  useEffect(() => {
    if (dataLoaded.machine && machine) {
      console.log(`Datos de máquina cargados: ${machine.name}`);
    }
    
    if (dataLoaded.checklist && checklistResults) {
      console.log(`Datos de checklist cargados con ${Object.keys(checklistResults.results || {}).length} resultados`);
    }
    
    if (dataLoaded.photos && generalPhotos) {
      console.log('Datos de fotos generales cargados');
    }
  }, [dataLoaded, machine, checklistResults, generalPhotos]);

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'ok':
        return 'Bien';
      case 'fail':
        return 'Mal';
      case 'na':
        return 'No Aplica';
      default:
        return 'No Revisado';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ok':
        return '#4CAF50';
      case 'fail':
        return '#F44336';
      case 'na':
        return '#9E9E9E';
      default:
        return '#757575';
    }
  };

  const handleShareReport = async () => {
    try {
      if (!machine) {
        Alert.alert('Error', 'No hay datos de máquina para generar el informe.');
        return;
      }
      
      console.log('Iniciando generación de PDF...');
      console.log(`Máquina: ${machine.name} (${machine.machineType || 'sin tipo'})`);
      
      if (checklistResults) {
        console.log(`Pasando checklist con ${Object.keys(checklistResults.results || {}).length} resultados al generador`);
      } else {
        console.log('No hay checklist para pasar al generador');
      }
      
      await sharePDFReport(machine, checklistResults, generalPhotos);
      console.log('PDF generado correctamente');
    } catch (error) {
      console.error('Error al compartir el informe:', error);
      Alert.alert('Error', 'No se pudo compartir el informe. Inténtalo de nuevo.');
    }
  };
  
  const renderStatusChip = (status: string) => {
    return (
      <Chip
        style={{
          backgroundColor: getStatusColor(status),
          marginRight: 4,
        }}
        textStyle={{ color: 'white' }}
      >
        {getStatusText(status)}
      </Chip>
    );
  };
  
  const handlePhotoPress = (uri: string) => {
    setSelectedPhotoUri(uri);
    setPhotoModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text>Cargando informe...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text>No se encontraron datos para esta máquina.</Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/')}
          style={{marginTop: 16}}
          color={BRAND_COLORS.primaryBlue}
        >
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  const isOthersMachineType = machine.machineType === 'otros';
  
  const machineChecklist = machine.machineType 
    ? getChecklistByMachineType(machine.machineType) 
    : checklistData;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Informe de Inspección</Title>
            <Paragraph style={styles.headerSubtitle}>
              Fecha: {new Date().toLocaleDateString()}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Información de la Máquina</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{machine.name}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Marca:</Text>
              <Text style={styles.infoValue}>{machine.brand || 'No especificado'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Modelo:</Text>
              <Text style={styles.infoValue}>{machine.model || 'No especificado'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Número de serie:</Text>
              <Text style={styles.infoValue}>{machine.serialNumber || 'No especificado'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{machine.clientName}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tipo de máquina:</Text>
              <Text style={styles.infoValue}>{machine.machineType || 'No especificado'}</Text>
            </View>

            {machine.location && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ubicación:</Text>
                <Text style={styles.infoValue}>{machine.location}</Text>
              </View>
            )}
            
            {machine.reviewedBy && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Revisado por:</Text>
                <Text style={styles.infoValue}>{machine.reviewedBy}</Text>
              </View>
            )}

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha registro:</Text>
              <Text style={styles.infoValue}>{new Date(machine.date).toLocaleDateString()}</Text>
            </View>
          </Card.Content>
        </Card>

        {isOthersMachineType ? (
          <Card style={styles.commentsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Observaciones Generales</Title>
              <Divider style={styles.divider} />
              <Paragraph style={styles.comments}>
                {machine.notes || 'No se han registrado observaciones.'}
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          checklistResults && checklistResults.results && Object.keys(checklistResults.results).length > 0 ? (
            <Card style={styles.checklistCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Resultados del Checklist</Title>
                <Divider style={styles.divider} />
                
                {machineChecklist.map((category, index) => {
                  const hasItems = category.items.some(item => 
                    checklistResults.results[item.id] !== undefined
                  );
                  
                  if (!hasItems) return null;
                  
                  return (
                    <View key={index} style={styles.categoryContainer}>
                      <Text style={styles.categoryTitle}>{category.category}</Text>
                      <Divider style={styles.categoryDivider} />
                      
                      {category.items.map(item => {
                        const status = checklistResults.results[item.id];
                        if (!status) return null;
                        
                        return (
                          <View key={item.id}>
                            <View style={styles.checklistItem}>
                              <Text style={styles.itemText}>{item.text}</Text>
                              {renderStatusChip(status)}
                            </View>
                            
                            {status === 'fail' && checklistResults.photos && checklistResults.photos[item.id] && (
                              <View style={styles.evidenceContainer}>
                                <Text style={styles.evidenceLabel}>
                                  Evidencia fotográfica 
                                  {Array.isArray(checklistResults.photos[item.id]) && 
                                    (checklistResults.photos[item.id] as any[]).length > 1 
                                    ? ` (${(checklistResults.photos[item.id] as any[]).length} imágenes)` 
                                    : ''}:
                                </Text>
                                
                                <View style={styles.photosGrid}>
                                  {Array.isArray(checklistResults.photos[item.id]) ? 
                                    (checklistResults.photos[item.id] as any[]).map((photo, photoIndex) => {
                                      const photoUri = typeof photo === 'string' ? photo : photo.uri;
                                      return (
                                        <TouchableOpacity 
                                          key={`${item.id}_photo_${photoIndex}`}
                                          onPress={() => handlePhotoPress(photoUri)}
                                          style={styles.photoContainer}
                                        >
                                          <Image 
                                            source={{ uri: photoUri }} 
                                            style={styles.evidencePhoto}
                                            resizeMode="contain"
                                          />
                                          <Text style={styles.photoNumber}>Foto #{photoIndex + 1}</Text>
                                        </TouchableOpacity>
                                      );
                                    }) : 
                                    <TouchableOpacity
                                      onPress={() => {
                                        const photoUri = typeof checklistResults.photos[item.id] === 'string' 
                                          ? checklistResults.photos[item.id] as string 
                                          : (checklistResults.photos[item.id] as any).uri;
                                        handlePhotoPress(photoUri);
                                      }}
                                      style={styles.photoContainer}
                                    >
                                      <Image 
                                        source={{ 
                                          uri: typeof checklistResults.photos[item.id] === 'string'
                                            ? checklistResults.photos[item.id] as string
                                            : (checklistResults.photos[item.id] as any).uri
                                        }} 
                                        style={styles.evidencePhoto}
                                        resizeMode="contain"
                                      />
                                    </TouchableOpacity>
                                  }
                                </View>
                              </View>
                            )}
                            
                            <Divider style={styles.itemDivider} />
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyChecklistCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Checklist no disponible</Title>
                <Divider style={styles.divider} />
                <Paragraph style={styles.emptyText}>
                  No se encontraron datos del checklist para esta máquina.
                </Paragraph>
              </Card.Content>
            </Card>
          )
        )}

        {!isOthersMachineType && machine.notes && (
          <Card style={styles.commentsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Comentarios Específicos</Title>
              <Divider style={styles.divider} />
              {machine.notes.includes('=== COMENTARIOS ESPECÍFICOS ===') ? (
                <View style={styles.commentsContainer}>
                  {machine.notes.split('=== COMENTARIOS ESPECÍFICOS ===')[1].split('\n\n').map((commentBlock, index) => {
                    if (!commentBlock.trim()) return null;
                    
                    const commentMatch = commentBlock.match(/#(\d+):/);
                    const commentNum = commentMatch ? commentMatch[1] : (index + 1);
                    
                    return (
                      <View key={index} style={styles.commentBlock}>
                        <Text style={styles.commentHeader}>Comentario #{commentNum}</Text>
                        <Text style={styles.commentText}>{commentBlock}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Paragraph style={styles.comments}>
                  {machine.notes}
                </Paragraph>
              )}
            </Card.Content>
          </Card>
        )}

        {generalPhotos && generalPhotos.photos && (
          <Card style={styles.photosCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Fotos Generales</Title>
              <Divider style={styles.divider} />
              
              <View style={styles.photosGrid}>
                {generalPhotos.photos.front && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>Esquina 1</Text>
                    <TouchableOpacity onPress={() => handlePhotoPress(generalPhotos.photos.front as string)}>
                      <Image 
                        source={{ uri: generalPhotos.photos.front }} 
                        style={styles.generalPhoto}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                
                {generalPhotos.photos.back && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>Esquina 2</Text>
                    <TouchableOpacity onPress={() => handlePhotoPress(generalPhotos.photos.back as string)}>
                      <Image 
                        source={{ uri: generalPhotos.photos.back }} 
                        style={styles.generalPhoto}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                
                {generalPhotos.photos.left && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>Esquina 3</Text>
                    <TouchableOpacity onPress={() => handlePhotoPress(generalPhotos.photos.left as string)}>
                      <Image 
                        source={{ uri: generalPhotos.photos.left }} 
                        style={styles.generalPhoto}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                
                {generalPhotos.photos.right && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>Esquina 4</Text>
                    <TouchableOpacity onPress={() => handlePhotoPress(generalPhotos.photos.right as string)}>
                      <Image 
                        source={{ uri: generalPhotos.photos.right }} 
                        style={styles.generalPhoto}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {Object.entries(generalPhotos.photos).map(([key, value]) => {
                  if (!['front', 'back', 'left', 'right'].includes(key) && value) {
                    return (
                      <View key={key} style={styles.photoItem}>
                        <Text style={styles.photoLabel}>Adicional - {key}</Text>
                        <TouchableOpacity onPress={() => handlePhotoPress(value)}>
                          <Image 
                            source={{ uri: value }} 
                            style={styles.generalPhoto}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </Card.Content>
          </Card>
        )}
        
        {__DEV__ && (
          <Card style={styles.debugCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Información de Depuración</Title>
              <Divider style={styles.divider} />
              
              <Text style={styles.debugText}>ID de máquina: {machineId}</Text>
              <Text style={styles.debugText}>Tipo: {machine.machineType || 'No especificado'}</Text>
              
              <Text style={styles.debugText}>
                Checklist: {checklistResults ? 'Disponible' : 'No disponible'}
              </Text>
              
              {checklistResults && (
                <>
                  <Text style={styles.debugText}>
                    Número de resultados: {Object.keys(checklistResults.results || {}).length}
                  </Text>
                  <Text style={styles.debugText}>
                    Ítems: {Object.keys(checklistResults.results || {}).join(', ')}
                  </Text>
                </>
              )}
              
              <Text style={styles.debugText}>
                Fotos generales: {generalPhotos ? 'Disponibles' : 'No disponibles'}
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      
      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonsContainer}>
          <Button 
            mode="outlined" 
            onPress={() => router.replace('/')}
            style={styles.button}
            icon="home"
            color={BRAND_COLORS.primaryBlue}
          >
            Volver al Inicio
          </Button>
          
          <Button 
            mode="contained" 
            onPress={handleShareReport}
            style={styles.button}
            icon="share"
            color={BRAND_COLORS.primaryOrange}
          >
            Compartir Informe
          </Button>
        </View>
      </SafeAreaView>
      
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setPhotoModalVisible(false)}
          >
            <View style={styles.closeIconWrapper}>
              <Text style={styles.closeIconText}>✕</Text>
            </View>
          </TouchableOpacity>
          
          {selectedPhotoUri && (
            <Image
              source={{ uri: selectedPhotoUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  title: {
    color: 'white',
    fontSize: 20,
  },
  headerSubtitle: {
    color: 'white',
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  checklistCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  emptyChecklistCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#757575',
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  commentsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  photosCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  debugCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
    backgroundColor: '#f3e5f5',
  },
  debugText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 4,
  },
  divider: {
    backgroundColor: BRAND_COLORS.primaryOrange,
    height: 1,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 120,
    color: BRAND_COLORS.primaryBlue,
  },
  infoValue: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: BRAND_COLORS.primaryBlue,
  },
  categoryDivider: {
    backgroundColor: BRAND_COLORS.tertiaryOrange,
    height: 1,
    marginBottom: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemText: {
    flex: 1,
    marginRight: 8,
  },
  itemDivider: {
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    height: 1,
  },
  evidenceContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  evidenceLabel: {
    fontStyle: 'italic',
    marginBottom: 8,
    color: BRAND_COLORS.primaryOrange,
    fontWeight: 'bold',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  photoContainer: {
    margin: 4,
    alignItems: 'center',
    width: '46%',
    marginBottom: 12,
  },
  evidencePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BRAND_COLORS.tertiaryOrange,
  },
  photoNumber: {
    marginTop: 4,
    fontSize: 12,
    color: BRAND_COLORS.grayDark,
  },
  photoItem: {
    width: '48%',
    marginBottom: 16,
  },
  photoLabel: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
  },
  generalPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BRAND_COLORS.tertiaryBlue,
  },
  comments: {
    padding: 12,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    fontStyle: 'italic',
    marginTop: 8,
  },
  commentsContainer: {
    marginTop: 8,
  },
  commentBlock: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  commentHeader: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 16,
    color: BRAND_COLORS.primaryBlue,
  },
  commentText: {
    fontStyle: 'italic',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  closeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});