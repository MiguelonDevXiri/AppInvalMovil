import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

interface Material {
  id: string;
  name: string;
  quantity: string;
}

export default function ActecoSolucionMaterialesScreen() {
  const params = useLocalSearchParams();
  const [tieneSolucion, setTieneSolucion] = useState<boolean | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [materiales, setMateriales] = useState<Material[]>([
    { id: '1', name: '', quantity: '' }
  ]);

  const handleAddMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      name: '',
      quantity: ''
    };
    setMateriales([...materiales, newMaterial]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materiales.length === 1) {
      Alert.alert('Aviso', 'Debe haber al menos una fila de material');
      return;
    }
    setMateriales(materiales.filter(m => m.id !== id));
  };

  const handleMaterialChange = (id: string, field: 'name' | 'quantity', value: string) => {
    setMateriales(materiales.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleContinue = () => {
    if (tieneSolucion === null) {
      Alert.alert('Campo requerido', 'Indica si tiene solución (Sí/No)');
      return;
    }

    // Filtrar materiales que tengan al menos nombre o cantidad
    const materialesValidos = materiales.filter(m => 
      m.name.trim() !== '' || m.quantity.trim() !== ''
    );

    const nextParams = {
      ...params,
      tieneSolucion: tieneSolucion.toString(),
      observaciones: observaciones,
      materiales: JSON.stringify(materialesValidos),
    };

    router.push({
      pathname: '/(tabs)/acteco-final-form' as any,
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
              <Text style={styles.headerTitle}>Solución y Materiales</Text>
              <Text style={styles.headerSubtitle}>Indica si tiene solución y materiales necesarios</Text>
            </Card.Content>
          </Card>

          {/* Tiene Solución */}
          <Card style={styles.solucionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>¿Tiene solución?</Text>
              <Divider style={styles.divider} />

              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={tieneSolucion === true ? 'checked' : 'unchecked'}
                    onPress={() => setTieneSolucion(true)}
                    color={BRAND_COLORS.primaryBlue}
                  />
                  <Text style={styles.checkboxLabel}>Sí</Text>
                </View>

                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={tieneSolucion === false ? 'checked' : 'unchecked'}
                    onPress={() => setTieneSolucion(false)}
                    color={BRAND_COLORS.primaryBlue}
                  />
                  <Text style={styles.checkboxLabel}>No</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Observaciones */}
          <Card style={styles.observacionesCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Observaciones</Text>
              <Divider style={styles.divider} />

              <TextInput
                label="Observaciones sobre la solución"
                value={observaciones}
                onChangeText={setObservaciones}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={4}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Describe las observaciones o detalles de la solución"
              />
            </Card.Content>
          </Card>

          {/* Tabla de Materiales */}
          <Card style={styles.materialesCard}>
            <Card.Content>
              <View style={styles.materialesHeader}>
                <Text style={styles.sectionTitle}>Materiales</Text>
                <Button
                  mode="contained"
                  onPress={handleAddMaterial}
                  icon="plus"
                  compact
                  style={styles.addButton}
                  color={BRAND_COLORS.primaryBlue}
                >
                  Añadir
                </Button>
              </View>
              <Divider style={styles.divider} />

              {/* Encabezado de tabla */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.materialColumn]}>Material</Text>
                <Text style={[styles.tableHeaderText, styles.quantityColumn]}>Cantidad</Text>
                <View style={styles.actionColumn} />
              </View>

              {/* Filas de materiales */}
              {materiales.map((material, index) => (
                <View key={material.id} style={styles.tableRow}>
                  <TextInput
                    value={material.name}
                    onChangeText={(text) => handleMaterialChange(material.id, 'name', text)}
                    style={[styles.tableInput, styles.materialColumn]}
                    mode="outlined"
                    dense
                    placeholder="Nombre del material"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                  />

                  <TextInput
                    value={material.quantity}
                    onChangeText={(text) => handleMaterialChange(material.id, 'quantity', text)}
                    style={[styles.tableInput, styles.quantityColumn]}
                    mode="outlined"
                    dense
                    placeholder="Cant."
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                  />

                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleRemoveMaterial(material.id)}
                    style={styles.deleteButton}
                    iconColor="#F44336"
                  />
                </View>
              ))}

              <Text style={styles.helpText}>
                Añade los materiales necesarios para la reparación
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={styles.backButton}
              onPress={() => router.back()}
              icon="arrow-left"
            >
              Volver
            </Button>

            <Button 
              mode="contained" 
              style={styles.continueButton}
              onPress={handleContinue}
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
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },
  headerCard: { marginBottom: 16, backgroundColor: BRAND_COLORS.primaryBlue },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'white', textAlign: 'center', marginTop: 4 },
  solucionCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange },
  observacionesCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue },
  materialesCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#4CAF50' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, marginBottom: 8 },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: 16 },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { fontSize: 16, marginLeft: 8 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  materialesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addButton: { },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  tableHeaderText: { fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, fontSize: 14 },
  tableRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  tableInput: { backgroundColor: 'white', marginRight: 8 },
  materialColumn: { flex: 2 },
  quantityColumn: { flex: 1 },
  actionColumn: { width: 40 },
  deleteButton: { margin: 0 },
  helpText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 8 },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  backButton: { flex: 1, marginRight: 8, borderColor: BRAND_COLORS.primaryBlue },
  continueButton: { flex: 1, marginLeft: 8, backgroundColor: BRAND_COLORS.primaryOrange },
});