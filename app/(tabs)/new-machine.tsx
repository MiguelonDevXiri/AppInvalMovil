import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { getMachineById, saveMachine } from '../../utils/storage';

export default function NewMachineScreen() {
  const { machineTypeId, machineId, isEditing: isEditingParam } = useLocalSearchParams();
  const isEditing = isEditingParam === 'true';
  const [machineType, setMachineType] = useState(getMachineTypeById(machineTypeId?.toString() || 'otros'));

  const [machine, setMachine] = useState({
    id: Date.now().toString(),
    name: '',
    machineType: machineTypeId?.toString() || 'otros',
    brand: '',
    model: '',
    serialNumber: '',
    licensePlate: '',
    otNumber: '',
    clientName: '',
    clientType: '',
    location: '',
    reviewedBy: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState({
    brand: false,
    clientName: false,
    licensePlate: false,
  });

  useEffect(() => {
    const loadMachineForEdit = async () => {
      if (!isEditing) return;
      if (!machineId) {
        router.replace('/machine-list');
        return;
      }

      const existingMachine = await getMachineById(machineId.toString());
      if (!existingMachine) {
        alert('No se pudo cargar el renove para editar.');
        router.replace('/machine-list');
        return;
      }

      const nextTypeId = existingMachine.machineType || machineTypeId?.toString() || 'otros';
      setMachineType(getMachineTypeById(nextTypeId));
      setMachine({
        id: existingMachine.id,
        name: existingMachine.name || getMachineTypeById(nextTypeId).name,
        machineType: nextTypeId,
        brand: existingMachine.brand || '',
        model: existingMachine.model || '',
        serialNumber: existingMachine.serialNumber || '',
        licensePlate: existingMachine.licensePlate || '',
        otNumber: existingMachine.otNumber || '',
        clientName: existingMachine.clientName || '',
        clientType: existingMachine.clientType || '',
        location: existingMachine.location || '',
        reviewedBy: existingMachine.reviewedBy || '',
        date: existingMachine.date || new Date().toISOString().split('T')[0],
        notes: existingMachine.notes || '',
      });
    };

    if (isEditing) {
      loadMachineForEdit();
      return;
    }

    if (!machineTypeId) {
      router.replace('/machine-type-selection');
    } else {
      const nextMachineType = getMachineTypeById(machineTypeId.toString());
      setMachineType(nextMachineType);
      setMachine(prev => ({
        ...prev,
        machineType: machineTypeId.toString(),
        name: nextMachineType.name
      }));
    }
  }, [machineTypeId, machineId, isEditing]);

  const handleChange = (field: string, value: string) => {
    setMachine({...machine, [field]: value});
    if (field === 'brand' || field === 'clientName' || field === 'licensePlate') {
      setErrors({...errors, [field]: false});
    }
  };

  const validateForm = () => {
    const newErrors = {
      brand: !machine.brand.trim(),
      clientName: !machine.clientName.trim(),
      licensePlate: !machine.licensePlate.trim(),
    };
    setErrors(newErrors);
    return !newErrors.brand && !newErrors.clientName && !newErrors.licensePlate;
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      if (!validateForm()) return;
      if (isSaving) return;
      setIsSaving(true);

      const savedMachine = await saveMachine(machine);
      const savedMachineId = savedMachine.id;

      if (isEditing) {
        router.replace({
          pathname: '/report',
          params: { machineId: savedMachineId },
        });
        return;
      }

      const nextPath = machine.machineType === 'otros' ? '/comments' : '/checklist';

      router.push({
        pathname: '/safety-checklist-form',
        params: {
          machineId: savedMachineId,
          module: 'inspection',
          nextPath,
        },
      });
    } catch (error) {
      console.error('Error al guardar la máquina:', error);
      setIsSaving(false);
      alert('Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

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
            <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.typeTitle}>{isEditing ? 'Editar renove' : `Tipo: ${machineType.name}`}</Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>{isEditing ? 'Editar datos del Renove' : 'Datos de la Máquina'}</Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Marca *"
              value={machine.brand}
              onChangeText={(text) => handleChange('brand', text)}
              style={styles.input}
              mode="outlined"
              error={errors.brand}
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            {errors.brand && (
              <HelperText type="error">La marca es obligatoria</HelperText>
            )}

            <TextInput
              label="Modelo"
              value={machine.model}
              onChangeText={(text) => handleChange('model', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Número de serie"
              value={machine.serialNumber}
              onChangeText={(text) => handleChange('serialNumber', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Matrícula *"
              value={machine.licensePlate}
              onChangeText={(text) => handleChange('licensePlate', text)}
              style={styles.input}
              mode="outlined"
              error={errors.licensePlate}
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            {errors.licensePlate && (
              <HelperText type="error">La matrícula es obligatoria</HelperText>
            )}

            <Text style={[styles.sectionTitle, styles.clientSection]}>Datos del Cliente</Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Cliente *"
              value={machine.clientName}
              onChangeText={(text) => handleChange('clientName', text)}
              style={styles.input}
              mode="outlined"
              error={errors.clientName}
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />
            {errors.clientName && (
              <HelperText type="error">El nombre del cliente es obligatorio</HelperText>
            )}

            <TextInput
              label="Tipo de Cliente"
              value={machine.clientType}
              onChangeText={(text) => handleChange('clientType', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              placeholder="Empresa, Particular, etc."
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Ubicación"
              value={machine.location}
              onChangeText={(text) => handleChange('location', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={BRAND_COLORS.primaryBlue}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Revisión realizada por"
              value={machine.reviewedBy}
              onChangeText={(text) => handleChange('reviewedBy', text)}
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
              onPress={handleSave}
              disabled={isSaving}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={isSaving ? BRAND_COLORS.grayMedium : BRAND_COLORS.primaryOrange}
            >
              {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Continuar'}
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {isSaving && (
        <Modal visible transparent animationType="fade">
          <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center'}}>
            <View style={{backgroundColor:'white', borderRadius:16, padding:32, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:12, elevation:8}}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
              <Text style={{marginTop:16, fontSize:16, fontWeight:'600', color:BRAND_COLORS.primaryBlue}}>Guardando datos...</Text>
              <Text style={{marginTop:8, fontSize:13, color:BRAND_COLORS.grayText}}>Preparando el checklist</Text>
            </View>
          </View>
        </Modal>
      )}
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
  scrollViewContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  typeTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    letterSpacing: 0.3,
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
});
