import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

interface Material {
  id: string;
  name: string;
  quantity: string;
  reference: string;
}

export default function AveriaMaterialesFormScreen() {
  const params = useLocalSearchParams();
  const [materiales, setMateriales] = useState<Material[]>([
    { id: '1', name: '', quantity: '', reference: '' },
  ]);

  useEffect(() => {
    if (params.isEditing === 'true' && params.materiales) {
      try {
        const parsed = JSON.parse(params.materiales as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMateriales(parsed);
        }
      } catch (e) {
        console.error('Error al parsear materiales:', e);
      }
    }
  }, []);

  const handleAddMaterial = () => {
    setMateriales([...materiales, { id: Date.now().toString(), name: '', quantity: '', reference: '' }]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materiales.length === 1) {
      Alert.alert('Aviso', 'Debe haber al menos una fila de material');
      return;
    }
    setMateriales(materiales.filter(m => m.id !== id));
  };

  const handleMaterialChange = (id: string, field: keyof Omit<Material, 'id'>, value: string) => {
    setMateriales(materiales.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleContinue = () => {
    const materialesValidos = materiales.filter(m =>
      m.name.trim() !== '' || m.quantity.trim() !== '' || m.reference.trim() !== ''
    );

    const nextParams = {
      ...params,
      materiales: JSON.stringify(materialesValidos),
    };

    router.push({
      pathname: '/(tabs)/averia-final-form' as any,
      params: nextParams,
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Materiales Utilizados</Text>
            <Text style={styles.headerSubtitle}>Registra los materiales empleados</Text>
          </LinearGradient>

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
                <Text style={[styles.tableHeaderText, styles.nameColumn]}>Material</Text>
                <Text style={[styles.tableHeaderText, styles.qtyColumn]}>Cant.</Text>
                <Text style={[styles.tableHeaderText, styles.refColumn]}>Referencia</Text>
                <View style={styles.actionColumn} />
              </View>

              {/* Filas */}
              {materiales.map((material) => (
                <View key={material.id} style={styles.tableRow}>
                  <TextInput
                    value={material.name}
                    onChangeText={(text) => handleMaterialChange(material.id, 'name', text)}
                    style={[styles.tableInput, styles.nameColumn]}
                    mode="outlined"
                    dense
                    placeholder="Nombre"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                  />
                  <TextInput
                    value={material.quantity}
                    onChangeText={(text) => handleMaterialChange(material.id, 'quantity', text)}
                    style={[styles.tableInput, styles.qtyColumn]}
                    mode="outlined"
                    dense
                    placeholder="Cant."
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                  />
                  <TextInput
                    value={material.reference}
                    onChangeText={(text) => handleMaterialChange(material.id, 'reference', text)}
                    style={[styles.tableInput, styles.refColumn]}
                    mode="outlined"
                    dense
                    placeholder="Ref."
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
              style={styles.navButton}
              onPress={() => router.back()}
              icon="arrow-left"
              textColor={BRAND_COLORS.primaryBlue}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              style={styles.navButton}
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
  backArrow: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  materialesCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.success, ...SHADOWS.small },
  materialesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  addButton: { borderRadius: BORDER_RADIUS.md },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: SPACING.md },
  tableHeader: { flexDirection: 'row', marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  tableHeaderText: { fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, fontSize: TYPOGRAPHY.sizes.sm },
  tableRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' },
  tableInput: { backgroundColor: 'white', marginRight: SPACING.xs },
  nameColumn: { flex: 2 },
  qtyColumn: { flex: 0.8 },
  refColumn: { flex: 1.2 },
  actionColumn: { width: 40 },
  deleteButton: { margin: 0 },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navButton: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
