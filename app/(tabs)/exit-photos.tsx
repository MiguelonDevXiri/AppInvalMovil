import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import {
  getExitChecksByMachineId,
  getExitPhotosByMachineId,
  getMachineById,
  Machine,
  saveExitPhotos,
  updateMachineInspectionStatus,
} from '../../utils/storage';
import { generateExitPDF } from '../../utils/exitReportGenerator';

interface Photos {
  d1: string | null;
  d2: string | null;
  d3: string | null;
  d4: string | null;
}

export default function ExitPhotosScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [photos, setPhotos] = useState<Photos>({ d1: null, d2: null, d3: null, d4: null });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingText, setSavingText] = useState('Guardando fotos de salida...');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        setLoading(true);
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) setMachine(foundMachine);

        const existingPhotos = await getExitPhotosByMachineId(machineId.toString());
        if (existingPhotos && existingPhotos.photos) {
          setPhotos({
            d1: existingPhotos.photos.d1 || null,
            d2: existingPhotos.photos.d2 || null,
            d3: existingPhotos.photos.d3 || null,
            d4: existingPhotos.photos.d4 || null,
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [machineId]);

  const handleTakePhoto = async (position: keyof Photos) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos({ ...photos, [position]: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleSavePhotos = async () => {
    try {
      if (!machineId) return false;
      const photosObject: Record<string, string> = {};
      for (const [key, value] of Object.entries(photos)) {
        if (value) photosObject[key] = value;
      }
      await saveExitPhotos({
        machineId: machineId.toString(),
        photos: photosObject,
        takenAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error al guardar las fotos:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
      return false;
    }
  };

  const handleFinish = async () => {
    try {
      if (!machineId) return;
      const photosTaken = Object.values(photos).filter(uri => uri !== null).length;
      if (photosTaken < 4) {
        Alert.alert('Fotos incompletas', 'No has tomado todas las fotos. ¿Continuar?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => saveAndFinish() },
        ]);
      } else {
        saveAndFinish();
      }
    } catch (error) {
      console.error('Error al finalizar:', error);
      Alert.alert('Error', 'Error al guardar los datos.');
    }
  };

  const saveAndFinish = async () => {
    try {
      setSavingText('Guardando fotos de salida...');
      setIsSaving(true);
      const saved = await handleSavePhotos();
      if (saved && machineId) {
        setSavingText('Actualizando estado...');
        await updateMachineInspectionStatus(machineId.toString(), 'revisada');

        // Generate exit PDF with timeout to prevent blocking
        setSavingText('Generando PDF de salida...');
        let pdfGenerated = false;
        try {
          const pdfTimeout = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('PDF timeout')), 30000)
          );
          const pdfWork = (async () => {
            const exitChecks = await getExitChecksByMachineId(machineId.toString());
            const exitPhotosData = await getExitPhotosByMachineId(machineId.toString());
            const foundMachine = await getMachineById(machineId.toString());
            if (foundMachine) {
              const machineComments = (foundMachine.commentsWithPhotos || []).map((c, i) => ({
                id: `comment_${i}`,
                text: c.text,
              }));
              await generateExitPDF(
                foundMachine,
                exitChecks,
                exitPhotosData,
                machineComments,
                (_pct, text) => setSavingText(text),
              );
            }
            return true;
          })();
          pdfGenerated = !!(await Promise.race([pdfWork, pdfTimeout]));
        } catch (pdfError) {
          console.warn('No se pudo generar el PDF de salida (no crítico):', pdfError);
        }

        setIsSaving(false);
        const pdfMsg = pdfGenerated
          ? 'Las fotos de salida se han guardado, el PDF se ha generado y la máquina ha sido marcada como revisada.'
          : 'Las fotos y comprobaciones se han guardado y la máquina ha sido marcada como revisada. El PDF no se pudo generar, pero puedes regenerarlo más tarde.';
        Alert.alert(
          'Inspección de salida completada',
          pdfMsg,
          [{ text: 'Aceptar', onPress: () => router.replace('/') }],
        );
        return;
      }
      setIsSaving(false);
    } catch (error) {
      console.error('Error al finalizar:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
        <Text style={{ color: BRAND_COLORS.grayText, marginTop: SPACING.md }}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={{ color: BRAND_COLORS.grayText }}>No se encontraron datos para esta máquina.</Text>
        <Button mode="contained" onPress={() => router.push('/')} style={{ marginTop: SPACING.md }} buttonColor={BRAND_COLORS.primaryBlue}>
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  const photoCount = Object.values(photos).filter(uri => uri !== null).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.secondary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="camera-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Fotos de Salida</Text>
          <Text style={styles.headerSubtitle}>
            {machine.name} - {machine.brand} {machine.model ? `(${machine.model})` : ''}
          </Text>
        </LinearGradient>

        <View style={styles.photosGrid}>
          {([
            { key: 'd1' as keyof Photos, label: 'D1', color: BRAND_COLORS.primaryOrange },
            { key: 'd2' as keyof Photos, label: 'D2', color: BRAND_COLORS.primaryBlue },
            { key: 'd3' as keyof Photos, label: 'D3', color: BRAND_COLORS.primaryBlue },
            { key: 'd4' as keyof Photos, label: 'D4', color: BRAND_COLORS.primaryOrange },
          ]).map(({ key, label, color }) => (
            <TouchableOpacity key={key} onPress={() => handleTakePhoto(key)} style={styles.photoCardWrapper} activeOpacity={0.8}>
              <Card style={styles.photoCard}>
                <Card.Content style={styles.photoCardContent}>
                  <Text style={[styles.photoTitle, { color }]}>{label}</Text>
                  {photos[key] ? (
                    <View style={styles.photoContainerInner}>
                      <Image source={{ uri: photos[key]! }} style={styles.photo} />
                      <Text style={[styles.photoHint, { color }]}>Tocar para cambiar</Text>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <MaterialCommunityIcons name="camera-plus-outline" size={32} color={BRAND_COLORS.grayText} />
                      <Text style={styles.photoPlaceholderText}>Tocar para foto</Text>
                    </View>
                  )}
                  {photos[key] && (
                    <View style={styles.checkIndicator}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={BRAND_COLORS.success} />
                    </View>
                  )}
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.progressInfo}>
          <MaterialCommunityIcons
            name={photoCount === 4 ? 'check-circle' : 'information'}
            size={20}
            color={photoCount === 4 ? BRAND_COLORS.success : BRAND_COLORS.primaryOrange}
          />
          <Text style={[styles.progressText, photoCount === 4 && { color: BRAND_COLORS.success }]}>
            Fotos completadas: {photoCount} de 4
          </Text>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button mode="outlined" onPress={() => router.back()} style={styles.backButton} disabled={isSaving} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue}>
            Volver
          </Button>
          <Button mode="contained" onPress={handleFinish} style={styles.finishButton} disabled={isSaving} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.success}>
            Finalizar
          </Button>
        </View>
      </SafeAreaView>
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={styles.savingTitle}>{savingText}</Text>
            <Text style={styles.savingSubtitle}>Espera un momento, estamos guardando la inspección de salida.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.primaryOrange,
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
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  backArrow: {
    position: 'absolute',
    left: 12,
    top: 12,
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
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.xl,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  photoCardWrapper: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  photoCard: {
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  photoCardContent: {
    position: 'relative',
  },
  photoTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.sm,
  },
  photoContainerInner: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
  },
  photoHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    marginTop: SPACING.xs,
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayLight,
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayMedium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  checkIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  progressText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.primaryOrange,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    ...SHADOWS.medium,
  },
  backButton: {
    flex: 1,
    marginRight: SPACING.sm,
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.md,
  },
  finishButton: {
    flex: 1,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  savingCard: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  savingTitle: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    textAlign: 'center',
  },
  savingSubtitle: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
  },
});
