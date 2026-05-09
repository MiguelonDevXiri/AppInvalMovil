import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';
import {
  getReparacionInspectionById,
  inspectionToParams,
  paramsToInspection,
  saveReparacionInspection,
  type ReparacionInspection,
} from '../../utils/reparacionesInspectionStorage';
import { shareReparacionesPDFReport } from '../../utils/reparacionesReportGenerator';
import { buildSafetySummarySections } from '../../utils/safetyChecklist';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function getParamString(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

function CollapsiblePhotoGrid({
  title,
  photos,
  expanded,
  onToggle,
  labelPrefix,
}: {
  title: string;
  photos: string[];
  expanded: boolean;
  onToggle: () => void;
  labelPrefix?: string;
}) {
  if (photos.length === 0) {
    return <Text style={styles.emptyText}>Sin fotos adjuntas</Text>;
  }

  return (
    <View style={styles.photoSection}>
      <TouchableOpacity style={styles.photoToggle} onPress={onToggle} activeOpacity={0.82}>
        <View style={styles.photoToggleTextBox}>
          <Text style={styles.photoToggleTitle}>{title}</Text>
          <Text style={styles.photoToggleSubtitle}>
            {expanded ? 'Fotos cargadas en pantalla' : 'Pulsa para cargar las fotos'}
          </Text>
        </View>
        <View style={styles.photoCountPill}>
          <Text style={styles.photoCountText}>{photos.length}</Text>
        </View>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#92400e" />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <View key={`${photo}_${index}`} style={styles.generalPhotoItem}>
              <Image source={{ uri: photo }} style={styles.photoThumb} resizeMode="cover" />
              {labelPrefix ? <Text style={styles.generalPhotoLabel}>{labelPrefix}{index + 1}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function ReparacionReportViewScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  const [inspection, setInspection] = useState<ReparacionInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [expandedPhotoSections, setExpandedPhotoSections] = useState<Record<string, boolean>>({});

  const safetySections = useMemo(() => buildSafetySummarySections(inspection?.safetyChecklist), [inspection]);

  const autoGeneratePDF = useCallback(async (currentInspection: ReparacionInspection) => {
    try {
      setIsGenerating(true);
      setProgressText('Guardando reparación...');
      setProgressPercent(8);

      const saved = await saveReparacionInspection(currentInspection);
      setInspection(saved);
      setProgressText('Generando PDF...');
      setProgressPercent(22);

      const success = await shareReparacionesPDFReport(
        saved,
        (percent, text) => {
          setProgressPercent(percent);
          setProgressText(text);
        },
        true
      );

      if (success) {
        setPdfGenerated(true);
        setProgressPercent(100);
        setProgressText('¡PDF generado!');
      }
    } catch (error) {
      console.error('Error al generar el PDF de reparación:', error);
      const message = error instanceof Error ? error.message : '';
      Alert.alert(
        'Error',
        message.includes('schema cache') || message.includes('Could not find the table')
          ? 'Falta crear las tablas de reparaciones en Supabase antes de guardar y generar el PDF.'
          : 'No se pudo guardar o generar el PDF de la reparación.'
      );
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressText('');
    }
  }, []);

  const loadAndSave = useCallback(async () => {
    try {
      setLoading(true);

      const currentParams = JSON.parse(paramsKey) as Record<string, unknown>;
      const inspectionIdParam = getParamString(currentParams.inspectionId);
      const shouldAutoGenerate =
        !inspectionIdParam ||
        Boolean(
          currentParams.clientName ||
          currentParams.repairs ||
          currentParams.materials ||
          currentParams.notes ||
          currentParams.safetyChecklist
        );

      let nextInspection: ReparacionInspection;
      if (shouldAutoGenerate) {
        nextInspection = paramsToInspection(currentParams as any);
      } else if (inspectionIdParam) {
        const loaded = await getReparacionInspectionById(inspectionIdParam);
        nextInspection = loaded || paramsToInspection(currentParams as any);
      } else {
        nextInspection = paramsToInspection(currentParams as any);
      }

      setInspection(nextInspection);
      setLoading(false);

      if (shouldAutoGenerate) {
        await autoGeneratePDF(nextInspection);
      }
    } catch (error) {
      console.error('Error al cargar la reparación:', error);
      setLoading(false);
    }
  }, [autoGeneratePDF, paramsKey]);

  useEffect(() => {
    void loadAndSave();
  }, [loadAndSave]);

  const togglePhotoSection = useCallback((key: string) => {
    setExpandedPhotoSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const handleSharePDF = async () => {
    if (!inspection) return;

    try {
      setIsSharing(true);
      setProgressText('Preparando PDF...');
      setProgressPercent(25);

      await shareReparacionesPDFReport(
        inspection,
        (percent, text) => {
          setProgressPercent(percent);
          setProgressText(text);
        },
        false
      );
    } catch (error) {
      console.error('Error al compartir reparación:', error);
    } finally {
      setIsSharing(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const handleEdit = () => {
    if (!inspection) return;
    router.push({
      pathname: '/reparacion-machine-form' as any,
      params: { ...inspectionToParams(inspection), isEditing: 'true' },
    });
  };

  const handleFinish = () => {
    router.push('/(tabs)' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#b45309" />
        <Text style={styles.loadingText}>Cargando parte de reparación...</Text>
      </SafeAreaView>
    );
  }

  if (!inspection) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
        <Text style={styles.errorText}>No se pudo cargar la reparación.</Text>
        <Button mode="contained" onPress={() => router.push('/(tabs)' as any)} buttonColor="#b45309">
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#78350f', '#b45309', '#f59e0b'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="toolbox-outline" size={28} color="rgba(255,255,255,0.85)" />
          <Text style={styles.headerTitle}>Resumen reparación taller</Text>
          <Text style={styles.headerSubtitle}>
            {pdfGenerated ? '✅ PDF generado y subido' : 'Guardando y generando PDF...'}
          </Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📋 Datos del cliente</Title>
            <Divider style={styles.divider} />
            <InfoRow label="Cliente" value={inspection.clientName} />
            <InfoRow label="Matrícula" value={inspection.licensePlate || 'Sin matrícula'} />
            <InfoRow label="Fecha" value={inspection.avisoDate} />
            <InfoRow label="Ubicación" value={inspection.location || 'Sin ubicación'} />
            <InfoRow label="Técnico" value={inspection.reviewedBy || 'Sin técnico'} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>⚙️ Datos de la máquina</Title>
            <Divider style={styles.divider} />
            <InfoRow label="Tipo" value={inspection.machineType || '-'} />
            <InfoRow label="Marca" value={inspection.machineBrand || '-'} />
            <InfoRow label="Modelo" value={inspection.machineModel || '-'} />
            <InfoRow label="Nº serie" value={inspection.serialNumber || '-'} />
            <InfoRow label="OT" value={inspection.otNumber || '-'} />
          </Card.Content>
        </Card>

        {safetySections.length > 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🛡️ Seguridad previa</Title>
              <Divider style={styles.divider} />
              {safetySections.map((section, index) => (
                <View key={section.id} style={styles.safetyBlock}>
                  <View style={styles.safetyHeader}>
                    <Text style={styles.safetyTitle}>{section.title}</Text>
                    <View
                      style={[
                        styles.safetyBadge,
                        section.status === 'safe'
                          ? styles.badgeSafe
                          : section.status === 'warning'
                            ? styles.badgeWarning
                            : styles.badgeNeutral,
                      ]}
                    >
                      <Text style={styles.safetyBadgeText}>
                        {section.status === 'safe'
                          ? 'OK'
                          : section.status === 'warning'
                            ? 'REVISAR'
                            : 'PENDIENTE'}
                      </Text>
                    </View>
                  </View>
                  <Paragraph style={styles.safetySummary}>{section.summary}</Paragraph>
                  {section.details.length > 0 ? (
                    <View style={styles.safetyDetails}>
                      {section.details.map((detail) => (
                        <Text key={detail} style={styles.safetyDetailText}>• {detail}</Text>
                      ))}
                    </View>
                  ) : null}
                  {index < safetySections.length - 1 ? <Divider style={styles.innerDivider} /> : null}
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {inspection.generalPhotos.length > 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📸 Fotos generales del antes</Title>
              <Divider style={styles.divider} />
              <CollapsiblePhotoGrid
                title="Ver fotos generales del antes"
                photos={inspection.generalPhotos}
                expanded={Boolean(expandedPhotoSections.generalBefore)}
                onToggle={() => togglePhotoSection('generalBefore')}
                labelPrefix="A"
              />
            </Card.Content>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>🛠️ Reparaciones realizadas</Title>
            <Divider style={styles.divider} />
            {inspection.repairs.length > 0 ? (
              inspection.repairs.map((repair, index) => (
                <View key={repair.id} style={styles.repairBlock}>
                  <Text style={styles.repairTitle}>Reparación {index + 1}</Text>
                  <Paragraph style={styles.repairDescription}>{repair.description || 'Sin descripción'}</Paragraph>
                  <CollapsiblePhotoGrid
                    title={`Ver fotos de la reparación ${index + 1}`}
                    photos={repair.photos}
                    expanded={Boolean(expandedPhotoSections[`repair-${repair.id}`])}
                    onToggle={() => togglePhotoSection(`repair-${repair.id}`)}
                  />
                  {index < inspection.repairs.length - 1 ? <Divider style={styles.innerDivider} /> : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No hay reparaciones registradas.</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>🧰 Materiales</Title>
            <Divider style={styles.divider} />
            {inspection.materials.length > 0 ? (
              inspection.materials.map((material, index) => (
                <View key={material.id} style={styles.materialRow}>
                  <View style={styles.materialMain}>
                    <Text style={styles.materialName}>{material.name || 'Material sin nombre'}</Text>
                    <Text style={styles.materialMeta}>
                      Cantidad: {material.quantity || '-'} · Ref: {material.reference || '-'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.availabilityChip,
                      material.available === true
                        ? styles.chipAvailable
                        : material.available === false
                          ? styles.chipUnavailable
                          : styles.chipUnknown,
                    ]}
                  >
                    <Text style={styles.availabilityText}>
                      {material.available === true ? 'Hay' : material.available === false ? 'No hay' : 'Sin revisar'}
                    </Text>
                  </View>
                  {index < inspection.materials.length - 1 ? <Divider style={styles.innerDivider} /> : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No se registraron materiales.</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📝 Observaciones</Title>
            <Divider style={styles.divider} />
            <Paragraph style={styles.notesText}>{inspection.notes || 'Sin observaciones.'}</Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={[styles.bottomActions, { paddingBottom: insets.bottom + SPACING.md }]} edges={['bottom']}>
        <Button
          mode="outlined"
          onPress={handleFinish}
          style={styles.actionButton}
          textColor="#92400e"
          icon="home"
          disabled={isGenerating || isSharing}
        >
          Volver al inicio
        </Button>
        <Button
          mode="outlined"
          onPress={handleEdit}
          style={styles.actionButton}
          textColor="#92400e"
          icon="pencil"
          disabled={isGenerating || isSharing}
        >
          Editar
        </Button>
        <Button
          mode="contained"
          onPress={handleSharePDF}
          style={styles.actionButton}
          buttonColor="#b45309"
          loading={isSharing}
          disabled={isGenerating || isSharing}
          icon="share-variant"
        >
          {isSharing ? 'Compartiendo...' : 'Compartir PDF'}
        </Button>
      </SafeAreaView>

      {(isGenerating || isSharing) && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color="#b45309" />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#78350f',
  },
  loadingSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: BRAND_COLORS.surface,
    padding: SPACING.xl,
  },
  loadingText: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  errorText: {
    color: BRAND_COLORS.error,
    fontSize: TYPOGRAPHY.sizes.lg,
    marginBottom: SPACING.md,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backBtn: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.md,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
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
    color: '#b45309',
    textAlign: 'center',
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
    backgroundColor: '#b45309',
    borderRadius: 3,
  },
  progressPercent: {
    marginTop: 8,
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  sectionTitle: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  innerDivider: {
    marginTop: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  infoLabel: {
    flex: 0.45,
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    flex: 0.55,
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    textAlign: 'right',
  },
  safetyBlock: {
    paddingVertical: SPACING.xs,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  safetyTitle: {
    flex: 1,
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  safetyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeSafe: {
    backgroundColor: '#dcfce7',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeNeutral: {
    backgroundColor: '#e2e8f0',
  },
  safetyBadgeText: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  safetySummary: {
    marginTop: SPACING.xs,
    color: BRAND_COLORS.grayDark,
  },
  safetyDetails: {
    marginTop: SPACING.xs,
    gap: 2,
  },
  safetyDetailText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  repairBlock: {
    paddingVertical: SPACING.xs,
  },
  repairTitle: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.xs,
  },
  repairDescription: {
    color: BRAND_COLORS.grayDark,
  },
  photoSection: {
    marginTop: SPACING.sm,
  },
  photoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  photoToggleTextBox: {
    flex: 1,
  },
  photoToggleTitle: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  photoToggleSubtitle: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  photoCountPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  photoCountText: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  generalPhotoItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  generalPhotoLabel: {
    color: '#92400e',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  emptyText: {
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  materialRow: {
    paddingVertical: SPACING.sm,
  },
  materialMain: {
    gap: 2,
    paddingRight: SPACING.md,
  },
  materialName: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  materialMeta: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  availabilityChip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  chipAvailable: {
    backgroundColor: '#dcfce7',
  },
  chipUnavailable: {
    backgroundColor: '#fee2e2',
  },
  chipUnknown: {
    backgroundColor: '#e2e8f0',
  },
  availabilityText: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  notesText: {
    color: BRAND_COLORS.grayDark,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl + 12,
    backgroundColor: 'white',
    ...SHADOWS.large,
  },
  actionButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
  },
});
