import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { getLogoBase64 } from './instalacionesReportGenerator';
import { renderSafetySummaryHTML, type SafetyChecklist } from './safetyChecklist';

// Tipo para el reporte ACTECO
interface ActecoReportData {
  id?: string;
  clientName: string;
  avisoDate: string;
  avisoTime: string;
  location: string;
  requestedBy: string;
  machineType: string;
  brand: string;
  model: string;
  serialNumber: string;
  licensePlate?: string;
  photoGeneral1?: string;
  photoGeneral2?: string;
  photoGeneral3?: string;
  photoGeneral4?: string;
  hasAveria: string;
  avisoAveria: string;
  averiaDetectada: string;
  causaAveria: string;
  averiaPhotos: string[];
  tieneSolucion: string;
  observaciones: string;
  safetyChecklist?: SafetyChecklist | null;
  materiales: string;
  technicianName: string;
  technicianSignature: string;
  clientSignatureName: string;
  clientSignature: string;
}

// ✨ FUNCIÓN PARA GENERAR NOMBRE DE ARCHIVO PERSONALIZADO
const generateFileName = (report: ActecoReportData): string => {
  try {
    // Limpiar y formatear cliente (eliminar espacios, caracteres especiales)
    const cleanClient = report.clientName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase();
    
    // Limpiar y formatear ubicación
    const cleanLocation = report.location
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 30); // Limitar longitud
    
    // Formatear fecha (DD/MM/YYYY → DD-MM-YYYY)
    const cleanDate = report.avisoDate
      .replace(/\//g, '-')
      .replace(/\s+/g, '');
    
    // Construir nombre: Cliente_URGENCIAS_Ubicacion_Fecha.pdf
    const fileName = `${cleanClient}_URGENCIAS_${cleanLocation}_${cleanDate}.pdf`;
    
    console.log('📄 Nombre de archivo generado:', fileName);
    return fileName;
  } catch (error) {
    console.error('❌ Error generando nombre de archivo:', error);
    // Fallback a nombre genérico
    return `URGENCIAS_${new Date().getTime()}.pdf`;
  }
};

const isRemoteUri = (uri: string): boolean => uri.startsWith('http://') || uri.startsWith('https://');

const ensureLocalImageUri = async (uri: string): Promise<string> => {
  if (!uri) return uri;
  if (!isRemoteUri(uri)) return uri;

  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}acteco_report_img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(uri, targetPath);
  return downloadResult.uri;
};

const getImageBase64 = async (uri: string, maxWidth: number = 250): Promise<string> => {
  try {
    if (!uri) {
      console.log('❌ URI vacía');
      return '';
    }
    
    // Si ya es base64, devolverla directamente
    if (uri.startsWith('data:image')) {
      console.log('✅ Ya es base64, devolviendo directamente');
      return uri;
    }

    const localUri = await ensureLocalImageUri(uri);
    
    console.log(`📸 Procesando imagen desde file: ${uri.substring(0, 80)}...`);
    
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      console.warn('⚠️ La imagen no existe:', uri);
      return '';
    }

    console.log(`✅ Imagen existe, redimensionando a ${maxWidth}px...`);

    const resizedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64
    });

    console.log(`✅ Imagen convertida a base64 (${base64.length} chars)`);
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('❌ Error al convertir imagen:', error);
    return '';
  }
};

const getImagesBase64Sequential = async (uris: string[], maxWidth?: number): Promise<string[]> => {
  const results: string[] = [];
  for (const uri of uris) {
    const image = await getImageBase64(uri, maxWidth).catch(() => '');
    if (image) results.push(image);
  }
  return results;
};


