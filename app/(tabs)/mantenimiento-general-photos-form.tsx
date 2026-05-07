import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View, type AlertButton } from 'react-native';
import { Button, Card, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection } from '../../utils/mantenimientoStorage';

const GRADIENT = ['#0f2f57', '#173f73', '#e87a20'] as const;
const PHOTO_SLOTS = [
  { key: 'front', label: 'A1' },
  { key: 'back', label: 'A2' },
  { key: 'left', label: 'A3' },
  { key: 'right', label: 'A4' },
] as const;

export default function MantenimientoGeneralPhotosFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState(() => paramsToInspection(params));
  const photoCount = useMemo(() => Object.values(inspection.generalPhotos).filter(Boolean).length, [inspection.generalPhotos]);

  const setPhoto = (key: string, uri: string | null) => setInspection((prev) => {
    const next = { ...prev.generalPhotos };
    if (uri) next[key] = uri; else delete next[key];
    return { ...prev, generalPhotos: next };
  });

  const pickCamera = async (key: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) setPhoto(key, result.assets[0].uri);
  };

  const pickLibrary = async (key: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos de galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.7, selectionLimit: 1 });
    if (!result.canceled && result.assets?.[0]?.uri) setPhoto(key, result.assets[0].uri);
  };

  const openOptions = (key: string, label: string) => {
    const actions: AlertButton[] = [
      { text: 'Cámara', onPress: () => { void pickCamera(key); } },
      { text: 'Galería', onPress: () => { void pickLibrary(key); } },
    ];
    if (inspection.generalPhotos[key]) actions.push({ text: 'Quitar foto', style: 'destructive', onPress: () => setPhoto(key, null) });
    actions.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(`Foto ${label}`, 'Selecciona una opción', actions);
  };

  const goData = () => router.replace({ pathname: '/(tabs)/mantenimiento-form' as any, params: inspectionToParams(inspection) });
  const goNext = () => router.push({ pathname: '/(tabs)/safety-checklist-form' as any, params: { ...inspectionToParams(inspection), module: 'mantenimiento' } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <LinearGradient colors={GRADIENT as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <TouchableOpacity onPress={goData} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Fotos generales</Text>
            <Text style={styles.headerSubtitle}>Paso 3 · Fotos generales de la máquina</Text>
          </LinearGradient>
          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>📸 Fotos generales</Text><Divider style={styles.divider} />
            <Text style={styles.info}>Añade las fotos generales antes del checklist de seguridad.</Text>
            <View style={styles.grid}>{PHOTO_SLOTS.map((slot) => {
              const uri = inspection.generalPhotos[slot.key];
              return <TouchableOpacity key={slot.key} style={styles.photoBox} onPress={() => openOptions(slot.key, slot.label)} activeOpacity={0.85}>{uri ? <Image source={{ uri }} style={styles.photo} /> : <View style={styles.placeholder}><MaterialCommunityIcons name="camera-plus-outline" size={32} color={BRAND_COLORS.grayText} /><Text style={styles.placeholderText}>Añadir</Text></View>}<Text style={styles.photoLabel}>{slot.label}</Text></TouchableOpacity>;
            })}</View>
          </Card.Content></Card>
          <Card style={styles.card}><Card.Content><Text style={styles.info}>Fotos añadidas: {photoCount} de 4</Text></Card.Content></Card>
        </ScrollView>
        <SafeAreaView edges={['bottom']}><View style={styles.actions}><Button mode="outlined" onPress={goData} style={styles.button}>Volver</Button><Button mode="contained" onPress={goNext} style={styles.button} icon="shield-check">Seguridad</Button></View></SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:'#0f2f57'}, container:{flex:1,backgroundColor:BRAND_COLORS.surface}, scroll:{flex:1}, content:{paddingBottom:SPACING.lg}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)',marginTop:4}, card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, info:{color:'#475569',lineHeight:20}, grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:SPACING.md}, photoBox:{width:'47%',height:160,borderWidth:1,borderColor:'#dbeafe',borderRadius:14,backgroundColor:'#eff6ff',overflow:'hidden',alignItems:'center'}, photo:{width:'100%',height:125}, placeholder:{height:125,width:'100%',alignItems:'center',justifyContent:'center'}, placeholderText:{color:'#64748b',marginTop:4}, photoLabel:{fontWeight:'800',color:'#0f2f57',marginTop:6}, actions:{flexDirection:'row',gap:10,padding:SPACING.md,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e2e8f0'}, button:{flex:1} });
