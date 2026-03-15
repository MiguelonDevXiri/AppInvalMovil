import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

export default function ActecoReportFormScreen() {
  const params = useLocalSearchParams();
  
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
      isEditing: isEditing ? 'true' : 'false'
    };

    router.push({
      pathname: '/(tabs)/acteco-general-photo' as any,
      params: nextParams
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Editar Inspección' : 'Nueva Inspección ACTECO'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditing ? 'Modifica los datos necesarios' : 'Completa los datos del cliente y la máquina'}
              </Text>
            </Card.Content>
          </Card>

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
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Nombre completo del cliente"
              />

              <View style={styles.row}>
                <TextInput
                  label="Fecha *"
                  value={avisoDate}
                  onChangeText={setAvisoDate}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.primaryBlue}
                  activeOutlineColor={BRAND_COLORS.primaryBlue}
                  placeholder="DD/MM/AAAA"
                />

                <TextInput
                  label="Hora *"
                  value={avisoTime}
                  onChangeText={setAvisoTime}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.primaryBlue}
                  activeOutlineColor={BRAND_COLORS.primaryBlue}
                  placeholder="HH:MM"
                />
              </View>

              <TextInput
                label="Ubicación *"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Dirección o ubicación"
              />

              <TextInput
                label="Pedido por"
                value={requestedBy}
                onChangeText={setRequestedBy}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
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
                outlineColor={BRAND_COLORS.primaryOrange}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Ej: Compactadora, Prensa, etc."
              />

              <TextInput
                label="Marca"
                value={brand}
                onChangeText={setBrand}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryOrange}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Marca del fabricante"
              />

              <TextInput
                label="Modelo"
                value={model}
                onChangeText={setModel}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryOrange}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="Modelo de la máquina"
              />

              <TextInput
                label="Número de serie"
                value={serialNumber}
                onChangeText={setSerialNumber}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryOrange}
                activeOutlineColor={BRAND_COLORS.primaryOrange}
                placeholder="S/N o número de serie"
              />

              <TextInput
                label="Matrícula"
                value={licensePlate}
                onChangeText={setLicensePlate}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryOrange}
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
              color={BRAND_COLORS.primaryBlue}
            >
              Cancelar
            </Button>
            
            <Button 
              mode="contained" 
              onPress={handleContinue}
              style={styles.button}
              icon="arrow-right"
              color={BRAND_COLORS.primaryOrange}
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
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  clientCard: {
    marginBottom: 16,
  },
  machineCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});