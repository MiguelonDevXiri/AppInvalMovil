import * as FileSystem from 'expo-file-system/legacy';
import { processImagesParallel, WIDTH_EVIDENCE, WIDTH_GENERAL } from './imageProcessor';
import * as Print from 'expo-print';
import { decode } from 'base64-arraybuffer';
import { ExitCheck, ExitPhotosData, Machine } from './storage';
import { supabase } from './supabase';
import { getChecklistByMachineType } from '../data/machineChecklists';
import { sanitizePathSegment } from './photoUpload';
import { getLogoBase64, getMachineTypeAbbreviation } from './reportGenerator';



const cleanFileName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ'\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50);
};

export const generateExitPDF = async (
  machine: Machine,
  exitChecks: ExitCheck[],
  exitPhotos: ExitPhotosData | null,
  comments: { id: string; text: string }[],
  onProgress?: (percent: number, text: string) => void
): Promise<string | null> => {
  try {
    console.log('=== GENERANDO PDF DE SALIDA ===');
    onProgress?.(10, 'Preparando informe de salida...');

    const machineChecklist = getChecklistByMachineType(machine.machineType || 'otros');
    const itemMap: Record<string, { text: string; category: string }> = {};
    for (const cat of machineChecklist) {
      for (const item of cat.items) {
        itemMap[item.id] = { text: item.text, category: cat.category };
      }
    }

    const verifiedBy = exitChecks.find(c => c.verifiedBy)?.verifiedBy || 'No especificado';
    const verifiedAt = exitChecks.find(c => c.verifiedAt)?.verifiedAt;
    const dateStr = verifiedAt ? new Date(verifiedAt).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
    const logoBase64 = getLogoBase64();
    const machineTypeAbbr = getMachineTypeAbbreviation(machine.machineType || 'otros');

    // Process exit photos D1-D4
    onProgress?.(30, 'Procesando fotos de salida...');
    let exitPhotosHtml = '';
    if (exitPhotos?.photos) {
      const photoEntries = Object.entries(exitPhotos.photos).filter(([_, url]) => url);
      const photoBase64s = await processImagesParallel(photoEntries.map(([_, url]) => url!), WIDTH_GENERAL, 0.4);

      if (photoBase64s.some(b => b)) {
        exitPhotosHtml = `
          <div class="section">
            <div class="section-header">
              <div class="section-icon">01</div>
              <div class="section-header-text">
                <div class="section-title">Fotografías de salida</div>
                <div class="section-subtitle">Vista general de la máquina al finalizar la revisión</div>
              </div>
            </div>
            <div class="photos-grid">
              ${photoBase64s.map((b64, idx) => {
                if (!b64) return '';
                const label = photoEntries[idx][0].toUpperCase();
                return `${idx % 2 === 0 ? '<div class="photos-row">' : ''}
                  <div class="photo-card">
                    <img src="${b64}" class="header-thumbnail" />
                    <div class="header-photo-label">${label}</div>
                  </div>
                ${idx % 2 === 1 || idx === photoBase64s.filter(b => b).length - 1 ? '</div>' : ''}`;
              }).filter(s => s).join('')}
            </div>
          </div>`;
      }
    }

    // Process checklist exit checks grouped by category
    onProgress?.(50, 'Procesando comprobaciones...');
    const checklistChecks = exitChecks.filter(c => !c.itemId.startsWith('comment_'));
    const commentChecks = exitChecks.filter(c => c.itemId.startsWith('comment_'));

    // Group by category
    const checksByCategory: Record<string, ExitCheck[]> = {};
    checklistChecks.forEach(check => {
      const cat = itemMap[check.itemId]?.category || 'Otros';
      if (!checksByCategory[cat]) checksByCategory[cat] = [];
      checksByCategory[cat].push(check);
    });

    // Process all check photos in parallel
    const checksWithPhotos = checklistChecks.filter(c => c.photoUrl);
    const checkPhotoResults = await processImagesParallel(checksWithPhotos.map(c => c.photoUrl!), WIDTH_EVIDENCE);
    const checkPhotoMap: Record<string, string> = {};
    checksWithPhotos.forEach((c, i) => {
      if (checkPhotoResults[i]) checkPhotoMap[c.itemId] = checkPhotoResults[i];
    });

    // Also process comment check photos
    const commentChecksWithPhotos = commentChecks.filter(c => c.photoUrl);
    const commentPhotoResults = await processImagesParallel(commentChecksWithPhotos.map(c => c.photoUrl!), WIDTH_EVIDENCE);
    const commentPhotoMap: Record<string, string> = {};
    commentChecksWithPhotos.forEach((c, i) => {
      if (commentPhotoResults[i]) commentPhotoMap[c.itemId] = commentPhotoResults[i];
    });

    let checksHtml = '';
    const categoryNames = Object.keys(checksByCategory);
    if (categoryNames.length > 0) {
      checksHtml = '<div class="section">';
      for (const catName of categoryNames) {
        const catChecks = checksByCategory[catName];
        checksHtml += `
          <div class="category">
            <div class="category-banner">${catName}</div>
            <table class="checklist-table">
              <thead>
                <tr>
                  <th style="width: 45%;">Ítem</th>
                  <th style="width: 20%; text-align:center;">Estado</th>
                  <th style="width: 35%;">Comentario</th>
                </tr>
              </thead>
              <tbody>`;
        for (const check of catChecks) {
          const info = itemMap[check.itemId];
          checksHtml += `
                <tr>
                  <td class="item-text">${info?.text || check.itemId}</td>
                  <td class="status-cell">
                    <span class="status-pill ${check.verified ? 'ok' : 'na'}">
                      <span class="status-dot ${check.verified ? 'ok' : 'na'}"></span>
                      ${check.verified ? 'Comprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style="font-size:11px;color:#475569">${check.comment || ''}</td>
                </tr>`;
          if (checkPhotoMap[check.itemId]) {
            checksHtml += `
                <tr><td colspan="3" class="photo-cell"><div class="evidence-photos-grid">
                  <div class="evidence-photo-container">
                    <div class="evidence-photo-frame"><img src="${checkPhotoMap[check.itemId]}" class="evidence-photo" /></div>
                    ${check.comment ? `<div class="photo-comment-inline">${check.comment}</div>` : ''}
                  </div>
                </div></td></tr>`;
          }
        }
        checksHtml += `</tbody></table></div>`;
      }
      checksHtml += '</div>';
    }

    // Process comment checks
    let commentsHtml = '';
    if (commentChecks.length > 0 || comments.length > 0) {
      const commentItems = comments.map((c, i) => {
        const check = commentChecks.find(cc => cc.itemId === `comment_${i}`);
        return { text: c.text, verified: check?.verified || false, comment: check?.comment || '', itemId: `comment_${i}` };
      });

      if (commentItems.length > 0) {
        commentsHtml = `
          <div class="section comments-section">
            <div class="section-header">
              <div class="section-icon">03</div>
              <div class="section-header-text">
                <div class="section-title">Comentarios revisados</div>
                <div class="section-subtitle">Revisión de observaciones de la inspección de entrada</div>
              </div>
            </div>
            <div class="comments-content">
              ${commentItems.map((item, idx) => {
                let block = `
                <div class="comment-block">
                  <strong class="comment-title">Comentario #${idx + 1}:</strong>
                  <div class="comment-text">${item.text}</div>
                  <div style="margin-top:6px;">
                    <span class="status-pill ${item.verified ? 'ok' : 'na'}" style="font-size:9px;">
                      <span class="status-dot ${item.verified ? 'ok' : 'na'}"></span>
                      ${item.verified ? 'Revisado' : 'Pendiente'}
                    </span>
                  </div>
                  ${item.comment ? `<div style="margin-top:6px;font-size:11px;color:#475569;font-style:italic;">Nota: ${item.comment}</div>` : ''}`;
                if (commentPhotoMap[item.itemId]) {
                  block += `
                  <div class="comment-photo-wrap">
                    <img src="${commentPhotoMap[item.itemId]}" class="comment-photo" />
                  </div>`;
                }
                block += '</div>';
                return block;
              }).join('')}
            </div>
          </div>`;
      }
    }

    onProgress?.(65, 'Generando HTML...');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Informe de Salida - ${machine.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 9mm;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            font-size: 11px;
            margin: 0;
            padding: 0;
            background: #ffffff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            position: relative;
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

          .page-shell { width: 100%; }

          .header {
            background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #173f73 70%, #1a4a85 100%);
            color: white;
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(15, 47, 87, 0.25);
          }

          .header-top { display: table; width: 100%; }
          .header-brand, .header-meta { display: table-cell; vertical-align: middle; }
          .header-meta { text-align: right; width: 42%; font-size: 9px; color: #c5d8ef; line-height: 1.6; }
          .brand-wrap { display: flex; align-items: center; gap: 14px; }

          .logo-badge {
            width: 78px; height: 78px; border-radius: 50%;
            background: #ffffff; text-align: center; vertical-align: middle;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .company-logo { max-width: 58px; max-height: 58px; vertical-align: middle; display: inline-block; }

          .header-kicker {
            font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase;
            color: #c5d8ef; margin-bottom: 4px;
            border-bottom: 2px solid #e87a20; padding-bottom: 4px; display: inline-block;
          }

          h1 { font-size: 22px; color: #ffffff; margin: 0 0 4px 0; letter-spacing: 0.5px; }
          .header-subline { font-size: 11px; color: #c5d8ef; }
          .header-meta strong { color: #ffffff; font-size: 12px; display: block; margin-bottom: 3px; }

          .info-grid {
            display: table; width: 100%; table-layout: fixed;
            border-spacing: 12px 0; margin: 0 -12px 20px -12px;
          }

          .info-card {
            display: table-cell; vertical-align: top;
            background: #f8fafc; border: 1px solid #e2e8f0;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          }

          .info-card-header {
            padding: 8px 12px; color: white; font-size: 9px;
            font-weight: bold; text-transform: uppercase; letter-spacing: 1px;
          }

          .info-card-header.blue {
            background: linear-gradient(135deg, #0f2f57 0%, #173f73 100%);
            border-bottom: 3px solid #e87a20;
          }

          .info-card-header.coral {
            background: linear-gradient(135deg, #e87a20 0%, #c2410c 100%);
            border-bottom: 3px solid #0f2f57;
          }

          .info-card-body { padding: 6px 12px; }

          .info-row { margin-bottom: 0; padding: 8px 0; border-bottom: 1px solid #eceff3; }
          .info-row:last-child { margin-bottom: 0; padding-bottom: 6px; border-bottom: 0; }
          .info-label { font-size: 9px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 2px; }
          .info-value { font-size: 12px; font-weight: bold; color: #111827; }

          .section { margin-bottom: 20px; }

          .section-header { display: table; width: 100%; margin-bottom: 10px; }
          .section-icon, .section-header-text { display: table-cell; vertical-align: middle; }

          .section-icon {
            width: 38px; height: 38px; border-radius: 10px;
            background: linear-gradient(135deg, #0f2f57 0%, #e87a20 100%);
            color: white; font-size: 11px; font-weight: bold;
            text-align: center; line-height: 38px;
            box-shadow: 0 2px 6px rgba(15, 47, 87, 0.2);
          }

          .section-header-text { padding-left: 10px; }
          .section-title { font-size: 14px; font-weight: bold; color: #0f2f57; margin-bottom: 2px; }
          .section-subtitle { font-size: 9px; color: #6b7280; }

          .photos-grid {
            display: table; width: 100%; table-layout: fixed;
            border-spacing: 10px 10px; margin: 0 -10px;
          }

          .photos-row { display: table-row; }

          .photo-card {
            display: table-cell; width: 50%; vertical-align: top;
            background: #f8fafc; border: 1px solid #e2e8f0;
            border-radius: 12px; padding: 10px; text-align: center;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }

          .header-thumbnail {
            width: 100%; height: auto; max-height: 190px;
            object-fit: contain; border-radius: 8px;
            border: 1px solid #e2e8f0; background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }

          .header-photo-label {
            font-size: 9px; color: #0f2f57; margin-top: 8px;
            font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;
          }

          .category { margin-bottom: 16px; }

          .category-banner {
            background: linear-gradient(90deg, #0f2f57 0%, #173f73 60%, #e87a20 100%);
            color: white; padding: 6px 12px;
            border-radius: 10px 10px 0 0; font-size: 10px;
            font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;
          }

          .checklist-table {
            width: 100%; border-collapse: separate; border-spacing: 0;
            font-size: 13px; border: 0.5px solid #e2e8f0;
            border-top: 0; border-radius: 0 0 10px 10px; overflow: hidden;
          }

          .checklist-table th, .checklist-table td {
            border-bottom: 0.5px solid #e2e8f0;
            padding: 7px 10px; text-align: left; vertical-align: middle;
          }

          .checklist-table th {
            background: #0f2f57; color: white; font-weight: bold;
            font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
            border-bottom: 3px solid #e87a20; padding: 8px 10px;
          }

          .item-text { color: #1f2937; font-size: 12px; line-height: 1.5; }
          .status-cell { text-align: center; }

          .status-pill {
            display: inline-block; padding: 3px 9px; border-radius: 999px;
            font-size: 10px; font-weight: bold; white-space: nowrap; letter-spacing: 0.3px;
          }

          .status-pill.ok { background: #dcfce7; color: #15803d; border: 0.5px solid #bbf7d0; }
          .status-pill.fail { background: #fff7ed; color: #9a3412; border: 0.5px solid #fed7aa; }
          .status-pill.na { background: #f3f4f6; color: #4b5563; border: 0.5px solid #e5e7eb; }
          .status-pill.cant { background: #f5f3ff; color: #5b21b6; border: 0.5px solid #c4b5fd; }

          .status-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 4px; }
          .status-dot.ok { background: #16a34a; }
          .status-dot.fail { background: #e87a20; }
          .status-dot.na { background: #6b7280; }
          .status-dot.cant { background: #7c3aed; }

          .photo-cell { padding: 6px 8px !important; background: #fafbfd; }

          .evidence-photos-grid { display: block; }

          .evidence-photo-container {
            display: table; width: 100%; margin-bottom: 6px; page-break-inside: avoid;
          }

          .evidence-photo-frame {
            display: table-cell; width: 90px; vertical-align: top;
            background: white; border: 1px solid #e2e8f0;
            border-radius: 6px; padding: 3px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          }

          .evidence-photo { width: 100%; height: auto; max-height: 80px; object-fit: contain; border-radius: 4px; }

          .photo-comment-inline {
            display: table-cell; vertical-align: middle; padding-left: 8px;
            background: #fff7ed; border-left: 3px solid #e87a20;
            font-size: 11px; line-height: 1.4;
            border-radius: 0 6px 6px 0; color: #9a3412; padding: 6px 9px;
          }

          .comments-section {
            background: #ffffff; border: 1px solid #e2e8f0;
            border-radius: 12px; padding: 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }

          .comments-content { font-size: 13px; line-height: 1.6; }

          .comment-block {
            margin-bottom: 16px; page-break-inside: avoid;
            background: #fafbfd; border-left: 4px solid #e87a20;
            border-radius: 0 10px 10px 0; padding: 12px 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }

          .comment-title { color: #0f2f57; display: block; margin-top: 0; margin-bottom: 5px; font-size: 13px; font-weight: bold; }
          .comment-text { margin-left: 0; margin-bottom: 8px; font-size: 13px; color: #1f2937; line-height: 1.6; }

          .comment-photo-wrap { margin: 10px 0 4px; text-align: center; }

          .comment-photo {
            width: 100%; height: auto; max-height: 160px;
            object-fit: contain; border-radius: 8px;
            border: 1px solid #e2e8f0; background: white;
          }

          .checklist-table tbody tr:nth-child(even) > td { background: #f8fafc; }

          .footer {
            margin-top: 28px; text-align: center; font-size: 8px;
            color: #6b7280; padding-top: 0;
          }

          .footer-separator {
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #e87a20 20%, #0f2f57 80%, transparent 100%);
            border-radius: 2px; margin-bottom: 14px;
          }

          .footer-logo { max-width: 110px; max-height: 40px; object-fit: contain; margin-bottom: 8px; opacity: 0.85; }
          .footer-address { font-size: 8px; color: #374151; font-weight: bold; line-height: 1.5; margin-bottom: 10px; }
          .footer-legal { font-size: 6.5px; color: #9ca3af; line-height: 1.4; text-align: justify; padding: 0 15px; }
        </style>
      </head>
      <body>
        <div class="page-shell">
          <div class="header">
            <div class="header-top">
              <div class="header-brand">
                <div class="brand-wrap">
                  <div class="logo-badge">
                    <img src="${logoBase64}" class="company-logo" alt="Logo Empresa" />
                  </div>
                  <div>
                    <div class="header-kicker">Inspección de salida</div>
                    <h1>INFORME DE SALIDA</h1>
                    <div class="header-subline">Documento técnico de revisión de salida</div>
                  </div>
                </div>
              </div>
              <div class="header-meta">
                <strong>INVAL M.S.L.</strong><br />
                Fecha revisión: ${dateStr}<br />
                Técnico revisor: ${verifiedBy}
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-card-header blue">Datos del cliente</div>
              <div class="info-card-body">
                <div class="info-row"><div class="info-label">Cliente</div><div class="info-value">${machine.clientName || 'No especificado'}</div></div>
                <div class="info-row"><div class="info-label">Ubicación</div><div class="info-value">${machine.location || 'No especificado'}</div></div>
                <div class="info-row"><div class="info-label">Técnico entrada</div><div class="info-value">${machine.reviewedBy || 'No especificado'}</div></div>
                <div class="info-row"><div class="info-label">Fecha entrada</div><div class="info-value">${machine.date ? new Date(machine.date).toLocaleDateString('es-ES') : 'No especificado'}</div></div>
              </div>
            </div>
            <div class="info-card">
              <div class="info-card-header coral">Datos de la máquina / Revisión</div>
              <div class="info-card-body">
                <div class="info-row"><div class="info-label">Nombre</div><div class="info-value">${machine.name}</div></div>
                <div class="info-row"><div class="info-label">Tipo</div><div class="info-value">${machineTypeAbbr}</div></div>
                <div class="info-row"><div class="info-label">Marca / Modelo</div><div class="info-value">${machine.brand || 'No especificado'} / ${machine.model || 'No especificado'}</div></div>
                <div class="info-row"><div class="info-label">Nº Serie</div><div class="info-value">${machine.serialNumber || 'No especificado'}</div></div>
                <div class="info-row"><div class="info-label">Matrícula</div><div class="info-value">${machine.licensePlate || 'No especificado'}</div></div>
              </div>
            </div>
          </div>

          ${exitPhotosHtml}
          ${checksHtml}
          ${commentsHtml}

          <div class="footer">
            <div class="footer-separator"></div>
            <img src="${logoBase64}" class="footer-logo" alt="Logo INVAL" />
            <p class="footer-address">C/. Dels Argenters, s/nº - Pol. El Alter<br/>46290 ALCÁCER (VALENCIA) - Apdo. 147<br/>Tel.: 96 110 04 29 · Fax: 96 123 06 68<br/>inval@inval-sl.com</p>
            <p class="footer-legal">De conformidad con lo que establece la Ley Orgánica 15/1999 de Protección de Datos de Carácter Personal, le informamos que sus datos personales serán incluidos dentro de un fichero automatizado bajo la responsabilidad de INVAL M. S.L., con la finalidad de poder atender los compromisos derivados de la relación que mantenemos con usted. Puede ejercer sus derechos de ACCESO, RECTIFICACIÓN, OPOSICIÓN Y CANCELACIÓN de los datos personales objeto de tratamiento ante INVAL, M.S.L. IND. EL ALTER ALCÁCER 46290 - VALENCIA. Si en el plazo de 50 días no nos comunica lo contrario, entenderemos que nos da su consentimiento para que los datos no han sido modificados, que se compromete a notificarnos cualquier variación y que tenemos el consentimiento para remitirles publicidad y/o información que pueda ser de su interés, vía postal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    onProgress?.(75, 'Creando PDF...');
    const { uri: pdfUri } = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      base64: false,
    });

    onProgress?.(85, 'Subiendo PDF de salida...');
    const pdfBase64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const clientName = cleanFileName(machine.clientName);
    const identifier = cleanFileName(machine.licensePlate || machine.serialNumber || '');
    const recordId = cleanFileName((machine.id || machine.date || '').slice(0, 8));
    const pdfStoragePath = `inspecciones/${clientName}_${identifier}_${recordId}/informe_salida_${clientName}_${identifier}.pdf`;

    await supabase.storage.from('inspection-photos').upload(pdfStoragePath, decode(pdfBase64), {
      contentType: 'application/pdf',
      upsert: true,
    });

    const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(pdfStoragePath);
    if (urlData?.publicUrl) {
      await supabase.from('machines').update({ exit_pdf_url: urlData.publicUrl }).eq('id', machine.id);
      console.log('PDF de salida subido:', urlData.publicUrl);
    }

    await FileSystem.deleteAsync(pdfUri, { idempotent: true });

    onProgress?.(100, 'PDF de salida listo');
    return urlData?.publicUrl || null;
  } catch (error) {
    console.error('Error al generar PDF de salida:', error);
    return null;
  }
};
