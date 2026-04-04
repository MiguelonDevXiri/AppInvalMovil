import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function AveriaFinalFormScreen() {
  const params = useLocalSearchParams();

  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo3, setPhoto3] = useState<string | null>(null);
  const [photo4, setPhoto4] = useState<string | null>(null);

  useEffect(() => {
    if (params.isEditing === 'true') {
      if (params.photoGeneral1 && (params.photoGeneral1 as string).trim() !== '') setPhoto1(params.photoGeneral1 as string);
      if (params.photoGeneral2 && (params.photoGeneral2 as string).trim() !== '') setPhoto2(params.photoGeneral2 as string);
      if (params.photoGeneral3 && (params.photoGeneral3 as string).trim() !== '') setPhoto3(params.photoGeneral3 as string);
      if (params.photoGeneral4 && (params.photoGeneral4 as string).trim() !== '') setPhoto4(params.photoGeneral4 as string);
    }
  }, []);

  const handleTakePhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la cámara'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (slot === 1) setPhoto1(uri); else if (slot === 2) setPhoto2(uri);
        else if (slot === 3) setPhoto3(uri); else setPhoto4(uri);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo tomar la foto'); }
  };

  const handlePickPhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la galería'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (slot === 1) setPhoto1(uri); else if (slot === 2) setPhoto2(uri);
        else if (slot === 3) setPhoto3(uri); else setPhoto4(uri);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo seleccionar la imagen'); }
  };

  const handleFinish = () => {
    router.push({
      pathname: '/(tabs)/averia-report-view' as any,
      params: {
        ...params,
        photoGeneral1: photo1 || '',
        photoGeneral2: photo2 || '',
        photoGeneral3: photo3 || '',
        photoGeneral4: photo4 || '',
      },
    });
  };

  const PhotoSlot = ({ num, photo }: { num: 1|2|3|4; photo: string | null }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>Foto {num}</Text>
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
        <LinearGradient
          colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fotos Generales</Text>
          <Text style={styles.headerSubtitle}>Captura fotos generales de la máquina</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📸 Fotos Generales de la Máquina</Title>
            <Divider style={styles.divider} />
            <View style={styles.photosGrid}>
              <PhotoSlot num={1} photo={photo1} />
              <PhotoSlot num={2} photo={photo2} />
              <PhotoSlot num={3} photo={photo3} />
              <PhotoSlot num={4} photo={photo4} />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
          <Button mode="contained" style={styles.navBtn} onPress={handleFinish} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.success}>Finalizar</Button>
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
