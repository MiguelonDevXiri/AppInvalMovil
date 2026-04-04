import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, RadioButton, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function AveriaFinalFormScreen() {
  const params = useLocalSearchParams();

  // Fotos generales
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo3, setPhoto3] = useState<string | null>(null);
  const [photo4, setPhoto4] = useState<string | null>(null);

  // Firma técnico
  const [technicianName, setTechnicianName] = useState('');
  const [technicianOption, setTechnicianOption] = useState<'nombre' | 'nombre-firma'>('nombre');
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [showTechnicianSignature, setShowTechnicianSignature] = useState(false);

  // Firma cliente
  const [clientName, setClientName] = useState('');
  const [clientOption, setClientOption] = useState<'nombre' | 'nombre-firma'>('nombre');
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [showClientSignature, setShowClientSignature] = useState(false);

  const technicianWebViewRef = useRef<WebView>(null);
  const clientWebViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (params.isEditing === 'true') {
      if (params.photoGeneral1) setPhoto1(params.photoGeneral1 as string);
      if (params.photoGeneral2) setPhoto2(params.photoGeneral2 as string);
      if (params.photoGeneral3) setPhoto3(params.photoGeneral3 as string);
      if (params.photoGeneral4) setPhoto4(params.photoGeneral4 as string);
      if (params.technicianName) setTechnicianName(params.technicianName as string);
      if (params.clientSignatureName) setClientName(params.clientSignatureName as string);
      if (params.technicianSignature && (params.technicianSignature as string).trim() !== '') {
        setTechnicianSignature(params.technicianSignature as string);
        setTechnicianOption('nombre-firma');
      }
      if (params.clientSignature && (params.clientSignature as string).trim() !== '') {
        setClientSignature(params.clientSignature as string);
        setClientOption('nombre-firma');
      }
    }
  }, []);

  const signatureHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; }
        html, body { width: 100vw; height: 100vh; overflow: hidden; position: fixed; touch-action: none; }
        #signature-pad { position: fixed; left: 0; top: 0; width: 100%; height: 100%; background-color: white; touch-action: none; }
      </style>
    </head>
    <body>
      <canvas id="signature-pad"></canvas>
      <script>
        const canvas = document.getElementById('signature-pad');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        let drawing = false, lastX = 0, lastY = 0;
        function getCoords(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
        function start(e) { e.preventDefault(); drawing = true; const c = getCoords(e); lastX = c.x; lastY = c.y; }
        function draw(e) { if (!drawing) return; e.preventDefault(); const c = getCoords(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(c.x, c.y); ctx.stroke(); lastX = c.x; lastY = c.y; }
        function stop(e) { if (!drawing) return; e.preventDefault(); drawing = false; window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png')); }
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stop, { passive: false });
        canvas.addEventListener('touchcancel', stop, { passive: false });
        document.body.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        window.clearSignature = function() { ctx.clearRect(0, 0, canvas.width, canvas.height); };
      </script>
    </body>
    </html>
  `;

  const handleTakePhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la cámara'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (slot === 1) setPhoto1(uri); else if (slot === 2) setPhoto2(uri);
        else if (slot === 3) setPhoto3(uri); else setPhoto4(uri);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo tomar la foto'); }
  };

  const handlePickPhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para la galería'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (slot === 1) setPhoto1(uri); else if (slot === 2) setPhoto2(uri);
        else if (slot === 3) setPhoto3(uri); else setPhoto4(uri);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo seleccionar la imagen'); }
  };

  const handleFinish = () => {
    if (!technicianName.trim()) { Alert.alert('Campo requerido', 'El nombre del técnico es obligatorio'); return; }
    if (technicianOption === 'nombre-firma' && !technicianSignature) { Alert.alert('Firma requerida', 'Firma antes de continuar'); return; }
    if (!clientName.trim()) { Alert.alert('Campo requerido', 'El nombre del cliente es obligatorio'); return; }
    if (clientOption === 'nombre-firma' && !clientSignature) { Alert.alert('Firma requerida', 'El cliente debe firmar'); return; }

    router.push({
      pathname: '/(tabs)/averia-report-view' as any,
      params: {
        ...params,
        photoGeneral1: photo1 || '',
        photoGeneral2: photo2 || '',
        photoGeneral3: photo3 || '',
        photoGeneral4: photo4 || '',
        technicianName,
        technicianSignature: technicianOption === 'nombre-firma' ? technicianSignature || '' : '',
        clientSignatureName: clientName,
        clientSignature: clientOption === 'nombre-firma' ? clientSignature || '' : '',
      },
    });
  };

  const PhotoSlot = ({ num, photo }: { num: 1|2|3|4; photo: string | null }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>Foto {num}</Text>
      {photo ? (
        <TouchableOpacity onPress={() => handleTakePhoto(num)} activeOpacity={0.8}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity style={styles.emptyPhotoThumb} onPress={() => handleTakePhoto(num)} activeOpacity={0.7}>
            <Text style={{ fontSize: 36 }}>📷</Text>
            <Text style={styles.emptyPhotoText}>Tomar foto</Text>
          </TouchableOpacity>
          <Button mode="text" onPress={() => handlePickPhoto(num)} compact labelStyle={{ fontSize: 11 }}>o elegir de galería</Button>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" scrollEnabled={!showTechnicianSignature && !showClientSignature}>
          <LinearGradient
            colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Fotos y Firmas</Text>
            <Text style={styles.headerSubtitle}>Fotos generales, técnico y conformidad</Text>
          </LinearGradient>

          {!showTechnicianSignature && !showClientSignature && (
            <>
              {/* Fotos generales */}
              <Card style={styles.card}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>📸 Fotos Generales de la Máquina</Title>
                  <Divider style={styles.divider} />
                  <View style={styles.photosGrid}>
                    <PhotoSlot num={1} photo={photo1} />
                    <PhotoSlot num={2} photo={photo2} />
                    <PhotoSlot num={3} photo={photo3} />
                    <PhotoSlot num={4} photo={photo4} />
                  </View>
                </Card.Content>
              </Card>

              {/* Técnico */}
              <Card style={styles.techCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>👷 Datos del Técnico</Text>
                  <Divider style={styles.divider} />
                  <TextInput label="Nombre del técnico *" value={technicianName} onChangeText={setTechnicianName} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" placeholder="Nombre completo" />
                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group onValueChange={v => setTechnicianOption(v as any)} value={technicianOption}>
                    <View style={styles.radioRow}>
                      <RadioButton.Item label="Solo nombre" value="nombre" color="#7c3aed" style={styles.radioItem} />
                      <RadioButton.Item label="Nombre + Firma" value="nombre-firma" color="#7c3aed" style={styles.radioItem} />
                    </View>
                  </RadioButton.Group>
                  {technicianOption === 'nombre-firma' && !technicianSignature && (
                    <Button mode="outlined" onPress={() => setShowTechnicianSignature(true)} icon="draw" style={styles.signatureBtn} textColor="#7c3aed">Firmar</Button>
                  )}
                  {technicianOption === 'nombre-firma' && technicianSignature && (
                    <View style={styles.signaturePreview}>
                      <Text style={styles.signatureText}>✓ Firma capturada</Text>
                      <Button mode="text" onPress={() => setTechnicianSignature(null)} textColor={BRAND_COLORS.error}>Borrar</Button>
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* Cliente */}
              <Card style={styles.clientCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>✅ Conformidad del Cliente</Text>
                  <Divider style={styles.divider} />
                  <TextInput label="Nombre del cliente *" value={clientName} onChangeText={setClientName} style={styles.input} mode="outlined" outlineColor={BRAND_COLORS.grayMedium} activeOutlineColor="#7c3aed" placeholder="Nombre completo" />
                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group onValueChange={v => setClientOption(v as any)} value={clientOption}>
                    <View style={styles.radioRow}>
                      <RadioButton.Item label="Solo nombre" value="nombre" color={BRAND_COLORS.primaryOrange} style={styles.radioItem} />
                      <RadioButton.Item label="Nombre + Firma" value="nombre-firma" color={BRAND_COLORS.primaryOrange} style={styles.radioItem} />
                    </View>
                  </RadioButton.Group>
                  {clientOption === 'nombre-firma' && !clientSignature && (
                    <Button mode="outlined" onPress={() => setShowClientSignature(true)} icon="draw" style={styles.signatureBtn} textColor={BRAND_COLORS.primaryOrange}>Firmar</Button>
                  )}
                  {clientOption === 'nombre-firma' && clientSignature && (
                    <View style={styles.signaturePreview}>
                      <Text style={styles.signatureText}>✓ Firma capturada</Text>
                      <Button mode="text" onPress={() => setClientSignature(null)} textColor={BRAND_COLORS.error}>Borrar</Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </>
          )}
        </ScrollView>

        {/* Signature fullscreen overlays */}
        {showTechnicianSignature && (
          <View style={styles.signatureFullscreen}>
            <View style={styles.signatureHeader}><Text style={styles.signatureHeaderText}>Firma del Técnico</Text><Text style={styles.signatureHint}>Dibuja tu firma con el dedo</Text></View>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
              <WebView ref={technicianWebViewRef} originWhitelist={['*']} source={{ html: signatureHTML }} onMessage={(e) => { const sig = e.nativeEvent.data; if (sig?.startsWith('data:image')) { setTechnicianSignature(sig); setShowTechnicianSignature(false); } }} javaScriptEnabled scrollEnabled={false} bounces={false} style={{ flex: 1, backgroundColor: 'white' }} />
            </View>
            <View style={styles.signatureFooter}>
              <Button mode="text" onPress={() => setShowTechnicianSignature(false)} textColor={BRAND_COLORS.grayText}>Cancelar</Button>
              <Button mode="text" onPress={() => technicianWebViewRef.current?.injectJavaScript('window.clearSignature();')} textColor="#7c3aed">Limpiar</Button>
            </View>
          </View>
        )}
        {showClientSignature && (
          <View style={styles.signatureFullscreen}>
            <View style={styles.signatureHeader}><Text style={styles.signatureHeaderText}>Firma del Cliente</Text><Text style={styles.signatureHint}>Dibuja tu firma con el dedo</Text></View>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
              <WebView ref={clientWebViewRef} originWhitelist={['*']} source={{ html: signatureHTML }} onMessage={(e) => { const sig = e.nativeEvent.data; if (sig?.startsWith('data:image')) { setClientSignature(sig); setShowClientSignature(false); } }} javaScriptEnabled scrollEnabled={false} bounces={false} style={{ flex: 1, backgroundColor: 'white' }} />
            </View>
            <View style={styles.signatureFooter}>
              <Button mode="text" onPress={() => setShowClientSignature(false)} textColor={BRAND_COLORS.grayText}>Cancelar</Button>
              <Button mode="text" onPress={() => clientWebViewRef.current?.injectJavaScript('window.clearSignature();')} textColor="#7c3aed">Limpiar</Button>
            </View>
          </View>
        )}

        {!showTechnicianSignature && !showClientSignature && (
          <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
            <View style={styles.buttonContainer}>
              <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
              <Button mode="contained" style={styles.navBtn} onPress={handleFinish} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.success}>Finalizar</Button>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  card: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  techCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  clientCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.sm },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  photoSlot: { width: '48%', marginBottom: SPACING.sm },
  photoSlotLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed', marginBottom: SPACING.xs, textAlign: 'center' },
  photoThumb: { width: '100%', height: 140, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#c4b5fd' },
  emptyPhotoThumb: { width: '100%', height: 140, backgroundColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BRAND_COLORS.grayMedium, borderStyle: 'dashed' },
  emptyPhotoText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, marginTop: SPACING.xs },
  changePhotoText: { textAlign: 'center', marginTop: SPACING.xs, color: '#7c3aed', fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold as any },
  input: { marginBottom: SPACING.md, backgroundColor: 'white' },
  radioLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold as any, marginBottom: SPACING.sm, color: '#1e293b' },
  radioRow: { marginBottom: SPACING.sm },
  radioItem: { paddingVertical: SPACING.xs },
  signatureBtn: { marginBottom: SPACING.sm, marginTop: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  signaturePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.sm, backgroundColor: BRAND_COLORS.successLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  signatureText: { color: BRAND_COLORS.success, fontWeight: TYPOGRAPHY.weights.bold as any },
  signatureFullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 1000 },
  signatureHeader: { padding: SPACING.md, backgroundColor: '#7c3aed', alignItems: 'center' },
  signatureHeaderText: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  signatureHint: { fontSize: TYPOGRAPHY.sizes.xs, color: 'white', marginTop: SPACING.xs },
  signatureFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: SPACING.md, backgroundColor: BRAND_COLORS.surface, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
