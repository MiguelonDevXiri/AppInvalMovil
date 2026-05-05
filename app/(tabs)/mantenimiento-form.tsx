import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { createEmptySafetyChecklist, type SafetyChecklist } from '../../utils/safetyChecklist';
import { createEmptyMantenimientoInspection, generateUUID, getMantenimientoInspectionById, saveMantenimientoInspection, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');
const PHOTO_POSITIONS = [{ key: 'front', label: 'A1 Frontal' }, { key: 'back', label: 'A2 Trasera' }, { key: 'left', label: 'A3 Izquierda' }, { key: 'right', label: 'A4 Derecha' }];

export default function MantenimientoFormScreen() {
  const params = useLocalSearchParams();
  const inspectionId = getParamString(params.inspectionId);
  const machineType = getParamString(params.machineType) || 'otros';
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => createEmptyMantenimientoInspection(machineType));
  const [loading, setLoading] = useState(Boolean(inspectionId));
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    if (!inspectionId) return;
    const loaded = await getMantenimientoInspectionById(inspectionId);
    if (loaded) setInspection(loaded); else Alert.alert('Error', 'No se pudo cargar el mantenimiento.');
    setLoading(false);
  })(); }, [inspectionId]);

  const completed = useMemo(() => inspection.checklist.filter((i) => i.status).length, [inspection.checklist]);
  const setField = (field: keyof MantenimientoInspection, value: any) => setInspection((prev) => ({ ...prev, [field]: value }));
  const updateChecklist = (index: number, patch: Partial<MantenimientoInspection['checklist'][number]>) => setInspection((prev) => ({ ...prev, checklist: prev.checklist.map((item, idx) => idx === index ? { ...item, ...patch } : item) }));

  const pickPhoto = async (callback: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) callback(result.assets[0].uri);
  };

  const ensureSafety = () => {
    const safety: SafetyChecklist = inspection.safetyChecklist || createEmptySafetyChecklist('full');
    setInspection((prev) => ({ ...prev, safetyChecklist: { ...safety, completedAt: new Date().toISOString() } }));
    Alert.alert('Checklist seguridad', 'Se ha marcado el checklist de seguridad como incluido. Puedes completarlo en detalle desde la pantalla compartida cuando el flujo lo requiera.');
  };

  const addMaterial = () => setInspection((prev) => ({ ...prev, materials: [...prev.materials, { id: generateUUID(), name: '', quantity: '', reference: '' }] }));
  const updateMaterial = (index: number, field: 'name' | 'quantity' | 'reference', value: string) => setInspection((prev) => ({ ...prev, materials: prev.materials.map((m, idx) => idx === index ? { ...m, [field]: value } : m) }));
  const removeMaterial = (index: number) => setInspection((prev) => ({ ...prev, materials: prev.materials.filter((_, idx) => idx !== index) }));

  const handleSave = async () => {
    if (!inspection.clientName.trim() || !inspection.location.trim() || !inspection.reviewedBy.trim()) { Alert.alert('Campos obligatorios', 'Cliente, ubicación y técnico son obligatorios.'); return; }
    try { setSaving(true); const saved = await saveMantenimientoInspection(inspection); router.replace({ pathname: '/mantenimiento-report-view' as any, params: { inspectionId: saved.id } }); }
    catch (error) { console.error('Error al guardar mantenimiento:', error); Alert.alert('Error', 'No se pudo guardar el mantenimiento. Revisa las tablas SQL.'); }
    finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} /><Text>Cargando mantenimiento...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0f2f57', '#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{inspectionId ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</Text>
          <Text style={styles.headerSubtitle}>{completed}/{inspection.checklist.length} puntos revisados</Text>
        </LinearGradient>

        <Card style={styles.card}><Card.Content>
          <Text style={styles.sectionTitle}>Encabezado</Text><Divider style={styles.divider} />
          <TextInput label="Cliente *" value={inspection.clientName} onChangeText={(v) => setField('clientName', v)} style={styles.input} mode="outlined" />
          <TextInput label="Fecha" value={inspection.date} onChangeText={(v) => setField('date', v)} style={styles.input} mode="outlined" />
          <TextInput label="Ubicación *" value={inspection.location} onChangeText={(v) => setField('location', v)} style={styles.input} mode="outlined" />
          <TextInput label="Revisado por *" value={inspection.reviewedBy} onChangeText={(v) => setField('reviewedBy', v)} style={styles.input} mode="outlined" />
          <TextInput label="Marca" value={inspection.brand} onChangeText={(v) => setField('brand', v)} style={styles.input} mode="outlined" />
          <TextInput label="Modelo" value={inspection.model} onChangeText={(v) => setField('model', v)} style={styles.input} mode="outlined" />
          <TextInput label="Nº serie" value={inspection.serialNumber} onChangeText={(v) => setField('serialNumber', v)} style={styles.input} mode="outlined" />
          <TextInput label="Matrícula" value={inspection.licensePlate} onChangeText={(v) => setField('licensePlate', v)} style={styles.input} mode="outlined" />
          <TextInput label="OT" value={inspection.otNumber || ''} onChangeText={(v) => setField('otNumber', v)} style={styles.input} mode="outlined" />
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Text style={styles.sectionTitle}>Checklist seguridad</Text><Divider style={styles.divider} />
          <Button mode={inspection.safetyChecklist ? 'contained' : 'outlined'} onPress={ensureSafety} icon="shield-check">{inspection.safetyChecklist ? 'Seguridad incluida' : 'Incluir seguridad previa'}</Button>
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Text style={styles.sectionTitle}>Fotos generales</Text><Divider style={styles.divider} />
          <View style={styles.photoGrid}>{PHOTO_POSITIONS.map((pos) => <TouchableOpacity key={pos.key} style={styles.photoBox} onPress={() => pickPhoto((uri) => setField('generalPhotos', { ...inspection.generalPhotos, [pos.key]: uri }))}>{inspection.generalPhotos[pos.key] ? <Image source={{ uri: inspection.generalPhotos[pos.key] }} style={styles.photo} /> : <MaterialCommunityIcons name="camera-plus" size={28} color={BRAND_COLORS.primaryBlue} />}<Text style={styles.photoLabel}>{pos.label}</Text></TouchableOpacity>)}</View>
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Text style={styles.sectionTitle}>Checklist mantenimiento</Text><Divider style={styles.divider} />
          {inspection.checklist.map((item, index) => <View key={`${item.id}-${index}`} style={styles.checkItem}>
            <Text style={styles.category}>{item.category}</Text><Text style={styles.itemText}>{item.text}</Text>
            <View style={styles.statusRow}>{['ok','fail','na','cant'].map((status) => <TouchableOpacity key={status} onPress={() => updateChecklist(index, { status })} style={[styles.statusBtn, item.status === status && styles.statusActive]}><Text style={[styles.statusText, item.status === status && styles.statusTextActive]}>{status === 'ok' ? 'Bien' : status === 'fail' ? 'Mal' : status === 'na' ? 'N/A' : 'No se puede'}</Text></TouchableOpacity>)}</View>
            {(item.status === 'fail' || item.status === 'cant') && <TextInput label="Comentario" value={item.comment || ''} onChangeText={(v) => updateChecklist(index, { comment: v })} mode="outlined" style={styles.input} />}
            <View style={styles.smallPhotos}>{(item.photos || []).map((uri, pidx) => <TouchableOpacity key={`${uri}-${pidx}`} onLongPress={() => updateChecklist(index, { photos: item.photos.filter((_, idx) => idx !== pidx) })}><Image source={{ uri }} style={styles.smallPhoto} /></TouchableOpacity>)}<TouchableOpacity style={styles.addPhoto} onPress={() => pickPhoto((uri) => updateChecklist(index, { photos: [...(item.photos || []), uri] }))}><MaterialCommunityIcons name="camera-plus" size={22} color={BRAND_COLORS.primaryBlue} /></TouchableOpacity></View>
          </View>)}
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Text style={styles.sectionTitle}>Materiales opcionales</Text><Divider style={styles.divider} />
          {inspection.materials.map((material, index) => <View key={material.id} style={styles.materialRow}><TextInput label="Material" value={material.name} onChangeText={(v) => updateMaterial(index, 'name', v)} mode="outlined" style={styles.materialInput} /><TextInput label="Cant." value={material.quantity} onChangeText={(v) => updateMaterial(index, 'quantity', v)} mode="outlined" style={styles.qtyInput} /><TouchableOpacity onPress={() => removeMaterial(index)} style={styles.deleteBtn}><MaterialCommunityIcons name="delete" size={22} color="#ef4444" /></TouchableOpacity><TextInput label="Referencia" value={material.reference} onChangeText={(v) => updateMaterial(index, 'reference', v)} mode="outlined" style={styles.fullInput} /></View>)}
          <Button mode="outlined" onPress={addMaterial} icon="plus">Añadir material</Button>
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content><TextInput label="Observaciones" value={inspection.notes} onChangeText={(v) => setField('notes', v)} mode="outlined" multiline numberOfLines={4} /></Card.Content></Card>
        <Button mode="contained" loading={saving} disabled={saving} onPress={handleSave} style={styles.saveBtn} icon="content-save">Guardar y generar informe</Button>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:BRAND_COLORS.primaryBlue}, center:{flex:1,alignItems:'center',justifyContent:'center'}, scroll:{flex:1,backgroundColor:BRAND_COLORS.surface}, content:{paddingBottom:SPACING.xl}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)',marginTop:4}, card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, input:{marginBottom:SPACING.sm,backgroundColor:'white'}, photoGrid:{flexDirection:'row',flexWrap:'wrap',gap:10}, photoBox:{width:'47%',height:130,borderWidth:1,borderColor:'#dbeafe',borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#eff6ff',overflow:'hidden'}, photo:{width:'100%',height:100}, photoLabel:{fontSize:12,color:'#334155',marginTop:4}, checkItem:{borderTopWidth:1,borderTopColor:'#e2e8f0',paddingVertical:12}, category:{fontSize:11,color:'#64748b',textTransform:'uppercase'}, itemText:{fontSize:15,fontWeight:'600',color:'#0f172a',marginVertical:6}, statusRow:{flexDirection:'row',flexWrap:'wrap',gap:6}, statusBtn:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:999,paddingHorizontal:10,paddingVertical:6}, statusActive:{backgroundColor:'#2563eb',borderColor:'#2563eb'}, statusText:{fontSize:12,color:'#334155'}, statusTextActive:{color:'white',fontWeight:'700'}, smallPhotos:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}, smallPhoto:{width:54,height:54,borderRadius:8}, addPhoto:{width:54,height:54,borderRadius:8,borderWidth:1,borderColor:'#bfdbfe',alignItems:'center',justifyContent:'center'}, materialRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8}, materialInput:{flex:1,minWidth:160,backgroundColor:'white'}, qtyInput:{width:90,backgroundColor:'white'}, fullInput:{width:'100%',backgroundColor:'white'}, deleteBtn:{width:44,alignItems:'center',justifyContent:'center'}, saveBtn:{margin:SPACING.md,borderRadius:BORDER_RADIUS.md} });
