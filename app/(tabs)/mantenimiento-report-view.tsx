import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { shareMantenimientoReport } from '../../utils/mantenimientoReportGenerator';
import { getMantenimientoInspectionById, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');
const statusText = (status: string) => status === 'ok' ? 'Bien' : status === 'fail' ? 'Mal' : status === 'na' ? 'N/A' : status === 'cant' ? 'No se puede' : 'Sin revisar';

export default function MantenimientoReportViewScreen() {
  const params = useLocalSearchParams();
  const inspectionId = getParamString(params.inspectionId);
  const [inspection, setInspection] = useState<MantenimientoInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => { (async () => { const loaded = inspectionId ? await getMantenimientoInspectionById(inspectionId) : null; setInspection(loaded); setLoading(false); })(); }, [inspectionId]);
  const share = async () => { if (!inspection) return; setSharing(true); await shareMantenimientoReport(inspection); setSharing(false); };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} /><Text>Cargando informe...</Text></SafeAreaView>;
  if (!inspection) return <SafeAreaView style={styles.center}><Text>No se encontró el mantenimiento.</Text><Button onPress={() => router.back()}>Volver</Button></SafeAreaView>;
  const fails = inspection.checklist.filter((i) => i.status === 'fail' || i.status === 'cant').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0f2f57', '#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Informe mantenimiento</Text><Text style={styles.headerSubtitle}>{inspection.clientName} · {inspection.date}</Text>
        </LinearGradient>
        <Card style={styles.card}><Card.Content><Text style={styles.title}>{inspection.clientName}</Text><Text style={styles.meta}>{getMachineTypeById(inspection.machineType).name} · {inspection.location}</Text><Text style={styles.meta}>Técnico: {inspection.reviewedBy}</Text><Text style={styles.meta}>Matrícula/Serie: {inspection.licensePlate || inspection.serialNumber || '—'}</Text></Card.Content></Card>
        <View style={styles.summaryRow}><View style={styles.summaryBox}><Text style={styles.summaryValue}>{inspection.checklist.filter((i) => i.status).length}</Text><Text style={styles.summaryLabel}>Revisados</Text></View><View style={styles.summaryBox}><Text style={[styles.summaryValue, { color: '#f97316' }]}>{fails}</Text><Text style={styles.summaryLabel}>Incidencias</Text></View><View style={styles.summaryBox}><Text style={styles.summaryValue}>{Object.values(inspection.generalPhotos).filter(Boolean).length}</Text><Text style={styles.summaryLabel}>Fotos</Text></View></View>
        <Card style={styles.card}><Card.Content><Text style={styles.sectionTitle}>Checklist</Text>{inspection.checklist.map((item) => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.text}</Text><Text style={styles.itemStatus}>{statusText(item.status)}{item.comment ? ` · ${item.comment}` : ''}</Text></View>)}</Card.Content></Card>
        <Card style={styles.card}><Card.Content><Text style={styles.sectionTitle}>Materiales</Text>{inspection.materials.length ? inspection.materials.map((m) => <Text key={m.id} style={styles.meta}>• {m.quantity} {m.name} {m.reference ? `(${m.reference})` : ''}</Text>) : <Text style={styles.meta}>Sin materiales.</Text>}</Card.Content></Card>
        <Card style={styles.card}><Card.Content><Text style={styles.sectionTitle}>Observaciones</Text><Text style={styles.meta}>{inspection.notes || 'Sin observaciones.'}</Text></Card.Content></Card>
        <View style={styles.actions}><Button mode="outlined" icon="pencil" onPress={() => router.push({ pathname: '/mantenimiento-form' as any, params: { inspectionId: inspection.id } })}>Editar</Button><Button mode="contained" icon="file-pdf-box" loading={sharing} onPress={share}>Generar PDF</Button></View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:BRAND_COLORS.surface}, center:{flex:1,alignItems:'center',justifyContent:'center'}, scroll:{flex:1}, content:{paddingBottom:SPACING.xl}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)'}, card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, title:{fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f172a'}, meta:{color:'#475569',marginTop:4}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57',marginBottom:8}, summaryRow:{flexDirection:'row',gap:8,paddingHorizontal:SPACING.md,marginTop:SPACING.md}, summaryBox:{flex:1,backgroundColor:'white',borderRadius:BORDER_RADIUS.lg,padding:SPACING.md,alignItems:'center',...SHADOWS.small}, summaryValue:{fontSize:24,fontWeight:'800',color:BRAND_COLORS.primaryBlue}, summaryLabel:{fontSize:12,color:'#64748b'}, item:{borderTopWidth:1,borderTopColor:'#e2e8f0',paddingVertical:8}, itemTitle:{fontWeight:'600',color:'#0f172a'}, itemStatus:{color:'#64748b',marginTop:2}, actions:{flexDirection:'row',gap:10,padding:SPACING.md} });
