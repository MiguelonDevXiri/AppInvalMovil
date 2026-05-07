import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View, type AlertButton } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection } from '../../utils/mantenimientoStorage';

const PHOTO_SLOTS = [
  { key: 'front', label: 'A1' },
  { key: 'back', label: 'A2' },
  { key: 'left', label: 'A3' },
  { key: 'right', label: 'A4' },
] as const;

export default function MantenimientoGeneralPhotosFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState(() => paramsToInspection(params));
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

  const goData = () => router.replace({ pathname: '/(tabs)/mantenimiento-form' as any, params: inspectionToParams(inspection) });
  const goNext = () => router.push({ pathname: '/(tabs)/safety-checklist-form' as any, params: { ...inspectionToParams(inspection), module: 'mantenimiento' } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          <LinearGradient colors={GRADIENTS.primary as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
            <TouchableOpacity onPress={goData} style={styles.backButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.typeTitle}>Fotos generales</Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Fotos generales de entrada</Text>
            <Divider style={styles.divider} />
            <Text style={styles.infoText}>Añade las fotos generales antes del checklist de seguridad.</Text>
            <View style={styles.grid}>
              {PHOTO_SLOTS.map((slot) => {
                const uri = inspection.generalPhotos[slot.key];
                return (
                  <TouchableOpacity key={slot.key} style={styles.photoBox} onPress={() => openOptions(slot.key, slot.label)} activeOpacity={0.85}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.photo} />
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
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color={BRAND_COLORS.primaryOrange} />
              <Text style={styles.counterText}>Fotos añadidas: {photoCount} de 4</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.cancelButton} onPress={goData} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue}>Cancelar</Button>
            <Button mode="contained" style={styles.saveButton} onPress={goNext} icon="arrow-right" contentStyle={styles.primaryButtonContent} buttonColor={BRAND_COLORS.primaryOrange}>Continuar</Button>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollViewContent: { paddingBottom: 112 },
  headerGradient: { padding: SPACING.xl, alignItems: 'center', paddingTop: SPACING.lg },
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  typeTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white', letterSpacing: 0.3, textAlign: 'center' },
  formCard: { margin: SPACING.lg, marginTop: -SPACING.sm, padding: SPACING.lg, backgroundColor: 'white', borderRadius: BORDER_RADIUS.xl, borderLeftWidth: 4, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.card },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm, letterSpacing: 0.2 },
  divider: { backgroundColor: BRAND_COLORS.lightOrange, height: 2, marginBottom: SPACING.lg, borderRadius: BORDER_RADIUS.full, opacity: 0.7 },
  infoText: { color: BRAND_COLORS.grayText, lineHeight: 20, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoBox: { width: '47%', height: 168, borderWidth: 1, borderColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.lg, backgroundColor: 'white', overflow: 'hidden', alignItems: 'center', marginBottom: SPACING.sm },
  photo: { width: '100%', height: 130, backgroundColor: BRAND_COLORS.grayLight },
  placeholder: { height: 130, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  placeholderText: { color: BRAND_COLORS.grayText, marginTop: 4, fontWeight: TYPOGRAPHY.weights.semibold as any },
  photoLabel: { fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginTop: 7 },
  counterBox: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg, backgroundColor: BRAND_COLORS.lightOrange, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterText: { color: '#92400e', fontWeight: TYPOGRAPHY.weights.bold as any },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, paddingTop: SPACING.md + 2, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight, ...SHADOWS.soft },
  cancelButton: { flex: 1, marginRight: SPACING.sm, borderColor: BRAND_COLORS.primaryBlue, borderRadius: BORDER_RADIUS.lg },
  saveButton: { flex: 1, marginLeft: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  primaryButtonContent: { flexDirection: 'row-reverse' },
});
