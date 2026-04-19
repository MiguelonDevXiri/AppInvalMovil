import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';
import {
  getInstalacionInspectionById,
  paramsToInspection,
  saveInstalacionInspection,
  type InstalacionInspection,
} from '../../utils/instalacionesInspectionStorage';
import { shareInstalacionesPDFReport } from '../../utils/instalacionesReportGenerator';

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const DRAFT_KEY = 'instalacion_draft_notes';

export default function InstalacionReportViewScreen() {
  const params = useLocalSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [inspection, setInspection] = useState<InstalacionInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const shouldAutoGenerate =
    !params.inspectionId ||
    Boolean(
      params.clientName ||
      params.workDescription ||
      params.finalPhoto ||
      params.photoSite1 ||
      params.photoSite2 ||
      params.photoSite3 ||
      params.photoSite4 ||
      params.materiales ||
      params.notes
    );

  useEffect(() => {
    loadAndSave();
  }, []);

  const loadAndSave = async () => {
    try {
      setLoading(true);

      let currentInspection: InstalacionInspection;
      if (params.inspectionId && typeof params.inspectionId === 'string') {
        const loadedInspection = await getInstalacionInspectionById(params.inspectionId);
        currentInspection = loadedInspection || paramsToInspection(params);
      } else {
        currentInspection = paramsToInspection(params);
      }

      const paramNotes = getParamString(params.notes) || getParamString(params.observaciones);
      const draftNotes = await AsyncStorage.getItem(DRAFT_KEY);
      const fallbackNotes = paramNotes.trim() || draftNotes?.trim() || '';
      if (fallbackNotes && !currentInspection.notes.trim()) {
        currentInspection = { ...currentInspection, notes: fallbackNotes };
      }

      setInspection(currentInspection);
      setLoading(false);

      if (shouldAutoGenerate) {
        await autoGeneratePDF(currentInspection);
      }
    } catch (error) {
      console.error('❌ Error al cargar instalación:', error);
      Alert.alert('Error', 'No se pudo cargar la instalación.');
      setLoading(false);
    }
  };

  const autoGeneratePDF = async (currentInspection: InstalacionInspection) => {
    try {
      setIsGenerating(true);
      setProgressText('Guardando instalación...');
      setProgressPercent(5);

      const savedInspection = await saveInstalacionInspection(currentInspection);
      setInspection(savedInspection);
      setProgressPercent(10);

      try {
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch (error) {
        console.error('No se pudo limpiar el borrador de instalación:', error);
      }

      setProgressText('Generando PDF...');
      const success = await shareInstalacionesPDFReport(
        savedInspection,
        (percent, text) => {
          setProgressPercent(percent);
          setProgressText(text);
        },
        true
      );

      if (success) {
        setProgressPercent(100);
        setProgressText('¡PDF generado!');
        setPdfGenerated(true);
      }
    } catch (error) {
      console.error('❌ Error al generar el PDF de instalación:', error);
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const handleSharePDF = async () => {
    if (!inspection) return;

    try {
      setIsSharing(true);
      setProgressText('Compartiendo...');
      setProgressPercent(50);

      await shareInstalacionesPDFReport(
        inspection,
        (percent, text) => {
          setProgressPercent(percent);
          setProgressText(text);
        },
        false
      );
    } catch {
      Alert.alert('Error', 'No se pudo compartir el PDF.');
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
          <ActivityIndicator size="large" color={INSTALLATION_PRIMARY} />
          <Text style={styles.loadingText}>Cargando instalación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!inspection) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la instalación.</Text>
          <Button mode="contained" onPress={handleFinish} buttonColor={INSTALLATION_PRIMARY}>
            Volver al Inicio
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const sitePhotos = [
    inspection.photoSite1,
    inspection.photoSite2,
    inspection.photoSite3,
    inspection.photoSite4,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={INSTALLATION_GRADIENT as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resumen del Informe</Text>
          <Text style={styles.headerSubtitle}>
            {pdfGenerated ? '✅ PDF generado y subido' : 'Generando PDF...'}
          </Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
            <Divider style={styles.dividerLine} />
            <InfoRow label="Cliente" value={inspection.clientName} />
            <InfoRow label="Matrícula" value={inspection.licensePlate} />
            <InfoRow label="Fecha" value={`${inspection.avisoDate} ${inspection.avisoTime}`.trim()} />
            <InfoRow label="Ubicación" value={inspection.location} />
            {inspection.reviewedBy ? <InfoRow label="Revisado por" value={inspection.reviewedBy} /> : null}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>⚙️ Datos de la Máquina</Title>
            <Divider style={styles.dividerLine} />
            <InfoRow label="Marca" value={inspection.machineBrand} />
            {inspection.machineType ? <InfoRow label="Tipo" value={inspection.machineType} /> : null}
            {inspection.machineModel ? <InfoRow label="Modelo" value={inspection.machineModel} /> : null}
            {inspection.serialNumber ? <InfoRow label="Nº Serie" value={inspection.serialNumber} /> : null}
            {inspection.otNumber ? <InfoRow label="Nº OT" value={inspection.otNumber} /> : null}
          </Card.Content>
        </Card>

        {sitePhotos.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📸 Fotos del Sitio</Title>
              <Divider style={styles.dividerLine} />
              <View style={styles.photosRow}>
                {sitePhotos.map((uri, index) => (
                  <Image key={`${uri}_${index}`} source={{ uri }} style={styles.photoThumb} />
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>🛠️ Faena a Realizar</Title>
            <Divider style={styles.dividerLine} />
            <Paragraph>{inspection.workDescription || 'Sin descripción de faena'}</Paragraph>
          </Card.Content>
        </Card>

        {inspection.materiales.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🧰 Materiales Utilizados</Title>
              <Divider style={styles.dividerLine} />
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Material</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cant.</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ref.</Text>
                </View>
                {inspection.materiales.map((material, index) => (
                  <View
                    key={material.id || index}
                    style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>{material.name || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{material.quantity || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{material.reference || '—'}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>✅ Resultado Final</Title>
            <Divider style={styles.dividerLine} />
            {inspection.finalPhoto ? (
              <Image source={{ uri: inspection.finalPhoto }} style={styles.finalPhoto} />
            ) : (
              <Text style={styles.emptyText}>Sin foto final</Text>
            )}
            {inspection.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Notas / Observaciones</Text>
                <Paragraph>{inspection.notes}</Paragraph>
              </View>
            ) : (
              <Text style={styles.emptyText}>Sin notas u observaciones.</Text>
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
            textColor={INSTALLATION_PRIMARY}
            disabled={isGenerating || isSharing}
          >
            Inicio
          </Button>
          <Button
            mode="contained"
            onPress={handleSharePDF}
            style={styles.button}
            icon="share-variant"
            buttonColor={INSTALLATION_PRIMARY}
            disabled={isGenerating || isSharing}
            loading={isSharing}
          >
            {isSharing ? 'Compartiendo...' : 'Compartir PDF'}
          </Button>
        </View>
      </SafeAreaView>

      {(isGenerating || isSharing) && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={INSTALLATION_PRIMARY} />
            <Text style={styles.overlayText}>{progressText}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function getParamString(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
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
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: -SPACING.md,
    marginBottom: SPACING.md,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 16,
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
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  card: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
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
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayMedium,
  },
  table: {
    marginTop: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: INSTALLATION_PRIMARY,
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
  finalPhoto: {
    width: '100%',
    height: 220,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayMedium,
  },
  notesBlock: {
    marginTop: SPACING.md,
  },
  notesTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  overlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: INSTALLATION_PRIMARY,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: INSTALLATION_PRIMARY,
    borderRadius: 3,
  },
  progressPercent: {
    marginTop: 8,
    fontSize: 12,
    color: BRAND_COLORS.grayText,
  },
});
