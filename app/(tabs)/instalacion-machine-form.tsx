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

export default function InstalacionMachineFormScreen() {
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
  const [avisoDate, setAvisoDate] = useState(
    new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [avisoTime, setAvisoTime] = useState(
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  );
  const [errors, setErrors] = useState({ clientName: false, licensePlate: false, brand: false });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadTechnician();

    if (params.isEditing === 'true') {
      setIsEditing(true);
      if (params.clientName) setClientName(params.clientName as string);
      if (params.licensePlate) setLicensePlate(params.licensePlate as string);
      if (params.machineType) setMachineType(params.machineType as string);
      if (params.brand) setBrand(params.brand as string);
      if (params.model) setModel(params.model as string);
      if (params.serialNumber) setSerialNumber(params.serialNumber as string);
      if (params.otNumber) setOtNumber(params.otNumber as string);
      if (params.location) setLocation(params.location as string);
      if (params.reviewedBy) setReviewedBy(params.reviewedBy as string);
      if (params.avisoDate) setAvisoDate(params.avisoDate as string);
      if (params.avisoTime) setAvisoTime(params.avisoTime as string);
    }
  }, []);

  const loadTechnician = async () => {
    try {
      const technicianJson = await AsyncStorage.getItem('current_technician');
      if (!technicianJson) return;

      const technician = JSON.parse(technicianJson);
      if (!reviewedBy && technician.name) {
        setReviewedBy(technician.name);
      }
    } catch (error) {
      console.error('No se pudo cargar el técnico:', error);
    }
  };

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
      pathname: '/(tabs)/instalacion-site-photos-form' as any,
      params: {
        ...params,
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
            colors={INSTALLATION_GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Instalación' : 'Nueva Instalación'}
            </Text>
            <Text style={styles.headerSubtitle}>Datos del cliente y de la máquina</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Nombre del cliente *"
                value={clientName}
                onChangeText={(text) => {
                  setClientName(text);
                  setErrors((current) => ({ ...current, clientName: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.clientName ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
                error={errors.clientName}
              />
              {errors.clientName && <HelperText type="error">El cliente es obligatorio</HelperText>}

              <TextInput
                label="Matrícula *"
                value={licensePlate}
                onChangeText={(text) => {
                  setLicensePlate(text);
                  setErrors((current) => ({ ...current, licensePlate: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.licensePlate ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
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
                activeOutlineColor={INSTALLATION_PRIMARY}
              />

              <View style={styles.row}>
                <TextInput
                  label="Fecha"
                  value={avisoDate}
                  onChangeText={setAvisoDate}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={INSTALLATION_PRIMARY}
                />
                <TextInput
                  label="Hora"
                  value={avisoTime}
                  onChangeText={setAvisoTime}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={INSTALLATION_PRIMARY}
                />
              </View>

              <TextInput
                label="Revisado por"
                value={reviewedBy}
                onChangeText={setReviewedBy}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>⚙️ Datos de la Máquina</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Marca *"
                value={brand}
                onChangeText={(text) => {
                  setBrand(text);
                  setErrors((current) => ({ ...current, brand: false }));
                }}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.brand ? BRAND_COLORS.error : BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
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
                activeOutlineColor={INSTALLATION_PRIMARY}
              />

              <TextInput
                label="Modelo"
                value={model}
                onChangeText={setModel}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
              />

              <TextInput
                label="Número de serie"
                value={serialNumber}
                onChangeText={setSerialNumber}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
              />

            </Card.Content>
          </Card>

          <Text style={styles.helpText}>* Campos obligatorios</Text>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => router.back()} style={styles.button} textColor={INSTALLATION_PRIMARY}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.button}
              icon="arrow-right"
              buttonColor={INSTALLATION_PRIMARY}
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
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.82)',
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
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.sm,
  },
  divider: {
    marginBottom: SPACING.md,
    backgroundColor: INSTALLATION_BORDER,
  },
  input: {
    marginBottom: SPACING.sm,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
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
  buttonContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
  },
});
