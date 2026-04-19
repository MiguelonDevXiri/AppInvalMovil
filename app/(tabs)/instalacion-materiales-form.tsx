import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';

interface Material {
  id: string;
  name: string;
  quantity: string;
  reference: string;
}

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const INSTALLATION_BORDER = '#99f6e4';

export default function InstalacionMaterialesFormScreen() {
  const params = useLocalSearchParams();
  const [materiales, setMateriales] = useState<Material[]>([
    { id: '1', name: '', quantity: '', reference: '' },
  ]);

  useEffect(() => {
    if (!params.materiales) return;

    try {
      const parsed = JSON.parse(params.materiales as string);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMateriales(parsed);
      }
    } catch (error) {
      console.error('No se pudieron cargar los materiales de instalación:', error);
    }
  }, []);

  const handleAddMaterial = () => {
    setMateriales((current) => [
      ...current,
      { id: Date.now().toString(), name: '', quantity: '', reference: '' },
    ]);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materiales.length === 1) {
      Alert.alert('Aviso', 'Debe haber al menos una fila de material.');
      return;
    }

    setMateriales((current) => current.filter((material) => material.id !== id));
  };

  const handleChange = (id: string, field: keyof Material, value: string) => {
    setMateriales((current) =>
      current.map((material) => (material.id === id ? { ...material, [field]: value } : material))
    );
  };

  const handleContinue = () => {
    const validMateriales = materiales.filter(
      (material) => material.name.trim() !== '' || material.quantity.trim() !== ''
    );

    router.push({
      pathname: '/(tabs)/instalacion-final-form' as any,
      params: {
        ...params,
        materiales: JSON.stringify(validMateriales),
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
            colors={INSTALLATION_GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Materiales Utilizados</Text>
            <Text style={styles.headerSubtitle}>Registra los materiales usados en la instalación</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>🧰 Materiales</Text>
                <Button
                  mode="contained"
                  onPress={handleAddMaterial}
                  icon="plus"
                  compact
                  style={styles.addButton}
                  buttonColor={INSTALLATION_PRIMARY}
                >
                  Añadir
                </Button>
              </View>
              <Divider style={styles.divider} />

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Material</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cant.</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ref./Obs.</Text>
                <View style={styles.actionsSpacer} />
              </View>

              {materiales.map((material) => (
                <View key={material.id} style={styles.tableRow}>
                  <TextInput
                    value={material.name}
                    onChangeText={(text) => handleChange(material.id, 'name', text)}
                    style={[styles.tableInput, { flex: 2 }]}
                    mode="outlined"
                    dense
                    placeholder="Material"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={INSTALLATION_PRIMARY}
                  />
                  <TextInput
                    value={material.quantity}
                    onChangeText={(text) => handleChange(material.id, 'quantity', text)}
                    style={[styles.tableInput, { flex: 1 }]}
                    mode="outlined"
                    dense
                    placeholder="Cant."
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={INSTALLATION_PRIMARY}
                  />
                  <TextInput
                    value={material.reference}
                    onChangeText={(text) => handleChange(material.id, 'reference', text)}
                    style={[styles.tableInput, { flex: 1.5 }]}
                    mode="outlined"
                    dense
                    placeholder="Referencia"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={INSTALLATION_PRIMARY}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleRemoveMaterial(material.id)}
                    iconColor={BRAND_COLORS.error}
                    style={styles.deleteIcon}
                  />
                </View>
              ))}

              <Text style={styles.helpText}>
                Puedes dejar materiales vacíos si la instalación no ha requerido consumibles.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor={INSTALLATION_PRIMARY}>
              Volver
            </Button>
            <Button
              mode="contained"
              style={styles.navBtn}
              onPress={handleContinue}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={INSTALLATION_PRIMARY}
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
    backgroundColor: INSTALLATION_PRIMARY,
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
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  backBtn: {
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
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: SPACING.xs,
  },
  card: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: INSTALLATION_PRIMARY,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
  },
  addButton: {
    borderRadius: BORDER_RADIUS.md,
  },
  divider: {
    backgroundColor: INSTALLATION_BORDER,
    height: 1,
    marginBottom: SPACING.md,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  tableHeaderText: {
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  actionsSpacer: {
    width: 40,
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
  deleteIcon: {
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
  navBtn: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
});
