import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';
import { getMachineTypeById } from '../data/machineTypes';
import { renderSafetySummaryHTML } from './safetyChecklist';
import type { MantenimientoChecklistItem, MantenimientoInspection } from './mantenimientoStorage';
import { getLogoBase64, getMachineTypeAbbreviation } from './reportGenerator';
import { supabase } from './supabase';

const esc = (value?: string | null): string => String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));

const cleanFileName = (name: string): string => name
  .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ'\s]/g, '_')
  .replace(/\s+/g, '_')
  .substring(0, 50);

const isRemoteUri = (uri: string): boolean => uri.startsWith('http://') || uri.startsWith('https://');

const ensureLocalImageUri = async (uri: string): Promise<string> => {
  if (!uri || !isRemoteUri(uri)) return uri;
  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}mantenimiento_img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(uri, targetPath);
  return downloadResult.uri;
};

const getPlaceholderImageBase64 = (): string => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQAAAACFI5MzAAAAA1BMVEXk5+pYdT3IAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAFUlEQVRIie3BAQEAAACAkP6v7ggKAAAuAAGfAAEkOuFjAAAAAElFTkSuQmCC';

const getImageBase64WithOrientation = async (uri: string, maxWidth: number): Promise<string> => {
  try {
    const localUri = await ensureLocalImageUri(uri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return getPlaceholderImageBase64();

    const resizedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen a base64:', error);
    return getPlaceholderImageBase64();
  }
};

const resolveImagesSequential = async (uris: string[], maxWidth: number): Promise<string[]> => {
  const results: string[] = [];
  for (const uri of uris) {
    results.push(await getImageBase64WithOrientation(uri, maxWidth).catch(() => ''));
  }
  return results;
};

const statusText = (status: string): string => {
  switch (status) {
    case 'ok': return 'Bien';
    case 'fail': return 'Mal';
    case 'na': return 'No Aplica';
    case 'cant': return 'No se puede';
    default: return 'No Revisado';
  }
};

const statusClass = (status: string): string => ['ok', 'fail', 'na', 'cant'].includes(status) ? status : 'pending';

const splitBalanced = (items: MantenimientoChecklistItem[]): [MantenimientoChecklistItem[], MantenimientoChecklistItem[]] => {
  const left: MantenimientoChecklistItem[] = [];
  const right: MantenimientoChecklistItem[] = [];
  let leftWeight = 0;
  let rightWeight = 0;

  for (const item of items) {
    const weight = 1 + (item.comment ? 1 : 0) + (item.photos?.length ? item.photos.length * 2 : 0);
    if (leftWeight <= rightWeight) {
      left.push(item);
      leftWeight += weight;
    } else {
      right.push(item);
      rightWeight += weight;
    }
  }

  return [left, right];
};

const generateMantenimientoHTML = async (inspection: MantenimientoInspection): Promise<string> => {
  const date = inspection.date ? new Date(inspection.date).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
  const machineName = getMachineTypeById(inspection.machineType).name;
  const logoBase64 = getLogoBase64();
  const identifier = cleanFileName(inspection.licensePlate?.trim() || inspection.serialNumber?.trim() || '');
  const photoIdPrefix = identifier;

  const generalPhotoEntries = [
    { key: 'front', label: photoIdPrefix ? `${photoIdPrefix}_A1` : 'A1', uri: inspection.generalPhotos?.front },
    { key: 'back', label: photoIdPrefix ? `${photoIdPrefix}_A2` : 'A2', uri: inspection.generalPhotos?.back },
    { key: 'left', label: photoIdPrefix ? `${photoIdPrefix}_A3` : 'A3', uri: inspection.generalPhotos?.left },
    { key: 'right', label: photoIdPrefix ? `${photoIdPrefix}_A4` : 'A4', uri: inspection.generalPhotos?.right },
  ].filter((entry): entry is { key: string; label: string; uri: string } => Boolean(entry.uri));

  const generalThumbnails = await resolveImagesSequential(generalPhotoEntries.map((entry) => entry.uri), 400);
  const generalPhotosHtml = generalPhotoEntries.length ? `
      <div class="section">
        <div class="section-header">
          <div class="section-icon">01</div>
          <div class="section-header-text">
            <div class="section-title">Fotos generales de entrada</div>
            <div class="section-subtitle">Vista general de la máquina antes de la revisión de mantenimiento</div>
          </div>
        </div>
        <div class="photos-grid">
          ${generalThumbnails.map((thumb, idx) => `${idx % 2 === 0 ? '<div class="photos-row">' : ''}
            <div class="photo-card">
              <img src="${thumb}" class="header-thumbnail" />
              <div class="header-photo-label">${esc(generalPhotoEntries[idx].label)}</div>
            </div>
          ${idx % 2 === 1 || idx === generalThumbnails.length - 1 ? '</div>' : ''}`).join('')}
        </div>
      </div>` : '';

  const checked = inspection.checklist.filter((item) => item.status).length;
  const ok = inspection.checklist.filter((item) => item.status === 'ok').length;
  const fails = inspection.checklist.filter((item) => item.status === 'fail').length;
  const notApplicable = inspection.checklist.filter((item) => item.status === 'na').length;
  const cant = inspection.checklist.filter((item) => item.status === 'cant').length;

  const photoUris: string[] = [];
  const photoIndexMap: { itemId: string; startIdx: number; count: number }[] = [];
  for (const item of inspection.checklist) {
    const photos = item.photos || [];
    if (!photos.length) continue;
    photoIndexMap.push({ itemId: item.id, startIdx: photoUris.length, count: photos.length });
    photoUris.push(...photos);
  }
  const checklistPhotoResults = await resolveImagesSequential(photoUris, 300);
  const photoHtmlByItemId: Record<string, string> = {};
  for (const entry of photoIndexMap) {
    const html = Array.from({ length: entry.count }, (_, index) => {
      const base64Image = checklistPhotoResults[entry.startIdx + index];
      if (!base64Image) return '';
      return `<div class="evidence-photo-container"><div class="evidence-photo-frame"><img src="${base64Image}" class="evidence-photo" /></div></div>`;
    }).join('');
    if (html) photoHtmlByItemId[entry.itemId] = html;
  }

  const grouped = inspection.checklist.reduce<Record<string, MantenimientoChecklistItem[]>>((acc, item) => {
    const key = item.category || 'Checklist';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const renderMiniTable = (items: MantenimientoChecklistItem[]) => {
    if (!items.length) return '';
    return `<table class="checklist-table">
      <thead><tr><th style="width: 63%;">Ítem</th><th style="width: 37%; text-align:center;">Estado</th></tr></thead>
      <tbody>${items.map((item) => {
        const itemStatusClass = statusClass(item.status);
        let row = `<tr>
          <td class="item-text">${esc(item.text)}</td>
          <td class="status-cell"><span class="status-pill ${itemStatusClass}"><span class="status-dot ${itemStatusClass}"></span>${statusText(item.status)}</span></td>
        </tr>`;
        if (item.comment) row += `<tr><td colspan="2" style="padding:4px 8px;"><div class="item-comment ${item.status === 'cant' ? 'cant' : ''}"><strong>${item.status === 'cant' ? 'Motivo' : 'Comentario'}:</strong> ${esc(item.comment)}</div></td></tr>`;
        if (photoHtmlByItemId[item.id]) row += `<tr><td colspan="2" class="photo-cell"><div class="evidence-photos-grid">${photoHtmlByItemId[item.id]}</div></td></tr>`;
        return row;
      }).join('')}</tbody>
    </table>`;
  };

  const checklistHtml = `<div class="section">
    <div class="section-header">
      <div class="section-icon">02</div>
      <div class="section-header-text">
        <div class="section-title">Checklist de mantenimiento</div>
        <div class="section-subtitle">Revisión funcional dividida por bloques de trabajo</div>
      </div>
    </div>
    <div class="summary-strip">
      <div class="summary-card summary-ok"><div class="summary-value">${ok}</div><div class="summary-label">Bien</div></div>
      <div class="summary-card summary-fail"><div class="summary-value">${fails}</div><div class="summary-label">Mal</div></div>
      <div class="summary-card summary-na"><div class="summary-value">${notApplicable}</div><div class="summary-label">N/A</div></div>
      <div class="summary-card summary-cant"><div class="summary-value">${cant}</div><div class="summary-label">No se puede</div></div>
      <div class="summary-card summary-total"><div class="summary-value">${checked}</div><div class="summary-label">Revisados</div></div>
    </div>
    ${Object.entries(grouped).map(([category, items]) => {
      const [leftItems, rightItems] = splitBalanced(items);
      return `<div class="category">
        <div class="category-banner">${esc(category)}</div>
        <div class="checklist-two-col">
          <div class="checklist-col">${renderMiniTable(leftItems)}</div>
          <div class="checklist-col">${renderMiniTable(rightItems)}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  const validMaterials = inspection.materials.filter((material) => material.name.trim() || material.quantity.trim() || material.reference.trim());
  const materialsHtml = validMaterials.length ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">03</div>
        <div class="section-header-text">
          <div class="section-title">Materiales</div>
          <div class="section-subtitle">Material usado o pendiente de reposición</div>
        </div>
      </div>
      <div class="materials-section">
        <table class="materials-table">
          <thead><tr><th style="width: 52%;">Material</th><th style="width: 18%; text-align:center;">Cantidad</th><th style="width: 30%;">Referencia</th></tr></thead>
          <tbody>${validMaterials.map((material) => `<tr><td>${esc(material.name) || '-'}</td><td style="text-align:center;">${esc(material.quantity) || '-'}</td><td>${esc(material.reference) || '-'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>` : '';

  const commentsHtml = inspection.notes ? `
    <div class="section comments-section">
      <div class="section-header">
        <div class="section-icon">${validMaterials.length ? '04' : '03'}</div>
        <div class="section-header-text">
          <div class="section-title">Observaciones</div>
          <div class="section-subtitle">Notas adicionales del mantenimiento</div>
        </div>
      </div>
      <div class="comments-content"><div>${esc(inspection.notes).replace(/\n/g, '<br />')}</div></div>
    </div>` : '';

  const safetySummaryHtml = renderSafetySummaryHTML(inspection.safetyChecklist);

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Informe de Mantenimiento - ${esc(inspection.clientName)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm 9mm; }
      body { font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #1f2937; font-size: 11px; margin: 0; padding: 0; background: #ffffff; print-color-adjust: exact; -webkit-print-color-adjust: exact; position: relative; }
      body::before { content: ""; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); background-image: url('${logoBase64}'); background-repeat: no-repeat; background-position: center; background-size: contain; width: 500px; height: 500px; opacity: 0.04; z-index: -1; pointer-events: none; }
      .page-shell { width: 100%; }
      .header { background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #173f73 70%, #1a4a85 100%); color: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(15, 47, 87, 0.25); }
      .header-top { display: table; width: 100%; }
      .header-brand, .header-meta { display: table-cell; vertical-align: middle; }
      .header-meta { text-align: right; width: 42%; font-size: 9px; color: #c5d8ef; line-height: 1.6; }
      .brand-wrap { display: flex; align-items: center; gap: 14px; }
      .logo-badge { width: 78px; height: 78px; border-radius: 50%; background: #ffffff; text-align: center; vertical-align: middle; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
      .company-logo { max-width: 58px; max-height: 58px; vertical-align: middle; display: inline-block; }
      .header-kicker { font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase; color: #c5d8ef; margin-bottom: 4px; border-bottom: 2px solid #e87a20; padding-bottom: 4px; display: inline-block; }
      h1 { font-size: 22px; color: #ffffff; margin: 0 0 4px 0; letter-spacing: 0.5px; }
      .header-subline { font-size: 11px; color: #c5d8ef; }
      .header-meta strong { color: #ffffff; font-size: 12px; display: block; margin-bottom: 3px; }
      .info-grid { display: table; width: 100%; table-layout: fixed; border-spacing: 12px 0; margin: 0 -12px 20px -12px; }
      .info-card { display: table-cell; vertical-align: top; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .info-card-header { padding: 8px 12px; color: white; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
      .info-card-header.blue { background: linear-gradient(135deg, #0f2f57 0%, #173f73 100%); border-bottom: 3px solid #e87a20; }
      .info-card-header.coral { background: linear-gradient(135deg, #e87a20 0%, #c2410c 100%); border-bottom: 3px solid #0f2f57; }
      .info-card-body { padding: 6px 12px; }
      .info-row { margin-bottom: 0; padding: 8px 0; border-bottom: 1px solid #eceff3; }
      .info-row:last-child { margin-bottom: 0; padding-bottom: 6px; border-bottom: 0; }
      .info-label { font-size: 9px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 2px; }
      .info-value { font-size: 12px; font-weight: bold; color: #111827; }
      .section { margin-bottom: 20px; }
      .section-header { display: table; width: 100%; margin-bottom: 10px; }
      .section-icon, .section-header-text { display: table-cell; vertical-align: middle; }
      .section-icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0f2f57 0%, #e87a20 100%); color: white; font-size: 11px; font-weight: bold; text-align: center; line-height: 38px; box-shadow: 0 2px 6px rgba(15, 47, 87, 0.2); }
      .section-header-text { padding-left: 10px; }
      .section-title { font-size: 14px; font-weight: bold; color: #0f2f57; margin-bottom: 2px; }
      .section-subtitle { font-size: 9px; color: #6b7280; }
      .summary-strip { display: table; width: 100%; table-layout: fixed; border-spacing: 8px 0; margin: 0 -8px 12px -8px; }
      .summary-card { display: table-cell; text-align: center; padding: 6px 4px; border-radius: 10px; color: white; font-weight: bold; }
      .summary-ok { background: #16a34a; } .summary-fail { background: #e87a20; } .summary-na { background: #6b7280; } .summary-cant { background: #7c3aed; } .summary-total { background: #0f2f57; }
      .summary-value { font-size: 18px; line-height: 1; margin-bottom: 4px; }
      .summary-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; }
      .photos-grid { display: table; width: 100%; table-layout: fixed; border-spacing: 10px 10px; margin: 0 -10px; }
      .photos-row { display: table-row; }
      .photo-card { display: table-cell; width: 50%; vertical-align: top; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
      .header-thumbnail { width: 100%; height: auto; max-height: 190px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
      .header-photo-label { font-size: 9px; color: #0f2f57; margin-top: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
      .category { margin-bottom: 16px; }
      .category-banner { background: linear-gradient(90deg, #0f2f57 0%, #173f73 60%, #e87a20 100%); color: white; padding: 6px 12px; border-radius: 10px 10px 0 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; }
      .checklist-two-col { display: table; width: 100%; table-layout: fixed; border-spacing: 10px 0; margin: 0 -10px; }
      .checklist-col { display: table-cell; width: 50%; vertical-align: top; }
      .checklist-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; border: 0.5px solid #e2e8f0; border-top: 0; border-radius: 0 0 10px 10px; overflow: hidden; }
      .checklist-table th, .checklist-table td { border-bottom: 0.5px solid #e2e8f0; padding: 7px 10px; text-align: left; vertical-align: middle; }
      .checklist-table th { background: #0f2f57; color: white; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #e87a20; padding: 8px 10px; }
      .item-text { color: #1f2937; font-size: 12px; line-height: 1.5; }
      .status-cell { text-align: center; }
      .status-pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: bold; white-space: nowrap; letter-spacing: 0.3px; }
      .status-pill.ok { background: #dcfce7; color: #15803d; border: 0.5px solid #bbf7d0; }
      .status-pill.fail { background: #fff7ed; color: #9a3412; border: 0.5px solid #fed7aa; }
      .status-pill.na, .status-pill.pending { background: #f3f4f6; color: #4b5563; border: 0.5px solid #e5e7eb; }
      .status-pill.cant { background: #f5f3ff; color: #5b21b6; border: 0.5px solid #c4b5fd; }
      .status-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 4px; }
      .status-dot.ok { background: #16a34a; } .status-dot.fail { background: #e87a20; } .status-dot.na, .status-dot.pending { background: #6b7280; } .status-dot.cant { background: #7c3aed; }
      .item-comment { background: #fff7ed; border-left: 3px solid #e87a20; padding: 4px 8px; border-radius: 4px; font-size: 9px; color: #9a3412; }
      .item-comment.cant { background: #f5f3ff; border-left-color: #7c3aed; color: #5b21b6; }
      .photo-cell { padding: 6px 8px !important; background: #fafbfd; }
      .evidence-photos-grid { display: block; }
      .evidence-photo-container { display: table; width: 100%; margin-bottom: 6px; page-break-inside: avoid; }
      .evidence-photo-frame { display: table-cell; width: 90px; vertical-align: top; background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .evidence-photo { width: 100%; height: auto; max-height: 80px; object-fit: contain; border-radius: 4px; }
      .materials-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
      .materials-table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .materials-table thead { background: linear-gradient(90deg, #0f2f57 0%, #173f73 60%, #e87a20 100%); color: white; }
      .materials-table th { padding: 9px 10px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
      .materials-table td { padding: 9px 10px; border-bottom: 0.5px solid #e2e8f0; background: white; color: #1f2937; }
      .materials-table tbody tr:nth-child(even) td, .checklist-table tbody tr:nth-child(even) > td { background: #f8fafc; }
      .comments-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
      .comments-content { font-size: 13px; line-height: 1.6; }
      .comments-content > div { background: #fafbfd; border-left: 4px solid #e87a20; border-radius: 0 10px 10px 0; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
      .footer { margin-top: 28px; text-align: center; font-size: 8px; color: #6b7280; padding-top: 0; }
      .footer-separator { height: 2px; background: linear-gradient(90deg, transparent 0%, #e87a20 20%, #0f2f57 80%, transparent 100%); border-radius: 2px; margin-bottom: 14px; }
      .footer-logo { max-width: 110px; max-height: 40px; object-fit: contain; margin-bottom: 8px; opacity: 0.85; }
      .footer-address { font-size: 8px; color: #374151; font-weight: bold; line-height: 1.5; margin-bottom: 10px; }
      .footer-legal { font-size: 6.5px; color: #9ca3af; line-height: 1.4; text-align: justify; padding: 0 15px; }
    </style>
  </head>
  <body>
    <div class="page-shell">
      <div class="header">
        <div class="header-top">
          <div class="header-brand"><div class="brand-wrap"><div class="logo-badge"><img src="${logoBase64}" class="company-logo" alt="Logo Empresa" /></div><div><div class="header-kicker">Mantenimientos y reparaciones</div><h1>Informe de mantenimiento</h1><div class="header-subline">Documento técnico de revisión visual y funcional</div></div></div></div>
          <div class="header-meta"><strong>INVAL M.S.L.</strong><br />Fecha: ${date}<br />Técnico: ${esc(inspection.reviewedBy) || 'No especificado'}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-header blue">Datos del cliente</div>
          <div class="info-card-body">
            <div class="info-row"><div class="info-label">Cliente</div><div class="info-value">${esc(inspection.clientName) || 'No especificado'}</div></div>
            <div class="info-row"><div class="info-label">Ubicación</div><div class="info-value">${esc(inspection.location) || 'No especificado'}</div></div>
            <div class="info-row"><div class="info-label">Revisado por</div><div class="info-value">${esc(inspection.reviewedBy) || 'No especificado'}</div></div>
            <div class="info-row"><div class="info-label">Fecha</div><div class="info-value">${date}</div></div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card-header coral">Datos de la máquina</div>
          <div class="info-card-body">
            <div class="info-row"><div class="info-label">Nombre</div><div class="info-value">${esc(machineName)}</div></div>
            <div class="info-row"><div class="info-label">Tipo</div><div class="info-value">${getMachineTypeAbbreviation(inspection.machineType || 'otros')}</div></div>
            <div class="info-row"><div class="info-label">Marca / Modelo</div><div class="info-value">${esc(inspection.brand) || 'No especificado'} / ${esc(inspection.model) || 'No especificado'}</div></div>
            <div class="info-row"><div class="info-label">Nº Serie</div><div class="info-value">${esc(inspection.serialNumber) || 'No especificado'}</div></div>
            <div class="info-row"><div class="info-label">Matrícula</div><div class="info-value">${esc(inspection.licensePlate) || 'No especificado'}</div></div>
            ${inspection.otNumber ? `<div class="info-row"><div class="info-label">OT</div><div class="info-value">${esc(inspection.otNumber)}</div></div>` : ''}
          </div>
        </div>
      </div>

      ${generalPhotosHtml}
      ${safetySummaryHtml}
      ${checklistHtml}
      ${materialsHtml}
      ${commentsHtml}

      <div class="footer">
        <div class="footer-separator"></div>
        <img src="${logoBase64}" class="footer-logo" alt="Logo INVAL" />
        <p class="footer-address">C/. Dels Argenters, s/nº - Pol. El Alter<br/>46290 ALCÁCER (VALENCIA) - Apdo. 147<br/>Tel.: 96 110 04 29 · Fax: 96 123 06 68<br/>inval@inval-sl.com</p>
        <p class="footer-legal">De conformidad con lo que establece la Ley Orgánica 15/1999 de Protección de Datos de Carácter Personal, le informamos que sus datos personales serán incluidos dentro de un fichero automatizado bajo la responsabilidad de INVAL M. S.L., con la finalidad de poder atender los compromisos derivados de la relación que mantenemos con usted. Puede ejercer sus derechos de ACCESO, RECTIFICACIÓN, OPOSICIÓN Y CANCELACIÓN de los datos personales objeto de tratamiento ante INVAL, M.S.L. IND. EL ALTER ALCÁCER 46290 - VALENCIA. Si en el plazo de 50 días no nos comunica lo contrario, entenderemos que nos da su consentimiento para que los datos no han sido modificados, que se compromete a notificarnos cualquier variación y que tenemos el consentimiento para remitirles publicidad y/o información que pueda ser de su interés, vía postal.</p>
      </div>
    </div>
  </body>
  </html>`;
};

const buildMantenimientoPdfStoragePath = (inspection: MantenimientoInspection): string => {
  const client = cleanFileName(inspection.clientName || 'cliente');
  const identifier = cleanFileName(inspection.licensePlate || inspection.serialNumber || 'sin_identificar');
  const recordId = cleanFileName((inspection.id || inspection.date || '').slice(0, 12));
  return `mantenimiento/${client}_${identifier}_${recordId}/informe_mantenimiento_${client}_${identifier}.pdf`;
};

const uploadMantenimientoPdf = async (inspection: MantenimientoInspection, pdfBase64: string): Promise<string | null> => {
  const storagePath = buildMantenimientoPdfStoragePath(inspection);
  const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(storagePath, decode(pdfBase64), {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl || null;
  if (!publicUrl) return null;

  const { error: updateError } = await supabase
    .from('mantenimiento_inspections')
    .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', inspection.id);
  if (updateError) throw updateError;

  inspection.pdfUrl = publicUrl;
  return publicUrl;
};

export const generateMantenimientoReport = async (inspection: MantenimientoInspection): Promise<string | null> => {
  try {
    const html = await generateMantenimientoHTML(inspection);
    const { uri, base64 } = await Print.printToFileAsync({ html, width: 595, height: 842, base64: true });
    if (base64) {
      try {
        await uploadMantenimientoPdf(inspection, base64);
      } catch (uploadError) {
        console.error('Error al subir PDF de mantenimiento:', uploadError);
      }
    }
    return uri;
  } catch (error) {
    console.error('Error al generar informe de mantenimiento:', error);
    Alert.alert('Error', 'No se pudo generar el PDF de mantenimiento.');
    return null;
  }
};

export const shareMantenimientoReport = async (inspection: MantenimientoInspection): Promise<void> => {
  const uri = await generateMantenimientoReport(inspection);
  if (!uri) return;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Compartir Mantenimiento - ${inspection.clientName}`,
      UTI: 'com.adobe.pdf',
    });
  }
};

export default { generateMantenimientoReport, shareMantenimientoReport };
