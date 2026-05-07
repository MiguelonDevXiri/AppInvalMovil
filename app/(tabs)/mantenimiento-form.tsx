import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { getMantenimientoInspectionById, inspectionToParams, paramsToInspection, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');

export default function MantenimientoFormScreen() {
  const params = useLocalSearchParams();
  const inspectionId = getParamString(params.inspectionId);
  const machineType = getParamString(params.machineType) || 'otros';
  const machineTypeData = useMemo(() => getMachineTypeById(machineType), [machineType]);
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection({ ...params, machineType }));
  const [loading, setLoading] = useState(Boolean(inspectionId) && !getParamString(params.clientName));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!inspectionId || getParamString(params.clientName)) return;
      const loaded = await getMantenimientoInspectionById(inspectionId);
      if (!active) return;
      if (loaded) setInspection(loaded); else Alert.alert('Error', 'No se pudo cargar el mantenimiento.');
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [inspectionId, params.clientName]);

  const setField = (field: keyof MantenimientoInspection, value: string) => setInspection((prev) => ({ ...prev, [field]: value }));

  const handleContinue = () => {
    if (!inspection.brand.trim() || !inspection.clientName.trim() || !inspection.licensePlate.trim()) {
      Alert.alert('Campos obligatorios', 'Marca, cliente y matrícula son obligatorios.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    router.push({ pathname: '/(tabs)/mantenimiento-general-photos-form' as any, params: inspectionToParams(inspection) });
    setIsSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primaryOrange} />
        <Text style={styles.loadingText}>Cargando mantenimiento...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.typeTitle}>{inspectionId ? 'Editar mantenimiento' : `Tipo: ${machineTypeData.name}`}</Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Datos de la Máquina</Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Marca *"
              value={inspection.brand}
              onChangeText={(value) => setField('brand', value)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              label="Modelo"
              value={inspection.model}
              onChangeText={(value) => setField('model', value)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              label="Número de serie"
              value={inspection.serialNumber}
              onChangeText={(value) => setField('serialNumber', value)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              label="Matrícula *"
              value={inspection.licensePlate}
              onChangeText={(value) => setField('licensePlate', value)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            <Text style={[styles.sectionTitle, styles.clientSection]}>Datos del Cliente</Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Cliente *"
              value={inspection.clientName}
              onChangeText={(value) => setField('clientName', value)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
          </View>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              style={styles.cancelButton}
              onPress={() => router.back()}
              icon="arrow-left"
              textColor={BRAND_COLORS.primaryBlue}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              style={styles.saveButton}
              onPress={handleContinue}
              disabled={isSaving}
              icon="arrow-right"
              contentStyle={styles.primaryButtonContent}
              buttonColor={isSaving ? BRAND_COLORS.grayMedium : BRAND_COLORS.primaryOrange}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 112,
  },
  headerGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  backButton: {
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
  typeTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  formCard: {
    margin: SPACING.lg,
    marginTop: -SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
  clientSection: {
    marginTop: SPACING.xl,
  },
  divider: {
    backgroundColor: BRAND_COLORS.lightOrange,
    height: 2,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.7,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: 'white',
  },
  inputOutline: {
    borderRadius: BORDER_RADIUS.lg,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.md + 2,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
    ...SHADOWS.soft,
  },
  cancelButton: {
    flex: 1,
    marginRight: SPACING.sm,
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.lg,
  },
  saveButton: {
    flex: 1,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  primaryButtonContent: {
    flexDirection: 'row-reverse',
  },
});
