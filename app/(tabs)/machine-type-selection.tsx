import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { MACHINE_TYPES } from '../../data/machineTypes';

const MACHINE_ICONS: Record<string, string> = {
  autocompactador: 'truck-cargo-container',
  volteador: 'rotate-3d-variant',
  rotoprensa: 'cog-sync-outline',
  'compactador-estatico': 'archive-outline',
  contenedor: 'package-variant-closed',
  'caja-estatica': 'cube-outline',
  'prensa-vertical': 'arrow-collapse-down',
  rollopacker: 'roller-skate',
  otros: 'dots-horizontal-circle-outline',
};

export default function MachineTypeSelectionScreen() {
  const handleTypeSelect = (typeId: string) => {
    router.push({
      pathname: '/new-machine',
      params: { machineTypeId: typeId }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="cog-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Selecciona el Tipo de Máquina</Text>
          <Text style={styles.headerSubtitle}>Elige el tipo para iniciar la inspección</Text>
        </LinearGradient>

        <View style={styles.typesGrid}>
          {MACHINE_TYPES.map((type, index) => (
            <TouchableOpacity
              key={type.id}
              style={styles.typeCard}
              onPress={() => handleTypeSelect(type.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardInner}>
                <View style={[styles.iconCircle, { backgroundColor: index % 2 === 0 ? BRAND_COLORS.lightBlue : BRAND_COLORS.lightOrange }]}>
                  <MaterialCommunityIcons
                    name={(MACHINE_ICONS[type.id] || 'cog') as any}
                    size={28}
                    color={index % 2 === 0 ? BRAND_COLORS.primaryBlue : BRAND_COLORS.primaryOrange}
                  />
                </View>
                <Text style={styles.typeTitle}>{type.name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={BRAND_COLORS.grayText} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={BRAND_COLORS.primaryBlue} />
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
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
    paddingBottom: SPACING.xl,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  typesGrid: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  typeCard: {
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'white',
    ...SHADOWS.small,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  typeTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: '#1e293b',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.primaryBlue,
    marginLeft: SPACING.xs,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
});
