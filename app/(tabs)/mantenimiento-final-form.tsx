import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { generateUUID, inspectionToParams, paramsToInspection, saveMantenimientoInspection, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const GRADIENT = ['#0f2f57', '#173f73', '#e87a20'] as const;

export default function MantenimientoFinalFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection(params));
  const [saving, setSaving] = useState(false);
  const checkedCount = useMemo(() => inspection.checklist.filter((item) => item.status).length, [inspection.checklist]);
  const photoCount = useMemo(() => Object.values(inspection.generalPhotos).filter(Boolean).length, [inspection.generalPhotos]);

  const setField = (field: keyof MantenimientoInspection, value: string) => setInspection((prev) => ({ ...prev, [field]: value }));
  const addMaterial = () => setInspection((prev) => ({ ...prev, materials: [...prev.materials, { id: generateUUID(), name: '', quantity: '', reference: '' }] }));
  const updateMaterial = (index: number, field: 'name' | 'quantity' | 'reference', value: string) => setInspection((prev) => ({ ...prev, materials: prev.materials.map((m, idx) => idx === index ? { ...m, [field]: value } : m) }));
  const removeMaterial = (index: number) => setInspection((prev) => ({ ...prev, materials: prev.materials.filter((_, idx) => idx !== index) }));

  const handleSave = async () => {
    if (!inspection.clientName.trim() || !inspection.location.trim() || !inspection.reviewedBy.trim()) {
      Alert.alert('Campos obligatorios', 'Cliente, ubicación y técnico son obligatorios.');
      return;
    }
    try {
      setSaving(true);
      const saved = await saveMantenimientoInspection(inspection);
      router.replace({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: saved.id } });
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error);
      Alert.alert('Error', 'No se pudo guardar el mantenimiento. Revisa las tablas SQL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={GRADIENT as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Resumen mantenimiento</Text>
            <Text style={styles.headerSubtitle}>Paso final · Comentarios, materiales y PDF</Text>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}><Text style={styles.summaryValue}>{checkedCount}</Text><Text style={styles.summaryLabel}>Revisados</Text></View>
            <View style={styles.summaryBox}><Text style={styles.summaryValue}>{photoCount}</Text><Text style={styles.summaryLabel}>Fotos generales</Text></View>
            <View style={styles.summaryBox}><Text style={styles.summaryValue}>{inspection.materials.length}</Text><Text style={styles.summaryLabel}>Materiales</Text></View>
          </View>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>Datos principales</Text><Divider style={styles.divider} />
            <Text style={styles.meta}>{inspection.clientName} · {inspection.location}</Text>
            <Text style={styles.meta}>{inspection.brand || 'Sin marca'} {inspection.model || ''} · {inspection.licensePlate || inspection.serialNumber || 'Sin matrícula/serie'}</Text>
            <Text style={styles.meta}>Técnico: {inspection.reviewedBy}</Text>
          </Card.Content></Card>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>Materiales opcionales</Text><Divider style={styles.divider} />
            {inspection.materials.map((material, index) => <View key={material.id} style={styles.materialRow}><TextInput label="Material" value={material.name} onChangeText={(v) => updateMaterial(index, 'name', v)} mode="outlined" style={styles.materialInput} /><TextInput label="Cant." value={material.quantity} onChangeText={(v) => updateMaterial(index, 'quantity', v)} mode="outlined" style={styles.qtyInput} /><TouchableOpacity onPress={() => removeMaterial(index)} style={styles.deleteBtn}><MaterialCommunityIcons name="delete" size={22} color="#ef4444" /></TouchableOpacity><TextInput label="Referencia" value={material.reference} onChangeText={(v) => updateMaterial(index, 'reference', v)} mode="outlined" style={styles.fullInput} /></View>)}
            <Button mode="outlined" onPress={addMaterial} icon="plus">Añadir material</Button>
          </Card.Content></Card>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>Comentarios</Text><Divider style={styles.divider} />
            <TextInput label="Observaciones" value={inspection.notes} onChangeText={(v) => setField('notes', v)} mode="outlined" multiline numberOfLines={4} style={styles.input} />
          </Card.Content></Card>
        </ScrollView>
        <SafeAreaView edges={['bottom']}><View style={styles.actions}><Button mode="outlined" onPress={() => router.push({ pathname: '/(tabs)/mantenimiento-checklist-form' as any, params: inspectionToParams(inspection) })} style={styles.button}>Volver</Button><Button mode="contained" loading={saving} disabled={saving} onPress={handleSave} style={styles.button} icon="file-pdf-box">Guardar/PDF</Button></View></SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:'#0f2f57'}, container:{flex:1,backgroundColor:BRAND_COLORS.surface}, scroll:{flex:1}, content:{paddingBottom:SPACING.lg}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)',marginTop:4}, summaryRow:{flexDirection:'row',gap:8,paddingHorizontal:SPACING.md,marginTop:SPACING.md}, summaryBox:{flex:1,backgroundColor:'white',borderRadius:BORDER_RADIUS.lg,padding:SPACING.md,alignItems:'center',...SHADOWS.small}, summaryValue:{fontSize:22,fontWeight:'800',color:'#0f2f57'}, summaryLabel:{fontSize:11,color:'#64748b',textAlign:'center'}, card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, meta:{color:'#475569',marginTop:4}, input:{backgroundColor:'white'}, materialRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:10,alignItems:'center'}, materialInput:{flex:1,minWidth:150,backgroundColor:'white'}, qtyInput:{width:86,backgroundColor:'white'}, fullInput:{width:'100%',backgroundColor:'white'}, deleteBtn:{width:42,height:42,alignItems:'center',justifyContent:'center'}, actions:{flexDirection:'row',gap:10,padding:SPACING.md,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e2e8f0'}, button:{flex:1} });
