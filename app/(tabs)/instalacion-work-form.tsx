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
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const INSTALLATION_BORDER = '#99f6e4';

export default function InstalacionWorkFormScreen() {
  const params = useLocalSearchParams();
  const [workDescription, setWorkDescription] = useState('');

  useEffect(() => {
    if (params.workDescription) {
      setWorkDescription(params.workDescription as string);
    }
  }, []);

  const handleContinue = () => {
    if (!workDescription.trim()) {
      Alert.alert('Campo requerido', 'Describe la faena a realizar antes de continuar.');
      return;
    }

    router.push({
      pathname: '/(tabs)/instalacion-materiales-form' as any,
      params: {
        ...params,
        workDescription,
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
            <Text style={styles.headerTitle}>Faena a Realizar</Text>
            <Text style={styles.headerSubtitle}>Describe el trabajo previsto para la instalación</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>🛠️ Trabajo / Faena</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Faena a realizar *"
                value={workDescription}
                onChangeText={setWorkDescription}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={7}
                outlineColor={BRAND_COLORS.grayMedium}
                activeOutlineColor={INSTALLATION_PRIMARY}
                placeholder="Describe la instalación, montaje o actuación que se va a realizar"
              />
              <Text style={styles.helpText}>
                Este texto se mostrará en el resumen, en el listado y en el PDF final.
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
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: INSTALLATION_PRIMARY,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.sm,
  },
  divider: {
    backgroundColor: INSTALLATION_BORDER,
    height: 1,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: 'white',
  },
  helpText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
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
