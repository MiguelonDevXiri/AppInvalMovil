import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection, type MantenimientoChecklistItem, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const GRADIENT = ['#0f2f57', '#2563eb', '#60a5fa'] as const;
type TabKey = 'general' | 'hidraulica' | 'electricidad';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'general', label: 'General', icon: 'clipboard-check-outline' },
  { key: 'hidraulica', label: 'Hidráulica', icon: 'hydraulic-oil-level' },
  { key: 'electricidad', label: 'Eléctrico', icon: 'flash-outline' },
];

const categoryToTab = (category: string): TabKey => {
  const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('hidraul')) return 'hidraulica';
  if (normalized.includes('electric')) return 'electricidad';
  return 'general';
};

const statusLabel = (status: string) => status === 'ok' ? 'Bien' : status === 'fail' ? 'Mal' : status === 'na' ? 'N/A' : 'No se puede';

export default function MantenimientoChecklistFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection(params));
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  const counts = useMemo(() => TABS.reduce<Record<TabKey, { total: number; done: number }>>((acc, tab) => {
    const items = inspection.checklist.filter((item) => categoryToTab(item.category) === tab.key);
    acc[tab.key] = { total: items.length, done: items.filter((item) => item.status).length };
    return acc;
  }, { general: { total: 0, done: 0 }, hidraulica: { total: 0, done: 0 }, electricidad: { total: 0, done: 0 } }), [inspection.checklist]);

  const visibleItems = useMemo(() => inspection.checklist
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => categoryToTab(item.category) === activeTab), [activeTab, inspection.checklist]);

  const updateChecklist = (index: number, patch: Partial<MantenimientoChecklistItem>) => setInspection((prev) => ({
    ...prev,
    checklist: prev.checklist.map((item, idx) => idx === index ? { ...item, ...patch } : item),
  }));

  const pickPhoto = async (index: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const item = inspection.checklist[index];
      updateChecklist(index, { photos: [...(item.photos || []), result.assets[0].uri] });
    }
  };

  const goNext = () => router.push({ pathname: '/(tabs)/mantenimiento-final-form' as any, params: inspectionToParams(inspection) });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={GRADIENT as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Checklist mantenimiento</Text>
            <Text style={styles.headerSubtitle}>Paso 5 · General, hidráulico y eléctrico por pestañas</Text>
          </LinearGradient>

          <View style={styles.tabs}>{TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = counts[tab.key];
            return <TouchableOpacity key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab.key)}><MaterialCommunityIcons name={tab.icon as any} size={18} color={active ? 'white' : BRAND_COLORS.primaryBlue} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text><Text style={[styles.tabCount, active && styles.tabTextActive]}>{count.done}/{count.total}</Text></TouchableOpacity>;
          })}</View>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>{TABS.find((tab) => tab.key === activeTab)?.label}</Text><Divider style={styles.divider} />
            {visibleItems.length === 0 ? <Text style={styles.empty}>Esta máquina no tiene puntos en esta pestaña.</Text> : visibleItems.map(({ item, index }) => (
              <View key={`${item.id}-${index}`} style={styles.checkItem}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.itemText}>{item.text}</Text>
                <View style={styles.statusRow}>{(['ok', 'fail', 'na', 'cant'] as const).map((status) => <TouchableOpacity key={status} onPress={() => updateChecklist(index, { status })} style={[styles.statusBtn, item.status === status && styles.statusActive]}><Text style={[styles.statusText, item.status === status && styles.statusTextActive]}>{statusLabel(status)}</Text></TouchableOpacity>)}</View>
                {(item.status === 'fail' || item.status === 'cant') ? <TextInput label="Comentario" value={item.comment || ''} onChangeText={(v) => updateChecklist(index, { comment: v })} mode="outlined" style={styles.input} /> : null}
                <View style={styles.smallPhotos}>{(item.photos || []).map((uri, pidx) => <TouchableOpacity key={`${uri}-${pidx}`} onLongPress={() => updateChecklist(index, { photos: item.photos.filter((_, idx) => idx !== pidx) })}><Image source={{ uri }} style={styles.smallPhoto} /></TouchableOpacity>)}<TouchableOpacity style={styles.addPhoto} onPress={() => { void pickPhoto(index); }}><MaterialCommunityIcons name="camera-plus" size={22} color={BRAND_COLORS.primaryBlue} /></TouchableOpacity></View>
              </View>
            ))}
          </Card.Content></Card>
        </ScrollView>
        <SafeAreaView edges={['bottom']}><View style={styles.actions}><Button mode="outlined" onPress={() => router.back()} style={styles.button}>Volver</Button><Button mode="contained" onPress={goNext} style={styles.button} icon="arrow-right">Finalizar</Button></View></SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:BRAND_COLORS.primaryBlue}, container:{flex:1,backgroundColor:BRAND_COLORS.surface}, scroll:{flex:1}, content:{paddingBottom:SPACING.lg}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)',marginTop:4}, tabs:{flexDirection:'row',gap:8,padding:SPACING.md}, tab:{flex:1,borderRadius:14,borderWidth:1,borderColor:'#bfdbfe',backgroundColor:'white',paddingVertical:10,paddingHorizontal:6,alignItems:'center',...SHADOWS.small}, tabActive:{backgroundColor:BRAND_COLORS.primaryBlue,borderColor:BRAND_COLORS.primaryBlue}, tabText:{fontSize:12,fontWeight:'800',color:BRAND_COLORS.primaryBlue,marginTop:3}, tabTextActive:{color:'white'}, tabCount:{fontSize:11,color:'#64748b',marginTop:2}, card:{margin:SPACING.md,marginTop:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, empty:{color:'#64748b'}, checkItem:{borderTopWidth:1,borderTopColor:'#e2e8f0',paddingVertical:12}, category:{fontSize:11,color:'#64748b',textTransform:'uppercase'}, itemText:{fontSize:15,fontWeight:'600',color:'#0f172a',marginVertical:6}, statusRow:{flexDirection:'row',flexWrap:'wrap',gap:6}, statusBtn:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:999,paddingHorizontal:10,paddingVertical:6}, statusActive:{backgroundColor:'#2563eb',borderColor:'#2563eb'}, statusText:{fontSize:12,color:'#334155'}, statusTextActive:{color:'white',fontWeight:'700'}, input:{marginTop:8,backgroundColor:'white'}, smallPhotos:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}, smallPhoto:{width:54,height:54,borderRadius:8}, addPhoto:{width:54,height:54,borderRadius:8,borderWidth:1,borderColor:'#bfdbfe',alignItems:'center',justifyContent:'center',backgroundColor:'#eff6ff'}, actions:{flexDirection:'row',gap:10,padding:SPACING.md,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e2e8f0'}, button:{flex:1} });
