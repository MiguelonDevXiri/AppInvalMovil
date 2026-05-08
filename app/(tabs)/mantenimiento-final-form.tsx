import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { generateUUID, inspectionToParams, paramsToInspection, type MantenimientoInspection, type MantenimientoMaterial } from '../../utils/mantenimientoStorage';

const buildEmptyMaterial = (): MantenimientoMaterial => ({
  id: generateUUID(),
  name: '',
  quantity: '',
  reference: '',
  available: null,
});

export default function MantenimientoFinalFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => {
    const current = paramsToInspection(params);
    return { ...current, materials: current.materials.length > 0 ? current.materials : [buildEmptyMaterial()] };
  });
  const saving = false;

  const checkedCount = useMemo(() => inspection.checklist.filter((item) => item.status).length, [inspection.checklist]);
  const photoCount = useMemo(() => Object.values(inspection.generalPhotos).filter(Boolean).length, [inspection.generalPhotos]);
  const validMaterialCount = useMemo(() => inspection.materials.filter((material) => material.name.trim() || material.quantity.trim() || material.reference.trim()).length, [inspection.materials]);

  const setField = (field: keyof MantenimientoInspection, value: string) => setInspection((prev) => ({ ...prev, [field]: value }));
  const addMaterial = () => setInspection((prev) => ({ ...prev, materials: [...prev.materials, buildEmptyMaterial()] }));
  const updateMaterial = <K extends keyof MantenimientoMaterial>(id: string, field: K, value: MantenimientoMaterial[K]) => setInspection((prev) => ({ ...prev, materials: prev.materials.map((material) => material.id === id ? { ...material, [field]: value } : material) }));
  const removeMaterial = (id: string) => setInspection((prev) => ({ ...prev, materials: prev.materials.length === 1 ? [buildEmptyMaterial()] : prev.materials.filter((material) => material.id !== id) }));

  const handleSave = () => {
    if (!inspection.brand.trim() || !inspection.clientName.trim() || !inspection.licensePlate.trim()) {
      Alert.alert('Campos obligatorios', 'Marca, cliente y matrícula son obligatorios.');
      return;
    }
    const validMaterials = inspection.materials.filter((material) => material.name.trim() || material.quantity.trim() || material.reference.trim());
    const next = { ...inspection, materials: validMaterials };
    router.push({ pathname: '/(tabs)/mantenimiento-general-photos-form' as any, params: inspectionToParams(next) });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={GRADIENTS.primary as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="toolbox-outline" size={26} color="rgba(255,255,255,0.7)" />
            <Text style={styles.headerTitle}>Materiales y observaciones</Text>
            <Text style={styles.headerSubtitle}>Añade materiales y observaciones</Text>
          </LinearGradient>

          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={BRAND_COLORS.primaryBlue} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoName}>{inspection.brand || inspection.machineType || 'Mantenimiento'}</Text>
                <Text style={styles.infoDetail}>Cliente: {inspection.clientName || '—'} · Matrícula: {inspection.licensePlate || '—'}</Text>
                <Text style={styles.infoDetail}>{checkedCount}/{inspection.checklist.length} revisados · {photoCount} fotos generales · {validMaterialCount} materiales</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.materialesCard}>
            <Card.Content>
              <View style={styles.materialesHeader}>
                <Text style={styles.sectionTitle}>🧰 Materiales</Text>
                <Button mode="contained" onPress={addMaterial} icon="plus" compact style={styles.addButton} buttonColor={BRAND_COLORS.primaryBlue}>Añadir</Button>
              </View>
              <Divider style={styles.divider} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.materialColumn]}>Material</Text>
                    <Text style={[styles.tableHeaderText, styles.quantityColumn]}>Cant.</Text>
                    <Text style={[styles.tableHeaderText, styles.referenceColumn]}>Referencia</Text>
                    <View style={styles.actionColumn} />
                  </View>

                  {inspection.materials.map((material) => (
                    <View key={material.id} style={styles.tableRow}>
                      <TextInput value={material.name} onChangeText={(text) => updateMaterial(material.id, 'name', text)} style={[styles.tableInput, styles.materialColumn]} mode="outlined" dense placeholder="Material" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor={BRAND_COLORS.primaryBlue} />
                      <TextInput value={material.quantity} onChangeText={(text) => updateMaterial(material.id, 'quantity', text)} style={[styles.tableInput, styles.quantityColumn]} mode="outlined" dense placeholder="Cant." outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor={BRAND_COLORS.primaryBlue} />
                      <TextInput value={material.reference} onChangeText={(text) => updateMaterial(material.id, 'reference', text)} style={[styles.tableInput, styles.referenceColumn]} mode="outlined" dense placeholder="Referencia" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor={BRAND_COLORS.primaryBlue} />
                      <IconButton icon="delete" size={20} onPress={() => removeMaterial(material.id)} iconColor={BRAND_COLORS.error} style={styles.deleteButton} />
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.helpText}>Puedes dejar este apartado vacío si no hay materiales que añadir.</Text>
            </Card.Content>
          </Card>

          <Card style={styles.notesCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Notas y observaciones</Text>
              <Divider style={styles.divider} />
              <TextInput label="Observaciones" value={inspection.notes} onChangeText={(value) => setField('notes', value)} mode="outlined" multiline numberOfLines={5} style={styles.notesInput} outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor={BRAND_COLORS.primaryBlue} />
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => router.push({ pathname: '/(tabs)/mantenimiento-checklist-form' as any, params: inspectionToParams(inspection) })} disabled={saving} style={styles.navButton} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue}>Volver</Button>
            <Button mode="contained" onPress={handleSave} style={styles.navButton} icon="arrow-right" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.primaryOrange}>Continuar</Button>
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
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginTop: SPACING.sm },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: TYPOGRAPHY.sizes.sm, textAlign: 'center', marginTop: SPACING.xs },
  infoCard: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  infoContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  infoTextContainer: { flex: 1 },
  infoName: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue },
  infoDetail: { fontSize: TYPOGRAPHY.sizes.sm, color: BRAND_COLORS.grayText, marginTop: 2 },
  materialesCard: { marginHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  notesCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  materialesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue },
  addButton: { borderRadius: BORDER_RADIUS.md },
  divider: { backgroundColor: BRAND_COLORS.lightOrange, height: 1, marginBottom: SPACING.md, marginTop: SPACING.sm },
  tableContainer: { minWidth: 560 },
  tableHeader: { flexDirection: 'row', marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  tableHeaderText: { fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, fontSize: TYPOGRAPHY.sizes.sm },
  tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  tableInput: { backgroundColor: 'white', marginRight: SPACING.xs },
  materialColumn: { flex: 2 },
  quantityColumn: { flex: 1 },
  referenceColumn: { flex: 1.5 },
  actionColumn: { width: 44 },
  deleteButton: { margin: 0 },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm },
  notesInput: { backgroundColor: 'white' },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navButton: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
