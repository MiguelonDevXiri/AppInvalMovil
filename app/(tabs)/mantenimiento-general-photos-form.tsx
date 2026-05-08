import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View, type AlertButton } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection, saveMantenimientoInspection } from '../../utils/mantenimientoStorage';

const PHOTO_SLOTS = [
  { key: 'front', label: 'A1' },
  { key: 'back', label: 'A2' },
  { key: 'left', label: 'A3' },
  { key: 'right', label: 'A4' },
] as const;

export default function MantenimientoGeneralPhotosFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState(() => paramsToInspection(params));
  const [saving, setSaving] = useState(false);
  const [savingText, setSavingText] = useState('Guardando fotos generales...');
  const photoCount = useMemo(() => Object.values(inspection.generalPhotos).filter(Boolean).length, [inspection.generalPhotos]);

  const setPhoto = (key: string, uri: string | null) => setInspection((prev) => {
    const next = { ...prev.generalPhotos };
    if (uri) next[key] = uri; else delete next[key];
    return { ...prev, generalPhotos: next };
  });

  const pickCamera = async (key: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) setPhoto(key, result.assets[0].uri);
  };

  const pickLibrary = async (key: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.7, selectionLimit: 1 });
    if (!result.canceled && result.assets?.[0]?.uri) setPhoto(key, result.assets[0].uri);
  };

  const openOptions = (key: string, label: string) => {
    const actions: AlertButton[] = [
      { text: 'Cámara', onPress: () => { void pickCamera(key); } },
      { text: 'Galería', onPress: () => { void pickLibrary(key); } },
    ];
    if (inspection.generalPhotos[key]) actions.push({ text: 'Quitar foto', style: 'destructive', onPress: () => setPhoto(key, null) });
    actions.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(`Foto ${label}`, 'Selecciona una opción', actions);
  };

  const goBack = () => router.back();

  const handleSaveAndFinish = async () => {
    if (photoCount < 4) {
      Alert.alert('Fotos incompletas', 'No has tomado todas las fotos. ¿Continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => doSave() },
      ]);
      return;
    }
    doSave();
  };

  const doSave = async () => {
    try {
      setSaving(true);
      setSavingText('Guardando mantenimiento...');
      const saved = await saveMantenimientoInspection(inspection);
      setSavingText('Preparando informe...');
      router.replace({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: saved.id } });
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error);
      Alert.alert('Error', 'No se pudo guardar el mantenimiento. Revisa las tablas SQL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          <LinearGradient colors={GRADIENTS.primary as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="camera-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.headerTitle}>Fotos Generales</Text>
            <Text style={styles.headerSubtitle}>
              {inspection.brand || inspection.machineType} — {inspection.clientName || 'Sin cliente'}
            </Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Fotos generales de entrada</Text>
            <Divider style={styles.divider} />
            <Text style={styles.infoText}>Añade las fotos generales de la máquina antes de guardar el informe.</Text>
            <View style={styles.grid}>
              {PHOTO_SLOTS.map((slot) => {
                const uri = inspection.generalPhotos[slot.key];
                return (
                  <TouchableOpacity key={slot.key} style={styles.photoBox} onPress={() => openOptions(slot.key, slot.label)} activeOpacity={0.85}>
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photo} />
                        <View style={styles.checkBadge}>
                          <MaterialCommunityIcons name="check-circle" size={20} color={BRAND_COLORS.success} />
                        </View>
                      </>
                    ) : (
                      <View style={styles.placeholder}>
                        <MaterialCommunityIcons name="camera-plus-outline" size={32} color={BRAND_COLORS.primaryBlue} />
                        <Text style={styles.placeholderText}>Añadir</Text>
                      </View>
                    )}
                    <Text style={styles.photoLabel}>{slot.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.counterBox}>
              <MaterialCommunityIcons
                name={photoCount === 4 ? 'check-circle' : 'image-multiple-outline'}
                size={20}
                color={photoCount === 4 ? BRAND_COLORS.success : BRAND_COLORS.primaryOrange}
              />
              <Text style={[styles.counterText, photoCount === 4 && { color: BRAND_COLORS.success }]}>
                Fotos completadas: {photoCount} de 4
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.cancelButton} onPress={goBack} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue} disabled={saving}>Volver</Button>
            <Button mode="contained" style={styles.saveButton} onPress={handleSaveAndFinish} icon="check" contentStyle={styles.primaryButtonContent} buttonColor={BRAND_COLORS.primaryOrange} disabled={saving} loading={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </View>
        </SafeAreaView>
      </View>

      {saving && (
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
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollViewContent: { paddingBottom: 112 },
  headerGradient: { padding: SPACING.lg, paddingTop: SPACING.md, alignItems: 'center' },
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any, fontSize: TYPOGRAPHY.sizes.xl, marginTop: SPACING.sm },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: TYPOGRAPHY.sizes.sm, marginTop: SPACING.xs },
  formCard: { margin: SPACING.lg, marginTop: -SPACING.sm, padding: SPACING.lg, backgroundColor: 'white', borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 4, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.card },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm, letterSpacing: 0.2 },
  divider: { backgroundColor: BRAND_COLORS.lightOrange, height: 2, marginBottom: SPACING.lg, borderRadius: BORDER_RADIUS.full, opacity: 0.7 },
  infoText: { color: BRAND_COLORS.grayText, lineHeight: 20, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoBox: { width: '47%', height: 168, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.lg, backgroundColor: 'white', overflow: 'hidden', alignItems: 'center', marginBottom: SPACING.sm, position: 'relative' },
  photo: { width: '100%', height: 130, backgroundColor: BRAND_COLORS.grayLight },
  placeholder: { height: 130, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  placeholderText: { color: BRAND_COLORS.grayText, marginTop: 4, fontWeight: TYPOGRAPHY.weights.semibold as any },
  photoLabel: { fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginTop: 7 },
  checkBadge: { position: 'absolute', top: 4, right: 4 },
  counterBox: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg, backgroundColor: BRAND_COLORS.lightOrange, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterText: { color: '#92400e', fontWeight: TYPOGRAPHY.weights.bold as any },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, paddingTop: SPACING.md + 2, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight, ...SHADOWS.soft },
  cancelButton: { flex: 1, marginRight: SPACING.sm, borderColor: BRAND_COLORS.primaryBlue, borderRadius: BORDER_RADIUS.lg },
  saveButton: { flex: 1, marginLeft: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  primaryButtonContent: { flexDirection: 'row-reverse' },
  savingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1100 },
  savingCard: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '80%', maxWidth: 320, ...SHADOWS.large },
  savingTitle: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, textAlign: 'center' },
  savingSubtitle: { marginTop: SPACING.sm, fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText, textAlign: 'center' },
});
