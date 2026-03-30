import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import checklistData from '../../data/checklistData';
import { getChecklistByMachineType } from '../../data/machineChecklists';
import { sharePDFReport } from '../../utils/reportGenerator';
import {
  ChecklistData, GeneralPhotosData, getChecklistByMachineId, getGeneralPhotosByMachineId, getMachineById, Machine
} from '../../utils/storage';

export default function ReportScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklistResults, setChecklistResults] = useState<ChecklistData | null>(null);
  const [generalPhotos, setGeneralPhotos] = useState<GeneralPhotosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const generatingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isGenerating) {
      generatingTimeoutRef.current = setTimeout(() => {
        setIsGenerating(false);
        setProgressPercent(0);
        setProgressText('');
      }, 60000);
    } else {
      if (generatingTimeoutRef.current) {
        clearTimeout(generatingTimeoutRef.current);
        generatingTimeoutRef.current = null;
      }
    }
    return () => {
      if (generatingTimeoutRef.current) {
        clearTimeout(generatingTimeoutRef.current);
      }
    };
  }, [isGenerating]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        setLoading(true);

        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) setMachine(foundMachine);

        const foundChecklist = await getChecklistByMachineId(machineId.toString());
        if (foundChecklist) setChecklistResults(foundChecklist);

        const foundPhotos = await getGeneralPhotosByMachineId(machineId.toString());
        if (foundPhotos) setGeneralPhotos(foundPhotos);

        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [machineId]);

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'ok': return 'Bien';
      case 'fail': return 'Mal';
      case 'na': return 'No Aplica';
      case 'cant': return 'No se puede';
      default: return 'No Revisado';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ok': return BRAND_COLORS.success;
      case 'fail': return BRAND_COLORS.error;
      case 'na': return BRAND_COLORS.grayDark;
      case 'cant': return '#7c3aed';
      default: return BRAND_COLORS.grayText;
    }
  };

  const handleShareReport = async () => {
    try {
      if (!machine) { Alert.alert('Error', 'No hay datos de máquina para generar el informe.'); return; }
      setIsGenerating(true);
      setProgressText('Preparando datos...');
      setProgressPercent(5);
      await new Promise(r => setTimeout(r, 50));

      await sharePDFReport(machine, checklistResults, generalPhotos, (percent, text) => {
        setProgressPercent(percent);
        setProgressText(text);
      });

      setProgressPercent(100);
      setProgressText('¡Listo!');
    } catch (error) {
      console.error('Error al compartir el informe:', error);
      Alert.alert('Error', 'No se pudo compartir el informe. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const renderStatusChip = (status: string) => (
    <Chip style={{ backgroundColor: getStatusColor(status), borderRadius: BORDER_RADIUS.full }} textStyle={{ color: 'white', fontSize: TYPOGRAPHY.sizes.xs }}>
      {getStatusText(status)}
    </Chip>
  );

  const handlePhotoPress = (uri: string) => {
    setSelectedPhotoUri(uri);
    setPhotoModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={{ color: BRAND_COLORS.grayText }}>Cargando informe...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={{ color: BRAND_COLORS.grayText }}>No se encontraron datos para esta máquina.</Text>
        <Button mode="contained" onPress={() => router.replace('/')} style={{ marginTop: SPACING.md }} buttonColor={BRAND_COLORS.primaryBlue}>
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  const isOthersMachineType = machine.machineType === 'otros';
  const machineChecklist = machine.machineType ? getChecklistByMachineType(machine.machineType) : checklistData;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="file-document-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Informe de Inspección</Text>
          <Text style={styles.headerDate}>Fecha: {new Date().toLocaleDateString()}</Text>
        </LinearGradient>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Información de la Máquina</Text>
            <Divider style={styles.divider} />
            {[
              { label: 'Nombre', value: machine.name },
              { label: 'Marca', value: machine.brand || 'No especificado' },
              { label: 'Modelo', value: machine.model || 'No especificado' },
              { label: 'Nº Serie', value: machine.serialNumber || 'No especificado' },
              { label: 'Cliente', value: machine.clientName },
              { label: 'Tipo', value: machine.machineType || 'No especificado' },
              ...(machine.location ? [{ label: 'Ubicación', value: machine.location }] : []),
              ...(machine.reviewedBy ? [{ label: 'Revisado por', value: machine.reviewedBy }] : []),
              { label: 'Fecha', value: new Date(machine.date).toLocaleDateString() },
            ].map((item, i) => (
              <View key={i} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{item.label}:</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {isOthersMachineType ? (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Observaciones Generales</Text>
              <Divider style={styles.divider} />
              <View style={styles.commentsBlock}>
                <Text style={styles.commentsText}>{machine.notes || 'No se han registrado observaciones.'}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : (
          checklistResults && checklistResults.results && Object.keys(checklistResults.results).length > 0 ? (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Resultados del Checklist</Text>
                <Divider style={styles.divider} />
                {machineChecklist.map((category, index) => {
                  const hasItems = category.items.some(item => checklistResults.results[item.id] !== undefined);
                  if (!hasItems) return null;
                  return (
                    <View key={index} style={styles.categoryContainer}>
                      <Text style={styles.categoryTitle}>{category.category}</Text>
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
                                <Text style={styles.evidenceLabel}>Evidencia fotográfica:</Text>
                                <View style={styles.photosGrid}>
                                  {Array.isArray(checklistResults.photos[item.id]) ?
                                    (checklistResults.photos[item.id] as any[]).map((photo, photoIndex) => {
                                      const photoUri = typeof photo === 'string' ? photo : photo.uri;
                                      return (
                                        <TouchableOpacity key={`${item.id}_photo_${photoIndex}`} onPress={() => handlePhotoPress(photoUri)} style={styles.photoContainer}>
                                          <Image source={{ uri: photoUri }} style={styles.evidencePhoto} resizeMode="contain" />
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
                                        source={{ uri: typeof checklistResults.photos[item.id] === 'string' ? checklistResults.photos[item.id] as string : (checklistResults.photos[item.id] as any).uri }}
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
            <Card style={[styles.sectionCard, { backgroundColor: BRAND_COLORS.grayLight }]}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Checklist no disponible</Text>
                <Divider style={styles.divider} />
                <Text style={styles.emptyText}>No se encontraron datos del checklist para esta máquina.</Text>
              </Card.Content>
            </Card>
          )
        )}

        {!isOthersMachineType && machine.notes && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Comentarios Específicos</Text>
              <Divider style={styles.divider} />
              {machine.notes.includes('=== COMENTARIOS ESPECÍFICOS ===') ? (
                <View>
                  {machine.notes.split('=== COMENTARIOS ESPECÍFICOS ===')[1].split('\n\n').map((block, i) => {
                    if (!block.trim()) return null;
                    const match = block.match(/#(\d+):/);
                    const num = match ? match[1] : (i + 1);
                    return (
                      <View key={i} style={styles.commentsBlock}>
                        <Text style={styles.commentBlockHeader}>Comentario #{num}</Text>
                        <Text style={styles.commentsText}>{block}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.commentsBlock}>
                  <Text style={styles.commentsText}>{machine.notes}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {generalPhotos && generalPhotos.photos && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Fotos Generales</Text>
              <Divider style={styles.divider} />
              <View style={styles.photosGrid}>
                {(['front', 'back', 'left', 'right'] as const).map((key, i) => {
                  const labels = ['Frontal', 'Posterior', 'Lateral Izq.', 'Lateral Der.'];
                  if (!generalPhotos.photos[key]) return null;
                  return (
                    <View key={key} style={styles.photoItem}>
                      <Text style={styles.photoLabel}>{labels[i]}</Text>
                      <TouchableOpacity onPress={() => handlePhotoPress(generalPhotos.photos[key] as string)}>
                        <Image source={{ uri: generalPhotos.photos[key] }} style={styles.generalPhoto} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {Object.entries(generalPhotos.photos).map(([key, value]) => {
                  if (['front', 'back', 'left', 'right'].includes(key) || !value) return null;
                  return (
                    <View key={key} style={styles.photoItem}>
                      <Text style={styles.photoLabel}>Adicional - {key}</Text>
                      <TouchableOpacity onPress={() => handlePhotoPress(value)}>
                        <Image source={{ uri: value }} style={styles.generalPhoto} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        {__DEV__ && (
          <Card style={styles.debugCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Depuración</Text>
              <Text style={styles.debugText}>ID: {machineId} | Tipo: {machine.machineType || 'N/A'}</Text>
              <Text style={styles.debugText}>Checklist: {checklistResults ? `${Object.keys(checklistResults.results || {}).length} items` : 'No'}</Text>
              <Text style={styles.debugText}>Fotos: {generalPhotos ? 'Sí' : 'No'}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonsContainer}>
          <Button mode="outlined" onPress={() => router.replace('/')} style={styles.button} icon="home" textColor={BRAND_COLORS.primaryBlue}>
            Inicio
          </Button>
          <Button mode="contained" onPress={handleShareReport} style={styles.button} icon="share-variant" buttonColor={BRAND_COLORS.primaryOrange} disabled={isGenerating}>
            Compartir Informe
          </Button>
        </View>
      </SafeAreaView>

      {isGenerating && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',zIndex:9999}}>
          <View style={{backgroundColor:'white',borderRadius:16,padding:32,alignItems:'center',width:'80%',maxWidth:300}}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={{marginTop:16,fontSize:16,fontWeight:'bold',color:BRAND_COLORS.primaryBlue}}>{progressText}</Text>
            <View style={{width:'100%',height:6,backgroundColor:'#e5e7eb',borderRadius:3,marginTop:12,overflow:'hidden'}}>
              <View style={{width:`${progressPercent}%`,height:'100%',backgroundColor:BRAND_COLORS.primaryOrange,borderRadius:3}} />
            </View>
            <Text style={{marginTop:8,fontSize:12,color:BRAND_COLORS.grayText}}>{progressPercent}%</Text>
            <TouchableOpacity
              onPress={() => { setIsGenerating(false); setProgressPercent(0); setProgressText(''); }}
              style={{marginTop:16,paddingVertical:8,paddingHorizontal:24,borderRadius:8,borderWidth:1,borderColor:BRAND_COLORS.grayMedium}}
            >
              <Text style={{fontSize:14,color:BRAND_COLORS.grayDark,fontWeight:'600'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPhotoModalVisible(false)}>
            <View style={styles.closeIconWrapper}>
              <MaterialCommunityIcons name="close" size={20} color="white" />
            </View>
          </TouchableOpacity>
          {selectedPhotoUri && <Image source={{ uri: selectedPhotoUri }} style={styles.modalImage} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  headerGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginTop: SPACING.sm,
    letterSpacing: 0.3,
  },
  headerDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  infoCard: {
    margin: SPACING.lg,
    marginTop: -SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  sectionCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.xs,
    letterSpacing: 0.2,
  },
  divider: {
    backgroundColor: BRAND_COLORS.lightOrange,
    height: 2,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.7,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm + 2,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    width: 110,
    color: BRAND_COLORS.primaryBlue,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  infoValue: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#1e293b',
    lineHeight: 20,
  },
  categoryContainer: {
    marginBottom: SPACING.lg,
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
  },
  itemText: {
    flex: 1,
    marginRight: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
  },
  itemDivider: {
    marginVertical: 0,
    backgroundColor: BRAND_COLORS.grayLight,
    height: 1,
    opacity: 0.5,
  },
  evidenceContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  evidenceLabel: {
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
    color: BRAND_COLORS.primaryOrange,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  photoContainer: {
    margin: SPACING.xs,
    alignItems: 'center',
    width: '46%',
    marginBottom: SPACING.sm,
  },
  evidencePhoto: {
    width: '100%',
    height: 150,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 0,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  photoNumber: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayDark,
  },
  photoItem: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  photoLabel: {
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: BRAND_COLORS.primaryBlue,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  generalPhoto: {
    width: '100%',
    height: 150,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 0,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  commentsBlock: {
    padding: SPACING.sm,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.sm,
  },
  commentBlockHeader: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.primaryBlue,
  },
  commentsText: {
    fontStyle: 'italic',
    color: '#1e293b',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  emptyText: {
    fontStyle: 'italic',
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  debugCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
    backgroundColor: '#faf5ff',
    ...SHADOWS.small,
  },
  debugText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.xs,
    color: BRAND_COLORS.grayDark,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.md + 2,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
    ...SHADOWS.soft,
  },
  button: {
    flex: 1,
    marginHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
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
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
