import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { type ReparacionMaterial } from '../../utils/reparacionesInspectionStorage';

const ACCENT = '#b45309';
const GRADIENT = ['#92400e', '#d97706', '#fbbf24'] as const;

const buildEmptyMaterial = (): ReparacionMaterial => ({
  id: Date.now().toString(),
  name: '',
  quantity: '',
  reference: '',
  available: null,
});

export default function ReparacionFinalFormScreen() {
  const params = useLocalSearchParams();
  const [materials, setMaterials] = useState<ReparacionMaterial[]>([buildEmptyMaterial()]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (typeof params.materials === 'string') {
      try {
        const parsed = JSON.parse(params.materials) as ReparacionMaterial[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMaterials(parsed);
        }
      } catch (error) {
        console.error('Error al recuperar materiales de reparación:', error);
      }
    }

    if (typeof params.notes === 'string') {
      setNotes(params.notes);
    }
  }, [params.materials, params.notes]);

  const handleAddMaterial = () => {
    setMaterials((current) => [...current, buildEmptyMaterial()]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materials.length === 1) {
      setMaterials([buildEmptyMaterial()]);
      return;
    }

    setMaterials((current) => current.filter((material) => material.id !== id));
  };

  const handleChange = (
    id: string,
    field: keyof ReparacionMaterial,
    value: string | boolean | null
  ) => {
    setMaterials((current) =>
      current.map((material) => (material.id === id ? { ...material, [field]: value } : material))
    );
  };

  const handleFinish = () => {
    const validMaterials = materials.filter(
      (material) =>
        material.name.trim() !== '' ||
        material.quantity.trim() !== '' ||
        material.reference.trim() !== '' ||
        material.available !== null
    );

    router.push({
      pathname: '/(tabs)/reparacion-report-view' as any,
      params: {
        ...params,
        materials: JSON.stringify(validMaterials),
        notes,
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
            colors={GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="toolbox-outline" size={26} color="rgba(255,255,255,0.75)" />
            <Text style={styles.headerTitle}>Cierre de reparaciones</Text>
            <Text style={styles.headerSubtitle}>Materiales y observaciones de la primera parte</Text>
          </LinearGradient>

          <Card style={styles.materialsCard}>
            <Card.Content>
              <View style={styles.materialsHeader}>
                <Text style={styles.sectionTitle}>🧰 Materiales</Text>
                <Button
                  mode="contained"
                  onPress={handleAddMaterial}
                  icon="plus"
                  compact
                  style={styles.addButton}
                  buttonColor={ACCENT}
                >
                  Añadir
                </Button>
              </View>
              <Divider style={styles.divider} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.materialColumn]}>Material</Text>
                    <Text style={[styles.tableHeaderText, styles.quantityColumn]}>Cant.</Text>
                    <Text style={[styles.tableHeaderText, styles.referenceColumn]}>Ref.</Text>
                    <Text style={[styles.tableHeaderText, styles.availableColumn]}>¿Hay?</Text>
                    <View style={styles.actionColumn} />
                  </View>

                  {materials.map((material) => (
                    <View key={material.id} style={styles.tableRow}>
                      <TextInput
                        value={material.name}
                        onChangeText={(value) => handleChange(material.id, 'name', value)}
                        style={[styles.tableInput, styles.materialColumn]}
                        mode="outlined"
                        dense
                        placeholder="Material"
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={ACCENT}
                      />

                      <TextInput
                        value={material.quantity}
                        onChangeText={(value) => handleChange(material.id, 'quantity', value)}
                        style={[styles.tableInput, styles.quantityColumn]}
                        mode="outlined"
                        dense
                        placeholder="Cant."
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={ACCENT}
                      />

                      <TextInput
                        value={material.reference}
                        onChangeText={(value) => handleChange(material.id, 'reference', value)}
                        style={[styles.tableInput, styles.referenceColumn]}
                        mode="outlined"
                        dense
                        placeholder="Referencia"
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={ACCENT}
                      />

                      <View style={styles.availableColumn}>
                        <View style={styles.toggleGroup}>
                          <TouchableOpacity
                            style={[styles.toggleButton, material.available === true && styles.toggleButtonYes]}
                            onPress={() =>
                              handleChange(
                                material.id,
                                'available',
                                material.available === true ? null : true
                              )
                            }
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.toggleText, material.available === true && styles.toggleTextActive]}>
                              Sí
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.toggleButton, material.available === false && styles.toggleButtonNo]}
                            onPress={() =>
                              handleChange(
                                material.id,
                                'available',
                                material.available === false ? null : false
                              )
                            }
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.toggleText, material.available === false && styles.toggleTextActive]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleRemoveMaterial(material.id)}
                        iconColor={BRAND_COLORS.error}
                        style={styles.deleteButton}
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.helpText}>
                Puedes dejar el bloque vacío si no se han usado materiales en esta primera parte.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.notesCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📝 Observaciones</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Notas de cierre"
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                mode="outlined"
                multiline
                numberOfLines={5}
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={ACCENT}
                placeholder="Ej.: materiales pendientes, detalles del trabajo o siguientes pasos"
              />
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={false}
              style={styles.navButton}
              icon="arrow-left"
              textColor={ACCENT}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={handleFinish}
              style={styles.navButton}
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={ACCENT}
            >
              Finalizar parte
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ACCENT },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
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
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  materialsCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  notesCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  materialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: ACCENT,
  },
  addButton: { borderRadius: BORDER_RADIUS.md },
  divider: { marginVertical: SPACING.md },
  tableContainer: { minWidth: 620 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  tableHeaderText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayText,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  tableInput: { backgroundColor: 'white' },
  materialColumn: { flex: 2.2 },
  quantityColumn: { flex: 1 },
  referenceColumn: { flex: 1.4 },
  availableColumn: { flex: 1.2, justifyContent: 'center' },
  actionColumn: { width: 40 },
  toggleGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.xs + 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  toggleButtonYes: { backgroundColor: BRAND_COLORS.success },
  toggleButtonNo: { backgroundColor: BRAND_COLORS.error },
  toggleText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  toggleTextActive: { color: 'white' },
  deleteButton: { margin: 0 },
  helpText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  notesInput: { backgroundColor: 'white' },
  buttonSafeArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
  },
  buttonContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  navButton: { flex: 1, borderRadius: BORDER_RADIUS.md },
});
