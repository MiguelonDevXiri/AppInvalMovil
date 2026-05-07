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

const GRADIENT = ['#0f2f57', '#173f73', '#e87a20'] as const;
type StatusKey = 'ok' | 'fail' | 'na' | 'cant';
const STATUS_OPTIONS: { key: StatusKey; label: string; icon: string; color: string }[] = [
  { key: 'ok', label: 'Bien', icon: 'check-circle-outline', color: '#16a34a' },
  { key: 'fail', label: 'Mal', icon: 'close-circle-outline', color: '#e87a20' },
  { key: 'na', label: 'N/A', icon: 'minus-circle-outline', color: '#64748b' },
  { key: 'cant', label: 'No se puede', icon: 'alert-circle-outline', color: '#7c3aed' },
];

const normalizeCategory = (value: string) => value.trim() || 'Checklist';
const statusLabel = (status: string) => STATUS_OPTIONS.find((option) => option.key === status)?.label || 'Sin revisar';
const needsEvidence = (status: string) => status === 'fail' || status === 'cant';

function ChecklistItemCard({
  item,
  index,
  updateChecklist,
  pickPhoto,
}: {
  item: MantenimientoChecklistItem;
  index: number;
  updateChecklist: (index: number, patch: Partial<MantenimientoChecklistItem>) => void;
  pickPhoto: (index: number) => void;
}) {
  const isOpen = needsEvidence(item.status);
  const activeOption = STATUS_OPTIONS.find((option) => option.key === item.status);

  return (
    <View style={[styles.checkCard, item.status === 'ok' && styles.cardOk, item.status === 'fail' && styles.cardFail, item.status === 'cant' && styles.cardCant]}>
      <View style={styles.checkHeader}>
        <View style={styles.checkInfo}>
          <Text style={styles.itemCategory}>{normalizeCategory(item.category)}</Text>
          <Text style={styles.itemText}>{item.text}</Text>
        </View>
        <View style={[styles.currentBadge, activeOption ? { backgroundColor: `${activeOption.color}18`, borderColor: `${activeOption.color}55` } : null]}>
          <MaterialCommunityIcons name={(activeOption?.icon || 'circle-outline') as any} size={16} color={activeOption?.color || '#64748b'} />
          <Text style={[styles.currentBadgeText, activeOption ? { color: activeOption.color } : null]}>{statusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.statusGrid}>
        {STATUS_OPTIONS.map((option) => {
          const active = item.status === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => updateChecklist(index, { status: option.key, ...(!needsEvidence(option.key) ? { comment: '', photos: [] } : {}) })}
              style={[styles.statusButton, active && { backgroundColor: option.color, borderColor: option.color }]}
              activeOpacity={0.82}
            >
              <MaterialCommunityIcons name={option.icon as any} size={17} color={active ? 'white' : option.color} />
              <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isOpen ? (
        <View style={styles.evidenceBox}>
          <Text style={styles.evidenceTitle}>{item.status === 'cant' ? 'Motivo' : 'Comentario de revisión'}</Text>
          <TextInput
            label={item.status === 'cant' ? 'Explica por qué no se puede revisar' : 'Comentario de revisión'}
            value={item.comment || ''}
            onChangeText={(value) => updateChecklist(index, { comment: value })}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor="#fed7aa"
            activeOutlineColor="#e87a20"
          />
          <View style={styles.photoRow}>
            {(item.photos || []).map((uri, photoIndex) => (
              <TouchableOpacity
                key={`${uri}-${photoIndex}`}
                onLongPress={() => updateChecklist(index, { photos: item.photos.filter((_, idx) => idx !== photoIndex) })}
                style={styles.photoWrap}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={styles.photo} />
                <Text style={styles.photoLabel}>D{photoIndex + 1}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={() => pickPhoto(index)} activeOpacity={0.82}>
              <MaterialCommunityIcons name="camera-plus-outline" size={24} color="#e87a20" />
              <Text style={styles.addPhotoText}>Evidencia</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Mantén pulsada una foto para quitarla.</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MantenimientoChecklistFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection(params));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => inspection.checklist.reduce<Record<string, { item: MantenimientoChecklistItem; index: number }[]>>((acc, item, index) => {
    const category = normalizeCategory(item.category);
    acc[category] = acc[category] || [];
    acc[category].push({ item, index });
    return acc;
  }, {}), [inspection.checklist]);

  const counts = useMemo(() => ({
    ok: inspection.checklist.filter((item) => item.status === 'ok').length,
    fail: inspection.checklist.filter((item) => item.status === 'fail').length,
    cant: inspection.checklist.filter((item) => item.status === 'cant').length,
    na: inspection.checklist.filter((item) => item.status === 'na').length,
    done: inspection.checklist.filter((item) => item.status).length,
    total: inspection.checklist.length,
  }), [inspection.checklist]);

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
            <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitle}>Checklist mantenimiento</Text>
            <Text style={styles.headerSubtitle}>Paso 5 · Misma dinámica que Renoves: marca estado y añade evidencia solo si hace falta</Text>
          </LinearGradient>

          <View style={styles.summaryBanner}>
            <MaterialCommunityIcons name="progress-check" size={20} color="#e87a20" />
            <Text style={styles.summaryText}>{counts.done}/{counts.total} puntos revisados</Text>
          </View>

          <View style={styles.summaryRow}>
            <SummaryBox label="Bien" value={counts.ok} color="#16a34a" />
            <SummaryBox label="Mal" value={counts.fail} color="#e87a20" />
            <SummaryBox label="N/A" value={counts.na} color="#64748b" />
            <SummaryBox label="No se puede" value={counts.cant} color="#7c3aed" />
          </View>

          {Object.entries(grouped).map(([category, rows], sectionIndex) => {
            const expanded = expandedSections[category] ?? sectionIndex === 0;
            const done = rows.filter(({ item }) => item.status).length;
            return (
              <Card key={category} style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setExpandedSections((current) => ({ ...current, [category]: !expanded }))}
                  activeOpacity={0.82}
                >
                  <View style={styles.sectionTitleRow}>
                    <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-right'} size={24} color="#e87a20" />
                    <Text style={styles.sectionTitle}>{category}</Text>
                  </View>
                  <Text style={styles.sectionCounter}>{done}/{rows.length}</Text>
                </TouchableOpacity>
                {expanded ? (
                  <Card.Content style={styles.sectionContent}>
                    {rows.map(({ item, index }, rowIndex) => (
                      <React.Fragment key={`${item.id}-${index}`}>
                        <ChecklistItemCard item={item} index={index} updateChecklist={updateChecklist} pickPhoto={pickPhoto} />
                        {rowIndex < rows.length - 1 ? <Divider style={styles.innerDivider} /> : null}
                      </React.Fragment>
                    ))}
                  </Card.Content>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
        <SafeAreaView edges={['bottom']}><View style={styles.actions}><Button mode="outlined" onPress={() => router.back()} style={styles.button} textColor="#92400e">Volver</Button><Button mode="contained" onPress={goNext} style={styles.button} buttonColor="#b45309" icon="arrow-right">Finalizar</Button></View></SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.summaryBox}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:'#0f2f57'}, container:{flex:1,backgroundColor:BRAND_COLORS.surface}, scroll:{flex:1}, content:{paddingBottom:SPACING.lg},
  header:{paddingTop:SPACING.md,paddingBottom:SPACING.xl,paddingHorizontal:SPACING.lg,alignItems:'center',gap:SPACING.xs},
  backBtn:{position:'absolute',left:SPACING.md,top:SPACING.md,zIndex:10,width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},
  headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,textAlign:'center'}, headerSubtitle:{color:'rgba(255,255,255,.84)',textAlign:'center',fontSize:TYPOGRAPHY.sizes.sm},
  summaryBanner:{margin:SPACING.md,marginBottom:0,padding:SPACING.md,borderRadius:BORDER_RADIUS.lg,backgroundColor:'#fff7ed',borderWidth:1,borderColor:'#fed7aa',flexDirection:'row',gap:8,alignItems:'center'}, summaryText:{fontWeight:'800',color:'#92400e'},
  summaryRow:{flexDirection:'row',gap:8,paddingHorizontal:SPACING.md,marginTop:SPACING.md}, summaryBox:{flex:1,backgroundColor:'white',borderRadius:BORDER_RADIUS.lg,paddingVertical:SPACING.sm,paddingHorizontal:4,alignItems:'center',...SHADOWS.small}, summaryValue:{fontSize:22,fontWeight:'900'}, summaryLabel:{fontSize:10,color:'#64748b',fontWeight:'700',textAlign:'center'},
  sectionCard:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,overflow:'hidden',...SHADOWS.small}, sectionHeader:{padding:SPACING.md,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'white'}, sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:4,flex:1}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.md,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57',flex:1}, sectionCounter:{fontWeight:'900',color:'#92400e'}, sectionContent:{paddingTop:0},
  checkCard:{paddingVertical:SPACING.md}, cardOk:{}, cardFail:{}, cardCant:{}, checkHeader:{flexDirection:'row',gap:SPACING.sm,alignItems:'flex-start'}, checkInfo:{flex:1}, itemCategory:{fontSize:11,color:'#64748b',textTransform:'uppercase',fontWeight:'800',letterSpacing:.4}, itemText:{fontSize:15,fontWeight:'700',color:'#0f172a',marginTop:4,lineHeight:21}, currentBadge:{borderWidth:1,borderColor:'#e2e8f0',borderRadius:999,paddingHorizontal:8,paddingVertical:5,flexDirection:'row',alignItems:'center',gap:4}, currentBadgeText:{fontSize:11,fontWeight:'800',color:'#64748b'},
  statusGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:SPACING.sm}, statusButton:{borderWidth:1,borderColor:'#e2e8f0',borderRadius:999,paddingVertical:8,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'white'}, statusButtonText:{fontSize:12,fontWeight:'800',color:'#334155'}, statusButtonTextActive:{color:'white'},
  evidenceBox:{marginTop:SPACING.sm,borderRadius:BORDER_RADIUS.lg,backgroundColor:'#fff7ed',borderWidth:1,borderColor:'#fed7aa',padding:SPACING.sm}, evidenceTitle:{fontSize:12,fontWeight:'900',color:'#92400e',marginBottom:6,textTransform:'uppercase'}, input:{backgroundColor:'white'}, photoRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:SPACING.sm}, photoWrap:{width:82}, photo:{width:82,height:82,borderRadius:12,backgroundColor:'#f1f5f9'}, photoLabel:{textAlign:'center',fontSize:11,fontWeight:'800',color:'#92400e',marginTop:3}, addPhotoButton:{width:96,height:82,borderRadius:12,borderWidth:1,borderStyle:'dashed',borderColor:'#fdba74',alignItems:'center',justifyContent:'center',backgroundColor:'white'}, addPhotoText:{fontSize:11,fontWeight:'800',color:'#92400e',marginTop:3}, hint:{fontSize:11,color:'#92400e',marginTop:6},
  innerDivider:{backgroundColor:'#e2e8f0'}, actions:{flexDirection:'row',gap:10,padding:SPACING.md,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e2e8f0'}, button:{flex:1},
});
