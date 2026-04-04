import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { type AveriaInspection } from './averiasInspectionStorage';

// ✨ Generar nombre de archivo personalizado
const generateFileName = (inspection: AveriaInspection): string => {
  try {
    const cleanClient = inspection.clientName
      .trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
    const cleanLocation = inspection.location
      .trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
    const cleanDate = inspection.avisoDate.replace(/\//g, '-').replace(/\s+/g, '');
    const cleanTime = inspection.avisoTime.replace(/:/g, '-').replace(/\s+/g, '');
    return `${cleanClient}_AVERIAS_${cleanLocation}_${cleanDate}_${cleanTime}.pdf`;
  } catch (error) {
    return `AVERIAS_${new Date().getTime()}.pdf`;
  }
};

const isRemoteUri = (uri: string): boolean => uri.startsWith('http://') || uri.startsWith('https://');

const ensureLocalImageUri = async (uri: string): Promise<string> => {
  if (!uri) return uri;
  if (!isRemoteUri(uri)) return uri;
  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}averias_report_img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(uri, targetPath);
  return downloadResult.uri;
};

const getImageBase64 = async (uri: string, maxWidth: number = 250): Promise<string> => {
  try {
    if (!uri) return '';
    if (uri.startsWith('data:image')) return uri;

    const localUri = await ensureLocalImageUri(uri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return '';

    const resizedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error procesando imagen:', error);
    return '';
  }
};

const getLogoBase64 = (): string => {
  // Logo INVAL en base64 mínimo (placeholder)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

// Generar HTML del informe
const generateAveriasHTML = async (inspection: AveriaInspection): Promise<string> => {
  try {
    const logoBase64 = getLogoBase64();

    // Procesar fotos generales en paralelo
    const generalSources = [inspection.photoGeneral1, inspection.photoGeneral2, inspection.photoGeneral3, inspection.photoGeneral4].filter(Boolean) as string[];
    const generalPromises = generalSources.map(src => getImageBase64(src).catch(() => ''));

    // Procesar fotos de defectos en paralelo
    const allDefectPhotoPromises: Promise<string[]>[] = (inspection.defects || []).map(async (defect) => {
      if (!defect.photos || defect.photos.length === 0) return [];
      const results = await Promise.all(defect.photos.map(p => getImageBase64(p).catch(() => '')));
      return results.filter(img => img !== '');
    });

    // Procesar fotos de solución en paralelo
    const solucionPhotoPromises = (inspection.solucionPhotos || []).map(p => getImageBase64(p).catch(() => ''));

    // Procesar firmas
    const signaturePromises = [
      inspection.technicianSignature ? getImageBase64(inspection.technicianSignature, 200).catch(() => '') : Promise.resolve(''),
      inspection.clientSignature ? getImageBase64(inspection.clientSignature, 200).catch(() => '') : Promise.resolve(''),
    ];

    const [generalResults, defectPhotoResults, solucionPhotoResults, signatureResults] = await Promise.all([
      Promise.all(generalPromises),
      Promise.all(allDefectPhotoPromises),
      Promise.all(solucionPhotoPromises),
      Promise.all(signaturePromises),
    ]);

    const photosGeneral = generalResults.filter(img => img !== '');
    const photosSolucion = solucionPhotoResults.filter(img => img !== '');
    const [technicianSigBase64, clientSigBase64] = signatureResults;

    // Parsear materiales
    const materiales = inspection.materiales || [];

    // ======= HTML =======
    let html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  @page { margin: 20mm 15mm; size: A4; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4; }
  .header { display: flex; align-items: center; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; margin-bottom: 15px; }
  .header img { height: 50px; margin-right: 15px; }
  .header-text { flex: 1; }
  .header-title { font-size: 18px; font-weight: bold; color: #7c3aed; }
  .header-subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
  .section { margin-bottom: 15px; break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: bold; color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; margin-bottom: 8px; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
  .info-table td:first-child { font-weight: bold; color: #64748b; width: 140px; }
  .photos-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .photos-grid img { width: 160px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
  .defect-block { margin-bottom: 12px; padding: 8px; background: #faf5ff; border-left: 3px solid #7c3aed; border-radius: 4px; }
  .defect-title { font-weight: bold; color: #7c3aed; margin-bottom: 4px; }
  .materials-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .materials-table th { background: #7c3aed; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  .materials-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  .materials-table tr:nth-child(even) { background: #f8fafc; }
  .signature-block { display: inline-block; width: 45%; vertical-align: top; margin-right: 4%; text-align: center; }
  .signature-block img { max-width: 180px; height: 80px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; background: white; }
  .signature-name { font-weight: bold; margin-top: 4px; }
  .footer { text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 20px; }
</style>
</head><body>

<div class="header">
  <img src="${logoBase64}" alt="Logo" />
  <div class="header-text">
    <div class="header-title">INFORME DE AVERÍAS</div>
    <div class="header-subtitle">INVAL - Servicio Técnico de Maquinaria</div>
  </div>
</div>

<!-- DATOS DEL CLIENTE -->
<div class="section">
  <div class="section-title">DATOS DEL CLIENTE</div>
  <table class="info-table">
    <tr><td>Cliente</td><td>${inspection.clientName}</td></tr>
    <tr><td>Fecha / Hora</td><td>${inspection.avisoDate} ${inspection.avisoTime}</td></tr>
    <tr><td>Ubicación</td><td>${inspection.location}</td></tr>
    ${inspection.requestedBy ? `<tr><td>Pedido por</td><td>${inspection.requestedBy}</td></tr>` : ''}
  </table>
</div>

<!-- DATOS DE LA MÁQUINA -->
<div class="section">
  <div class="section-title">DATOS DE LA MÁQUINA</div>
  <table class="info-table">
    <tr><td>Tipo</td><td>${inspection.machineType}</td></tr>
    ${inspection.machineBrand ? `<tr><td>Marca</td><td>${inspection.machineBrand}</td></tr>` : ''}
    ${inspection.machineModel ? `<tr><td>Modelo</td><td>${inspection.machineModel}</td></tr>` : ''}
    ${inspection.serialNumber ? `<tr><td>Nº Serie</td><td>${inspection.serialNumber}</td></tr>` : ''}
    ${inspection.licensePlate ? `<tr><td>Matrícula</td><td>${inspection.licensePlate}</td></tr>` : ''}
  </table>
</div>`;

    // AVERÍAS DETECTADAS
    const defects = inspection.defects || [];
    if (defects.length > 0) {
      html += `
<div class="section">
  <div class="section-title">AVERÍAS DETECTADAS (${defects.length})</div>`;
      for (let i = 0; i < defects.length; i++) {
        const defect = defects[i];
        const defectPhotos = defectPhotoResults[i] || [];
        html += `
  <div class="defect-block">
    <div class="defect-title">Avería #${i + 1}</div>
    <p>${defect.description || 'Sin descripción'}</p>`;
        if (defectPhotos.length > 0) {
          html += `<div class="photos-grid">`;
          for (const photo of defectPhotos) {
            html += `<img src="${photo}" />`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    // INTERVENCIÓN / SOLUCIÓN
    if (inspection.solucionDescription || photosSolucion.length > 0) {
      html += `
<div class="section">
  <div class="section-title">INTERVENCIÓN / SOLUCIÓN</div>`;
      if (inspection.solucionDescription) {
        html += `<p>${inspection.solucionDescription}</p>`;
      }
      if (photosSolucion.length > 0) {
        html += `<div class="photos-grid">`;
        for (const photo of photosSolucion) {
          html += `<img src="${photo}" />`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    // MATERIALES
    if (materiales.length > 0) {
      html += `
<div class="section">
  <div class="section-title">MATERIALES UTILIZADOS</div>
  <table class="materials-table">
    <tr><th>Material</th><th>Cantidad</th><th>Referencia</th></tr>`;
      for (const m of materiales) {
        html += `<tr><td>${m.name}</td><td>${m.quantity}</td><td>${m.reference || ''}</td></tr>`;
      }
      html += `</table></div>`;
    }

    // FOTOS GENERALES
    if (photosGeneral.length > 0) {
      html += `
<div class="section">
  <div class="section-title">FOTOS GENERALES</div>
  <div class="photos-grid">`;
      for (const photo of photosGeneral) {
        html += `<img src="${photo}" />`;
      }
      html += `</div></div>`;
    }

    // FIRMAS
    html += `
<div class="section">
  <div class="section-title">FIRMAS</div>
  <div>
    <div class="signature-block">
      <p style="font-size:10px;color:#64748b;">Técnico</p>
      <div class="signature-name">${inspection.technicianName}</div>
      ${technicianSigBase64 ? `<img src="${technicianSigBase64}" />` : '<p style="color:#94a3b8;font-style:italic;">Sin firma</p>'}
    </div>
    <div class="signature-block">
      <p style="font-size:10px;color:#64748b;">Cliente</p>
      <div class="signature-name">${inspection.clientSignatureName}</div>
      ${clientSigBase64 ? `<img src="${clientSigBase64}" />` : '<p style="color:#94a3b8;font-style:italic;">Sin firma</p>'}
    </div>
  </div>
</div>

<div class="footer">
  Documento generado automáticamente por INVAL App — ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
</div>

</body></html>`;

    return html;
  } catch (error) {
    console.error('❌ Error generando HTML:', error);
    throw error;
  }
};

// Función principal: generar y compartir PDF
export const shareAveriasPDFReport = async (inspection: AveriaInspection, onProgress?: (percent: number, text: string) => void): Promise<boolean> => {
  try {
    console.log('🚀 Generando PDF del informe de averías...');

    onProgress?.(15, 'Procesando fotos...');
    const reportHTML = await generateAveriasHTML(inspection);
    onProgress?.(50, 'Generando PDF...');

    const customFileName = generateFileName(inspection);

    const { uri: pdfUri } = await Print.printToFileAsync({
      html: reportHTML,
      width: 595,
      height: 842,
      base64: false,
    });

    // Renombrar PDF
    const fileUri = `${FileSystem.documentDirectory}${customFileName}`;
    try {
      await FileSystem.moveAsync({ from: pdfUri, to: fileUri });
    } catch (moveError) {
      console.warn('⚠️ No se pudo renombrar, usando nombre original');
    }

    const finalUri = await FileSystem.getInfoAsync(fileUri).then(info =>
      info.exists ? fileUri : pdfUri
    );

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'El compartir no está disponible en este dispositivo');
        return false;
      }

      // Subir PDF a Supabase Storage
      onProgress?.(88, 'Subiendo PDF a la nube...');
      try {
        const pdfBase64ForUpload = await FileSystem.readAsStringAsync(finalUri, { encoding: FileSystem.EncodingType.Base64 });
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        const pdfStoragePath = `averias/${sanitize(inspection.location)}_${sanitize(inspection.avisoDate)}/informe_${customFileName}`;
        await supabase.storage.from('inspection-photos').upload(pdfStoragePath, decode(pdfBase64ForUpload), {
          contentType: 'application/pdf',
          upsert: true,
        });
        console.log('PDF Averías subido a Supabase Storage');
      } catch (uploadErr) {
        console.warn('No se pudo subir el PDF a Supabase (no crítico):', uploadErr);
      }

      onProgress?.(90, 'Abriendo compartir...');
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Inspección AVERÍAS - ${inspection.clientName}`,
        UTI: 'com.adobe.pdf',
      });

      Alert.alert('Informe generado', `PDF generado: ${customFileName}`, [{ text: 'OK' }]);
      return true;
    } else {
      window.open(finalUri, '_blank');
      return true;
    }
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    Alert.alert('Error al generar informe', `Ocurrió un problema: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return false;
  }
};

export default {
  generateAveriasHTML,
  shareAveriasPDFReport,
};