export const generateActecoHTML = async (report: ActecoReportData): Promise<string> => {
  try {
    console.log('=== INICIANDO GENERACIÓN DE PDF ===');
    console.log('📋 Cliente:', report.clientName);
    console.log('📋 Técnico:', report.technicianName);
    
    const logoBase64 = getLogoBase64();
    
    // Procesar fotos de forma secuencial para evitar picos de memoria en Android.
    const generalSources = [report.photoGeneral1, report.photoGeneral2, report.photoGeneral3, report.photoGeneral4].filter(Boolean) as string[];
    const photosGeneral = await getImagesBase64Sequential(generalSources);
    const photosAveria = await getImagesBase64Sequential(
      report.averiaPhotos && Array.isArray(report.averiaPhotos) ? report.averiaPhotos : []
    );

    console.log(`📸 Fotos generales: ${photosGeneral.length}`);
    console.log(`📸 Fotos de avería: ${photosAveria.length}`);
    
    // ✅ PROCESAR FIRMAS - CRÍTICO
    console.log('');
    console.log('=== PROCESANDO FIRMAS ===');
    console.log('✍️ Firma técnico recibida:', report.technicianSignature ? 'SÍ' : 'NO');
    console.log('✍️ Longitud firma técnico:', report.technicianSignature?.length || 0);
    console.log('✍️ Primeros 100 chars técnico:', report.technicianSignature?.substring(0, 100) || 'vacío');
    
    console.log('✍️ Firma cliente recibida:', report.clientSignature ? 'SÍ' : 'NO');
    console.log('✍️ Longitud firma cliente:', report.clientSignature?.length || 0);
    console.log('✍️ Primeros 100 chars cliente:', report.clientSignature?.substring(0, 100) || 'vacío');
    
    let firmaTenico = '';
    let firmaCliente = '';
    
    // Procesar firma técnico
    if (report.technicianSignature && report.technicianSignature.trim() !== '') {
      firmaTenico = await getImageBase64(report.technicianSignature, 300);
      console.log('✅ Firma técnico procesada:', firmaTenico ? `SÍ (${firmaTenico.length} chars)` : 'NO');
    } else {
      console.log('⚠️ Firma técnico vacía o no proporcionada');
    }
    
    // Procesar firma cliente
    if (report.clientSignature && report.clientSignature.trim() !== '') {
      firmaCliente = await getImageBase64(report.clientSignature, 300);
      console.log('✅ Firma cliente procesada:', firmaCliente ? `SÍ (${firmaCliente.length} chars)` : 'NO');
    } else {
      console.log('⚠️ Firma cliente vacía o no proporcionada');
    }
    
    console.log('=== FIN PROCESADO FIRMAS ===');
    console.log('');
    
    // ✅ PROCESAR MATERIALES
    let materialesRows = '<tr><td colspan="2" style="text-align: center; color: #999; font-style: italic;">Sin materiales registrados</td></tr>';
    
    if (report.materiales) {
      try {
        const materialesArray = typeof report.materiales === 'string' 
          ? JSON.parse(report.materiales) 
          : report.materiales;
        
        if (Array.isArray(materialesArray) && materialesArray.length > 0) {
          materialesRows = materialesArray
            .filter((m: any) => m.name || m.material || m.quantity || m.cantidad)
            .map((m: any) => {
              const cantidad = m.quantity || m.cantidad || '-';
              const material = m.name || m.material || '-';
              return `
                <tr>
                  <td style="text-align: center;">${cantidad}</td>
                  <td>${material}</td>
                </tr>
              `;
            })
            .join('');
        }
      } catch (e) {
        console.error('Error al parsear materiales:', e);
      }
    }
    
    // ✅ GENERAR HTML DE FOTOS GENERALES
    let fotosGeneralesHTML = '';
    if (photosGeneral.length > 0) {
      fotosGeneralesHTML = `
        <div class="photos-grid">
          ${photosGeneral.map((photo, index) => `
            <div class="photo-item">
              <div class="photo-section">
                <div class="photo-title">📸 Foto General ${photosGeneral.length > 1 ? (index + 1) : ''}</div>
                <div class="photo-container">
                  <img src="${photo}" class="photo" alt="Foto General ${index + 1}" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    // ✅ GENERAR HTML DE FOTOS DE AVERÍA
    let fotosAveriaHTML = '';
    if (photosAveria.length > 0) {
      fotosAveriaHTML = `
        <div class="photos-grid">
          ${photosAveria.map((photo, index) => `
            <div class="photo-item">
              <div class="photo-section">
                <div class="photo-title">📸 Foto Avería ${photosAveria.length > 1 ? (index + 1) : ''}</div>
                <div class="photo-container">
                  <img src="${photo}" class="photo" alt="Foto Avería ${index + 1}" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    const safetySummaryHTML = renderSafetySummaryHTML(report.safetyChecklist);
    
    console.log('✅ HTML generado correctamente');
    console.log('✍️ Firma técnico en HTML:', firmaTenico ? 'INCLUIDA' : 'NO INCLUIDA');
    console.log('✍️ Firma cliente en HTML:', firmaCliente ? 'INCLUIDA' : 'NO INCLUIDA');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 15mm;
            line-height: 1.5;
            font-size: 11px;
            color: #1f2937;
            background-color: white;
            position: relative;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          body::before {
            content: "";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            background-image: url('${logoBase64}');
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            width: 500px;
            height: 500px;
            opacity: 0.04;
            z-index: -1;
            pointer-events: none;
          }
          
          .header {
            background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #173f73 70%, #1a4a85 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(15, 47, 87, 0.25);
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .logo-container {
            width: 78px;
            height: 78px;
            background: white;
            border-radius: 50%;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          
          .logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            display: block;
          }
          
          .header-text h1 {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          
          .header-text p {
            font-size: 11px;
            color: #c5d8ef;
          }
          
          .header-right {
            text-align: right;
            font-size: 9px;
            line-height: 1.6;
            color: #c5d8ef;
          }
          
          .header-right .company-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
            color: #ffffff;
          }
          
          .info-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .info-column {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          }
          
          .column-header {
            background: linear-gradient(135deg, #0f2f57 0%, #173f73 100%);
            color: white;
            padding: 8px 13px;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
            border-bottom: 3px solid #e87a20;
          }

          .column-header.orange {
            background: linear-gradient(135deg, #e87a20 0%, #c2410c 100%);
            border-bottom: 3px solid #0f2f57;
          }
          
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .info-table td {
            padding: 8px 10px;
            border-bottom: 0.5px solid #e2e8f0;
          }
          
          .info-table tr:last-child td {
            border-bottom: none;
          }

          .info-table tr:nth-child(even) td {
            background: #f1f5f9;
          }
          
          .info-table td.label {
            font-size: 9px;
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            width: 35%;
          }

          .info-table td.value {
            font-size: 12px;
            font-weight: bold;
            color: #111827;
            width: 65%;
          }

          .info-table tr:nth-child(even) td.label {
            background: #f1f5f9;
          }
          
          .section {
            margin: 12px 0;
            page-break-inside: avoid;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }

          .section-header {
            background: linear-gradient(135deg, #0f2f57 0%, #173f73 100%);
            color: white;
            padding: 8px 13px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-left: 4px solid #e87a20;
          }

          .section-header.orange {
            background: linear-gradient(135deg, #e87a20 0%, #c2410c 100%);
            border-left: 4px solid #0f2f57;
          }
          
          .section-content {
            padding: 12px 14px;
            min-height: 40px;
            line-height: 1.5;
            color: #374151;
            font-size: 11px;
          }
          
          .section-content.empty {
            color: #9ca3af;
            font-style: italic;
          }
          
          .photos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          
          .photo-item {
            page-break-inside: avoid;
          }
          
          .photo-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }

          .photo-title {
            font-weight: bold;
            font-size: 9px;
            color: #0f2f57;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            text-align: center;
          }

          .photo-container {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px;
            text-align: center;
          }
          
          .photo {
            max-width: 100%;
            width: 100%;
            height: auto;
            max-height: 180px;
            display: block;
            margin: 0 auto;
            border-radius: 8px;
            object-fit: contain;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }
          
          .solution-container {
            display: flex;
            gap: 30px;
            justify-content: center;
            align-items: center;
            padding: 15px;
          }
          
          .solution-option {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: bold;
          }
          
          .checkbox {
            width: 22px;
            height: 22px;
            border: 2px solid #0f2f57;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
          }
          
          .checkbox.checked {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            border-color: #16a34a;
          }
          
          .checkbox.checked::before {
            content: "✓";
            color: white;
            font-size: 18px;
            font-weight: bold;
          }
          
          .solution-yes { color: #16a34a; }
          .solution-no { color: #dc2626; }
          
          .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
          }
          
          .materials-table thead {
            background: linear-gradient(90deg, #0f2f57 0%, #173f73 60%, #e87a20 100%);
            color: white;
          }
          
          .materials-table th {
            padding: 10px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .materials-table td {
            padding: 10px 12px;
            border-bottom: 0.5px solid #e2e8f0;
            background: white;
            font-size: 11px;
          }
          
          .materials-table tbody tr:nth-child(even) td {
            background: #f8fafc;
          }
          
          .signatures-section {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            page-break-inside: avoid;
          }
          
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }
          
          .signature-label {
            font-weight: bold;
            color: #0f2f57;
            margin-bottom: 15px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .signature-image-container {
            min-height: 100px;
            max-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 15px;
            padding: 10px;
            overflow: hidden;
          }
          
          .signature-image {
            max-width: 100%;
            max-height: 100px;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
          }
          
          .signature-placeholder {
            color: #d1d5db;
            font-style: italic;
            font-size: 11px;
            font-weight: normal;
          }
          
          .signature-line {
            border-top: 2px solid #1f2937;
            margin: 10px 20px 15px 20px;
          }
          
          .signature-name {
            font-size: 11px;
            color: #1f2937;
            font-weight: bold;
            margin-top: 5px;
          }
          
          .footer {
            margin-top: 28px;
            text-align: center;
            font-size: 8px;
            color: #6b7280;
            padding-top: 0;
            page-break-inside: avoid;
          }

          .footer-separator {
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #e87a20 20%, #0f2f57 80%, transparent 100%);
            border-radius: 2px;
            margin-bottom: 14px;
          }

          .footer-logo-container {
            margin-bottom: 8px;
          }

          .footer-logo {
            max-width: 110px;
            max-height: 40px;
            object-fit: contain;
            opacity: 0.85;
          }

          .footer-address {
            font-size: 8px;
            color: #374151;
            font-weight: bold;
            line-height: 1.5;
            margin-bottom: 10px;
          }

          .footer-text {
            font-size: 6.5px;
            color: #9ca3af;
            line-height: 1.4;
            text-align: justify;
            padding: 0 15px;
          }
          
          @page {
            margin: 15mm;
            size: A4;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .section,
            .photo-section,
            .signatures-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div class="logo-container">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo INVAL" />` : '<div style="color: #0f2f57; font-weight: bold; font-size: 16px;">INVAL</div>'}
            </div>
            <div class="header-text">
              <h1>INFORME INSPECCIÓN</h1>
              <p>Mantenimientos y Reparaciones</p>
            </div>
          </div>
          <div class="header-right">
            <div class="company-name">INVAL M.S.L.</div>
            <div>Mantenimientos y Reparaciones</div>
            <div>Tel: 647 752 523</div>
            <div>gerencia@inval-sl.com</div>
          </div>
        </div>
        
        <div class="info-container">
          <div class="info-column">
            <div class="column-header">📋 DATOS DEL CLIENTE</div>
            <table class="info-table">
              <tr>
                <td class="label">Cliente:</td>
                <td class="value">${report.clientName || '-'}</td>
              </tr>
              <tr>
                <td class="label">Fecha:</td>
                <td class="value">${report.avisoDate || '-'}</td>
              </tr>
              <tr>
                <td class="label">Ubicación:</td>
                <td class="value">${report.location || '-'}</td>
              </tr>
              <tr>
                <td class="label">Pedido por:</td>
                <td class="value">${report.requestedBy || '-'}</td>
              </tr>
            </table>
          </div>
          
          <div class="info-column">
            <div class="column-header orange">⚙️ DATOS DE LA MÁQUINA</div>
            <table class="info-table">
              <tr>
                <td class="label">Tipo:</td>
                <td class="value">${report.machineType || '-'}</td>
              </tr>
              <tr>
                <td class="label">Marca:</td>
                <td class="value">${report.brand || '-'}</td>
              </tr>
              <tr>
                <td class="label">Modelo:</td>
                <td class="value">${report.model || '-'}</td>
              </tr>
              <tr>
                <td class="label">Nº Serie:</td>
                <td class="value">${report.serialNumber || '-'}</td>
              </tr>
              <tr>
                <td class="label">Matrícula:</td>
                <td class="value">${report.licensePlate || '-'}</td>
              </tr>
            </table>
          </div>
        </div>
        
        ${fotosGeneralesHTML}
        
        <div class="section">
          <div class="section-header">📋 AVISO DE AVERÍA</div>
          <div class="section-content ${!report.avisoAveria ? 'empty' : ''}">
            ${report.avisoAveria || 'No especificado'}
          </div>
        </div>
        
        <div class="section">
          <div class="section-header orange">🔧 AVERÍA DETECTADA</div>
          <div class="section-content ${!report.averiaDetectada ? 'empty' : ''}">
            ${report.averiaDetectada || 'No especificada'}
          </div>
        </div>
        
        ${fotosAveriaHTML}
        
        <div class="section">
          <div class="section-header">❓ CAUSA DE LA AVERÍA</div>
          <div class="section-content ${!report.causaAveria ? 'empty' : ''}">
            ${report.causaAveria || 'No especificada'}
          </div>
        </div>
        
        <div class="section">
          <div class="section-header orange">✅ TIENE SOLUCIÓN</div>
          <div class="solution-container">
            <div class="solution-option">
              <div class="checkbox ${report.tieneSolucion === 'true' ? 'checked' : ''}"></div>
              <span class="solution-yes">SÍ</span>
            </div>
            <div class="solution-option">
              <div class="checkbox ${report.tieneSolucion === 'false' ? 'checked' : ''}"></div>
              <span class="solution-no">NO</span>
            </div>
          </div>
        </div>

        ${safetySummaryHTML}
        
        <div class="section">
          <div class="section-header">💬 OBSERVACIONES</div>
          <div class="section-content ${!report.observaciones ? 'empty' : ''}">
            ${report.observaciones || 'Sin observaciones'}
          </div>
        </div>
        
        <div class="section">
          <div class="section-header orange">🛠️ MATERIALES UTILIZADOS</div>
          <div class="section-content" style="padding: 0;">
            <table class="materials-table">
              <thead>
                <tr>
                  <th style="width: 25%; text-align: center;">Cantidad</th>
                  <th style="width: 75%;">Material</th>
                </tr>
              </thead>
              <tbody>
                ${materialesRows}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-label">✍️ Firma del Técnico</div>
            <div class="signature-image-container">
              ${firmaTenico 
                ? `<img src="${firmaTenico}" class="signature-image" alt="Firma Técnico" />` 
                : '<div class="signature-placeholder">Sin firma</div>'
              }
            </div>
            <div class="signature-line"></div>
            <div class="signature-name">${report.technicianName || 'Nombre del Técnico'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">✍️ Firma del Cliente</div>
            <div class="signature-image-container">
              ${firmaCliente 
                ? `<img src="${firmaCliente}" class="signature-image" alt="Firma Cliente" />` 
                : '<div class="signature-placeholder">Sin firma</div>'
              }
            </div>
            <div class="signature-line"></div>
            <div class="signature-name">${report.clientSignatureName || 'Nombre y DNI del Cliente'}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-separator"></div>
          ${logoBase64 ? `
            <div class="footer-logo-container">
              <img src="${logoBase64}" class="footer-logo" alt="Logo INVAL" />
            </div>
          ` : ''}
          <div class="footer-address">
            C/. Dels Argenters, s/nº - Pol. El Alter<br>
            46290 ALCÁCER (VALENCIA) - Apdo. 147<br>
            Tel.: 96 110 04 29 - Fax 96 123 06 68<br>
            inval@inval-sl.com
          </div>
          <div class="footer-text">
            De conformidad con lo que establece la Ley Orgánica 15/1999 de Protección de Datos de Carácter Personal, le informamos que sus datos personales serán incluidos dentro de un fichero automatizado bajo la responsabilidad de INVAL.M., S.L., con la finalidad de poder atender los compromisos derivados de la relación que mantenemos con usted. Puede ejercer sus derechos de ACCESO, RECTIFICACIÓN, OPOSICIÓN Y CANCELACIÓN de los datos personales objeto de tratamiento ante INVAL. M.S.L. IND. EL ALTER ALCÁCER 46290 - VALENCIA. Si en el plazo de 30 días no nos comunica lo contrario, entenderemos que nos da su consentimiento para que los datos no han sido modificados, que se compromete a notificarnos cualquier variación y que tenemos el consentimiento para remitirles publicidad y/o información que pueda ser de su interés, vía postal.
          </div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    console.error('❌ Error en generateActecoHTML:', error);
    throw error;
  }
};

export const shareActecoPDFReport = async (report: ActecoReportData, onProgress?: (percent: number, text: string) => void, autoUploadOnly: boolean = false): Promise<boolean> => {
  try {
    console.log('🚀 Generando PDF del informe...');
    
    onProgress?.(15, 'Procesando fotos...');
    const reportHTML = await generateActecoHTML(report);
    onProgress?.(50, 'Generando PDF...');
    
    // ✨ GENERAR NOMBRE PERSONALIZADO DEL ARCHIVO
    const customFileName = generateFileName(report);
    
    console.log('📄 Creando archivo PDF...');
    
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: reportHTML,
      width: 595,
      height: 842,
      base64: false,
    });
    
    console.log('✅ PDF generado:', pdfUri);
    
    // ✨ RENOMBRAR PDF CON NOMBRE PERSONALIZADO
    const fileUri = `${FileSystem.documentDirectory}${customFileName}`;
    
    try {
      await FileSystem.moveAsync({
        from: pdfUri,
        to: fileUri
      });
      console.log('✅ PDF renombrado a:', customFileName);
    } catch (moveError) {
      console.warn('⚠️ No se pudo renombrar, usando nombre original');
    }
    
    // Verificar qué URI usar
    const finalUri = await FileSystem.getInfoAsync(fileUri).then(info => 
      info.exists ? fileUri : pdfUri
    );
    
    console.log('📤 Compartiendo PDF:', finalUri);
    
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
        const recordId = sanitize((report.id || report.avisoDate || '').slice(0, 8));
        const pdfStoragePath = `urgencias/${sanitize(report.location)}_${sanitize(report.avisoDate)}_${recordId}/informe_${customFileName}`;
        await supabase.storage.from('inspection-photos').upload(pdfStoragePath, decode(pdfBase64ForUpload), {
          contentType: 'application/pdf',
          upsert: true,
        });
        console.log('PDF ACTECO subido a Supabase Storage');
      } catch (uploadErr) {
        console.warn('No se pudo subir el PDF ACTECO a Supabase (no crítico):', uploadErr);
      }

      if (autoUploadOnly) {
        onProgress?.(100, '¡PDF subido!');
        return true;
      }

      onProgress?.(90, 'Abriendo compartir...');
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Inspección URGENCIAS - ${report.clientName}`,
        UTI: 'com.adobe.pdf'
      });
      
      return true;
    } else {
      window.open(finalUri, '_blank');
      return true;
    }
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    Alert.alert(
      'Error al generar informe', 
      `Ocurrió un problema: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
    return false;
  }
};

export default {
  generateActecoHTML,
  shareActecoPDFReport,
};
