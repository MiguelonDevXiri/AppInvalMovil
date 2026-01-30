import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { saveMachine } from '../../utils/storage';

export default function NewMachineScreen() {
  const { machineTypeId } = useLocalSearchParams();
  const [machineType, setMachineType] = useState(getMachineTypeById(machineTypeId?.toString() || 'otros'));

  const [machine, setMachine] = useState({
    id: Date.now().toString(),
    name: '',
    machineType: machineTypeId?.toString() || 'otros',
    brand: '',
    model: '',
    serialNumber: '',
    licensePlate: '',
    clientName: '',
    clientType: '',
    location: '',
    reviewedBy: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  const [errors, setErrors] = useState({
    brand: false,
    clientName: false
  });
  
  useEffect(() => {
    if (!machineTypeId) {
      console.log("No hay tipo de máquina seleccionado, redirigiendo a selección");
      router.replace('/machine-type-selection');
    } else {
      console.log(`Tipo de máquina seleccionado: ${machineTypeId}`);
      setMachineType(getMachineTypeById(machineTypeId.toString()));
      setMachine(prev => ({
        ...prev,
        machineType: machineTypeId.toString(),
        name: getMachineTypeById(machineTypeId.toString()).name
      }));
    }
  }, [machineTypeId]);

  const handleChange = (field: string, value: string) => {
    setMachine({...machine, [field]: value});
    
    if (field === 'brand' || field === 'clientName') {
      setErrors({...errors, [field]: false});
    }
  };

  const validateForm = () => {
    const newErrors = {
      brand: !machine.brand.trim(),
      clientName: !machine.clientName.trim()
    };
    
    setErrors(newErrors);
    return !newErrors.brand && !newErrors.clientName;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }
      
      console.log("Guardando máquina:", machine);
      const savedMachine = await saveMachine(machine);
      console.log("Máquina guardada con ID:", savedMachine.id);
      
      if (machine.machineType === 'otros') {
        console.log("Máquina tipo 'otros', navegando a comentarios");
        router.push({
          pathname: '/comments',
          params: { machineId: machine.id }
        });
      } else {
        console.log("Navegando a checklist");
        router.push({
          pathname: '/checklist',
          params: { machineId: machine.id }
        });
      }
    } catch (error) {
      console.error('Error al guardar la máquina:', error);
      alert('Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.typeTitle}>
                Tipo: {machineType.name}
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.formCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Datos de la Máquina</Text>
              <Divider style={styles.divider} />
              
              <TextInput
                label="Marca *"
                value={machine.brand}
                onChangeText={(text) => handleChange('brand', text)}
                style={styles.input}
                mode="outlined"
                error={errors.brand}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
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
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />
              
              <TextInput
                label="Número de serie"
                value={machine.serialNumber}
                onChangeText={(text) => handleChange('serialNumber', text)}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />
              
              <TextInput
                label="Matrícula"
                value={machine.licensePlate}
                onChangeText={(text) => handleChange('licensePlate', text)}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />
              
              <Text style={[styles.sectionTitle, styles.clientSection]}>Datos del Cliente</Text>
              <Divider style={styles.divider} />
              
              <TextInput
                label="Cliente *"
                value={machine.clientName}
                onChangeText={(text) => handleChange('clientName', text)}
                style={styles.input}
                mode="outlined"
                error={errors.clientName}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
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
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Empresa, Particular, etc."
              />
              
              <TextInput
                label="Ubicación"
                value={machine.location}
                onChangeText={(text) => handleChange('location', text)}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />
              
              <TextInput
                label="Revisión realizada por"
                value={machine.reviewedBy}
                onChangeText={(text) => handleChange('reviewedBy', text)}
                style={styles.input}
                mode="outlined"
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
              />
            </Card.Content>
          </Card>
        </ScrollView>
        
        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={styles.cancelButton}
              onPress={() => router.back()}
              icon="arrow-left"
            >
              Cancelar
            </Button>
            
            <Button 
              mode="contained" 
              style={styles.saveButton}
              onPress={handleSave}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
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
  scrollViewContent: {
    padding: 16,
    paddingBottom: 16,
  },
  headerCard: {
    marginBottom: 8,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  formCard: {
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 8,
  },
  clientSection: {
    marginTop: 16,
  },
  divider: {
    backgroundColor: BRAND_COLORS.primaryOrange,
    height: 1,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: BRAND_COLORS.primaryBlue,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
});