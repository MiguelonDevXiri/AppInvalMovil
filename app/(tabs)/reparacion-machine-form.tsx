import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, HelperText, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

const ACCENT = '#b45309';
const GRADIENT = ['#92400e', '#d97706', '#fbbf24'] as const;

const parseGeneralPhotosParam = (value: unknown): (string | null)[] => {
  const slots: (string | null)[] = [null, null, null, null];

  if (typeof value !== 'string') {
    return slots;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      parsed
        .filter((item) => typeof item === 'string')
        .slice(0, 4)
        .forEach((item, index) => {
          slots[index] = item as string;
        });
    }
  } catch (error) {
    console.error('No se pudieron recuperar las fotos generales de reparación:', error);
  }

  return slots;
};

export default function ReparacionMachineFormScreen() {
  const params = useLocalSearchParams();

  const [clientName, setClientName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [otNumber, setOtNumber] = useState('');
  const [location, setLocation] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [generalPhotos, setGeneralPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [avisoDate, setAvisoDate] = useState(
    new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );
  const [avisoTime, setAvisoTime] = useState(
    new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
  const [errors, setErrors] = useState({ clientName: false, licensePlate: false, brand: false });
  const isEditing = params.isEditing === 'true';

  useEffect(() => {
    if (typeof params.clientName === 'string') setClientName(params.clientName);
    if (typeof params.licensePlate === 'string') setLicensePlate(params.licensePlate);
    if (typeof params.machineType === 'string') setMachineType(params.machineType);
    if (typeof params.brand === 'string') setBrand(params.brand);
    if (typeof params.model === 'string') setModel(params.model);
    if (typeof params.serialNumber === 'string') setSerialNumber(params.serialNumber);
    if (typeof params.otNumber === 'string') setOtNumber(params.otNumber);
    if (typeof params.location === 'string') setLocation(params.location);
    if (typeof params.avisoDate === 'string') setAvisoDate(params.avisoDate);
    if (typeof params.avisoTime === 'string') setAvisoTime(params.avisoTime);
  }, [
    params.clientName,
    params.licensePlate,
    params.machineType,
    params.brand,
    params.model,
    params.serialNumber,
    params.otNumber,
    params.location,
    params.avisoDate,
    params.avisoTime,
  ]);

  useEffect(() => {
    setGeneralPhotos(parseGeneralPhotosParam(params.generalPhotos));
  }, [params.generalPhotos]);

  useEffect(() => {
    if (typeof params.reviewedBy === 'string' && params.reviewedBy.trim()) {
      setReviewedBy(params.reviewedBy);
      return;
    }

    let active = true;

    const loadTechnician = async () => {
      try {
        const techJson = await AsyncStorage.getItem('current_technician');
        if (!active || !techJson) {
          return;
        }

        const tech = JSON.parse(techJson);
        if (tech.name) {
          setReviewedBy((current) => current || tech.name);
        }
      } catch (error) {
        console.error('No se pudo cargar el técnico actual:', error);
      }
    };

    void loadTechnician();

    return () => {
      active = false;
    };
  }, [params.reviewedBy]);

  const handleContinue = () => {
    const nextErrors = {
      clientName: !clientName.trim(),
      licensePlate: !licensePlate.trim(),
      brand: !brand.trim(),
    };

    setErrors(nextErrors);

    if (nextErrors.clientName || nextErrors.licensePlate || nextErrors.brand) {
      Alert.alert('Campos obligatorios', 'Cliente, matrícula y marca son obligatorios.');
      return;
    }

    router.push({
      pathname: '/(tabs)/reparacion-entry-photos-form' as any,
      params: {
        ...params,
        module: 'reparacion',
        clientName,
        licensePlate,
        machineType,
        brand,
        model,
        serialNumber,
        otNumber,
        location,
        reviewedBy,
        avisoDate,
        avisoTime,
        generalPhotos: JSON.stringify(generalPhotos.filter((value): value is string => Boolean(value))),
        isEditing: isEditing ? 'true' : 'false',
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
            colors={GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar reparación' : 'Nueva reparación taller'}
            </Text>
            <Text style={styles.headerSubtitle}>Paso 1 · Datos iniciales del parte</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📋 Datos del cliente</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Nombre del cliente *"
                value={clientName}
                onChangeText={(value) => {
                  setClientName(value);
                  setErrors((current) => ({ ...current, clientName: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.clientName ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
                error={errors.clientName}
              />
              {errors.clientName && <HelperText type="error">El cliente es obligatorio</HelperText>}

              <TextInput
                label="Matrícula *"
                value={licensePlate}
                onChangeText={(value) => {
                  setLicensePlate(value);
                  setErrors((current) => ({ ...current, licensePlate: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.licensePlate ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
                error={errors.licensePlate}
              />
              {errors.licensePlate && <HelperText type="error">La matrícula es obligatoria</HelperText>}

              <TextInput
                label="Ubicación"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />

              <TextInput
                label="Fecha"
                value={avisoDate}
                onChangeText={setAvisoDate}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />

              <TextInput
                label="Técnico responsable"
                value={reviewedBy}
                onChangeText={setReviewedBy}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>⚙️ Datos de la máquina</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Marca *"
                value={brand}
                onChangeText={(value) => {
                  setBrand(value);
                  setErrors((current) => ({ ...current, brand: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.brand ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
                error={errors.brand}
              />
              {errors.brand && <HelperText type="error">La marca es obligatoria</HelperText>}

              <TextInput
                label="Tipo de máquina"
                value={machineType}
                onChangeText={setMachineType}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />

              <TextInput
                label="Modelo"
                value={model}
                onChangeText={setModel}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />

              <TextInput
                label="Número de serie"
                value={serialNumber}
                onChangeText={setSerialNumber}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
              />

              <Text style={styles.infoText}>El Nº OT se asigna desde la plataforma web.</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>➡️ Siguiente paso</Title>
              <Divider style={styles.divider} />
              <Text style={styles.infoText}>
                Al continuar pasarás a la pantalla donde se hacen las fotos generales del antes.
              </Text>
            </Card.Content>
          </Card>

          <Text style={styles.helpText}>* Campos obligatorios</Text>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => router.back()} style={styles.button} textColor={ACCENT}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.button}
              icon="arrow-right"
              buttonColor={ACCENT}
            >
              Continuar
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ACCENT },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
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
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: ACCENT,
    marginBottom: SPACING.sm,
  },
  divider: { marginBottom: SPACING.md },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  halfInput: { flex: 1 },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    lineHeight: 20,
  },
  helpText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
  },
  buttonContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  button: { flex: 1, borderRadius: BORDER_RADIUS.md },
});
