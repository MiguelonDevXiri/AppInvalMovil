import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

interface InterventionEntry {
  id: string;
  description: string;
  photos: string[];
  proposedSolution?: string;
}

export default function SaicaSolucionFormScreen() {
  const params = useLocalSearchParams();
  const [interventions, setInterventions] = useState<InterventionEntry[]>([]);

  useEffect(() => {
    if (params.interventions) {
      try {
        const parsed = JSON.parse(params.interventions as string);
        if (Array.isArray(parsed)) {
          setInterventions(parsed.map((item) => ({ ...item, proposedSolution: item.proposedSolution || '' })));
        }
      } catch (e) {
        console.error('Error al parsear intervenciones Saica:', e);
      }
    }
  }, []);

  const handleSolutionChange = (id: string, value: string) => {
    setInterventions((current) => current.map((item) => item.id === id ? { ...item, proposedSolution: value } : item));
  };

  const handleContinue = () => {
    if (interventions.length === 0) {
      Alert.alert('Sin intervenciones', 'No se han encontrado intervenciones necesarias.');
      return;
    }

    const missing = interventions.some((item) => !item.proposedSolution?.trim());
    if (missing) {
      Alert.alert('Campo requerido', 'Añade una propuesta de solución para cada intervención.');
      return;
    }

    router.push({
      pathname: '/(tabs)/saica-materiales-form' as any,
      params: {
        ...params,
        interventions: JSON.stringify(interventions),
        solucionDescription: interventions.map((item, index) => `Intervención ${index + 1}: ${item.proposedSolution || ''}`).join('\n\n'),
        solucionPhotos: JSON.stringify([]),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Propuesta de Solución</Text>
            <Text style={styles.headerSubtitle}>Una propuesta por cada intervención necesaria</Text>
          </LinearGradient>

          {interventions.map((intervention, index) => (
            <Card key={intervention.id || index} style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>🛠️ Intervención {index + 1}</Text>
                <Divider style={styles.divider} />
                <Text style={styles.descriptionLabel}>Intervención necesaria</Text>
                <Text style={styles.descriptionText}>{intervention.description || '—'}</Text>
                <TextInput
                  label="Propuesta de solución *"
                  value={intervention.proposedSolution || ''}
                  onChangeText={(value) => handleSolutionChange(intervention.id, value)}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={5}
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor="#7c3aed"
                  placeholder="Describe la propuesta de solución para esta intervención"
                />
              </Card.Content>
            </Card>
          ))}
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
  card: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md },
  descriptionLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.grayText, marginBottom: SPACING.xs },
  descriptionText: { color: '#1e293b', marginBottom: SPACING.md },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
