import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { LazyPhotoGrid } from '../../components/LazyPhotoGrid';
import {
  getAveriaInspectionById,
  inspectionToParams,
  paramsToInspection,
  saveAveriaInspection,
  type AveriaInspection,
} from '../../utils/averiasInspectionStorage';
import { shareAveriasPDFReport } from '../../utils/averiasReportGenerator';

export default function AveriaReportViewScreen() {
  const params = useLocalSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [inspection, setInspection] = useState<AveriaInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  useEffect(() => { loadAndSave(); }, []);

  const getParamString = (value: unknown): string => {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : '';
    }

    return typeof value === 'string' ? value : '';
  };

  const loadAndSave = async () => {
    try {
      setLoading(true);
      const hasFormParams = Object.keys(params).some((key) => key !== 'inspectionId' && key !== 'isEditing');
      const shouldAutoGenerate = !params.inspectionId || hasFormParams;

      let insp: AveriaInspection;
      if (shouldAutoGenerate) {
        insp = paramsToInspection(params);
      } else if (params.inspectionId && typeof params.inspectionId === 'string') {
        const loaded = await getAveriaInspectionById(params.inspectionId);
        insp = loaded || paramsToInspection(params);
      } else {
        insp = paramsToInspection(params);
      }

      const paramNotes = getParamString(params.notes) || getParamString(params.observaciones);
      const draftNotes = await AsyncStorage.getItem('averia_draft_notes');
      const fallbackNotes = paramNotes.trim() || draftNotes?.trim() || '';
      if (fallbackNotes && !insp.notes.trim()) {
        insp = { ...insp, notes: fallbackNotes };
      }

      setInspection(insp);
      setLoading(false);

      if (shouldAutoGenerate) {
        await autoGeneratePDF(insp);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', 'No se pudo cargar la inspección');
      setLoading(false);
    }
  };

  const autoGeneratePDF = async (insp: AveriaInspection) => {
    try {
      setIsGenerating(true);
      setProgressText('Guardando inspección...');
      setProgressPercent(5);

      const saved = await saveAveriaInspection(insp);
      try {
        await AsyncStorage.removeItem('averia_draft_notes');
      } catch (error) {
        console.error('No se pudo limpiar el borrador de notas:', error);
      }
      setInspection(saved);
      setProgressPercent(10);

      setProgressText('Generando PDF...');
      const success = await shareAveriasPDFReport(saved, (percent, text) => {
        setProgressPercent(percent);
        setProgressText(text);
      }, true); // autoUploadOnly = true (no compartir, solo generar y subir)

      if (success) {
        setProgressPercent(100);
        setProgressText('¡PDF generado!');
        setPdfGenerated(true);
      }
    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
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
      await shareAveriasPDFReport(inspection, (percent, text) => {
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

  const handleEdit = () => {
    if (!inspection) return;
    router.push({ pathname: '/averia-machine-form' as any, params: { ...inspectionToParams(inspection), isEditing: 'true' } });
  };

  const handleFinish = () => { router.push('/(tabs)'); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
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
          <Button mode="contained" onPress={handleFinish}>Volver al Inicio</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ padding: SPACING.lg, paddingTop: SPACING.md, alignItems: 'center', position: 'relative' }}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any }}>Resumen del Informe</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: TYPOGRAPHY.sizes.sm, marginTop: SPACING.xs }}>
            {pdfGenerated ? '✅ PDF generado y subido' : 'Generando PDF...'}
          </Text>
        </LinearGradient>

        {/* Datos del Cliente */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
            <Divider style={styles.dividerLine} />
            <InfoRow label="Cliente" value={inspection.clientName} />
            <InfoRow label="Matrícula" value={inspection.licensePlate} />
            <InfoRow label="Fecha" value={inspection.avisoDate} />
            <InfoRow label="Ubicación" value={inspection.location} />
            {inspection.reviewedBy ? <InfoRow label="Revisado por" value={inspection.reviewedBy} /> : null}
          </Card.Content>
        </Card>

        {/* Datos de la Máquina */}
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

        {/* Averías detectadas */}
        {inspection.defects && inspection.defects.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🔧 Averías Detectadas ({inspection.defects.length})</Title>
              <Divider style={styles.dividerLine} />
              {inspection.defects.map((defect, idx) => (
                <View key={defect.id || idx} style={styles.defectSection}>
                  <Text style={styles.defectLabel}>Avería {idx + 1}</Text>
                  <Paragraph>{defect.description}</Paragraph>
                  {defect.photos && defect.photos.length > 0 && (
                    <LazyPhotoGrid title={`Fotos avería ${idx + 1}`} photos={defect.photos} labelPrefix="A" accentColor="#7c3aed" />
                  )}
                  {idx < inspection.defects.length - 1 && <Divider style={{ marginVertical: SPACING.sm }} />}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Intervención */}
        {inspection.solucionDescription ? (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🛠️ Intervención / Solución</Title>
              <Divider style={styles.dividerLine} />
              <Paragraph>{inspection.solucionDescription}</Paragraph>
              {inspection.solucionPhotos && inspection.solucionPhotos.length > 0 && (
                <LazyPhotoGrid title="Fotos solución" photos={inspection.solucionPhotos} labelPrefix="S" accentColor="#7c3aed" />
              )}
            </Card.Content>
          </Card>
        ) : null}

        {/* Notas / observaciones */}
        {inspection.notes ? (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📝 Notas / Observaciones</Title>
              <Divider style={styles.dividerLine} />
              <Paragraph>{inspection.notes}</Paragraph>
            </Card.Content>
          </Card>
        ) : null}

        {/* Materiales */}
        {inspection.materiales && inspection.materiales.length > 0 && (
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
                {inspection.materiales.map((m, idx) => (
                  <View key={m.id || idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{m.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{m.quantity}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{m.reference}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Fotos generales */}
        {(inspection.photoGeneral1 || inspection.photoGeneral2 || inspection.photoGeneral3 || inspection.photoGeneral4) && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📸 Fotos Generales</Title>
              <Divider style={styles.dividerLine} />
              <LazyPhotoGrid
                title="Fotos generales"
                photos={[inspection.photoGeneral1, inspection.photoGeneral2, inspection.photoGeneral3, inspection.photoGeneral4].filter(Boolean) as string[]}
                labelPrefix="G"
                accentColor="#7c3aed"
              />
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button mode="outlined" onPress={handleFinish} style={styles.button} icon="home" textColor="#7c3aed" disabled={isGenerating || isSharing}>Inicio</Button>
          <Button mode="outlined" onPress={handleEdit} style={styles.button} icon="pencil" textColor="#7c3aed" disabled={isGenerating || isSharing}>Editar</Button>
          <Button mode="contained" onPress={handleSharePDF} style={styles.button} icon="share-variant" buttonColor="#7c3aed" disabled={isGenerating || isSharing} loading={isSharing}>
            {isSharing ? 'Compartiendo...' : 'Compartir PDF'}
          </Button>
        </View>
      </SafeAreaView>

      {(isGenerating || isSharing) && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color="#7c3aed" />
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: SPACING.sm }}>
      <Text style={{ fontWeight: TYPOGRAPHY.weights.bold as any, width: 120, color: BRAND_COLORS.grayText }}>{label}:</Text>
      <Text style={{ flex: 1, color: '#1e293b' }}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.grayText },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  errorText: { fontSize: TYPOGRAPHY.sizes.md, color: BRAND_COLORS.error, marginBottom: SPACING.lg, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: 32 },
  backBtn: { position: 'absolute', left: 16, top: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  dividerLine: { marginBottom: SPACING.md },
  defectSection: { marginBottom: SPACING.sm },
  defectLabel: { fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.xs },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  photoThumb: { width: 100, height: 100, borderRadius: BORDER_RADIUS.md, backgroundColor: BRAND_COLORS.grayMedium },
  table: { marginTop: SPACING.sm },
  tableHeader: { flexDirection: 'row', backgroundColor: '#7c3aed', padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
  tableHeaderText: { color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any, fontSize: TYPOGRAPHY.sizes.sm },
  tableRow: { flexDirection: 'row', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: BRAND_COLORS.grayMedium },
  tableRowEven: { backgroundColor: BRAND_COLORS.grayLight },
  tableRowOdd: { backgroundColor: 'white' },
  tableCell: { fontSize: TYPOGRAPHY.sizes.sm, color: '#1e293b' },
  buttonSafeArea: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium },
  buttonContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  button: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  overlayBox: { backgroundColor: 'white', borderRadius: 16, padding: 32, alignItems: 'center', width: '80%', maxWidth: 300 },
  overlayText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: '#7c3aed' },
  progressBar: { width: '100%', height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 3 },
  progressPercent: { marginTop: 8, fontSize: 12, color: BRAND_COLORS.grayText },
});
