import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, RadioButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BRAND_COLORS } from '../../constants/Colors';

export default function ActecoFinalFormScreen() {
  const params = useLocalSearchParams();
  const [technicianName, setTechnicianName] = useState('');
  const [technicianOption, setTechnicianOption] = useState<'nombre' | 'nombre-firma'>('nombre');
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [showTechnicianSignature, setShowTechnicianSignature] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [clientOption, setClientOption] = useState<'nombre' | 'nombre-firma'>('nombre');
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [showClientSignature, setShowClientSignature] = useState(false);

  const technicianWebViewRef = useRef<WebView>(null);
  const clientWebViewRef = useRef<WebView>(null);

  const signatureHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box;
          -webkit-user-select: none;
          user-select: none;
        }
        html, body { 
          width: 100vw; 
          height: 100vh; 
          overflow: hidden;
          position: fixed;
          touch-action: none;
        }
        #signature-pad {
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: white;
          touch-action: none;
        }
      </style>
    </head>
    <body>
      <canvas id="signature-pad"></canvas>
      <script>
        const canvas = document.getElementById('signature-pad');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let drawing = false;
        let lastX = 0;
        let lastY = 0;
        
        function getCoordinates(e) {
          const rect = canvas.getBoundingClientRect();
          const touch = e.touches ? e.touches[0] : e;
          return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
          };
        }
        
        function startDrawing(e) {
          e.preventDefault();
          e.stopPropagation();
          drawing = true;
          const coords = getCoordinates(e);
          lastX = coords.x;
          lastY = coords.y;
        }
        
        function draw(e) {
          if (!drawing) return;
          e.preventDefault();
          e.stopPropagation();
          
          const coords = getCoordinates(e);
          
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          
          lastX = coords.x;
          lastY = coords.y;
        }
        
        function stopDrawing(e) {
          if (!drawing) return;
          e.preventDefault();
          e.stopPropagation();
          drawing = false;
          
          const dataUrl = canvas.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(dataUrl);
        }
        
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing, { passive: false });
        canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
        
        document.body.addEventListener('touchmove', function(e) {
          e.preventDefault();
        }, { passive: false });
        
        window.clearSignature = function() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
      </script>
    </body>
    </html>
  `;

  const handleTechnicianMessage = (event: any) => {
    const signature = event.nativeEvent.data;
    if (signature && signature.startsWith('data:image')) {
      setTechnicianSignature(signature);
      setShowTechnicianSignature(false);
    }
  };

  const handleClientMessage = (event: any) => {
    const signature = event.nativeEvent.data;
    if (signature && signature.startsWith('data:image')) {
      setClientSignature(signature);
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
      technicianName: technicianName,
      technicianSignature: technicianOption === 'nombre-firma' ? technicianSignature || '' : '',
      clientSignatureName: clientName,
      clientSignature: clientOption === 'nombre-firma' ? clientSignature || '' : '',
    };

    router.push({
      pathname: '/(tabs)/acteco-report-view' as any,
      params: nextParams
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!showTechnicianSignature && !showClientSignature}
        >
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.headerTitle}>Datos Finales</Text>
              <Text style={styles.headerSubtitle}>Información del técnico y conformidad del cliente</Text>
            </Card.Content>
          </Card>

          {!showTechnicianSignature && !showClientSignature && (
            <>
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
                    outlineColor={BRAND_COLORS.primaryBlue}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                    placeholder="Nombre completo del técnico"
                  />

                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group 
                    onValueChange={value => setTechnicianOption(value as 'nombre' | 'nombre-firma')} 
                    value={technicianOption}
                  >
                    <View style={styles.radioRow}>
                      <RadioButton.Item 
                        label="Solo nombre" 
                        value="nombre" 
                        color={BRAND_COLORS.primaryBlue}
                        style={styles.radioItem}
                      />
                      <RadioButton.Item 
                        label="Nombre + Firma" 
                        value="nombre-firma" 
                        color={BRAND_COLORS.primaryBlue}
                        style={styles.radioItem}
                      />
                    </View>
                  </RadioButton.Group>

                  {technicianOption === 'nombre-firma' && (
                    <>
                      {!technicianSignature && (
                        <Button
                          mode="outlined"
                          onPress={() => setShowTechnicianSignature(true)}
                          icon="draw"
                          style={styles.signatureButton}
                          color={BRAND_COLORS.primaryBlue}
                        >
                          Firmar
                        </Button>
                      )}

                      {technicianSignature && (
                        <View style={styles.signaturePreview}>
                          <Text style={styles.signatureText}>✓ Firma capturada</Text>
                          <Button
                            mode="text"
                            onPress={() => setTechnicianSignature(null)}
                            color="#F44336"
                          >
                            Borrar
                          </Button>
                        </View>
                      )}
                    </>
                  )}
                </Card.Content>
              </Card>

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
                    outlineColor={BRAND_COLORS.primaryBlue}
                    activeOutlineColor={BRAND_COLORS.primaryBlue}
                    placeholder="Nombre completo del cliente que da conformidad"
                  />

                  <Text style={styles.radioLabel}>¿Incluir firma?</Text>
                  <RadioButton.Group 
                    onValueChange={value => setClientOption(value as 'nombre' | 'nombre-firma')} 
                    value={clientOption}
                  >
                    <View style={styles.radioRow}>
                      <RadioButton.Item 
                        label="Solo nombre" 
                        value="nombre" 
                        color={BRAND_COLORS.primaryOrange}
                        style={styles.radioItem}
                      />
                      <RadioButton.Item 
                        label="Nombre + Firma" 
                        value="nombre-firma" 
                        color={BRAND_COLORS.primaryOrange}
                        style={styles.radioItem}
                      />
                    </View>
                  </RadioButton.Group>

                  {clientOption === 'nombre-firma' && (
                    <>
                      {!clientSignature && (
                        <Button
                          mode="outlined"
                          onPress={() => setShowClientSignature(true)}
                          icon="draw"
                          style={styles.signatureButton}
                          color={BRAND_COLORS.primaryOrange}
                        >
                          Firmar
                        </Button>
                      )}

                      {clientSignature && (
                        <View style={styles.signaturePreview}>
                          <Text style={styles.signatureText}>✓ Firma capturada</Text>
                          <Button
                            mode="text"
                            onPress={() => setClientSignature(null)}
                            color="#F44336"
                          >
                            Borrar
                          </Button>
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
              <WebView
                ref={technicianWebViewRef}
                originWhitelist={['*']}
                source={{ html: signatureHTML }}
                onMessage={handleTechnicianMessage}
                javaScriptEnabled={true}
                scrollEnabled={false}
                bounces={false}
                style={styles.webview}
              />
            </View>
            <View style={styles.signatureFooter}>
              <Button
                mode="text"
                onPress={() => setShowTechnicianSignature(false)}
                color="#666"
                style={styles.footerButton}
              >
                Cancelar
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  if (technicianWebViewRef.current) {
                    technicianWebViewRef.current.injectJavaScript('window.clearSignature();');
                  }
                }}
                color={BRAND_COLORS.primaryOrange}
                style={styles.footerButton}
              >
                Limpiar
              </Button>
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
              <WebView
                ref={clientWebViewRef}
                originWhitelist={['*']}
                source={{ html: signatureHTML }}
                onMessage={handleClientMessage}
                javaScriptEnabled={true}
                scrollEnabled={false}
                bounces={false}
                style={styles.webview}
              />
            </View>
            <View style={styles.signatureFooter}>
              <Button
                mode="text"
                onPress={() => setShowClientSignature(false)}
                color="#666"
                style={styles.footerButton}
              >
                Cancelar
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  if (clientWebViewRef.current) {
                    clientWebViewRef.current.injectJavaScript('window.clearSignature();');
                  }
                }}
                color={BRAND_COLORS.primaryOrange}
                style={styles.footerButton}
              >
                Limpiar
              </Button>
            </View>
          </View>
        )}

        {!showTechnicianSignature && !showClientSignature && (
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={styles.backButton}
              onPress={() => router.back()}
              icon="arrow-left"
            >
              Volver
            </Button>

            <Button 
              mode="contained" 
              style={styles.finishButton}
              onPress={handleFinish}
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              Finalizar
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  headerCard: { marginBottom: 16, backgroundColor: BRAND_COLORS.primaryBlue },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'white', textAlign: 'center', marginTop: 4 },
  technicianCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue },
  clientCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, marginBottom: 8 },
  divider: { backgroundColor: BRAND_COLORS.primaryOrange, height: 1, marginBottom: 16 },
  input: { marginBottom: 16, backgroundColor: 'white' },
  radioLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  radioRow: { marginBottom: 12 },
  radioItem: { paddingVertical: 4 },
  signatureButton: { marginBottom: 12, marginTop: 8 },
  signaturePreview: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#E8F5E9', 
    borderRadius: 4, 
    marginTop: 8,
    marginBottom: 12 
  },
  signatureText: { color: '#4CAF50', fontWeight: 'bold' },
  
  signatureFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  signatureHeader: {
    padding: 16,
    backgroundColor: BRAND_COLORS.primaryBlue,
    alignItems: 'center',
  },
  signatureHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  signatureHint: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
  },
  signatureCanvasContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  webview: { 
    flex: 1,
    backgroundColor: 'white',
  },
  signatureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerButton: {
    minWidth: 120,
  },
  
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#e0e0e0' 
  },
  backButton: { flex: 1, marginRight: 8, borderColor: BRAND_COLORS.primaryBlue },
  finishButton: { flex: 1, marginLeft: 8, backgroundColor: '#4CAF50' },
});