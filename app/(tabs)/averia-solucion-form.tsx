import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function AveriaSolucionFormScreen() {
  const params = useLocalSearchParams();
  const [solucionDescription, setSolucionDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (params.solucionDescription) {
      setSolucionDescription(params.solucionDescription as string);
    }
    if (params.solucionPhotos) {
      try {
        const parsed = JSON.parse(params.solucionPhotos as string);
        if (Array.isArray(parsed)) setPhotos(parsed);
      } catch (e) {}
    }
  }, []);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para la cámara'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo tomar la foto'); }
  };

  const handlePickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para la galería'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, quality: 0.7,
        allowsMultipleSelection: true, selectionLimit: 10,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPhotos([...photos, ...result.assets.map(a => a.uri)]);
      }
    } catch (error) { Alert.alert('Error', 'No se pudieron seleccionar las imágenes'); }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('Eliminar foto', '¿Eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => setPhotos(photos.filter((_, i) => i !== index)) },
    ]);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(tabs)/averia-materiales-form' as any,
      params: {
        ...params,
        solucionDescription,
        solucionPhotos: JSON.stringify(photos),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Solución / Intervención</Text>
            <Text style={styles.headerSubtitle}>Describe la intervención realizada</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>🛠️ Intervención Realizada</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Descripción de la intervención"
                value={solucionDescription}
                onChangeText={setSolucionDescription}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={6}
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor="#7c3aed"
                placeholder="Describe qué se ha hecho para solucionar las averías"
              />
            </Card.Content>
          </Card>

          <Card style={styles.photosCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📸 Fotos de la Solución</Text>
              <Divider style={styles.divider} />

              <View style={styles.photoActions}>
                <Button mode="contained" icon="camera" onPress={handleTakePhoto} style={styles.photoBtn} buttonColor="#7c3aed">Tomar Foto</Button>
                <Button mode="outlined" icon="image-multiple" onPress={handlePickPhotos} style={styles.photoBtn} textColor="#7c3aed">Galería</Button>
              </View>

              {photos.length > 0 ? (
                <View style={styles.photosGrid}>
                  {photos.map((uri, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemovePhoto(index)}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Foto {index + 1}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No se han añadido fotos de la solución</Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
            <Button mode="contained" style={styles.navBtn} onPress={handleContinue} icon="arrow-right" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor="#7c3aed">Continuar</Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  card: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  photosCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.success, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  photoBtn: { flex: 1, borderRadius: BORDER_RADIUS.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoContainer: { width: '48%', marginBottom: SPACING.sm, position: 'relative' },
  photo: { width: '100%', height: 120, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#c4b5fd' },
  deleteBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(220,38,38,0.9)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: 'white', fontSize: 18, fontWeight: TYPOGRAPHY.weights.bold as any, lineHeight: 20 },
  photoLabel: { textAlign: 'center', marginTop: SPACING.xs, fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  emptyText: { textAlign: 'center', fontStyle: 'italic', color: BRAND_COLORS.grayText, padding: SPACING.lg },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
