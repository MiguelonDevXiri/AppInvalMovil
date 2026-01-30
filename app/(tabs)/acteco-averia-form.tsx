import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

export default function ActecoAveriaFormScreen() {
  const params = useLocalSearchParams();
  const [averiaData, setAveriaData] = useState({
    avisoAveria: '',
    averiaDetectada: '',
    causaAveria: '',
  });

  const handleChange = (field: string, value: string) => {
    setAveriaData({ ...averiaData, [field]: value });
  };

  const handleContinue = () => {
    // Determinar si hay avería (si algún campo tiene contenido)
    const hasAveria = averiaData.avisoAveria.trim() !== '' || 
                      averiaData.averiaDetectada.trim() !== '' || 
                      averiaData.causaAveria.trim() !== '';

    const nextParams = {
      ...params,
      hasAveria: hasAveria.toString(),
      avisoAveria: averiaData.avisoAveria,
      averiaDetectada: averiaData.averiaDetectada,
      causaAveria: averiaData.causaAveria,
    };

    if (hasAveria) {
      router.push({
        pathname: '/(tabs)/acteco-averia-photo' as any,
        params: nextParams
      });
    } else {
      router.push({
        pathname: '/(tabs)/acteco-final-form' as any,
        params: nextParams
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.headerTitle}>Avería</Text>
              <Text style={styles.headerSubtitle}>Completa los datos de la avería</Text>
            </Card.Content>
          </Card>

          <Card style={styles.averiaCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Datos de la Avería</Text>
              <Divider style={styles.divider} />

              <TextInput
                label="Aviso de avería"
                value={averiaData.avisoAveria}
                onChangeText={(text) => handleChange('avisoAveria', text)}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Describe el aviso recibido"
              />

              <TextInput
                label="Avería detectada"
                value={averiaData.averiaDetectada}
                onChangeText={(text) => handleChange('averiaDetectada', text)}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={4}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Describe la avería encontrada"
              />

              <TextInput
                label="Causa de la avería"
                value={averiaData.causaAveria}
                onChangeText={(text) => handleChange('causaAveria', text)}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
                outlineColor={BRAND_COLORS.primaryBlue}
                activeOutlineColor={BRAND_COLORS.primaryBlue}
                placeholder="Indica la causa probable"
              />

              <Text style={styles.helpText}>
                Nota: Si no hay avería, deja los campos vacíos y continúa.
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
  averiaCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F44336' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, marginBottom: 8 },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  helpText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 8 },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  backButton: { flex: 1, marginRight: 8, borderColor: BRAND_COLORS.primaryBlue },
  continueButton: { flex: 1, marginLeft: 8, backgroundColor: BRAND_COLORS.primaryOrange },
});