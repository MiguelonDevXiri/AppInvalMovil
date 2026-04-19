import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const INSTALLATION_BORDER = '#99f6e4';
const DRAFT_KEY = 'instalacion_draft_notes';

export default function InstalacionFinalFormScreen() {
  const params = useLocalSearchParams();
  const [finalPhoto, setFinalPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    const loadInitialState = async () => {
      if (params.finalPhoto && (params.finalPhoto as string).trim() !== '') {
        setFinalPhoto(params.finalPhoto as string);
      }

      const paramNotes = getParamString(params.notes) || getParamString(params.observaciones);
      if (paramNotes) {
        setNotes(paramNotes);
        setDraftLoaded(true);
        return;
      }

      try {
        const savedDraft = await AsyncStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          setNotes(savedDraft);
        }
      } catch (error) {
        console.error('No se pudo cargar el borrador de notas de instalación:', error);
      } finally {
        setDraftLoaded(true);
      }
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    const persistDraft = async () => {
      try {
        await AsyncStorage.setItem(DRAFT_KEY, notes);
      } catch (error) {
        console.error('No se pudo persistir el borrador de notas de instalación:', error);
      }
    };

    persistDraft();
  }, [draftLoaded, notes]);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        setFinalPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto final.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setFinalPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la foto final.');
    }
  };

  const handleContinue = async () => {
    if (!finalPhoto) {
      Alert.alert('Foto requerida', 'Añade la foto final de la instalación antes de continuar.');
      return;
    }

    try {
      await AsyncStorage.setItem(DRAFT_KEY, notes);
    } catch (error) {
      console.error('No se pudo guardar el borrador final de notas:', error);
    }

    router.push({
      pathname: '/(tabs)/instalacion-report-view' as any,
      params: {
        ...params,
        finalPhoto,
        notes,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={INSTALLATION_GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cierre de la Instalación</Text>
            <Text style={styles.headerSubtitle}>Foto final y notas / observaciones</Text>
          </LinearGradient>

          <Card style={styles.photoCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📷 Foto Final</Text>
              <Divider style={styles.divider} />

              {finalPhoto ? (
                <TouchableOpacity onPress={handleTakePhoto} activeOpacity={0.85}>
                  <Image source={{ uri: finalPhoto }} style={styles.finalPhoto} />
                  <Text style={styles.changePhotoText}>✓ Tocar para cambiar la foto final</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <TouchableOpacity style={styles.emptyPhotoThumb} onPress={handleTakePhoto} activeOpacity={0.8}>
                    <Text style={styles.cameraEmoji}>📷</Text>
                    <Text style={styles.emptyPhotoText}>Tomar foto final</Text>
                  </TouchableOpacity>
                  <Button mode="text" onPress={handlePickPhoto} compact labelStyle={styles.galleryText}>
                    o elegir de galería
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.notesCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📝 Notas / Observaciones</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Notas para web y PDF"
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                mode="outlined"
                multiline
                numberOfLines={5}
                placeholder="Añade cualquier observación importante de la instalación"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
              />
              <Text style={styles.helpText}>
                Las notas se guardan en borrador hasta completar el guardado final.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor={INSTALLATION_PRIMARY}>
              Volver
            </Button>
            <Button
              mode="contained"
              style={styles.navBtn}
              onPress={handleContinue}
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={INSTALLATION_PRIMARY}
            >
              Finalizar
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getParamString(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: INSTALLATION_PRIMARY,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  backBtn: {
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
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: SPACING.xs,
  },
  photoCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: INSTALLATION_PRIMARY,
    ...SHADOWS.small,
  },
  notesCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.sm,
  },
  divider: {
    backgroundColor: INSTALLATION_BORDER,
    height: 1,
    marginBottom: SPACING.md,
  },
  finalPhoto: {
    width: '100%',
    height: 220,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: INSTALLATION_BORDER,
  },
  emptyPhotoThumb: {
    width: '100%',
    height: 220,
    backgroundColor: BRAND_COLORS.grayMedium,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayMedium,
    borderStyle: 'dashed',
  },
  cameraEmoji: {
    fontSize: 44,
  },
  emptyPhotoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.xs,
  },
  changePhotoText: {
    textAlign: 'center',
    marginTop: SPACING.xs,
    color: INSTALLATION_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  galleryText: {
    fontSize: 11,
    color: INSTALLATION_PRIMARY,
  },
  notesInput: {
    backgroundColor: 'white',
  },
  helpText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
  navBtn: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
});
