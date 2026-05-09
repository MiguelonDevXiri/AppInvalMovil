import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { ChecklistData, ChecklistMaterial, getChecklistByMachineId, getMachineById, Machine, saveChecklist } from '../../utils/storage';

const buildEmptyMaterial = (): ChecklistMaterial => ({
  id: Date.now().toString(),
  name: '',
  quantity: '',
  reference: '',
  available: null,
});

export default function ChecklistMaterialsScreen() {
  const { machineId, returnTo: returnToParam } = useLocalSearchParams();
  const returnTo = typeof returnToParam === 'string' ? returnToParam : Array.isArray(returnToParam) ? returnToParam[0] : undefined;
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [materiales, setMateriales] = useState<ChecklistMaterial[]>([buildEmptyMaterial()]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        setLoading(true);

        const [foundMachine, foundChecklist] = await Promise.all([
          getMachineById(machineId.toString()),
          getChecklistByMachineId(machineId.toString()),
        ]);

        setMachine(foundMachine);
        setChecklistData(foundChecklist);

        if (foundChecklist?.materials && foundChecklist.materials.length > 0) {
          setMateriales(foundChecklist.materials);
        }
      } catch (error) {
        console.error('Error al cargar materiales del checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [machineId]);

  const handleAddMaterial = () => {
    setMateriales((current) => [...current, buildEmptyMaterial()]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materiales.length === 1) {
      setMateriales([buildEmptyMaterial()]);
      return;
    }

    setMateriales((current) => current.filter((material) => material.id !== id));
  };

  const handleChange = (id: string, field: keyof ChecklistMaterial, value: string | boolean | null) => {
    setMateriales((current) => current.map((material) => (
      material.id === id ? { ...material, [field]: value } : material
    )));
  };

  const handleContinue = async () => {
    try {
      if (!machineId || !checklistData) {
        Alert.alert('Error', 'No se ha encontrado el checklist de esta inspección.');
        return;
      }

      setIsSaving(true);

      const validMateriales = materiales.filter((material) => {
        return material.name.trim() !== '' || material.quantity.trim() !== '' || material.reference.trim() !== '';
      });

      const nextChecklist: ChecklistData = {
        ...checklistData,
        machineId: machineId.toString(),
        materials: validMateriales,
      };

      await saveChecklist(nextChecklist);
      if (returnTo) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace({ pathname: returnTo as any, params: { machineId: machineId.toString() } });
        }
        return;
      }
      router.push({ pathname: '/comments', params: { machineId: machineId.toString() } });
    } catch (error) {
      console.error('Error al guardar materiales del checklist:', error);
      Alert.alert('Error', 'No se pudieron guardar los materiales. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>Cargando materiales...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="toolbox-outline" size={26} color="rgba(255,255,255,0.7)" />
            <Text style={styles.headerTitle}>Materiales opcionales</Text>
            <Text style={styles.headerSubtitle}>Añade materiales usados o pendientes de pedir</Text>
          </LinearGradient>

          {machine && (
            <Card style={styles.infoCard}>
              <Card.Content style={styles.infoContent}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={BRAND_COLORS.primaryBlue} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoName}>{machine.name}</Text>
                  <Text style={styles.infoDetail}>Cliente: {machine.clientName}</Text>
                  <Text style={styles.infoDetail}>Este apartado es opcional</Text>
                </View>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.materialesCard}>
            <Card.Content>
              <View style={styles.materialesHeader}>
                <Text style={styles.sectionTitle}>🧰 Materiales</Text>
                <Button mode="contained" onPress={handleAddMaterial} icon="plus" compact style={styles.addButton} buttonColor={BRAND_COLORS.primaryBlue}>
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

                  {materiales.map((material) => (
                    <View key={material.id} style={styles.tableRow}>
                      <TextInput
                        value={material.name}
                        onChangeText={(text) => handleChange(material.id, 'name', text)}
                        style={[styles.tableInput, styles.materialColumn]}
                        mode="outlined"
                        dense
                        placeholder="Material"
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={BRAND_COLORS.primaryBlue}
                      />

                      <TextInput
                        value={material.quantity}
                        onChangeText={(text) => handleChange(material.id, 'quantity', text)}
                        style={[styles.tableInput, styles.quantityColumn]}
                        mode="outlined"
                        dense
                        placeholder="Cant."
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={BRAND_COLORS.primaryBlue}
                      />

                      <TextInput
                        value={material.reference}
                        onChangeText={(text) => handleChange(material.id, 'reference', text)}
                        style={[styles.tableInput, styles.referenceColumn]}
                        mode="outlined"
                        dense
                        placeholder="Referencia"
                        outlineColor={BRAND_COLORS.grayMedium}
                        activeOutlineColor={BRAND_COLORS.primaryBlue}
                      />

                      <View style={styles.availableColumn}>
                        <View style={styles.toggleGroup}>
                          <TouchableOpacity
                            style={[styles.toggleButton, material.available === true && styles.toggleButtonYes]}
                            onPress={() => handleChange(material.id, 'available', material.available === true ? null : true)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.toggleText, material.available === true && styles.toggleTextActive]}>Sí</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.toggleButton, material.available === false && styles.toggleButtonNo]}
                            onPress={() => handleChange(material.id, 'available', material.available === false ? null : false)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.toggleText, material.available === false && styles.toggleTextActive]}>No</Text>
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

              <Text style={styles.helpText}>Puedes dejar este apartado vacío si no hay materiales que añadir.</Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={isSaving}
              style={styles.navButton}
              icon="arrow-left"
              textColor={BRAND_COLORS.primaryBlue}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={handleContinue}
              disabled={isSaving}
              style={styles.navButton}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={BRAND_COLORS.primaryBlue}
              loading={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Continuar'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingText: {
    color: BRAND_COLORS.grayText,
  },
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
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
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  infoCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
  },
  infoDetail: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    marginTop: 2,
  },
  materialesCard: {
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    ...SHADOWS.small,
  },
  materialesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
  },
  addButton: {
    borderRadius: BORDER_RADIUS.md,
  },
  divider: {
    backgroundColor: BRAND_COLORS.lightOrange,
    height: 1,
    marginBottom: SPACING.md,
  },
  tableContainer: {
    minWidth: 640,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  tableHeaderText: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tableInput: {
    backgroundColor: 'white',
    marginRight: SPACING.xs,
  },
  materialColumn: {
    flex: 2,
  },
  quantityColumn: {
    flex: 1,
  },
  referenceColumn: {
    flex: 1.5,
  },
  availableColumn: {
    flex: 1.1,
    justifyContent: 'center',
  },
  actionColumn: {
    width: 44,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  toggleButton: {
    minWidth: 42,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  toggleButtonYes: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  toggleButtonNo: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  toggleText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  toggleTextActive: {
    color: '#0f172a',
  },
  deleteButton: {
    margin: 0,
  },
  helpText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
  navButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
});
