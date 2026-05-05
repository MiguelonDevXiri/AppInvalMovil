import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ActecoReportFormScreen() {
  const params = useLocalSearchParams();
  const inspectionIdRef = useRef(typeof params.inspectionId === 'string' ? params.inspectionId : generateUUID());

  // Datos del cliente
  const [clientName, setClientName] = useState('');
  const [avisoDate, setAvisoDate] = useState(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const [avisoTime, setAvisoTime] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const [location, setLocation] = useState('');
  const [requestedBy, setRequestedBy] = useState('');

  // Datos de la máquina
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [otNumber, setOtNumber] = useState('');

  const [isEditing, setIsEditing] = useState(false);

  // Cargar datos si viene en modo edición
  useEffect(() => {
    if (params.isEditing === 'true') {
      console.log('✏️ Cargando datos para editar');
      setIsEditing(true);
      loadEditData();
    }
  }, []);

  const loadEditData = () => {
    // Cargar datos del cliente
    if (params.clientName) setClientName(params.clientName as string);
    if (params.avisoDate) setAvisoDate(params.avisoDate as string);
    if (params.avisoTime) setAvisoTime(params.avisoTime as string);
    if (params.location) setLocation(params.location as string);
    if (params.requestedBy) setRequestedBy(params.requestedBy as string);

    // Cargar datos de la máquina
    if (params.machineType) setMachineType(params.machineType as string);
    if (params.brand) setBrand(params.brand as string);
    if (params.model) setModel(params.model as string);
    if (params.serialNumber) setSerialNumber(params.serialNumber as string);
    if (params.licensePlate) setLicensePlate(params.licensePlate as string);
    if (params.otNumber) setOtNumber(params.otNumber as string);

    console.log('✅ Datos cargados para edición');
  };

  const handleContinue = () => {
    if (!clientName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del cliente es obligatorio');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Campo requerido', 'La ubicación es obligatoria');
      return;
    }

    if (!machineType.trim()) {
      Alert.alert('Campo requerido', 'El tipo de máquina es obligatorio');
      return;
    }

    // Pasar todos los params existentes + los nuevos datos
    const nextParams = {
      ...params, // Mantener inspectionId y otros datos si vienen
      inspectionId: inspectionIdRef.current,
      clientName,
      avisoDate,
      avisoTime,
      location,
      requestedBy,
      machineType,
      brand,
      model,
      serialNumber,
      licensePlate,
      otNumber,
      isEditing: isEditing ? 'true' : 'false'
    };

    router.push({
      pathname: '/(tabs)/safety-checklist-form' as any,
      params: {
        ...nextParams,
        module: 'urgencia',
      }
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
            colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Inspección' : 'Nueva Inspección ACTECO'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEditing ? 'Modifica los datos necesarios' : 'Completa los datos del cliente y la máquina'}
            </Text>
          </LinearGradient>

          <Card style={styles.clientCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Nombre del cliente *"
                value={clientName}
                onChangeText={setClientName}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Nombre completo del cliente"
              />

              <View style={styles.row}>
                <TextInput
                  label="Fecha *"
                  value={avisoDate}
                  onChangeText={setAvisoDate}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={BRAND_COLORS.primaryBlue}
                  placeholder="DD/MM/AAAA"
                />
              </View>

              <TextInput
                label="Ubicación *"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Dirección o ubicación"
              />

              <TextInput
                label="Pedido por"
                value={requestedBy}
                onChangeText={setRequestedBy}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Persona que solicita"
              />
            </Card.Content>
          </Card>

          <Card style={styles.machineCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>⚙️ Datos de la Máquina</Title>
              <Divider style={styles.divider} />

              <TextInput
                label="Tipo de máquina *"
                value={machineType}
                onChangeText={setMachineType}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Ej: Compactadora, Prensa, etc."
              />

              <TextInput
                label="Marca"
                value={brand}
                onChangeText={setBrand}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Marca del fabricante"
              />

              <TextInput
                label="Modelo"
                value={model}
                onChangeText={setModel}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Modelo de la máquina"
              />

              <TextInput
                label="Número de serie"
                value={serialNumber}
                onChangeText={setSerialNumber}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="S/N o número de serie"
              />

              <TextInput
                label="Matrícula"
                value={licensePlate}
                onChangeText={setLicensePlate}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Matrícula (si aplica)"
              />

            </Card.Content>
          </Card>

          <Text style={styles.helpText}>* Campos obligatorios</Text>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.button}
              textColor={BRAND_COLORS.primaryBlue}
            >
              Cancelar
            </Button>

            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.button}
              icon="arrow-right"
              buttonColor={BRAND_COLORS.primaryOrange}
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
    backgroundColor: BRAND_COLORS.primaryBlue,
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
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  clientCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  machineCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.sm,
  },
  divider: {
    marginBottom: SPACING.md,
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
