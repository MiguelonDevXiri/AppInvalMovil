import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { getCompanyName, getMyInspections, logout } from '../../utils/api';

// Machine type abbreviations and colors
const TYPE_ABBREV: Record<string, string> = {
  autocompactador: 'AC',
  'compactador-estatico': 'CE',
  'prensa-vertical': 'PV',
  volteador: 'VT',
  rotoprensa: 'RP',
  'caja-estatica': 'CJ',
  contenedor: 'CT',
  otros: 'OT',
};

const TYPE_COLORS: Record<string, string> = {
  AC: '#1e3a8a',
  CE: '#ca8a04',
  PV: '#16a34a',
  VT: '#7c3aed',
  RP: '#0891b2',
  CJ: '#dc2626',
  CT: '#ea580c',
  OT: '#6b7280',
};

export default function AutomisaHomeScreen() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [name, data] = await Promise.all([getCompanyName(), getMyInspections()]);
      setCompanyName(name);
      setInspections(data);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron cargar las inspecciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => { await logout(); router.replace('/automisa-login'); },
      },
    ]);
  };

  const handleSelect = (item: any) => {
    router.push({
      pathname: '/automisa-checklist',
      params: {
        woId: item.wo_id,
        machineType: item.machine_type,
        machineName: item.machine_name,
        licensePlate: item.license_plate,
        location: item.location || '',
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const abbrev = TYPE_ABBREV[item.machine_type] || item.machine_type?.substring(0, 2).toUpperCase() || '??';
    const color = TYPE_COLORS[abbrev] || BRAND_COLORS.grayDark;

    return (
      <TouchableOpacity onPress={() => handleSelect(item)} activeOpacity={0.7}>
        <Card style={[styles.card, item.is_overdue && styles.cardOverdue]}>
          <Card.Content style={styles.cardContent}>
            {item.is_overdue && (
              <Text style={styles.overdueLabel}>⏰ VENCIDA</Text>
            )}
            <View style={styles.cardRow}>
              <Chip
                style={[styles.typeBadge, { backgroundColor: color }]}
                textStyle={styles.typeBadgeText}
              >
                {abbrev}
              </Chip>
              <Text style={styles.plate}>{item.license_plate}</Text>
            </View>
            <Text style={styles.machineName}>{item.machine_name}</Text>
            {item.location ? <Text style={styles.location}>📍 {item.location}</Text> : null}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mis inspecciones de hoy</Text>
            {companyName ? <Text style={styles.companyName}>{companyName}</Text> : null}
          </View>
          <Button mode="text" onPress={handleLogout} icon="logout" textColor="white" compact>
            Salir
          </Button>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><Text>Cargando inspecciones...</Text></View>
      ) : (
        <FlatList
          data={inspections}
          keyExtractor={(item) => item.wo_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_COLORS.primaryBlue]} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No hay inspecciones asignadas para hoy</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: BRAND_COLORS.primaryBlue,
    padding: 16,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  companyName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
    elevation: 3,
    borderRadius: 12,
  },
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  overdueLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  cardContent: { padding: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { borderRadius: 6 },
  typeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  plate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.lightBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 1,
  },
  machineName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  location: { fontSize: 13, color: BRAND_COLORS.grayText },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: BRAND_COLORS.grayText, textAlign: 'center' },
});
