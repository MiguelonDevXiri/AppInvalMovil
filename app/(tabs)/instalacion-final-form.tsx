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

type FinalPhotoSlot = 1 | 2 | 3 | 4;
type ChecklistValue = boolean | null;

type ChecklistQuestionProps = {
  title: string;
  value: ChecklistValue;
  onChange: (nextValue: boolean) => void;
  reason?: string;
  onChangeReason?: (nextValue: string) => void;
  requireReason?: boolean;
};

type PhotoSlotProps = {
  slot: FinalPhotoSlot;
  photo: string | null;
  isPrimary?: boolean;
  onTakePhoto: (slot: FinalPhotoSlot) => void;
  onPickPhoto: (slot: FinalPhotoSlot) => void;
};

export default function InstalacionFinalFormScreen() {
  const params = useLocalSearchParams();
  const [finalPhoto1, setFinalPhoto1] = useState<string | null>(null);
  const [finalPhoto2, setFinalPhoto2] = useState<string | null>(null);
  const [finalPhoto3, setFinalPhoto3] = useState<string | null>(null);
  const [finalPhoto4, setFinalPhoto4] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [worksCorrectly, setWorksCorrectly] = useState<ChecklistValue>(null);
  const [worksCorrectlyReason, setWorksCorrectlyReason] = useState('');
  const [staysRunning, setStaysRunning] = useState<ChecklistValue>(null);
  const [staysRunningReason, setStaysRunningReason] = useState('');
  const [pressuresChecked, setPressuresChecked] = useState<ChecklistValue>(null);
  const [pressuresCheckedReason, setPressuresCheckedReason] = useState('');

  useEffect(() => {
    const loadInitialState = async () => {
      const firstFinalPhoto = getParamString(params.finalPhoto) || getParamString(params.finalPhoto1);
      if (firstFinalPhoto) setFinalPhoto1(firstFinalPhoto);
      if (getParamString(params.finalPhoto2)) setFinalPhoto2(getParamString(params.finalPhoto2));
      if (getParamString(params.finalPhoto3)) setFinalPhoto3(getParamString(params.finalPhoto3));
      if (getParamString(params.finalPhoto4)) setFinalPhoto4(getParamString(params.finalPhoto4));

      const paramWorksCorrectly = getParamBoolean(params.worksCorrectly);
      if (paramWorksCorrectly !== null) setWorksCorrectly(paramWorksCorrectly);
      const paramStaysRunning = getParamBoolean(params.staysRunning);
      if (paramStaysRunning !== null) setStaysRunning(paramStaysRunning);
      const paramPressuresChecked = getParamBoolean(params.pressuresChecked);
      if (paramPressuresChecked !== null) setPressuresChecked(paramPressuresChecked);

      setWorksCorrectlyReason(getParamString(params.worksCorrectlyReason));
      setStaysRunningReason(getParamString(params.staysRunningReason));
      setPressuresCheckedReason(getParamString(params.pressuresCheckedReason));

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

  const setPhotoBySlot = (slot: FinalPhotoSlot, uri: string | null) => {
    if (slot === 1) setFinalPhoto1(uri);
    if (slot === 2) setFinalPhoto2(uri);
    if (slot === 3) setFinalPhoto3(uri);
    if (slot === 4) setFinalPhoto4(uri);
  };

  const handleTakePhoto = async (slot: FinalPhotoSlot) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        setPhotoBySlot(slot, result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto final.');
    }
  };

  const handlePickPhoto = async (slot: FinalPhotoSlot) => {
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
        setPhotoBySlot(slot, result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la foto final.');
    }
  };

  const handleContinue = async () => {
    if (!finalPhoto1) {
      Alert.alert('Foto requerida', 'Añade al menos la primera foto final antes de continuar.');
      return;
    }

    if (worksCorrectly === null || staysRunning === null || pressuresChecked === null) {
      Alert.alert('Checklist requerido', 'Completa el checklist final antes de continuar.');
      return;
    }

    if (worksCorrectly === false && !worksCorrectlyReason.trim()) {
      Alert.alert('Motivo requerido', 'Indica por qué la máquina no funciona bien.');
      return;
    }

    if (staysRunning === false && !staysRunningReason.trim()) {
      Alert.alert('Motivo requerido', 'Indica por qué la máquina no se queda en marcha.');
      return;
    }

    if (pressuresChecked === false && !pressuresCheckedReason.trim()) {
      Alert.alert('Motivo requerido', 'Indica por qué no se han podido comprobar correctamente las presiones o el funcionamiento general.');
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
        worksCorrectly: String(worksCorrectly),
        worksCorrectlyReason,
        staysRunning: String(staysRunning),
        staysRunningReason,
        pressuresChecked: String(pressuresChecked),
        pressuresCheckedReason,
        finalPhoto: finalPhoto1,
        finalPhoto1,
        finalPhoto2: finalPhoto2 || '',
        finalPhoto3: finalPhoto3 || '',
        finalPhoto4: finalPhoto4 || '',
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
            <Text style={styles.headerSubtitle}>Checklist final, fotos finales y notas / observaciones</Text>
          </LinearGradient>

          <Card style={styles.checklistCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>☑️ Checklist Final</Text>
              <Divider style={styles.divider} />
              <InstalacionChecklistQuestion
                title="¿Funciona bien la máquina?"
                value={worksCorrectly}
                onChange={setWorksCorrectly}
                reason={worksCorrectlyReason}
                onChangeReason={setWorksCorrectlyReason}
                requireReason
              />
              <InstalacionChecklistQuestion
                title="¿La máquina se queda en marcha?"
                value={staysRunning}
                onChange={setStaysRunning}
                reason={staysRunningReason}
                onChangeReason={setStaysRunningReason}
                requireReason
              />
              <InstalacionChecklistQuestion
                title="¿Se comprueban presiones y funcionamiento general de la máquina?"
                value={pressuresChecked}
                onChange={setPressuresChecked}
                reason={pressuresCheckedReason}
                onChangeReason={setPressuresCheckedReason}
                requireReason
              />
            </Card.Content>
          </Card>

          <Card style={styles.photoCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📷 Fotos Finales</Text>
              <Divider style={styles.divider} />
              <View style={styles.photosGrid}>
                <InstalacionPhotoSlot slot={1} photo={finalPhoto1} isPrimary onTakePhoto={handleTakePhoto} onPickPhoto={handlePickPhoto} />
                <InstalacionPhotoSlot slot={2} photo={finalPhoto2} onTakePhoto={handleTakePhoto} onPickPhoto={handlePickPhoto} />
                <InstalacionPhotoSlot slot={3} photo={finalPhoto3} onTakePhoto={handleTakePhoto} onPickPhoto={handlePickPhoto} />
                <InstalacionPhotoSlot slot={4} photo={finalPhoto4} onTakePhoto={handleTakePhoto} onPickPhoto={handlePickPhoto} />
              </View>
              <Text style={styles.helpText}>
                Puedes añadir hasta 4 fotos finales. La primera es obligatoria y será la foto principal en la web.
              </Text>
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

function getParamBoolean(value: unknown): boolean | null {
  if (Array.isArray(value)) {
    return getParamBoolean(value[0]);
  }

  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function InstalacionPhotoSlot({
  slot,
  photo,
  isPrimary = false,
  onTakePhoto,
  onPickPhoto,
}: PhotoSlotProps) {
  return (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>{isPrimary ? 'Foto principal *' : `Foto final ${slot}`}</Text>
      {photo ? (
        <TouchableOpacity onPress={() => onTakePhoto(slot)} activeOpacity={0.85}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity style={styles.emptyPhotoThumb} onPress={() => onTakePhoto(slot)} activeOpacity={0.8}>
            <Text style={styles.cameraEmoji}>📷</Text>
            <Text style={styles.emptyPhotoText}>{isPrimary ? 'Tomar foto principal' : 'Tomar foto final'}</Text>
          </TouchableOpacity>
          <Button mode="text" onPress={() => onPickPhoto(slot)} compact labelStyle={styles.galleryText}>
            o elegir de galería
          </Button>
        </View>
      )}
    </View>
  );
}

function InstalacionChecklistQuestion({
  title,
  value,
  onChange,
  reason,
  onChangeReason,
  requireReason,
}: ChecklistQuestionProps) {
  return (
    <View style={styles.checklistItem}>
      <Text style={styles.checklistQuestion}>{title}</Text>
      <View style={styles.answerRow}>
        <TouchableOpacity
          style={[styles.answerButton, value === true && styles.answerButtonYesActive]}
          onPress={() => onChange(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.answerButtonText, value === true && styles.answerButtonTextActive]}>Sí</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.answerButton, value === false && styles.answerButtonNoActive]}
          onPress={() => onChange(false)}
          activeOpacity={0.85}
        >
          <Text style={[styles.answerButtonText, value === false && styles.answerButtonTextActive]}>No</Text>
        </TouchableOpacity>
      </View>
      {value === false && onChangeReason ? (
        <TextInput
          label={requireReason ? 'Si no, ¿por qué? *' : 'Si no, ¿por qué?'}
          value={reason || ''}
          onChangeText={onChangeReason}
          style={styles.reasonInput}
          mode="outlined"
          multiline
          numberOfLines={3}
          outlineColor={BRAND_COLORS.grayMedium}
          activeOutlineColor={INSTALLATION_PRIMARY}
          placeholder="Explica el motivo"
        />
      ) : null}
    </View>
  );
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
    textAlign: 'center',
  },
  checklistCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: INSTALLATION_PRIMARY,
    ...SHADOWS.small,
  },
  photoCard: {
    marginHorizontal: SPACING.md,
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
  checklistItem: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f8fffd',
    borderWidth: 1,
    borderColor: INSTALLATION_BORDER,
  },
  checklistQuestion: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: '#0f172a',
    marginBottom: SPACING.sm,
  },
  answerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  answerButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
    backgroundColor: 'white',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  answerButtonYesActive: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  answerButtonNoActive: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  answerButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: '#334155',
  },
  answerButtonTextActive: {
    color: '#0f172a',
  },
  reasonInput: {
    marginTop: SPACING.sm,
    backgroundColor: 'white',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  photoSlot: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  photoSlotLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  photoThumb: {
    width: '100%',
    height: 150,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: INSTALLATION_BORDER,
  },
  emptyPhotoThumb: {
    width: '100%',
    height: 150,
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
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
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
