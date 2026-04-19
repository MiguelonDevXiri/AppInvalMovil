import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

interface Material {
  id: string;
  name: string;
  quantity: string;
  reference: string;
}

export default function AveriaMaterialesFormScreen() {
  const params = useLocalSearchParams();
  const [notes, setNotes] = useState('');
  const [materiales, setMateriales] = useState<Material[]>([
    { id: '1', name: '', quantity: '', reference: '' },
  ]);

  const getParamString = (value: unknown): string => {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : '';
    }

    return typeof value === 'string' ? value : '';
  };

  useEffect(() => {
    const loadNotes = async () => {
      const paramNotes = getParamString(params.notes);
      if (paramNotes) {
        setNotes(paramNotes);
      } else {
        try {
          const savedDraftNotes = await AsyncStorage.getItem('averia_draft_notes');
          if (savedDraftNotes) {
            setNotes(savedDraftNotes);
          }
        } catch (error) {
          console.error('No se pudo recuperar el borrador de notas:', error);
        }
      }

      if (params.materiales) {
        try {
          const parsed = JSON.parse(params.materiales as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMateriales(parsed);
          }
        } catch (e) {}
      }
    };

    loadNotes();
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

  const handleChange = (id: string, field: keyof Material, value: string) => {
    setMateriales(materiales.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleContinue = async () => {
    const validMateriales = materiales.filter(m => m.name.trim() !== '' || m.quantity.trim() !== '');

    try {
      await AsyncStorage.setItem('averia_draft_notes', notes);
    } catch (error) {
      console.error('No se pudo guardar el borrador de notas:', error);
    }

    router.push({
      pathname: '/(tabs)/averia-final-form' as any,
      params: {
        ...params,
        notes,
        materiales: JSON.stringify(validMateriales),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Materiales Utilizados</Text>
            <Text style={styles.headerSubtitle}>Registra los materiales gastados</Text>
          </LinearGradient>

          <Card style={styles.notesCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📝 Notas / Observaciones</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Observaciones de la intervención"
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Añade notas o detalles que deban verse en web y PDF"
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor="#7c3aed"
              />
            </Card.Content>
          </Card>

          <Card style={styles.materialesCard}>
            <Card.Content>
              <View style={styles.materialesHeader}>
                <Text style={styles.sectionTitle}>🧰 Materiales</Text>
                <Button mode="contained" onPress={handleAddMaterial} icon="plus" compact style={styles.addButton} buttonColor="#7c3aed">Añadir</Button>
              </View>
              <Divider style={styles.divider} />

              {/* Encabezado tabla */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Material</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cant.</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ref./Obs.</Text>
                <View style={{ width: 40 }} />
              </View>

              {materiales.map((material) => (
                <View key={material.id} style={styles.tableRow}>
                  <TextInput
                    value={material.name}
                    onChangeText={(t) => handleChange(material.id, 'name', t)}
                    style={[styles.tableInput, { flex: 2 }]}
                    mode="outlined"
                    dense
                    placeholder="Material"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor="#7c3aed"
                  />
                  <TextInput
                    value={material.quantity}
                    onChangeText={(t) => handleChange(material.id, 'quantity', t)}
                    style={[styles.tableInput, { flex: 1 }]}
                    mode="outlined"
                    dense
                    placeholder="Cant."
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor="#7c3aed"
                  />
                  <TextInput
                    value={material.reference}
                    onChangeText={(t) => handleChange(material.id, 'reference', t)}
                    style={[styles.tableInput, { flex: 1.5 }]}
                    mode="outlined"
                    dense
                    placeholder="Referencia"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor="#7c3aed"
                  />
                  <IconButton icon="delete" size={20} onPress={() => handleRemoveMaterial(material.id)} iconColor={BRAND_COLORS.error} style={{ margin: 0 }} />
                </View>
              ))}

              <Text style={styles.helpText}>Añade los materiales utilizados en la reparación</Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
            <Button mode="contained" style={styles.navBtn} onPress={handleContinue} icon="arrow-right" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor="#7c3aed">Continuar</Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  notesCard: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue, ...SHADOWS.small },
  notesInput: { backgroundColor: 'white' },
  materialesCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.success, ...SHADOWS.small },
  materialesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed' },
  addButton: { borderRadius: BORDER_RADIUS.md },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md },
  tableHeader: { flexDirection: 'row', marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  tableHeaderText: { fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', fontSize: TYPOGRAPHY.sizes.sm },
  tableRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' },
  tableInput: { backgroundColor: 'white', marginRight: SPACING.xs },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
