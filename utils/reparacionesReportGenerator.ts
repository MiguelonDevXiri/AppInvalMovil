import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { getLogoBase64 as getInvalLogoBase64 } from './instalacionesReportGenerator';
import { supabase } from './supabase';
import { buildReparacionesPdfStoragePath, type ReparacionInspection } from './reparacionesInspectionStorage';
import { renderSafetySummaryHTML } from './safetyChecklist';

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatMultiline = (value?: string): string => {
  if (!value?.trim()) {
    return '<span style="color:#94a3b8;font-style:italic;">Sin datos</span>';
  }

  return escapeHtml(value).replace(/\n/g, '<br />');
};

const generateFileName = (report: ReparacionInspection): string => {
  try {
    const cleanPlate = (report.licensePlate || 'SIN_MATRICULA')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase();
    const cleanClient = report.clientName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 30);
    const cleanDate = (report.avisoDate || '').replace(/\//g, '-').replace(/\s+/g, '');
    return `${cleanPlate}_${cleanClient}_REPARACIONES_${cleanDate || Date.now()}.pdf`;
  } catch {
    return `REPARACIONES_${Date.now()}.pdf`;
  }
};

const isRemoteUri = (uri: string): boolean => uri.startsWith('http://') || uri.startsWith('https://');

const ensureLocalImageUri = async (uri: string): Promise<string> => {
  if (!uri || !isRemoteUri(uri)) {
    return uri;
  }

  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}reparaciones_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const result = await FileSystem.downloadAsync(uri, targetPath);
  return result.uri;
};

