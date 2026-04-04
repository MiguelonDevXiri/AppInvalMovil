import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
    getActecoInspectionById,
    paramsToInspection,
    saveActecoInspection,
    type ActecoInspection
} from '../../utils/actecoInspectionStorage';
import { shareActecoPDFReport } from '../../utils/actecoReportGenerator';

export default function ActecoReportViewScreen() {
  const params = useLocalSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [inspection, setInspection] = useState<ActecoInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  useEffect(() => {
    loadInspection();
  }, []);

  const loadInspection = async () => {
    try {
      setLoading(true);
      
      // Si viene con inspectionId, cargar de storage
      if (params.inspectionId && typeof params.inspectionId === 'string') {
        console.log('📂 Cargando inspección existente:', params.inspectionId);
        const loadedInspection = await getActecoInspectionById(params.inspectionId);
        
        if (loadedInspection) {
          console.log('✅ Inspección cargada:', loadedInspection.clientName);
          setInspection(loadedInspection);
        } else {
          console.log('⚠️ Inspección no encontrada, creando nueva');
          const newInspection = paramsToInspection(params);
          setInspection(newInspection);
        }
      } else {
        // Nueva inspección desde el formulario
        console.log('📝 Creando nueva inspección');
        const newInspection = paramsToInspection(params);
        setInspection(newInspection);
      }
    } catch (error) {
      console.error('❌ Error al cargar inspección:', error);
      Alert.alert('Error', 'No se pudo cargar la inspección');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generar PDF al cargar
  useEffect(() => {
    if (!loading && inspection && !pdfGenerated) {
      autoGeneratePDF(inspection);
    }
  }, [loading, inspection]);

  const autoGeneratePDF = async (insp: ActecoInspection) => {
    try {
      setIsGenerating(true);
      setProgressText('Guardando inspección...');
      setProgressPercent(5);

      const savedInspection = await saveActecoInspection(insp);
      setInspection(savedInspection);
      setProgressPercent(10);

      const reportData = buildReportData(savedInspection);
      const success = await shareActecoPDFReport(reportData, (percent, text) => {
        setProgressPercent(percent);
        setProgressText(text);
      }, true); // autoUploadOnly

      if (success) {
        setProgressPercent(100);
        setProgressText('¡PDF generado!');
        setPdfGenerated(true);
      }
    } catch (error) {
      console.error('❌ Error al auto-generar PDF:', error);
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const buildReportData = (insp: ActecoInspection) => ({
    clientName: insp.clientName,
    avisoDate: insp.avisoDate,
    avisoTime: insp.avisoTime,
    location: insp.location,
    requestedBy: insp.requestedBy,
    machineType: insp.machineType,
    brand: insp.machineBrand,
    model: insp.machineModel,
    serialNumber: insp.serialNumber,
    licensePlate: insp.licensePlate || '',
    photoGeneral1: insp.photoGeneral1,
    photoGeneral2: insp.photoGeneral2,
    photoGeneral3: insp.photoGeneral3,
    photoGeneral4: insp.photoGeneral4,
    hasAveria: insp.hasAveria ? 'true' : 'false',
    avisoAveria: insp.avisoAveria,
    averiaDetectada: insp.averiaDetectada,
    causaAveria: insp.causaAveria,
    averiaPhotos: insp.averiaPhotos,
    tieneSolucion: insp.tieneSolucion ? 'true' : 'false',
    observaciones: insp.observaciones,
    materiales: JSON.stringify(insp.materiales),
    technicianName: insp.technicianName,
    technicianSignature: insp.technicianSignature,
    clientSignatureName: insp.clientSignatureName,
    clientSignature: insp.clientSignature,
  });

  const handleShareReport = async () => {
    if (!inspection) { Alert.alert('Error', 'No hay datos'); return; }
    try {
      setIsSharing(true);
      setProgressText('Compartiendo...');
      setProgressPercent(50);
      const reportData = buildReportData(inspection);
      await shareActecoPDFReport(reportData, (percent, text) => {
        setProgressPercent(percent);
        setProgressText(text);
      }, false); // compartir
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el PDF');
    } finally {
      setIsSharing(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const handleFinish = () => {
    router.push('/(tabs)');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
          <Text style={styles.loadingText}>Cargando inspección...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!inspection) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la inspección</Text>
          <Button mode="contained" onPress={handleFinish}>
            Volver al Inicio
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const averiaPhotos = inspection.averiaPhotos || [];
  const materials = inspection.materiales || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{padding: SPACING.lg, paddingTop: SPACING.md, alignItems:'center', position:'relative'}}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:16,top:16,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any}}>Resumen del Informe</Text>
          <Text style={{color:'rgba(255,255,255,0.8)',fontSize:TYPOGRAPHY.sizes.sm,marginTop:SPACING.xs}}>Revisa los datos antes de generar el PDF</Text>
        </LinearGradient>

        {/* Datos del Cliente */}
        <Card style={styles.clientCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{inspection.clientName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{inspection.avisoDate} {inspection.avisoTime}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubicación:</Text>
              <Text style={styles.infoValue}>{inspection.location}</Text>
            </View>

            {inspection.requestedBy && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pedido por:</Text>
                <Text style={styles.infoValue}>{inspection.requestedBy}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Datos de la Máquina */}
        <Card style={styles.machineCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>⚙️ Datos de la Máquina</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{inspection.machineType}</Text>
            </View>

            {inspection.machineBrand && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marca:</Text>
                <Text style={styles.infoValue}>{inspection.machineBrand}</Text>
              </View>
            )}

            {inspection.machineModel && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modelo:</Text>
                <Text style={styles.infoValue}>{inspection.machineModel}</Text>
              </View>
            )}

            {inspection.serialNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nº Serie:</Text>
                <Text style={styles.infoValue}>{inspection.serialNumber}</Text>
              </View>
            )}

            {inspection.licensePlate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Matrícula:</Text>
                <Text style={styles.infoValue}>{inspection.licensePlate}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Fotos Generales */}
        {(inspection.photoGeneral1 || inspection.photoGeneral2 || inspection.photoGeneral3 || inspection.photoGeneral4) && (
          <Card style={styles.photosCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📸 Fotos Generales</Title>
              <Divider style={styles.divider} />
              <View style={styles.photosGrid}>
                {inspection.photoGeneral1 && (
                  <Image source={{ uri: inspection.photoGeneral1 }} style={styles.photoThumbnail} />
                )}
                {inspection.photoGeneral2 && (
                  <Image source={{ uri: inspection.photoGeneral2 }} style={styles.photoThumbnail} />
                )}
                {inspection.photoGeneral3 && (
                  <Image source={{ uri: inspection.photoGeneral3 }} style={styles.photoThumbnail} />
                )}
                {inspection.photoGeneral4 && (
                  <Image source={{ uri: inspection.photoGeneral4 }} style={styles.photoThumbnail} />
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Avería */}
        {inspection.hasAveria && (
          <>
            <Card style={styles.averiaCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>🔧 Avería</Title>
                <Divider style={styles.divider} />
                
                {inspection.avisoAveria && (
                  <View style={styles.textSection}>
                    <Text style={styles.textLabel}>Aviso:</Text>
                    <Paragraph>{inspection.avisoAveria}</Paragraph>
                  </View>
                )}

                {inspection.averiaDetectada && (
                  <View style={styles.textSection}>
                    <Text style={styles.textLabel}>Detectada:</Text>
                    <Paragraph>{inspection.averiaDetectada}</Paragraph>
                  </View>
                )}

                {inspection.causaAveria && (
                  <View style={styles.textSection}>
                    <Text style={styles.textLabel}>Causa:</Text>
                    <Paragraph>{inspection.causaAveria}</Paragraph>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tiene solución:</Text>
                  <Text style={[styles.infoValue, inspection.tieneSolucion ? styles.successText : styles.errorText]}>
                    {inspection.tieneSolucion ? 'SÍ' : 'NO'}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {averiaPhotos.length > 0 && (
              <Card style={styles.photosCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>📸 Fotos de Avería</Title>
                  <Divider style={styles.divider} />
                  <View style={styles.photosGrid}>
                    {averiaPhotos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                    ))}
                  </View>
                </Card.Content>
              </Card>
            )}
          </>
        )}

        {/* Observaciones */}
        {inspection.observaciones && (
          <Card style={styles.observationsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>💬 Observaciones</Title>
              <Divider style={styles.divider} />
              <Paragraph>{inspection.observaciones}</Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Materiales */}
        {materials.length > 0 && (
          <Card style={styles.materialsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🛠️ Materiales Utilizados</Title>
              <Divider style={styles.divider} />
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Material</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cantidad</Text>
                </View>
                
                {materials.map((material, index) => (
                  <View 
                    key={material.id || index} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>{material.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{material.quantity}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Firmas */}
        <Card style={styles.finalCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>✍️ Firmas</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Técnico:</Text>
              <Text style={styles.infoValue}>{inspection.technicianName}</Text>
            </View>

            {inspection.technicianSignature && (
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Firma del técnico:</Text>
                <Image 
                  source={{ uri: inspection.technicianSignature }} 
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{inspection.clientSignatureName}</Text>
            </View>

            {inspection.clientSignature && (
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Firma del cliente:</Text>
                <Image 
                  source={{ uri: inspection.clientSignature }} 
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={handleFinish}
            style={styles.button}
            icon="home"
            textColor={BRAND_COLORS.primaryBlue}
            disabled={isGenerating || isSharing}
          >
            Volver al Inicio
          </Button>
          
          <Button 
            mode="contained" 
            onPress={handleShareReport}
            style={styles.button}
            icon="share-variant"
            buttonColor={BRAND_COLORS.primaryOrange}
            disabled={isGenerating || isSharing}
            loading={isSharing}
          >
            {isSharing ? 'Compartiendo...' : 'Compartir PDF'}
          </Button>
        </View>
      </SafeAreaView>

      {(isGenerating || isSharing) && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',zIndex:9999}}>
          <View style={{backgroundColor:'white',borderRadius:16,padding:32,alignItems:'center',width:'80%',maxWidth:300}}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={{marginTop:16,fontSize:16,fontWeight:'bold',color:BRAND_COLORS.primaryBlue}}>{progressText}</Text>
            <View style={{width:'100%',height:6,backgroundColor:'#e5e7eb',borderRadius:3,marginTop:12,overflow:'hidden'}}>
              <View style={{width:`${progressPercent}%`,height:'100%',backgroundColor:BRAND_COLORS.primaryOrange,borderRadius:3}} />
            </View>
            <Text style={{marginTop:8,fontSize:12,color:BRAND_COLORS.grayText}}>{progressPercent}%</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.grayText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.error,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 32,
  },
  clientCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  machineCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  photosCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  averiaCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  observationsCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  materialsCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  finalCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.sm,
  },
  divider: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    width: 120,
    color: BRAND_COLORS.grayText,
  },
  infoValue: {
    flex: 1,
    color: '#1e293b',
  },
  successText: {
    color: BRAND_COLORS.success,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  textSection: {
    marginBottom: SPACING.md,
  },
  textLabel: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayText,
    marginBottom: SPACING.xs,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoThumbnail: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayMedium,
  },
  table: {
    marginTop: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.primaryBlue,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  tableRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.grayMedium,
  },
  tableRowEven: {
    backgroundColor: BRAND_COLORS.grayLight,
  },
  tableRowOdd: {
    backgroundColor: 'white',
  },
  tableCell: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#1e293b',
  },
  signatureSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  signatureLabel: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayText,
    marginBottom: SPACING.sm,
  },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
  },
});