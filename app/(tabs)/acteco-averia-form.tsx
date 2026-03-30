import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function ActecoAveriaFormScreen() {
  const params = useLocalSearchParams();
  const [averiaData, setAveriaData] = useState({
    avisoAveria: '',
    averiaDetectada: '',
    causaAveria: '',
  });

  // Cargar datos existentes en modo edición
  useEffect(() => {
    if (params.isEditing === 'true') {
      console.log('✏️ Cargando datos de avería para editar');
      setAveriaData({
        avisoAveria: (params.avisoAveria as string) || '',
        averiaDetectada: (params.averiaDetectada as string) || '',
        causaAveria: (params.causaAveria as string) || '',
      });
    }
  }, []);

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
            <Text style={styles.headerTitle}>Avería</Text>
            <Text style={styles.headerSubtitle}>Completa los datos de la avería</Text>
          </LinearGradient>

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
                outlineColor={BRAND_COLORS.grayMedium}
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
                outlineColor={BRAND_COLORS.grayMedium}
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
                outlineColor={BRAND_COLORS.grayMedium}
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
  averiaCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.error, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: SPACING.md },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  helpText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, fontStyle: 'italic', marginTop: SPACING.sm },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  backButton: { flex: 1, marginRight: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  continueButton: { flex: 1, marginLeft: SPACING.sm, borderRadius: BORDER_RADIUS.md },
});
