import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { deleteMantenimientoInspection, getMantenimientoInspections, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

export default function MantenimientoInspectionsListScreen() {
  const [items, setItems] = useState<MantenimientoInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => { setLoading(true); setItems(await getMantenimientoInspections()); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (inspection: MantenimientoInspection) => Alert.alert('Eliminar mantenimiento', `¿Eliminar el mantenimiento de ${inspection.clientName}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => { const ok = await deleteMantenimientoInspection(inspection.id); if (ok) load(); else Alert.alert('Error', 'No se pudo eliminar.'); } },
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={['#0f2f57', '#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Mantenimientos registrados</Text>
        <Text style={styles.headerSubtitle}>Listado, ver, editar o borrar</Text>
      </LinearGradient>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#e87a20" /></View> : (
        <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name="tools" size={48} color="#94a3b8" /><Text style={styles.emptyText}>No hay mantenimientos registrados</Text><Button mode="contained" onPress={() => router.push('/mantenimiento-machine-type-selection' as any)}>Crear mantenimiento</Button></View>} renderItem={({ item }) => <Card style={styles.card}><Card.Content>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.title}>{item.clientName || 'Sin cliente'}</Text><Text style={styles.subtitle}>{getMachineTypeById(item.machineType).name} · {item.date}</Text><Text style={styles.meta}>{item.location || 'Sin ubicación'} · {item.reviewedBy || 'Sin técnico'}</Text></View><MaterialCommunityIcons name="tools" size={28} color="#e87a20" /></View>
          <View style={styles.actions}><Button compact mode="outlined" onPress={() => router.push({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: item.id } })}>Ver</Button><Button compact mode="outlined" onPress={() => router.push({ pathname: '/mantenimiento-form' as any, params: { inspectionId: item.id } })}>Editar</Button><Button compact textColor="#ef4444" onPress={() => handleDelete(item)}>Borrar</Button></View>
        </Card.Content></Card>} />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:BRAND_COLORS.surface}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)'}, center:{flex:1,alignItems:'center',justifyContent:'center'}, list:{padding:SPACING.md,paddingBottom:SPACING.xl}, card:{marginBottom:SPACING.md,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, row:{flexDirection:'row',alignItems:'center'}, title:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f172a'}, subtitle:{color:'#334155',marginTop:4}, meta:{color:'#64748b',marginTop:2}, actions:{flexDirection:'row',justifyContent:'flex-end',gap:8,marginTop:12}, empty:{alignItems:'center',justifyContent:'center',padding:SPACING.xl,gap:12}, emptyText:{color:'#64748b',fontSize:16,textAlign:'center'} });
