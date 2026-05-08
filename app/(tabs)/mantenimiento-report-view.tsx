import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMachineTypeById } from '../../data/machineTypes';
import { shareMantenimientoReport } from '../../utils/mantenimientoReportGenerator';
import { getMantenimientoInspectionById, type MantenimientoChecklistItem, type MantenimientoInspection } from '../../utils/mantenimientoStorage';
import { buildSafetySummarySections } from '../../utils/safetyChecklist';

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');
const statusText = (status: string) => status === 'ok' ? 'Bien' : status === 'fail' ? 'Mal' : status === 'na' ? 'N/A' : status === 'cant' ? 'No se puede' : 'Sin revisar';
const statusColor = (status: string) => status === 'ok' ? '#16a34a' : status === 'fail' ? '#e87a20' : status === 'cant' ? '#7c3aed' : '#64748b';
const GENERAL_PHOTOS = [
  { key: 'front', label: 'A1' },
  { key: 'back', label: 'A2' },
  { key: 'left', label: 'A3' },
  { key: 'right', label: 'A4' },
];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.summaryBox}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function CollapsiblePhotoGrid({
  title,
  photos,
  expanded,
  onToggle,
  onOpenPhoto,
}: {
  title: string;
  photos: { uri: string; label: string }[];
  expanded: boolean;
  onToggle: () => void;
  onOpenPhoto: (uri: string) => void;
}) {
  if (photos.length === 0) return <Text style={styles.emptyText}>Sin fotos adjuntas.</Text>;
  return (
    <View style={styles.photoSection}>
      <TouchableOpacity style={styles.photoToggle} onPress={onToggle} activeOpacity={0.82}>
        <View style={styles.photoToggleTextBox}>
          <Text style={styles.photoToggleTitle}>{title}</Text>
          <Text style={styles.photoToggleSubtitle}>{expanded ? 'Fotos cargadas en pantalla' : 'Pulsa para cargar las fotos'}</Text>
        </View>
        <View style={styles.photoCountPill}><Text style={styles.photoCountText}>{photos.length}</Text></View>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#92400e" />
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}_${index}`} style={styles.photoItem}>
              <TouchableOpacity onPress={() => onOpenPhoto(photo.uri)} activeOpacity={0.85}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} resizeMode="cover" />
              </TouchableOpacity>
              <Text style={styles.photoLabel}>{photo.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ChecklistRow({ item, index, onOpenPhoto }: { item: MantenimientoChecklistItem; index: number; onOpenPhoto: (uri: string) => void }) {
  const color = statusColor(item.status);
  const evidencePhotos = (item.photos || []).map((uri, photoIndex) => ({ uri, label: `D${index + 1}.${photoIndex + 1}` }));
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkCategory}>{item.category || 'Checklist'}</Text>
          <Text style={styles.checkText}>• {item.text}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
          <Text style={[styles.statusBadgeText, { color }]}>{statusText(item.status)}</Text>
        </View>
      </View>
      {item.comment ? <Text style={[styles.commentBox, item.status === 'cant' ? styles.commentCant : styles.commentFail]}><Text style={styles.commentStrong}>{item.status === 'cant' ? 'Motivo: ' : 'Comentario: '}</Text>{item.comment}</Text> : null}
      {evidencePhotos.length > 0 ? <View style={styles.inlinePhotos}>{evidencePhotos.map((photo) => <TouchableOpacity key={photo.uri} style={styles.inlinePhotoBox} onPress={() => onOpenPhoto(photo.uri)} activeOpacity={0.85}><Image source={{ uri: photo.uri }} style={styles.inlinePhoto} /><Text style={styles.inlinePhotoLabel}>{photo.label}</Text></TouchableOpacity>)}</View> : null}
    </View>
  );
}

export default function MantenimientoReportViewScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const inspectionId = getParamString(params.inspectionId);
  const [inspection, setInspection] = useState<MantenimientoInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [expandedPhotoSections, setExpandedPhotoSections] = useState<Record<string, boolean>>({});
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = inspectionId ? await getMantenimientoInspectionById(inspectionId) : null;
      if (!active) return;
      setInspection(loaded);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [inspectionId]);

  const share = async () => {
    if (!inspection) return;
    try {
      setSharing(true);
      await shareMantenimientoReport(inspection);
    } catch (error) {
      console.error('Error al compartir mantenimiento:', error);
      Alert.alert('Error', 'No se pudo generar o compartir el PDF de mantenimiento.');
    } finally {
      setSharing(false);
    }
  };

  const togglePhotoSection = useCallback((key: string) => {
    setExpandedPhotoSections((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const safetySections = useMemo(() => buildSafetySummarySections(inspection?.safetyChecklist), [inspection]);
  const generalPhotos = useMemo(() => {
    if (!inspection) return [];
    return GENERAL_PHOTOS.map((slot) => ({ uri: inspection.generalPhotos?.[slot.key], label: slot.label })).filter((photo): photo is { uri: string; label: string } => Boolean(photo.uri));
  }, [inspection]);
  const groupedChecklist = useMemo(() => {
    if (!inspection) return [];
    const grouped = inspection.checklist.reduce<Record<string, MantenimientoChecklistItem[]>>((acc, item) => {
      const key = item.category || 'Checklist';
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
    return Object.entries(grouped);
  }, [inspection]);

  if (loading) return <SafeAreaView style={styles.loadingSafeArea}><ActivityIndicator size="large" color="#b45309" /><Text style={styles.loadingText}>Cargando informe...</Text></SafeAreaView>;
  if (!inspection) return <SafeAreaView style={styles.loadingSafeArea}><Text style={styles.errorText}>No se encontró el mantenimiento.</Text><Button onPress={() => router.back()}>Volver</Button></SafeAreaView>;

  const counts = {
    ok: inspection.checklist.filter((i) => i.status === 'ok').length,
    fail: inspection.checklist.filter((i) => i.status === 'fail').length,
    cant: inspection.checklist.filter((i) => i.status === 'cant').length,
    na: inspection.checklist.filter((i) => i.status === 'na').length,
    done: inspection.checklist.filter((i) => i.status).length,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#0f2f57', '#173f73', '#e87a20'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
          <MaterialCommunityIcons name="wrench-clock-outline" size={28} color="rgba(255,255,255,0.85)" />
          <Text style={styles.headerTitle}>Resumen mantenimiento</Text>
          <Text style={styles.headerSubtitle}>{inspection.clientName} · {inspection.date}</Text>
        </LinearGradient>

        <Card style={styles.card}><Card.Content>
          <Title style={styles.sectionTitle}>📋 Datos del cliente</Title><Divider style={styles.divider} />
          <InfoRow label="Cliente" value={inspection.clientName} />
          <InfoRow label="Ubicación" value={inspection.location} />
          <InfoRow label="Fecha entrada" value={inspection.date} />
          <InfoRow label="Revisado por" value={inspection.reviewedBy} />
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Title style={styles.sectionTitle}>⚙️ Datos de la máquina</Title><Divider style={styles.divider} />
          <InfoRow label="Tipo" value={getMachineTypeById(inspection.machineType).name} />
          <InfoRow label="Marca" value={inspection.brand} />
          <InfoRow label="Modelo" value={inspection.model} />
          <InfoRow label="Nº serie" value={inspection.serialNumber} />
          <InfoRow label="Matrícula" value={inspection.licensePlate} />
          <InfoRow label="OT" value={inspection.otNumber} />
        </Card.Content></Card>

        <View style={styles.summaryRow}>
          <SummaryBox label="Bien" value={counts.ok} color="#16a34a" />
          <SummaryBox label="Mal" value={counts.fail} color="#e87a20" />
          <SummaryBox label="N/A" value={counts.na} color="#64748b" />
          <SummaryBox label="No se puede" value={counts.cant} color="#7c3aed" />
        </View>

        {safetySections.length > 0 ? (
          <Card style={styles.card}><Card.Content>
            <Title style={styles.sectionTitle}>🛡️ Seguridad previa</Title><Divider style={styles.divider} />
            {safetySections.map((section, index) => (
              <View key={section.id} style={styles.safetyBlock}>
                <View style={styles.safetyHeader}>
                  <Text style={styles.safetyTitle}>{section.title}</Text>
                  <View style={[styles.safetyBadge, section.status === 'safe' ? styles.badgeSafe : section.status === 'warning' ? styles.badgeWarning : styles.badgeNeutral]}>
                    <Text style={styles.safetyBadgeText}>{section.status === 'safe' ? 'OK' : section.status === 'warning' ? 'REVISAR' : 'PENDIENTE'}</Text>
                  </View>
                </View>
                <Paragraph style={styles.safetySummary}>{section.summary}</Paragraph>
                {section.details.length > 0 ? <View style={styles.safetyDetails}>{section.details.map((detail) => <Text key={detail} style={styles.safetyDetailText}>• {detail}</Text>)}</View> : null}
                {index < safetySections.length - 1 ? <Divider style={styles.innerDivider} /> : null}
              </View>
            ))}
          </Card.Content></Card>
        ) : null}

        <Card style={styles.card}><Card.Content>
          <Title style={styles.sectionTitle}>📋 Checklist</Title><Divider style={styles.divider} />
          <Text style={styles.sectionHint}>{counts.done}/{inspection.checklist.length} puntos revisados</Text>
          {groupedChecklist.map(([category, items]) => (
            <View key={category} style={styles.checkSection}>
              <Text style={styles.categoryBanner}>{category}</Text>
              {items.map((item, index) => <ChecklistRow key={`${item.id}-${index}`} item={item} index={index} onOpenPhoto={setSelectedPhotoUri} />)}
            </View>
          ))}
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Title style={styles.sectionTitle}>🧰 Materiales</Title><Divider style={styles.divider} />
          {inspection.materials.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.materialsTable}>
                <View style={styles.materialsHeaderRow}>
                  <Text style={[styles.materialsHeaderText, { flex: 2 }]}>Material</Text>
                  <Text style={[styles.materialsHeaderText, { flex: 1 }]}>Cant.</Text>
                  <Text style={[styles.materialsHeaderText, { flex: 1.4 }]}>Ref.</Text>
                  <Text style={[styles.materialsHeaderText, { flex: 0.9 }]}>¿Hay?</Text>
                </View>
                {inspection.materials.map((material, index) => (
                  <View key={material.id} style={[styles.materialsRow, index % 2 === 0 ? styles.materialsRowEven : styles.materialsRowOdd]}>
                    <Text style={[styles.materialsCell, { flex: 2 }]}>{material.name || '—'}</Text>
                    <Text style={[styles.materialsCell, { flex: 1 }]}>{material.quantity || '—'}</Text>
                    <Text style={[styles.materialsCell, { flex: 1.4 }]}>{material.reference || '—'}</Text>
                    <Text style={[styles.materialsCell, { flex: 0.9 }]}>{material.available === true ? 'Sí' : material.available === false ? 'No' : '—'}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : <Text style={styles.emptyText}>Sin materiales asociados.</Text>}
        </Card.Content></Card>

        <Card style={styles.card}><Card.Content>
          <Title style={styles.sectionTitle}>📝 Observaciones</Title><Divider style={styles.divider} />
          <Paragraph style={styles.notesText}>{inspection.notes || 'Sin observaciones.'}</Paragraph>
        </Card.Content></Card>

        {generalPhotos.length > 0 ? (
          <Card style={styles.card}><Card.Content>
            <Title style={styles.sectionTitle}>📸 Fotos generales de entrada</Title><Divider style={styles.divider} />
            <CollapsiblePhotoGrid title="Ver fotos generales de entrada" photos={generalPhotos} expanded={Boolean(expandedPhotoSections.general)} onToggle={() => togglePhotoSection('general')} onOpenPhoto={setSelectedPhotoUri} />
          </Card.Content></Card>
        ) : null}
      </ScrollView>

      <SafeAreaView style={[styles.bottomActions, { paddingBottom: insets.bottom + SPACING.md }]} edges={['bottom']}>
        <Button mode="outlined" onPress={() => router.push({ pathname: '/mantenimiento-form' as any, params: { inspectionId: inspection.id } })} style={styles.actionButton} textColor="#92400e" icon="pencil" disabled={sharing}>Editar</Button>
        <Button mode="contained" onPress={share} style={styles.actionButton} buttonColor="#b45309" loading={sharing} disabled={sharing} icon="share-variant">{sharing ? 'Generando...' : 'Compartir PDF'}</Button>
      </SafeAreaView>

      <Modal visible={Boolean(selectedPhotoUri)} transparent animationType="fade" onRequestClose={() => setSelectedPhotoUri(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedPhotoUri(null)}>
            <MaterialCommunityIcons name="close" size={22} color="white" />
          </TouchableOpacity>
          {selectedPhotoUri ? <Image source={{ uri: selectedPhotoUri }} style={styles.modalImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:'#0f2f57'}, loadingSafeArea:{flex:1,alignItems:'center',justifyContent:'center',gap:SPACING.md,backgroundColor:BRAND_COLORS.surface,padding:SPACING.xl}, loadingText:{color:BRAND_COLORS.grayDark}, errorText:{color:BRAND_COLORS.error,fontSize:TYPOGRAPHY.sizes.lg}, scrollView:{flex:1,backgroundColor:BRAND_COLORS.surface}, scrollContent:{paddingBottom:120},
  header:{paddingTop:SPACING.md,paddingBottom:SPACING.xl,paddingHorizontal:SPACING.lg,alignItems:'center',gap:SPACING.xs}, backBtn:{position:'absolute',left:SPACING.md,top:SPACING.md,zIndex:10,width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,textAlign:'center'}, headerSubtitle:{color:'rgba(255,255,255,.84)',textAlign:'center'},
  card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, sectionHint:{fontSize:12,color:'#64748b',fontWeight:'700',marginBottom:SPACING.sm},
  infoRow:{flexDirection:'row',justifyContent:'space-between',gap:SPACING.md,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#eef2f7'}, infoLabel:{fontSize:12,color:'#64748b',fontWeight:'800',textTransform:'uppercase',letterSpacing:.4}, infoValue:{flex:1,textAlign:'right',fontSize:14,color:'#0f172a',fontWeight:'700'},
  summaryRow:{flexDirection:'row',gap:8,paddingHorizontal:SPACING.md,marginTop:SPACING.md}, summaryBox:{flex:1,backgroundColor:'white',borderRadius:BORDER_RADIUS.lg,paddingVertical:SPACING.sm,paddingHorizontal:4,alignItems:'center',...SHADOWS.small}, summaryValue:{fontSize:22,fontWeight:'900'}, summaryLabel:{fontSize:10,color:'#64748b',fontWeight:'700',textAlign:'center'},
  safetyBlock:{paddingVertical:SPACING.xs}, safetyHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:SPACING.sm}, safetyTitle:{flex:1,fontWeight:'800',color:'#0f172a'}, safetyBadge:{borderRadius:999,paddingHorizontal:8,paddingVertical:4}, badgeSafe:{backgroundColor:'#dcfce7'}, badgeWarning:{backgroundColor:'#fff7ed'}, badgeNeutral:{backgroundColor:'#f1f5f9'}, safetyBadgeText:{fontSize:10,fontWeight:'900',color:'#334155'}, safetySummary:{color:'#475569',marginTop:6}, safetyDetails:{backgroundColor:'#f8fafc',borderRadius:12,padding:SPACING.sm,marginTop:6}, safetyDetailText:{color:'#475569',fontSize:12,lineHeight:18}, innerDivider:{marginVertical:SPACING.sm,backgroundColor:'#e2e8f0'},
  checkSection:{borderWidth:1,borderColor:'#e2e8f0',borderRadius:14,overflow:'hidden',marginTop:SPACING.sm}, categoryBanner:{backgroundColor:'#0f2f57',color:'white',fontWeight:'900',paddingVertical:8,paddingHorizontal:12,textTransform:'uppercase',letterSpacing:.4}, checkRow:{padding:SPACING.sm,borderTopWidth:1,borderTopColor:'#e2e8f0',backgroundColor:'white'}, checkTop:{flexDirection:'row',alignItems:'flex-start',gap:SPACING.sm}, checkCategory:{fontSize:10,color:'#64748b',textTransform:'uppercase',fontWeight:'800'}, checkText:{fontSize:14,color:'#0f172a',fontWeight:'700',lineHeight:20,marginTop:2}, statusBadge:{borderWidth:1,borderRadius:999,paddingVertical:5,paddingHorizontal:8}, statusBadgeText:{fontSize:11,fontWeight:'900'}, commentBox:{marginTop:8,borderRadius:12,padding:10,fontSize:12,lineHeight:18}, commentFail:{backgroundColor:'#fff7ed',color:'#92400e'}, commentCant:{backgroundColor:'#f5f3ff',color:'#5b21b6'}, commentStrong:{fontWeight:'900'}, inlinePhotos:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}, inlinePhotoBox:{width:82}, inlinePhoto:{width:82,height:82,borderRadius:12,backgroundColor:'#f1f5f9'}, inlinePhotoLabel:{textAlign:'center',fontSize:11,fontWeight:'800',color:'#92400e',marginTop:3},
  materialsTable:{minWidth:620,borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,overflow:'hidden'}, materialsHeaderRow:{flexDirection:'row',backgroundColor:'#0f2f57',borderBottomWidth:3,borderBottomColor:'#e87a20'}, materialsHeaderText:{color:'white',fontSize:11,fontWeight:'900',textTransform:'uppercase',letterSpacing:.5,paddingVertical:9,paddingHorizontal:8}, materialsRow:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:'#e2e8f0'}, materialsRowEven:{backgroundColor:'#f8fafc'}, materialsRowOdd:{backgroundColor:'white'}, materialsCell:{fontSize:12,color:'#334155',fontWeight:'700',paddingVertical:9,paddingHorizontal:8}, notesText:{color:'#475569',lineHeight:21}, emptyText:{color:'#64748b',fontStyle:'italic'},
  photoSection:{marginTop:SPACING.xs}, photoToggle:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.sm,borderRadius:14,backgroundColor:'#fff7ed',borderWidth:1,borderColor:'#fed7aa'}, photoToggleTextBox:{flex:1}, photoToggleTitle:{fontWeight:'900',color:'#92400e'}, photoToggleSubtitle:{fontSize:11,color:'#b45309',marginTop:2}, photoCountPill:{minWidth:30,height:30,borderRadius:15,backgroundColor:'#e87a20',alignItems:'center',justifyContent:'center'}, photoCountText:{color:'white',fontWeight:'900'}, photosGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:SPACING.sm}, photoItem:{width:'47%',borderRadius:14,backgroundColor:'#f8fafc',borderWidth:1,borderColor:'#e2e8f0',overflow:'hidden'}, photoThumb:{width:'100%',height:130}, photoLabel:{textAlign:'center',fontWeight:'900',color:'#0f2f57',paddingVertical:6},
  bottomActions:{position:'absolute',left:0,right:0,bottom:0,flexDirection:'row',gap:10,paddingHorizontal:SPACING.md,paddingTop:SPACING.md,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e2e8f0',...SHADOWS.medium}, actionButton:{flex:1},
  modalContainer:{flex:1,backgroundColor:'rgba(0,0,0,0.92)',alignItems:'center',justifyContent:'center',padding:SPACING.md}, modalCloseButton:{position:'absolute',top:48,right:24,zIndex:10,width:42,height:42,borderRadius:21,backgroundColor:'rgba(255,255,255,0.16)',alignItems:'center',justifyContent:'center'}, modalImage:{width:'100%',height:'82%'},
});

