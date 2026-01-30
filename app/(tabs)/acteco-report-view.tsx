import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
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
  const [inspection, setInspection] = useState<ActecoInspection | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleShareReport = async () => {
    if (!inspection) {
      Alert.alert('Error', 'No hay datos de inspección');
      return;
    }

    try {
      setIsGenerating(true);

      // Guardar la inspección antes de generar el PDF
      console.log('💾 Guardando inspección...');
      const savedInspection = await saveActecoInspection(inspection);
      console.log('✅ Inspección guardada con ID:', savedInspection.id);

      // Preparar datos para el PDF
      const reportData = {
        clientName: inspection.clientName,
        avisoDate: inspection.avisoDate,
        avisoTime: inspection.avisoTime,
        location: inspection.location,
        requestedBy: inspection.requestedBy,
        machineType: inspection.machineType,
        brand: inspection.machineBrand,
        model: inspection.machineModel,
        serialNumber: inspection.serialNumber,
        licensePlate: inspection.licensePlate || '',
        photoGeneral1: inspection.photoGeneral1,
        photoGeneral2: inspection.photoGeneral2,
        photoGeneral3: inspection.photoGeneral3,
        photoGeneral4: inspection.photoGeneral4,
        hasAveria: inspection.hasAveria ? 'true' : 'false',
        avisoAveria: inspection.avisoAveria,
        averiaDetectada: inspection.averiaDetectada,
        causaAveria: inspection.causaAveria,
        averiaPhotos: inspection.averiaPhotos,
        tieneSolucion: inspection.tieneSolucion ? 'true' : 'false',
        observaciones: inspection.observaciones,
        materiales: JSON.stringify(inspection.materiales),
        technicianName: inspection.technicianName,
        technicianSignature: inspection.technicianSignature,
        clientSignatureName: inspection.clientSignatureName,
        clientSignature: inspection.clientSignature,
      };

      console.log('📄 Generando PDF...');
      const success = await shareActecoPDFReport(reportData);
      
      if (success) {
        console.log('✅ PDF generado correctamente');
      }
    } catch (error) {
      console.error('❌ Error al compartir informe:', error);
      Alert.alert('Error', 'No se pudo generar el informe');
    } finally {
      setIsGenerating(false);
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
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.headerTitle}>Resumen del Informe</Text>
            <Text style={styles.headerSubtitle}>Revisa los datos antes de generar el PDF</Text>
          </Card.Content>
        </Card>

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
            color={BRAND_COLORS.primaryBlue}
            disabled={isGenerating}
          >
            Volver al Inicio
          </Button>
          
          <Button 
            mode="contained" 
            onPress={handleShareReport}
            style={styles.button}
            icon="file-pdf-box"
            color={BRAND_COLORS.primaryOrange}
            disabled={isGenerating}
            loading={isGenerating}
          >
            {isGenerating ? 'Generando...' : 'Generar PDF'}
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  clientCard: {
    marginBottom: 16,
  },
  machineCard: {
    marginBottom: 16,
  },
  photosCard: {
    marginBottom: 16,
  },
  averiaCard: {
    marginBottom: 16,
  },
  observationsCard: {
    marginBottom: 16,
  },
  materialsCard: {
    marginBottom: 16,
  },
  finalCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 120,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  textSection: {
    marginBottom: 12,
  },
  textLabel: {
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.primaryBlue,
    padding: 12,
    borderRadius: 4,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableRowOdd: {
    backgroundColor: 'white',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
  },
  signatureSection: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signatureLabel: {
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});