const getImageBase64 = async (uri: string, maxWidth: number = 240): Promise<string> => {
  try {
    if (!uri) return '';
    if (uri.startsWith('data:image')) return uri;

    const localUri = await ensureLocalImageUri(uri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return '';

    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen de reparación:', error);
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

const renderPhotoGrid = (photos: string[], labels: string[], emptyMessage: string): string => {
  if (photos.length === 0) {
    return `<div class="empty-box small">${escapeHtml(emptyMessage)}</div>`;
  }

  return `
    <div class="photos-grid">
      ${photos.map((photo, index) => `
        ${index % 2 === 0 ? '<div class="photos-row">' : ''}
          <div class="photo-card">
            <div class="photo-frame">
              <img src="${photo}" class="photo" />
            </div>
            <div class="photo-title">${escapeHtml(labels[index] || `Foto ${index + 1}`)}</div>
          </div>
        ${index % 2 === 1 || index === photos.length - 1 ? '</div>' : ''}
      `).join('')}
    </div>
  `;
};

export const generateReparacionesHTML = async (report: ReparacionInspection): Promise<string> => {
  const logoBase64 = getInvalLogoBase64();
  const repairsWithPhotos = [];
  for (const repair of report.repairs || []) {
    repairsWithPhotos.push({
      ...repair,
      photos: await getImagesBase64Sequential(repair.photos || []),
    });
  }

  const beforePhotos = await getImagesBase64Sequential(report.generalPhotos || [], 280);

  const materialsRows = report.materials?.filter((material) => {
    return (
      material.name.trim() ||
      material.quantity.trim() ||
      material.reference.trim() ||
      material.available !== null
    );
  }) || [];

  const repairsHtml = repairsWithPhotos.length > 0
    ? `
      <div class="section">
        <div class="section-header orange">🛠️ REPARACIONES REALIZADAS</div>
        <div class="section-content repairs-stack">
          ${repairsWithPhotos.map((repair, index) => `
            <div class="repair-card">
              <div class="repair-card-header">
                <div class="repair-badge">${index + 1}</div>
                <div>
                  <div class="repair-title">Reparación ${index + 1}</div>
                  <div class="repair-meta">${repair.photos.length > 0 ? `${repair.photos.length} foto(s) del trabajo` : 'Sin fotos adjuntas'}</div>
                </div>
              </div>
              <div class="repair-card-grid">
                <div>
                  <div class="subsection-label first">Descripción</div>
                  <div class="description-box compact">${formatMultiline(repair.description)}</div>
                </div>
                <div>
                  <div class="subsection-label first">Fotos del trabajo</div>
                  ${renderPhotoGrid(repair.photos, repair.photos.map((_, photoIndex) => `R${index + 1}.${photoIndex + 1}`), 'Sin fotos adjuntas')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : `
      <div class="section">
        <div class="section-header orange">🛠️ REPARACIONES REALIZADAS</div>
        <div class="section-content">
          <div class="empty-box">Sin reparaciones registradas</div>
        </div>
      </div>
    `;

  const beforePhotosHtml = beforePhotos.length > 0
    ? `
        <div class="section">
          <div class="section-header">📸 FOTOS GENERALES DEL ANTES</div>
          <div class="section-content">
            ${renderPhotoGrid(beforePhotos, beforePhotos.map((_, index) => `A${index + 1}`), 'Sin fotos generales registradas')}
          </div>
        </div>
      `
    : '';

  const materialsHtml = materialsRows.length > 0
    ? materialsRows.map((material) => `
        <tr>
          <td>${escapeHtml(material.name || '-')}</td>
          <td style="text-align:center;">${escapeHtml(material.quantity || '-')}</td>
          <td>${escapeHtml(material.reference || '-')}</td>
          <td style="text-align:center;">${material.available === true ? 'Sí' : material.available === false ? 'No' : '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;font-style:italic;">Sin materiales registrados</td></tr>';

  const safetySummaryHtml = renderSafetySummaryHTML(report.safetyChecklist, '🛡️ SEGURIDAD PREVIA');
  const safetySummarySectionHtml = safetySummaryHtml
    ? safetySummaryHtml.replace('<div class="section">', '<div class="section safety-section">')
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 15mm;
            color: #1f2937;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.45;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .header { background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #173f73 70%, #1a4a85 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo-container { width: 78px; height: 78px; background: white; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center; }
          .logo { max-width: 100%; max-height: 100%; object-fit: contain; }
          .header-main { flex: 1; }
          .header-main h1 { margin: 0 0 6px 0; font-size: 22px; }
          .header-main p { margin: 0; font-size: 11px; color: #c5d8ef; }
          .header-side { min-width: 170px; font-size: 9px; line-height: 1.6; text-align: right; color: #c5d8ef; }
          .header-side .company-name { font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 4px; }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 16px;
          }
          .info-card, .section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .info-card table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-card td {
            padding: 9px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-card tr:last-child td {
            border-bottom: none;
          }
          .info-card tr:nth-child(even) td {
            background: #f1f5f9;
          }
          .label {
            width: 36%;
            color: #64748b;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .value {
            font-weight: bold;
            color: #111827;
          }
          .section-header {
            background: linear-gradient(135deg, #78350f 0%, #b45309 100%);
            color: white;
            padding: 9px 14px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.8px;
          }
          .section-header.orange {
            background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%);
          }
          .section {
            margin-bottom: 14px;
          }
          .section-content {
            padding: 12px;
          }
          .description-box, .empty-box, .notes-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: white;
            padding: 12px;
          }
          .description-box.compact, .notes-box.compact {
            padding: 10px;
          }
          .empty-box {
            color: #94a3b8;
            font-style: italic;
            text-align: center;
          }
          .empty-box.small {
            padding: 10px;
            font-size: 10px;
          }
          .photos-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
            border-spacing: 8px 8px;
            margin: -4px -8px 0;
          }
          .photos-row {
            display: table-row;
          }
          .photo-card {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 12px;
            padding: 8px;
            text-align: center;
          }
          .photo-frame {
            border: 1px solid #e2e8f0;
            background: white;
            border-radius: 10px;
            padding: 4px;
          }
          .photo-title {
            font-size: 9px;
            color: #92400e;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 6px;
            letter-spacing: 0.7px;
            text-align: center;
          }
          .photo {
            display: block;
            width: 100%;
            max-height: 150px;
            object-fit: contain;
            border-radius: 8px;
          }
          .repairs-stack {
            display: grid;
            gap: 12px;
          }
          .repair-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            padding: 12px;
            page-break-inside: avoid;
          }
          .repair-card-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 10px;
          }
          .repair-badge {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            background: linear-gradient(135deg, #78350f 0%, #f59e0b 100%);
            color: white;
            font-size: 11px;
            font-weight: bold;
            line-height: 28px;
            text-align: center;
            flex-shrink: 0;
          }
          .repair-title {
            font-size: 12px;
            font-weight: bold;
            color: #0f2f57;
          }
          .repair-meta {
            margin-top: 2px;
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .repair-card-grid {
            display: grid;
            grid-template-columns: 0.9fr 1.1fr;
            gap: 12px;
            align-items: start;
          }
          .subsection-label {
            margin-bottom: 6px;
            font-size: 9px;
            color: #92400e;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.7px;
          }
          .materials-table {
            width: 100%;
            border-collapse: collapse;
          }
          .materials-table thead {
            background: linear-gradient(90deg, #78350f 0%, #b45309 60%, #f59e0b 100%);
            color: white;
          }
          .materials-table th, .materials-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .materials-table th {
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .materials-table tbody tr:nth-child(even) td {
            background: #f8fafc;
          }
          .safety-section {
            page-break-before: always;
          }
          .safety-table td {
            vertical-align: top;
          }
          .safety-table td:first-child {
            background: #f8fafc;
            color: #0f2f57;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.6px;
          }
          .safety-table tbody strong {
            color: #0f2f57;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 2px solid #f59e0b;
            color: #64748b;
            font-size: 8px;
            text-align: center;
          }
          @page { margin: 15mm; size: A4; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div class="logo-container">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo INVAL" />` : '<div style="color: #0f2f57; font-weight: bold; font-size: 16px;">INVAL</div>'}
            </div>
            <div class="header-main">
              <h1>PARTE DE REPARACIÓN</h1>
              <p>Mantenimientos y Reparaciones</p>
            </div>
          </div>
          <div class="header-side">
            <div class="company-name">INVAL M.S.L.</div>
            <div>Mantenimientos y Reparaciones</div>
            <div>${escapeHtml(report.avisoDate || '-')}</div>
            <div>${escapeHtml(report.reviewedBy || '-')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="section-header">📋 DATOS DEL CLIENTE</div>
            <table>
              <tr><td class="label">Cliente</td><td class="value">${escapeHtml(report.clientName || '-')}</td></tr>
              <tr><td class="label">Matrícula</td><td class="value">${escapeHtml(report.licensePlate || '-')}</td></tr>
              <tr><td class="label">Ubicación</td><td class="value">${escapeHtml(report.location || '-')}</td></tr>
              <tr><td class="label">Técnico</td><td class="value">${escapeHtml(report.reviewedBy || '-')}</td></tr>
            </table>
          </div>
          <div class="info-card">
            <div class="section-header orange">⚙️ DATOS DE LA MÁQUINA</div>
            <table>
              <tr><td class="label">Tipo</td><td class="value">${escapeHtml(report.machineType || '-')}</td></tr>
              <tr><td class="label">Marca</td><td class="value">${escapeHtml(report.machineBrand || '-')}</td></tr>
              <tr><td class="label">Modelo</td><td class="value">${escapeHtml(report.machineModel || '-')}</td></tr>
              <tr><td class="label">Serie</td><td class="value">${escapeHtml(report.serialNumber || '-')}</td></tr>
              <tr><td class="label">OT</td><td class="value">${escapeHtml(report.otNumber || '-')}</td></tr>
            </table>
          </div>
        </div>

        ${beforePhotosHtml}
        ${safetySummarySectionHtml}
        ${repairsHtml}

        <div class="section">
          <div class="section-header">🧰 MATERIALES</div>
          <div class="section-content" style="padding:0;">
            <table class="materials-table">
              <thead>
                <tr>
                  <th style="width:40%;">Material</th>
                  <th style="width:16%; text-align:center;">Cant.</th>
                  <th style="width:28%;">Referencia</th>
                  <th style="width:16%; text-align:center;">¿Hay?</th>
                </tr>
              </thead>
              <tbody>${materialsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-header">📝 OBSERVACIONES</div>
          <div class="section-content">
            <div class="notes-box">${formatMultiline(report.notes)}</div>
          </div>
        </div>

        <div class="footer">
          <div style="height: 2px; background: linear-gradient(90deg, transparent 0%, #e87a20 20%, #0f2f57 80%, transparent 100%); border-radius: 2px; margin-bottom: 14px;"></div>
          ${logoBase64 ? `<div style="margin-bottom:8px"><img src="${logoBase64}" style="max-width:110px; max-height:40px; object-fit:contain; opacity:0.85;" /></div>` : ''}
          <div style="font-size:8px; color:#374151; font-weight:bold; line-height:1.5; margin-bottom:10px;">
            C/. Dels Argenters, s/nº - Pol. El Alter<br>
            46290 ALCÁCER (VALENCIA) - Apdo. 147<br>
            Tel.: 96 110 04 29 - Fax 96 123 06 68<br>
            inval@inval-sl.com
          </div>
          <div style="font-size:6.5px; color:#9ca3af; line-height:1.4; text-align:justify; padding:0 15px;">
            Informe generado automáticamente desde la app de INVAL · ${escapeHtml(report.clientName || 'Cliente')} · ${escapeHtml(report.licensePlate || 'Sin matrícula')}
          </div>
        </div>
      </body>
    </html>
  `;
};

export const shareReparacionesPDFReport = async (
  report: ReparacionInspection,
  onProgress?: (percent: number, text: string) => void,
  autoUploadOnly: boolean = false
): Promise<boolean> => {
  try {
    onProgress?.(15, 'Procesando fotos...');
    const reportHTML = await generateReparacionesHTML(report);
    onProgress?.(50, 'Generando PDF...');

    const customFileName = generateFileName(report);
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: reportHTML,
      width: 595,
      height: 842,
      base64: false,
    });

    const fileUri = `${FileSystem.documentDirectory}${customFileName}`;
    try {
      await FileSystem.moveAsync({ from: pdfUri, to: fileUri });
    } catch {
      console.warn('No se pudo renombrar el PDF de reparaciones');
    }

    const finalUri = await FileSystem.getInfoAsync(fileUri).then((info) => (info.exists ? fileUri : pdfUri));

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        return false;
      }

      onProgress?.(88, 'Subiendo PDF a la nube...');
      let uploadedPublicUrl = '';
      try {
        const pdfBase64 = await FileSystem.readAsStringAsync(finalUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const storagePath = buildReparacionesPdfStoragePath(report, 'entrada');
        const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(storagePath, decode(pdfBase64), {
          contentType: 'application/pdf',
          upsert: true,
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(storagePath);

        uploadedPublicUrl = publicUrlData?.publicUrl || '';

        if (!uploadedPublicUrl) {
          throw new Error('Supabase no devolvió URL pública para el PDF de reparación.');
        }

        if (report.id) {
          const { error: updateError } = await supabase
            .from('reparaciones_inspections')
            .update({
              pdf_url: uploadedPublicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', report.id);

          if (updateError) {
            throw updateError;
          }
        }
      } catch (uploadError) {
        console.warn('No se pudo subir el PDF de reparaciones a Supabase:', uploadError);
        if (autoUploadOnly) {
          Alert.alert('Error', 'Se guardó la reparación, pero no se pudo subir el PDF a Supabase.');
          return false;
        }
      }

      if (autoUploadOnly) {
        onProgress?.(100, '¡PDF subido!');
        return Boolean(uploadedPublicUrl);
      }

      onProgress?.(92, 'Abriendo compartir...');
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Parte reparación - ${report.clientName}`,
        UTI: 'com.adobe.pdf',
      });

      return true;
    }

    window.open(finalUri, '_blank');
    return true;
  } catch (error) {
    console.error('Error al generar PDF de reparaciones:', error);
    Alert.alert('Error', `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return false;
  }
};

export default {
  generateReparacionesHTML,
  shareReparacionesPDFReport,
};
