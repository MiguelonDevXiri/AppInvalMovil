import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function SaicaPhotosFormScreen() {
  const params = useLocalSearchParams();
  const [photoGeneral, setPhotoGeneral] = useState<string | null>(null);
  const [photoPlaca, setPhotoPlaca] = useState<string | null>(null);

  useEffect(() => {
    if (params.isEditing === 'true') {
      if (params.photoGeneral1 && (params.photoGeneral1 as string).trim() !== '') setPhotoGeneral(params.photoGeneral1 as string);
      if (params.photoGeneral2 && (params.photoGeneral2 as string).trim() !== '') setPhotoPlaca(params.photoGeneral2 as string);
    }
  }, []);

  const setSlotPhoto = (slot: 1 | 2, uri: string) => {
    if (slot === 1) setPhotoGeneral(uri); else setPhotoPlaca(uri);
  };

  const handleTakePhoto = async (slot: 1 | 2) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la cámara'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) setSlotPhoto(slot, result.assets[0].uri);
    } catch (error) { Alert.alert('Error', 'No se pudo tomar la foto'); }
  };

  const handlePickPhoto = async (slot: 1 | 2) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la galería'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) setSlotPhoto(slot, result.assets[0].uri);
    } catch (error) { Alert.alert('Error', 'No se pudo seleccionar la imagen'); }
  };

  const handleFinish = () => {
    router.push({
      pathname: '/(tabs)/saica-interventions-form' as any,
      params: {
        ...params,
        photoGeneral1: photoGeneral || '',
        photoGeneral2: photoPlaca || '',
        photoGeneral3: '',
        photoGeneral4: '',
      },
    });
  };

  const PhotoSlot = ({ num, label, photo }: { num: 1|2; label: string; photo: string | null }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>{label}</Text>
      {photo ? (
        <TouchableOpacity onPress={() => handleTakePhoto(num)} activeOpacity={0.8}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity style={styles.emptyPhotoThumb} onPress={() => handleTakePhoto(num)} activeOpacity={0.7}>
            <Text style={{ fontSize: 36 }}>📷</Text>
            <Text style={styles.emptyPhotoText}>Tomar foto</Text>
          </TouchableOpacity>
          <Button mode="text" onPress={() => handlePickPhoto(num)} compact labelStyle={{ fontSize: 11 }}>o elegir de galería</Button>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fotos de Máquina</Text>
          <Text style={styles.headerSubtitle}>Captura foto general y foto de placa</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📸 Foto general y placa</Title>
            <Divider style={styles.divider} />
            <View style={styles.photosGrid}>
              <PhotoSlot num={1} label="Foto general" photo={photoGeneral} />
              <PhotoSlot num={2} label="Foto de placa" photo={photoPlaca} />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
          <Button mode="contained" style={styles.navBtn} onPress={handleFinish} icon="arrow-right" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor="#7c3aed">Continuar</Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  scrollView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  card: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  photoSlot: { width: '48%', marginBottom: SPACING.sm },
  photoSlotLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.xs, textAlign: 'center' },
  photoThumb: { width: '100%', height: 140, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#c4b5fd' },
  emptyPhotoThumb: { width: '100%', height: 140, backgroundColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BRAND_COLORS.grayMedium, borderStyle: 'dashed' },
  emptyPhotoText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, marginTop: SPACING.xs },
  changePhotoText: { textAlign: 'center', marginTop: SPACING.xs, color: '#7c3aed', fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold as any },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
