import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { isLoggedIn, login } from '../../utils/api';

export default function AutomisaLoginScreen() {
  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, skip to home
    isLoggedIn().then((loggedIn) => {
      if (loggedIn) {
        router.replace('/automisa-home');
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!companyCode.trim() || !password.trim()) {
      Alert.alert('Campos obligatorios', 'Introduce el código de empresa y la contraseña');
      return;
    }

    setSubmitting(true);
    const result = await login(companyCode.trim(), password.trim());
    setSubmitting(false);

    if (result.success) {
      router.replace('/automisa-home');
    } else {
      Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.title}>Automisa</Text>
              <Text style={styles.subtitle}>Inspecciones de Maquinaria</Text>
            </Card.Content>
          </Card>

          <View style={styles.form}>
            <TextInput
              label="Código de empresa"
              value={companyCode}
              onChangeText={setCompanyCode}
              mode="outlined"
              style={styles.input}
              autoCapitalize="characters"
              left={<TextInput.Icon icon="domain" />}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              style={styles.loginButton}
              onPress={handleLogin}
              loading={submitting}
              disabled={submitting}
              icon="login"
              contentStyle={styles.loginButtonContent}
            >
              Entrar
            </Button>
          </View>

          <Button
            mode="text"
            onPress={() => router.back()}
            style={styles.backButton}
            icon="arrow-left"
          >
            Volver al menú
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  headerCard: {
    backgroundColor: BRAND_COLORS.primaryBlue,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  form: { gap: 12 },
  input: { backgroundColor: 'white' },
  loginButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
  loginButtonContent: { height: 52 },
  backButton: { marginTop: 16, alignSelf: 'center' },
});
