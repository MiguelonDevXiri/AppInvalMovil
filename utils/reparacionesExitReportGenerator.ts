import * as FileSystem from 'expo-file-system/legacy';
import { processImagesParallel, imageToBase64, WIDTH_EVIDENCE, WIDTH_GENERAL } from './imageProcessor';
import * as Print from 'expo-print';
import { decode } from 'base64-arraybuffer';
import { getLogoBase64 as getInvalLogoBase64 } from './instalacionesReportGenerator';
import { buildReparacionesPdfStoragePath, type ReparacionInspection } from './reparacionesInspectionStorage';
import { supabase } from './supabase';

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
const formatDateOnly = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-ES');
};


const formatMultiline = (value?: string): string => {
  if (!value?.trim()) {
    return '<span style="color:#94a3b8;font-style:italic;">Sin datos</span>';
  }

  return escapeHtml(value).replace(/\n/g, '<br />');
};

const sanitizeFileSegment = (value: string): string => {
  return (value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .substring(0, 50)
    .toUpperCase();
};

const buildExitFileName = (report: ReparacionInspection): string => {
  const cleanPlate = sanitizeFileSegment(report.licensePlate || 'SIN_MATRICULA');
  const cleanClient = sanitizeFileSegment(report.clientName || 'CLIENTE');
  const cleanDate = (report.avisoDate || '').replace(/\//g, '-').replace(/\s+/g, '');
  return `${cleanPlate}_${cleanClient}_REPARACIONES_SALIDA_${cleanDate || Date.now()}.pdf`;
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

export const generateReparacionExitHTML = async (report: ReparacionInspection): Promise<string> => {
  const logoBase64 = getInvalLogoBase64();

  const beforePhotos = await processImagesParallel(report.generalPhotos || [], WIDTH_GENERAL, 0.4);

  const exitGeneralPhotos = await processImagesParallel(report.exitData?.generalPhotos || [], WIDTH_GENERAL, 0.4);

  const exitChecks = [];
  for (const [index, repair] of (report.repairs || []).entries()) {
      const currentCheck = report.exitData?.checks.find((item) => item.repairId === repair.id);
      const reviewPhoto = currentCheck?.photoUrl ? await imageToBase64(currentCheck.photoUrl, WIDTH_EVIDENCE).catch(() => '') : '';
      const originalPhotos = await processImagesParallel((repair.photos || []).slice(0, 4), 220);

      exitChecks.push({
        id: repair.id,
        title: `Reparación ${index + 1}`,
        description: repair.description || '',
        checked: Boolean(currentCheck?.checked),
        comment: currentCheck?.comment || '',
        reviewPhoto,
        originalPhotos,
      });
  }

  const exitMaterials = (report.exitData?.materials || []).filter((material) => {
    return (
      material.name.trim() ||
      material.quantity.trim() ||
      material.reference.trim() ||
      material.available !== null ||
      material.checked
    );
  });

  const beforePhotosHtml = beforePhotos.length > 0
    ? `
      <div class="section">
        <div class="section-header">📸 FOTOS GENERALES DEL ANTES</div>
        <div class="section-content">
          ${renderPhotoGrid(beforePhotos, beforePhotos.map((_, index) => `A${index + 1}`), 'Sin fotos de entrada')}
        </div>
      </div>
    `
    : '';

  const exitGeneralPhotosHtml = exitGeneralPhotos.length > 0
    ? `
      <div class="section">
        <div class="section-header">📸 FOTOS GENERALES DE SALIDA</div>
        <div class="section-content">
          ${renderPhotoGrid(exitGeneralPhotos, exitGeneralPhotos.map((_, index) => `S${index + 1}`), 'Sin fotos de salida')}
        </div>
      </div>
    `
    : '';

  const checksHtml = exitChecks.length > 0
    ? exitChecks.map((check) => {
        const originalPhotosHtml = renderPhotoGrid(
          check.originalPhotos,
          check.originalPhotos.map((_, index) => `Entrada ${index + 1}`),
          'Sin fotos de entrada'
        );

        const reviewPhotoHtml = check.reviewPhoto
          ? `
            <div class="review-photo-wrap">
              <div class="photo-frame review-photo-frame">
                <img src="${check.reviewPhoto}" class="review-photo" />
              </div>
              <div class="photo-title">Evidencia de salida</div>
            </div>
          `
          : '<div class="empty-box small">Sin evidencia adjunta</div>';

        return `
          <div class="check-card ${check.checked ? 'check-card-ok' : 'check-card-pending'}">
            <div class="check-top-row">
              <div class="check-title">${escapeHtml(check.title)}</div>
              <div class="status-pill ${check.checked ? 'status-ok' : 'status-pending'}">
                ${check.checked ? 'Comprobada' : 'Pendiente'}
              </div>
            </div>
            <div class="check-grid">
              <div>
                <div class="subsection-label first">Trabajo realizado</div>
                <div class="notes-box compact">${formatMultiline(check.description)}</div>
                <div class="subsection-label">Comentario de revisión</div>
                <div class="notes-box compact">${formatMultiline(check.comment)}</div>
              </div>
              <div>
                <div class="subsection-label first">Fotos del trabajo</div>
                ${originalPhotosHtml}
                <div class="subsection-label">Foto de comprobación</div>
                ${reviewPhotoHtml}
              </div>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty-box">No hay comprobaciones de salida registradas.</div>';

  const materialsHtml = exitMaterials.length > 0
    ? exitMaterials.map((material) => `
        <tr>
          <td>${escapeHtml(material.name || '-')}</td>
          <td style="text-align:center;">${escapeHtml(material.quantity || '-')}</td>
          <td>${escapeHtml(material.reference || '-')}</td>
          <td style="text-align:center;">${material.checked ? 'Sí' : 'No'}</td>
          <td style="text-align:center;">${material.available === true ? 'Sí' : material.available === false ? 'No' : '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;font-style:italic;">Sin materiales revisados</td></tr>';

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
          .header {
            background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #166534 70%, #22c55e 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo-container { width: 78px; height: 78px; background: white; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center; }
          .logo { max-width: 100%; max-height: 100%; object-fit: contain; }
          .header-main h1 { margin: 0 0 6px 0; font-size: 22px; }
          .header-main p { margin: 0; font-size: 11px; color: #dcfce7; }
          .header-side { min-width: 170px; font-size: 9px; line-height: 1.6; text-align: right; color: #dcfce7; }
          .header-side .company-name { font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
          .info-card, .section, .check-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .info-card table { width: 100%; border-collapse: collapse; }
          .info-card td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
          .info-card tr:last-child td { border-bottom: none; }
          .info-card tr:nth-child(even) td { background: #f1f5f9; }
          .label { width: 36%; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; }
          .value { font-weight: bold; color: #111827; }
          .section { margin-bottom: 14px; }
          .section-header {
            background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
            color: white;
            padding: 9px 14px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.8px;
          }
          .section-content { padding: 12px; }
          .photos-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
            border-spacing: 8px 8px;
            margin: -4px -8px 0;
          }
          .photos-row { display: table-row; }
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
            color: #166534;
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
          .review-photo-wrap { margin-top: 0; }
          .review-photo-frame { border-color: #bbf7d0; }
          .review-photo {
            display: block;
            width: 100%;
            max-height: 140px;
            object-fit: contain;
            border-radius: 8px;
          }
          .check-card {
            padding: 12px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .check-card-ok { border-color: #86efac; background: #f0fdf4; }
          .check-card-pending { border-color: #fcd34d; background: #fffbeb; }
          .check-top-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          .check-title { font-size: 13px; font-weight: bold; color: #0f2f57; }
          .check-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            align-items: start;
          }
          .notes-box, .empty-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: white;
            padding: 12px;
            color: #334155;
          }
          .notes-box.compact {
            padding: 10px;
          }
          .empty-box { color: #94a3b8; font-style: italic; text-align: center; }
          .empty-box.small { padding: 10px; font-size: 10px; }
          .status-pill {
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
          }
          .status-ok { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .subsection-label {
            margin-top: 10px;
            margin-bottom: 6px;
            font-size: 9px;
            font-weight: bold;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.7px;
          }
          .materials-table { width: 100%; border-collapse: collapse; }
          .materials-table thead { background: linear-gradient(90deg, #0f2f57 0%, #166534 60%, #22c55e 100%); color: white; }
          .materials-table th, .materials-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .materials-table th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; }
          .materials-table tbody tr:nth-child(even) td { background: #f8fafc; }
          .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 2px solid #22c55e;
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
              <h1>PARTE DE SALIDA · REPARACIÓN</h1>
              <p>Comprobación final de reparación taller</p>
            </div>
          </div>
          <div class="header-side">
            <div class="company-name">INVAL M.S.L.</div>
            <div>Revisión de salida</div>
            <div>${escapeHtml(formatDateOnly(report.exitCompletedAt || report.exitData?.completedAt || report.avisoDate))}</div>
            <div>${escapeHtml(report.exitReviewedBy || report.exitData?.reviewedBy || '-')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="section-header">📋 DATOS DEL CLIENTE</div>
            <table>
              <tr><td class="label">Cliente</td><td class="value">${escapeHtml(report.clientName || '-')}</td></tr>
              <tr><td class="label">Matrícula</td><td class="value">${escapeHtml(report.licensePlate || '-')}</td></tr>
              <tr><td class="label">Ubicación</td><td class="value">${escapeHtml(report.location || '-')}</td></tr>
              <tr><td class="label">OT</td><td class="value">${escapeHtml(report.otNumber || '-')}</td></tr>
            </table>
          </div>
          <div class="info-card">
            <div class="section-header">⚙️ DATOS DE LA MÁQUINA</div>
            <table>
              <tr><td class="label">Tipo</td><td class="value">${escapeHtml(report.machineType || '-')}</td></tr>
              <tr><td class="label">Marca</td><td class="value">${escapeHtml(report.machineBrand || '-')}</td></tr>
              <tr><td class="label">Modelo</td><td class="value">${escapeHtml(report.machineModel || '-')}</td></tr>
              <tr><td class="label">Serie</td><td class="value">${escapeHtml(report.serialNumber || '-')}</td></tr>
            </table>
          </div>
        </div>

        ${beforePhotosHtml}
        ${exitGeneralPhotosHtml}
        <div class="section">
          <div class="section-header">✅ COMPROBACIÓN FINAL DE REPARACIONES</div>
          <div class="section-content">${checksHtml}</div>
        </div>

        <div class="section">
          <div class="section-header">🧰 MATERIALES DE SALIDA</div>
          <div class="section-content" style="padding:0;">
            <table class="materials-table">
              <thead>
                <tr>
                  <th style="width:34%;">Material</th>
                  <th style="width:14%; text-align:center;">Cant.</th>
                  <th style="width:24%;">Referencia</th>
                  <th style="width:14%; text-align:center;">OK</th>
                  <th style="width:14%; text-align:center;">¿Hay?</th>
                </tr>
              </thead>
              <tbody>${materialsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-header">📝 OBSERVACIONES DE SALIDA</div>
          <div class="section-content">
            <div class="notes-box">${formatMultiline(report.exitData?.note || report.exitNotes)}</div>
          </div>
        </div>

        <div class="footer">
          <div style="height: 2px; background: linear-gradient(90deg, transparent 0%, #22c55e 20%, #0f2f57 80%, transparent 100%); border-radius: 2px; margin-bottom: 14px;"></div>
          ${logoBase64 ? `<div style="margin-bottom:8px"><img src="${logoBase64}" style="max-width:110px; max-height:40px; object-fit:contain; opacity:0.85;" /></div>` : ''}
          <div style="font-size:8px; color:#374151; font-weight:bold; line-height:1.5; margin-bottom:10px;">
            C/. Dels Argenters, s/nº - Pol. El Alter<br>
            46290 ALCÁCER (VALENCIA) - Apdo. 147<br>
            Tel.: 96 110 04 29 - Fax 96 123 06 68<br>
            inval@inval-sl.com
          </div>
          <div style="font-size:6.5px; color:#9ca3af; line-height:1.4; text-align:justify; padding:0 15px;">
            Informe de salida generado automáticamente desde la app de INVAL · ${escapeHtml(report.clientName || 'Cliente')} · ${escapeHtml(report.licensePlate || 'Sin matrícula')}
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generateReparacionExitPDF = async (
  report: ReparacionInspection,
  onProgress?: (percent: number, text: string) => void
): Promise<string | null> => {
  try {
    onProgress?.(15, 'Procesando salida...');
    const html = await generateReparacionExitHTML(report);
    onProgress?.(55, 'Generando PDF de salida...');

    const fileName = buildExitFileName(report);
    const { uri: pdfUri } = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      base64: false,
    });

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    try {
      await FileSystem.moveAsync({ from: pdfUri, to: fileUri });
    } catch {
      // fallback a pdfUri
    }

    const finalUri = await FileSystem.getInfoAsync(fileUri).then((info) => (info.exists ? fileUri : pdfUri));
    onProgress?.(82, 'Subiendo PDF de salida...');

    const pdfBase64 = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const storagePath = buildReparacionesPdfStoragePath(report, 'salida');

    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(storagePath, decode(pdfBase64), {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from('inspection-photos').getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || '';

    if (!publicUrl) {
      throw new Error('Supabase no devolvió URL pública para el PDF de salida.');
    }

    if (report.id) {
      const { error: updateError } = await supabase
        .from('reparaciones_inspections')
        .update({
          exit_pdf_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (updateError) {
        throw updateError;
      }
    }

    onProgress?.(100, 'PDF de salida listo');
    return publicUrl;
  } catch (error) {
    console.error('Error al generar el PDF de salida de reparación:', error);
    return null;
  }
};

export default {
  generateReparacionExitHTML,
  generateReparacionExitPDF,
};
