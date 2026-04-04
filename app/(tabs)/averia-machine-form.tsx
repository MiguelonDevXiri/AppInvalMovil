import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, HelperText, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function AveriaMachineFormScreen() {
  const params = useLocalSearchParams();

  // Mismos campos que inspecciones + fecha
  const [clientName, setClientName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [avisoDate, setAvisoDate] = useState(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const [avisoTime, setAvisoTime] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const [notes, setNotes] = useState('');

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
      if (params.location) setLocation(params.location as string);
      if (params.reviewedBy) setReviewedBy(params.reviewedBy as string);
      if (params.avisoDate) setAvisoDate(params.avisoDate as string);
      if (params.avisoTime) setAvisoTime(params.avisoTime as string);
      if (params.notes) setNotes(params.notes as string);
    }
  }, []);

  const loadTechnician = async () => {
    try {
      const techJson = await AsyncStorage.getItem('current_technician');
      if (techJson) {
        const tech = JSON.parse(techJson);
        if (!reviewedBy && tech.name) setReviewedBy(tech.name);
      }
    } catch (e) {}
  };

  const handleContinue = () => {
    const newErrors = {
      clientName: !clientName.trim(),
      licensePlate: !licensePlate.trim(),
      brand: !brand.trim(),
    };
    setErrors(newErrors);
    if (newErrors.clientName || newErrors.licensePlate || newErrors.brand) {
      Alert.alert('Campos obligatorios', 'Cliente, matrícula y marca son obligatorios');
      return;
    }

    router.push({
      pathname: '/(tabs)/averia-defects-form' as any,
      params: {
        ...params,
        clientName, licensePlate, machineType, brand, model, serialNumber,
        location, reviewedBy, avisoDate, avisoTime, notes,
        isEditing: isEditing ? 'true' : 'false',
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
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Avería' : 'Nueva Inspección Averías'}
            </Text>
            <Text style={styles.headerSubtitle}>Datos del cliente y la máquina</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📋 Datos del Cliente</Title>
              <Divider style={styles.divider} />
              <TextInput label="Nombre del cliente *" value={clientName} onChangeText={(t) => { setClientName(t); setErrors({...errors, clientName: false}); }} style={styles.input} mode="outlined" outlineColor={errors.clientName ? BRAND_COLORS.error : BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" error={errors.clientName} />
              {errors.clientName && <HelperText type="error">El cliente es obligatorio</HelperText>}

              <TextInput label="Matrícula *" value={licensePlate} onChangeText={(t) => { setLicensePlate(t); setErrors({...errors, licensePlate: false}); }} style={styles.input} mode="outlined" outlineColor={errors.licensePlate ? BRAND_COLORS.error : BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" error={errors.licensePlate} />
              {errors.licensePlate && <HelperText type="error">La matrícula es obligatoria</HelperText>}

              <TextInput label="Ubicación" value={location} onChangeText={setLocation} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />

              <View style={styles.row}>
                <TextInput label="Fecha" value={avisoDate} onChangeText={setAvisoDate} style={[styles.input, styles.halfInput]} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
                <TextInput label="Hora" value={avisoTime} onChangeText={setAvisoTime} style={[styles.input, styles.halfInput]} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
              </View>

              <TextInput label="Revisado por" value={reviewedBy} onChangeText={setReviewedBy} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>⚙️ Datos de la Máquina</Title>
              <Divider style={styles.divider} />
              <TextInput label="Marca *" value={brand} onChangeText={(t) => { setBrand(t); setErrors({...errors, brand: false}); }} style={styles.input} mode="outlined" outlineColor={errors.brand ? BRAND_COLORS.error : BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" error={errors.brand} />
              {errors.brand && <HelperText type="error">La marca es obligatoria</HelperText>}

              <TextInput label="Tipo de máquina" value={machineType} onChangeText={setMachineType} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
              <TextInput label="Modelo" value={model} onChangeText={setModel} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
              <TextInput label="Número de serie" value={serialNumber} onChangeText={setSerialNumber} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
              <TextInput label="Notas" value={notes} onChangeText={setNotes} style={styles.input} mode="outlined" multiline numberOfLines={3} outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" />
            </Card.Content>
          </Card>

          <Text style={styles.helpText}>* Campos obligatorios</Text>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => router.back()} style={styles.button} textColor="#7c3aed">Cancelar</Button>
            <Button mode="contained" onPress={handleContinue} style={styles.button} icon="arrow-right" buttonColor="#7c3aed">Continuar</Button>
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
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white', marginBottom: SPACING.xs },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)' },
  card: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  divider: { marginBottom: SPACING.md },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  halfInput: { flex: 1 },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm, textAlign: 'center' },
  buttonSafeArea: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium },
  buttonContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  button: { flex: 1, borderRadius: BORDER_RADIUS.md },
});
