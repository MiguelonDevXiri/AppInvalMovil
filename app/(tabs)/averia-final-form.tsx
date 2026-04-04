import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, RadioButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

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
      // Fotos generales
      if (params.photoGeneral1 && (params.photoGeneral1 as string).trim() !== '') setPhoto1(params.photoGeneral1 as string);
      if (params.photoGeneral2 && (params.photoGeneral2 as string).trim() !== '') setPhoto2(params.photoGeneral2 as string);
      if (params.photoGeneral3 && (params.photoGeneral3 as string).trim() !== '') setPhoto3(params.photoGeneral3 as string);
      if (params.photoGeneral4 && (params.photoGeneral4 as string).trim() !== '') setPhoto4(params.photoGeneral4 as string);
      // Firmas
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

  const handleTakePhoto = async (photoNumber: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        switch (photoNumber) {
          case 1: setPhoto1(uri); break;
          case 2: setPhoto2(uri); break;
          case 3: setPhoto3(uri); break;
          case 4: setPhoto4(uri); break;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const handleChooseFromGallery = async (photoNumber: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        switch (photoNumber) {
          case 1: setPhoto1(uri); break;
          case 2: setPhoto2(uri); break;
          case 3: setPhoto3(uri); break;
          case 4: setPhoto4(uri); break;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        let drawing = false, lastX = 0, lastY = 0;
        function getCoordinates(e) { const rect = canvas.getBoundingClientRect(); const touch = e.touches ? e.touches[0] : e; return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }; }
        function startDrawing(e) { e.preventDefault(); drawing = true; const c = getCoordinates(e); lastX = c.x; lastY = c.y; }
        function draw(e) { if (!drawing) return; e.preventDefault(); const c = getCoordinates(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(c.x, c.y); ctx.stroke(); lastX = c.x; lastY = c.y; }
        function stopDrawing(e) { if (!drawing) return; e.preventDefault(); drawing = false; window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png')); }
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing, { passive: false });
        canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
        document.body.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        window.clearSignature = function() { ctx.clearRect(0, 0, canvas.width, canvas.height); };
      </script>
    </body>
    </html>
  `;

  const handleTechnicianMessage = (event: any) => {
    const sig = event.nativeEvent.data;
    if (sig && sig.startsWith('data:image')) {
      setTechnicianSignature(sig);
      setShowTechnicianSignature(false);
    }
  };

  const handleClientMessage = (event: any) => {
    const sig = event.nativeEvent.data;
    if (sig && sig.startsWith('data:image')) {
      setClientSignature(sig);
      setShowClientSignature(false);
    }
  };

  const handleFinish = () => {
    if (!technicianName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del técnico es obligatorio');
      return;
    }
    if (technicianOption === 'nombre-firma' && !technicianSignature) {
      Alert.alert('Firma requerida', 'Por favor firma antes de continuar');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del cliente es obligatorio para la conformidad');
      return;
    }
    if (clientOption === 'nombre-firma' && !clientSignature) {
      Alert.alert('Firma requerida', 'Por favor el cliente debe firmar antes de continuar');
      return;
    }

    const nextParams = {
      ...params,
      photoGeneral1: photo1 || '',
      photoGeneral2: photo2 || '',
      photoGeneral3: photo3 || '',
      photoGeneral4: photo4 || '',
      technicianName,
      technicianSignature: technicianOption === 'nombre-firma' ? technicianSignature || '' : '',
      clientSignatureName: clientName,
      clientSignature: clientOption === 'nombre-firma' ? clientSignature || '' : '',
    };

    router.push({
      pathname: '/(tabs)/averia-report-view' as any,
      params: nextParams,
    });
  };

  const PhotoSlot = ({ photoNumber, photo, onTakePhoto, onChooseGallery }: {
    photoNumber: number; photo: string | null; onTakePhoto: () => void; onChooseGallery: () => void;
  }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>Foto {photoNumber}</Text>
      {photo ? (
        <TouchableOpacity onPress={onTakePhoto} activeOpacity={0.8}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity style={styles.emptyPhotoThumb} onPress={onTakePhoto} activeOpacity={0.7}>
            <Text style={styles.emptyPhotoIcon}>📷</Text>
            <Text style={styles.emptyPhotoText}>Tomar foto</Text>
          </TouchableOpacity>
          <Button mode="text" onPress={onChooseGallery} style={styles.galleryButton} compact labelStyle={{ fontSize: 11 }}>
            o elegir de galería
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!showTechnicianSignature && !showClientSignature}
        >
          <LinearGradient
            colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Fotos Generales y Firmas</Text>
            <Text style={styles.headerSubtitle}>Paso final: fotos, firma técnico y cliente</Text>
          </LinearGradient>

          {!showTechnicianSignature && !showClientSignature && (
            <>
              {/* Fotos generales */}
              <Card style={styles.photoCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>📸 Fotos Generales de la Máquina</Text>
                  <Divider style={styles.divider} />
                  <View style={styles.photosGrid}>
                    <PhotoSlot photoNumber={1} photo={photo1} onTakePhoto={() => handleTakePhoto(1)} onChooseGallery={() => handleChooseFromGallery(1)} />
                    <PhotoSlot photoNumber={2} photo={photo2} onTakePhoto={() => handleTakePhoto(2)} onChooseGallery={() => handleChooseFromGallery(2)} />
                    <PhotoSlot photoNumber={3} photo={photo3} onTakePhoto={() => handleTakePhoto(3)} onChooseGallery={() => handleChooseFromGallery(3)} />
                    <PhotoSlot photoNumber={4} photo={photo4} onTakePhoto={() => handleTakePhoto(4)} onChooseGallery={() => handleChooseFromGallery(4)} />
                  </View>
                </Card.Content>
              </Card>

              {/* Firma técnico */}
              <Card style={styles.technicianCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>👷 Datos del Técnico</Text>
                  <Divider style={styles.divider} />
                  <TextInput
                    label="Nombre del técnico *"
                    value={technicianName}
                    onChangeText={setTechnicianName}
                    style={styles.input}
                    mode="outlined"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                    placeholder="Nombre completo del técnico"
                  />
                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group onValueChange={v => setTechnicianOption(v as any)} value={technicianOption}>
                    <View style={styles.radioRow}>
                      <RadioButton.Item label="Solo nombre" value="nombre" color={BRAND_COLORS.primaryBlue} style={styles.radioItem} />
                      <RadioButton.Item label="Nombre + Firma" value="nombre-firma" color={BRAND_COLORS.primaryBlue} style={styles.radioItem} />
                    </View>
                  </RadioButton.Group>
                  {technicianOption === 'nombre-firma' && (
                    <>
                      {!technicianSignature ? (
                        <Button mode="outlined" onPress={() => setShowTechnicianSignature(true)} icon="draw" style={styles.signatureButton} textColor={BRAND_COLORS.primaryBlue}>
                          Firmar
                        </Button>
                      ) : (
                        <View style={styles.signaturePreview}>
                          <Text style={styles.signatureText}>✓ Firma capturada</Text>
                          <Button mode="text" onPress={() => setTechnicianSignature(null)} textColor={BRAND_COLORS.error}>Borrar</Button>
                        </View>
                      )}
                    </>
                  )}
                </Card.Content>
              </Card>

              {/* Firma cliente */}
              <Card style={styles.clientCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>✅ Conformidad del Cliente</Text>
                  <Divider style={styles.divider} />
                  <TextInput
                    label="Nombre del cliente *"
                    value={clientName}
                    onChangeText={setClientName}
                    style={styles.input}
                    mode="outlined"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                    placeholder="Nombre completo del cliente que da conformidad"
                  />
                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group onValueChange={v => setClientOption(v as any)} value={clientOption}>
                    <View style={styles.radioRow}>
                      <RadioButton.Item label="Solo nombre" value="nombre" color={BRAND_COLORS.primaryOrange} style={styles.radioItem} />
                      <RadioButton.Item label="Nombre + Firma" value="nombre-firma" color={BRAND_COLORS.primaryOrange} style={styles.radioItem} />
                    </View>
                  </RadioButton.Group>
                  {clientOption === 'nombre-firma' && (
                    <>
                      {!clientSignature ? (
                        <Button mode="outlined" onPress={() => setShowClientSignature(true)} icon="draw" style={styles.signatureButton} textColor={BRAND_COLORS.primaryOrange}>
                          Firmar
                        </Button>
                      ) : (
                        <View style={styles.signaturePreview}>
                          <Text style={styles.signatureText}>✓ Firma capturada</Text>
                          <Button mode="text" onPress={() => setClientSignature(null)} textColor={BRAND_COLORS.error}>Borrar</Button>
                        </View>
                      )}
                    </>
                  )}
                </Card.Content>
              </Card>
            </>
          )}
        </ScrollView>

        {showTechnicianSignature && (
          <View style={styles.signatureFullscreen}>
            <View style={styles.signatureHeader}>
              <Text style={styles.signatureHeaderText}>Firma del Técnico</Text>
              <Text style={styles.signatureHint}>Dibuja tu firma con el dedo</Text>
            </View>
            <View style={styles.signatureCanvasContainer}>
              <WebView ref={technicianWebViewRef} originWhitelist={['*']} source={{ html: signatureHTML }} onMessage={handleTechnicianMessage} javaScriptEnabled scrollEnabled={false} bounces={false} style={styles.webview} />
            </View>
            <View style={styles.signatureFooter}>
              <Button mode="text" onPress={() => setShowTechnicianSignature(false)} textColor={BRAND_COLORS.grayText} style={styles.footerButton}>Cancelar</Button>
              <Button mode="text" onPress={() => { technicianWebViewRef.current?.injectJavaScript('window.clearSignature();'); }} textColor={BRAND_COLORS.primaryOrange} style={styles.footerButton}>Limpiar</Button>
            </View>
          </View>
        )}

        {showClientSignature && (
          <View style={styles.signatureFullscreen}>
            <View style={styles.signatureHeader}>
              <Text style={styles.signatureHeaderText}>Firma del Cliente</Text>
              <Text style={styles.signatureHint}>Dibuja tu firma con el dedo</Text>
            </View>
            <View style={styles.signatureCanvasContainer}>
              <WebView ref={clientWebViewRef} originWhitelist={['*']} source={{ html: signatureHTML }} onMessage={handleClientMessage} javaScriptEnabled scrollEnabled={false} bounces={false} style={styles.webview} />
            </View>
            <View style={styles.signatureFooter}>
              <Button mode="text" onPress={() => setShowClientSignature(false)} textColor={BRAND_COLORS.grayText} style={styles.footerButton}>Cancelar</Button>
              <Button mode="text" onPress={() => { clientWebViewRef.current?.injectJavaScript('window.clearSignature();'); }} textColor={BRAND_COLORS.primaryOrange} style={styles.footerButton}>Limpiar</Button>
            </View>
          </View>
        )}

        {!showTechnicianSignature && !showClientSignature && (
          <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
            <View style={styles.buttonContainer}>
              <Button mode="outlined" style={styles.navButton} onPress={() => router.back()} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue}>
                Volver
              </Button>
              <Button mode="contained" style={styles.navButton} onPress={handleFinish} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.success}>
                Finalizar
              </Button>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backArrow: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  photoCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  photoSlot: { width: '48%', marginBottom: SPACING.sm },
  photoSlotLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.xs, textAlign: 'center' },
  photoThumb: { width: '100%', height: 140, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: BRAND_COLORS.primaryOrange },
  emptyPhotoThumb: { width: '100%', height: 140, backgroundColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BRAND_COLORS.grayMedium, borderStyle: 'dashed' },
  emptyPhotoIcon: { fontSize: 36 },
  emptyPhotoText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText, marginTop: SPACING.xs },
  changePhotoText: { textAlign: 'center', marginTop: SPACING.xs, color: BRAND_COLORS.primaryBlue, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold as any },
  galleryButton: { marginTop: SPACING.xs },
  technicianCard: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue, ...SHADOWS.small },
  clientCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange, ...SHADOWS.small },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: SPACING.md },
  input: { marginBottom: SPACING.md, backgroundColor: 'white' },
  radioLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold as any, marginBottom: SPACING.sm, color: '#1e293b' },
  radioRow: { marginBottom: SPACING.sm },
  radioItem: { paddingVertical: SPACING.xs },
  signatureButton: { marginBottom: SPACING.sm, marginTop: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  signaturePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.sm, backgroundColor: BRAND_COLORS.successLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  signatureText: { color: BRAND_COLORS.success, fontWeight: TYPOGRAPHY.weights.bold as any },
  signatureFullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 1000 },
  signatureHeader: { padding: SPACING.md, backgroundColor: BRAND_COLORS.primaryBlue, alignItems: 'center' },
  signatureHeaderText: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  signatureHint: { fontSize: TYPOGRAPHY.sizes.xs, color: 'white', marginTop: SPACING.xs },
  signatureCanvasContainer: { flex: 1, backgroundColor: 'white' },
  webview: { flex: 1, backgroundColor: 'white' },
  signatureFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: SPACING.md, backgroundColor: BRAND_COLORS.surface, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium },
  footerButton: { minWidth: 120 },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navButton: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
