import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { migrateFromAsyncStorage } from '../../utils/storage';
import { migrateActecoFromAsyncStorage } from '../../utils/actecoInspectionStorage';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: string;
  colors: readonly string[];
  onPress: () => void;
}

const ActionCard = React.memo(({ title, subtitle, icon, colors, onPress }: ActionCardProps) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.cardWrapper}>
    <LinearGradient
      colors={colors as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={styles.actionCard}
    >
      <View style={styles.cardIconContainer}>
        <MaterialCommunityIcons name={icon as any} size={28} color="white" />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.cardChevron}>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.8)" />
      </View>
    </LinearGradient>
  </TouchableOpacity>
));

export default function HomeScreen() {
  const [technicianName, setTechnicianName] = useState<string | null>(null);
  const [technicianRole, setTechnicianRole] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const technicianJson = await AsyncStorage.getItem('current_technician');
      if (!technicianJson) {
        router.replace('/login');
        return;
      }
      const technician = JSON.parse(technicianJson);
      setTechnicianName(technician.name);
      setTechnicianRole(technician.role || null);

      // Ejecutar migración si no se ha hecho
      const migrated = await AsyncStorage.getItem('migration_completed');
      if (!migrated) {
        await migrateFromAsyncStorage();
        await migrateActecoFromAsyncStorage();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/login');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleNavNewInspection = useCallback(() => {
    router.push('/machine-type-selection');
  }, []);

  const handleNavMachineList = useCallback(() => {
    router.push('/machine-list');
  }, []);

  const handleNavExitMachineList = useCallback(() => {
    router.push('/exit-machine-list' as any);
  }, []);

  const handleNavExitManagement = useCallback(() => {
    router.push('/exit-management' as any);
  }, []);

  const handleNavActecoForm = useCallback(() => {
    router.push('/acteco-report-form');
  }, []);

  const handleNavActecoList = useCallback(() => {
    router.push('/acteco-inspections-list');
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('current_technician');
            router.replace('/login');
          },
        },
      ]
    );
  };

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
          <Text style={styles.heroSubtitle}>Sistema de Gestión de Inspecciones</Text>
          <View style={styles.heroDivider} />
          {technicianName && (
            <View style={styles.technicianRow}>
              <MaterialCommunityIcons name="account-circle" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={styles.technicianText}>{technicianName}</Text>
            </View>
          )}
          <Text style={styles.heroDate}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabel}>Inspecciones INVAL</Text>
          <View style={styles.sectionLine} />
        </View>

        <ActionCard
          title="Nueva Inspección"
          subtitle="Iniciar inspección de maquinaria"
          icon="plus-circle-outline"
          colors={GRADIENTS.secondary}
          onPress={handleNavNewInspection}
        />

        <ActionCard
          title="Entradas Registradas"
          subtitle="Ver historial e informes"
          icon="format-list-bulleted-square"
          colors={GRADIENTS.primary}
          onPress={handleNavMachineList}
        />

        <ActionCard
          title="Inspección de Salida"
          subtitle="Revisar máquinas inspeccionadas"
          icon="clipboard-check-outline"
          colors={['#16a34a', '#4ade80']}
          onPress={handleNavExitMachineList}
        />

        <ActionCard
          title="Gestionar Salidas"
          subtitle="Editar o eliminar revisiones"
          icon="file-document-edit-outline"
          colors={['#0891b2', '#22d3ee']}
          onPress={handleNavExitManagement}
        />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabel}>Inspecciones URGENCIAS</Text>
          <View style={styles.sectionLine} />
        </View>

        <ActionCard
          title="Inspección Urgencias"
          subtitle="Informes de intervención urgente"
          icon="clipboard-check-outline"
          colors={GRADIENTS.success}
          onPress={handleNavActecoForm}
        />

        <ActionCard
          title="Inspecciones Registradas"
          subtitle="Consultar informes guardados"
          icon="file-document-multiple-outline"
          colors={['#0891b2', '#22d3ee']}
          onPress={handleNavActecoList}
        />

        <View style={styles.footer} />
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
  heroSection: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    borderBottomLeftRadius: BORDER_RADIUS.xl + 8,
    borderBottomRightRadius: BORDER_RADIUS.xl + 8,
  },
  logo: {
    width: 220,
    height: 88,
    marginBottom: SPACING.lg,
    tintColor: 'white',
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
    letterSpacing: 0.3,
  },
  heroDivider: {
    width: 48,
    height: 3,
    backgroundColor: BRAND_COLORS.secondaryOrange,
    borderRadius: BORDER_RADIUS.full,
    marginVertical: SPACING.lg,
    opacity: 0.9,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
  },
  technicianText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: 'rgba(255,255,255,0.95)',
  },
  heroDate: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
    marginTop: SPACING.xs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logoutText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl + 4,
    marginBottom: SPACING.md,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND_COLORS.grayMedium,
    opacity: 0.6,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: SPACING.md,
  },
  cardWrapper: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.card,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.xl,
    minHeight: 84,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  cardChevron: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  footer: {
    height: SPACING.lg,
  },
});
