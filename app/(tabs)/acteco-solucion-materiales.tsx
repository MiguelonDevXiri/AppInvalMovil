import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Checkbox, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

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

  // Cargar datos existentes en modo edición
  useEffect(() => {
    if (params.isEditing === 'true') {
      console.log('✏️ Cargando datos de solución/materiales para editar');
      if (params.tieneSolucion === 'true') {
        setTieneSolucion(true);
      } else if (params.tieneSolucion === 'false') {
        setTieneSolucion(false);
      }
      if (params.observaciones) {
        setObservaciones(params.observaciones as string);
      }
      if (params.materiales) {
        try {
          const parsed = JSON.parse(params.materiales as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMateriales(parsed);
          }
        } catch (e) {
          console.error('Error al parsear materiales:', e);
        }
      }
    }
  }, []);

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
            <Text style={styles.headerTitle}>Solución y Materiales</Text>
            <Text style={styles.headerSubtitle}>Indica si tiene solución y materiales necesarios</Text>
          </LinearGradient>

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
                outlineColor={BRAND_COLORS.grayMedium}
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
                  buttonColor={BRAND_COLORS.primaryBlue}
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
              {materiales.map((material) => (
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
                    iconColor={BRAND_COLORS.error}
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
              textColor={BRAND_COLORS.primaryBlue}
            >
              Volver
            </Button>

            <Button
              mode="contained"
              style={styles.continueButton}
              onPress={handleContinue}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
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
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  solucionCard: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  observacionesCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue, ...SHADOWS.small },
  materialesCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.success, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: SPACING.md },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: SPACING.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { fontSize: TYPOGRAPHY.sizes.md, marginLeft: SPACING.sm },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  materialesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addButton: { borderRadius: BORDER_RADIUS.md },
  tableHeader: { flexDirection: 'row', marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  tableHeaderText: { fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, fontSize: TYPOGRAPHY.sizes.sm },
  tableRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' },
  tableInput: { backgroundColor: 'white', marginRight: SPACING.sm },
  materialColumn: { flex: 2 },
  quantityColumn: { flex: 1 },
  actionColumn: { width: 40 },
  deleteButton: { margin: 0 },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  backButton: { flex: 1, marginRight: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  continueButton: { flex: 1, marginLeft: SPACING.sm, borderRadius: BORDER_RADIUS.md },
});
