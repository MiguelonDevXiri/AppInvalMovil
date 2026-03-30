import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface Technician {
  id: string;
  name: string;
  pin: string;
  role: string;
}

export default function LoginScreen() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar técnicos:', error);
        Alert.alert('Error', 'No se pudieron cargar los técnicos');
        return;
      }

      setTechnicians(data || []);
    } catch (error) {
      console.error('Error al cargar técnicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedTechnician) {
      Alert.alert('Error', 'Selecciona un técnico');
      return;
    }

    if (!pin) {
      Alert.alert('Error', 'Introduce el PIN');
      return;
    }

    setLoggingIn(true);

    try {
      if (pin !== selectedTechnician.pin) {
        Alert.alert('Error', 'PIN incorrecto');
        setPin('');
        return;
      }

      // Guardar técnico logueado
      await AsyncStorage.setItem(
        'current_technician',
        JSON.stringify({
          id: selectedTechnician.id,
          name: selectedTechnician.name,
          role: selectedTechnician.role,
        })
      );

      router.replace('/');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LinearGradient
          colors={GRADIENTS.hero as unknown as [string, string, ...string[]]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <LinearGradient
          colors={GRADIENTS.hero as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <Image
            source={require('../../assets/images/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Iniciar Sesión</Text>
          <Text style={styles.heroSubtitle}>Selecciona tu perfil de técnico</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Técnico</Text>

          {technicians.map((tech) => (
            <TouchableOpacity
              key={tech.id}
              style={[
                styles.technicianCard,
                selectedTechnician?.id === tech.id && styles.technicianCardSelected,
              ]}
              onPress={() => {
                setSelectedTechnician(tech);
                setPin('');
              }}
              activeOpacity={0.85}
            >
              <View style={[
                styles.technicianIcon,
                selectedTechnician?.id === tech.id && styles.technicianIconSelected,
              ]}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color={selectedTechnician?.id === tech.id ? 'white' : BRAND_COLORS.primaryBlue}
                />
              </View>
              <Text style={[
                styles.technicianName,
                selectedTechnician?.id === tech.id && styles.technicianNameSelected,
              ]}>
                {tech.name}
              </Text>
              {selectedTechnician?.id === tech.id && (
                <MaterialCommunityIcons name="check-circle" size={24} color={BRAND_COLORS.primaryBlue} />
              )}
            </TouchableOpacity>
          ))}

          {selectedTechnician && (
            <View style={styles.pinSection}>
              <Text style={styles.sectionTitle}>PIN de acceso</Text>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={setPin}
                placeholder="Introduce tu PIN"
                placeholderTextColor={BRAND_COLORS.grayText}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.loginButton,
              (!selectedTechnician || !pin || loggingIn) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!selectedTechnician || !pin || loggingIn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                (!selectedTechnician || !pin || loggingIn)
                  ? ['#94a3b8', '#94a3b8'] as unknown as [string, string, ...string[]]
                  : GRADIENTS.primary as unknown as [string, string, ...string[]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              {loggingIn ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Entrar</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  container: {
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  heroSection: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    borderBottomLeftRadius: BORDER_RADIUS.xl + 8,
    borderBottomRightRadius: BORDER_RADIUS.xl + 8,
  },
  logo: {
    width: 240,
    height: 96,
    marginBottom: SPACING.lg,
    tintColor: 'white',
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.sizes.title,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    marginTop: SPACING.sm,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: 'rgba(255,255,255,0.75)',
    marginTop: SPACING.xs,
    letterSpacing: 0.2,
  },
  formContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayDark,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    letterSpacing: 0.2,
  },
  technicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm + 2,
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayLight,
    ...SHADOWS.soft,
  },
  technicianCardSelected: {
    borderColor: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    ...SHADOWS.card,
  },
  technicianIcon: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: BRAND_COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  technicianIconSelected: {
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  technicianName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: BRAND_COLORS.grayDark,
  },
  technicianNameSelected: {
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  pinSection: {
    marginTop: SPACING.lg,
  },
  pinInput: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    fontSize: TYPOGRAPHY.sizes.xl,
    textAlign: 'center',
    letterSpacing: 10,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.soft,
  },
  loginButton: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 6,
    gap: SPACING.sm,
  },
  loginButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    letterSpacing: 0.5,
  },
});
