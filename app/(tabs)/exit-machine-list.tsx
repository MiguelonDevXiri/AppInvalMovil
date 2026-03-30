import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachines, Machine } from '../../utils/storage';

export default function ExitMachineListScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const allMachines = await getMachines();
      // Solo máquinas con entrada hecha pero sin salida
      const entradaMachines = allMachines.filter(
        (m) => m.inspectionStatus !== 'revisada'
      );
      setMachines(entradaMachines);
      setFilteredMachines(entradaMachines);
    } catch (error) {
      console.error('Error al cargar máquinas:', error);
      Alert.alert('Error', 'No se pudieron cargar las máquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMachines();
    }, [])
  );

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMachines(machines);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredMachines(
      machines.filter(
        (m) =>
          m.clientName.toLowerCase().includes(q) ||
          (m.licensePlate && m.licensePlate.toLowerCase().includes(q)) ||
          (m.brand && m.brand.toLowerCase().includes(q)) ||
          m.name.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, machines]);

  const handleMachinePress = (machine: Machine) => {
    router.push({
      pathname: '/exit-inspection' as any,
      params: { machineId: machine.id },
    });
  };

  const renderItem = ({ item }: { item: Machine }) => (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => handleMachinePress(item)} activeOpacity={0.85}>
        <Card.Content style={styles.cardContent}>
          <Text style={styles.machineName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.brand && (
            <Text style={styles.detail}>Marca: {item.brand}</Text>
          )}
          <Text style={styles.detail}>Cliente: {item.clientName}</Text>
          {item.licensePlate && (
            <Text style={styles.detail}>Matrícula: {item.licensePlate}</Text>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString('es-ES')}
            </Text>
            <Chip
              style={[styles.chip, { backgroundColor: '#fff7ed' }]}
              textStyle={[styles.chipText, { color: '#ea580c' }]}
            >
              Entrada
            </Chip>
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#16a34a', '#4ade80'] as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inspección de Salida</Text>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por cliente, matrícula, marca..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Cargando máquinas...</Text>
          </View>
        ) : filteredMachines.length > 0 ? (
          <FlatList
            data={filteredMachines}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={56}
              color={BRAND_COLORS.grayMedium}
            />
            <Text style={styles.emptyText}>
              No hay máquinas pendientes de inspección de salida.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16a34a',
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  backButton: {
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
    marginLeft: 44,
    letterSpacing: 0.2,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'white',
    ...SHADOWS.soft,
  },
  searchbar: {
    backgroundColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 0,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
  },
  searchInput: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    marginBottom: SPACING.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardContent: {
    paddingVertical: SPACING.md,
  },
  machineName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 4,
  },
  detail: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  date: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
  },
  chip: {
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
