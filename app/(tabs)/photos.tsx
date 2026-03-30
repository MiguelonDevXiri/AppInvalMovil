import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getChecklistByMachineId, getGeneralPhotosByMachineId, getMachineById, Machine, saveGeneralPhotos } from '../../utils/storage';
import { generateAndUploadPDF } from '../../utils/reportGenerator';

interface Photos {
  front: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
}

export default function PhotoScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [photos, setPhotos] = useState<Photos>({ front: null, back: null, left: null, right: null });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingText, setSavingText] = useState('Guardando fotos generales...');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        setLoading(true);
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) setMachine(foundMachine);

        const existingPhotos = await getGeneralPhotosByMachineId(machineId.toString());
        if (existingPhotos && existingPhotos.photos) {
          setPhotos({
            front: existingPhotos.photos.front || null,
            back: existingPhotos.photos.back || null,
            left: existingPhotos.photos.left || null,
            right: existingPhotos.photos.right || null,
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
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara'); return; }
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
      await saveGeneralPhotos({ machineId: machineId.toString(), photos: photosObject, takenAt: new Date().toISOString() });
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
          { text: 'Continuar', onPress: () => saveAndContinue() },
        ]);
      } else { saveAndContinue(); }
    } catch (error) {
      console.error('Error al finalizar las fotos:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const saveAndContinue = async () => {
    try {
      setSavingText('Guardando fotos generales...');
      setIsSaving(true);
      const saved = await handleSavePhotos();
      if (saved && machineId) {
        // Generar y subir PDF automáticamente a Supabase
        setSavingText('Generando PDF...');
        try {
          const currentMachine = await getMachineById(machineId.toString());
          if (currentMachine) {
            const checklistData = await getChecklistByMachineId(machineId.toString());
            const photosData = await getGeneralPhotosByMachineId(machineId.toString());
            await generateAndUploadPDF(currentMachine, checklistData, photosData, (_percent, text) => {
              setSavingText(text);
            });
          }
        } catch (pdfError) {
          console.warn('No se pudo generar el PDF automático (no crítico):', pdfError);
        }
        setSavingText('Preparando informe...');
        setIsSaving(false);
        router.push({ pathname: '/report', params: { machineId: machineId.toString() } });
        return;
      }
      setIsSaving(false);
    } catch (error) {
      console.error('Error al continuar al informe:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={{ color: BRAND_COLORS.grayText }}>Cargando datos...</Text>
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
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="camera-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Fotos Generales</Text>
          <Text style={styles.headerSubtitle}>
            {machine.name} - {machine.brand} {machine.model ? `(${machine.model})` : ''}
          </Text>
        </LinearGradient>

        <View style={styles.photosGrid}>
          {([
            { key: 'front' as keyof Photos, label: 'A1', color: BRAND_COLORS.primaryBlue },
            { key: 'back' as keyof Photos, label: 'A2', color: BRAND_COLORS.primaryOrange },
            { key: 'left' as keyof Photos, label: 'A3', color: BRAND_COLORS.primaryOrange },
            { key: 'right' as keyof Photos, label: 'A4', color: BRAND_COLORS.primaryBlue },
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
            color={photoCount === 4 ? BRAND_COLORS.success : BRAND_COLORS.primaryBlue}
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
          <Button mode="contained" onPress={handleFinish} style={styles.finishButton} disabled={isSaving} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.primaryOrange}>
            Guardar
          </Button>
        </View>
      </SafeAreaView>
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={styles.savingTitle}>{savingText}</Text>
            <Text style={styles.savingSubtitle}>Espera un momento, estamos preparando el informe.</Text>
          </View>
        </View>
      )}
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
    padding: SPACING.lg,
    paddingTop: SPACING.md,
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
    color: BRAND_COLORS.primaryBlue,
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
