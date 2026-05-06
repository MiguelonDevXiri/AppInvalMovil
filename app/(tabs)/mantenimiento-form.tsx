import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getMantenimientoInspectionById, inspectionToParams, paramsToInspection, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');
const GRADIENT = ['#0f2f57', '#2563eb', '#60a5fa'] as const;

export default function MantenimientoFormScreen() {
  const params = useLocalSearchParams();
  const inspectionId = getParamString(params.inspectionId);
  const machineType = getParamString(params.machineType) || 'otros';
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection({ ...params, machineType }));
  const [loading, setLoading] = useState(Boolean(inspectionId) && !getParamString(params.clientName));

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!inspectionId || getParamString(params.clientName)) return;
      const loaded = await getMantenimientoInspectionById(inspectionId);
      if (!active) return;
      if (loaded) setInspection(loaded); else Alert.alert('Error', 'No se pudo cargar el mantenimiento.');
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [inspectionId, params.clientName]);

  const setField = (field: keyof MantenimientoInspection, value: string) => setInspection((prev) => ({ ...prev, [field]: value }));

  const handleContinue = () => {
    if (!inspection.clientName.trim() || !inspection.location.trim() || !inspection.reviewedBy.trim()) {
      Alert.alert('Campos obligatorios', 'Cliente, ubicación y técnico son obligatorios.');
      return;
    }
    router.push({ pathname: '/(tabs)/mantenimiento-general-photos-form' as any, params: inspectionToParams(inspection) });
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} /><Text>Cargando mantenimiento...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={GRADIENT as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={22} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>{inspectionId ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</Text>
            <Text style={styles.headerSubtitle}>Paso 2 · Datos de máquina y cliente</Text>
          </LinearGradient>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>Cliente</Text><Divider style={styles.divider} />
            <TextInput label="Cliente *" value={inspection.clientName} onChangeText={(v) => setField('clientName', v)} style={styles.input} mode="outlined" />
            <TextInput label="Ubicación *" value={inspection.location} onChangeText={(v) => setField('location', v)} style={styles.input} mode="outlined" />
            <TextInput label="Fecha" value={inspection.date} onChangeText={(v) => setField('date', v)} style={styles.input} mode="outlined" />
            <TextInput label="Revisado por *" value={inspection.reviewedBy} onChangeText={(v) => setField('reviewedBy', v)} style={styles.input} mode="outlined" />
          </Card.Content></Card>

          <Card style={styles.card}><Card.Content>
            <Text style={styles.sectionTitle}>Máquina</Text><Divider style={styles.divider} />
            <TextInput label="Marca" value={inspection.brand} onChangeText={(v) => setField('brand', v)} style={styles.input} mode="outlined" />
            <TextInput label="Modelo" value={inspection.model} onChangeText={(v) => setField('model', v)} style={styles.input} mode="outlined" />
            <TextInput label="Nº serie" value={inspection.serialNumber} onChangeText={(v) => setField('serialNumber', v)} style={styles.input} mode="outlined" />
            <TextInput label="Matrícula" value={inspection.licensePlate} onChangeText={(v) => setField('licensePlate', v)} style={styles.input} mode="outlined" />
            <TextInput label="OT" value={inspection.otNumber || ''} onChangeText={(v) => setField('otNumber', v)} style={styles.input} mode="outlined" />
          </Card.Content></Card>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => router.back()} style={styles.button}>Volver</Button>
            <Button mode="contained" onPress={handleContinue} style={styles.button} icon="arrow-right">Continuar</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:BRAND_COLORS.primaryBlue}, keyboard:{flex:1}, center:{flex:1,alignItems:'center',justifyContent:'center'}, scroll:{flex:1,backgroundColor:BRAND_COLORS.surface}, content:{paddingBottom:SPACING.xl}, header:{padding:SPACING.lg,borderBottomLeftRadius:BORDER_RADIUS.xl,borderBottomRightRadius:BORDER_RADIUS.xl}, backBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'}, headerTitle:{color:'white',fontSize:TYPOGRAPHY.sizes.xl,fontWeight:TYPOGRAPHY.weights.bold as any,marginTop:SPACING.sm}, headerSubtitle:{color:'rgba(255,255,255,.85)',marginTop:4}, card:{margin:SPACING.md,marginBottom:0,borderRadius:BORDER_RADIUS.lg,...SHADOWS.small}, sectionTitle:{fontSize:TYPOGRAPHY.sizes.lg,fontWeight:TYPOGRAPHY.weights.bold as any,color:'#0f2f57'}, divider:{marginVertical:SPACING.sm}, input:{marginBottom:SPACING.sm,backgroundColor:'white'}, actions:{flexDirection:'row',gap:10,padding:SPACING.md}, button:{flex:1} });
