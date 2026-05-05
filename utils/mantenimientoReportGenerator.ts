import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getMachineTypeById } from '../data/machineTypes';
import { renderSafetySummaryHTML } from './safetyChecklist';
import type { MantenimientoInspection } from './mantenimientoStorage';

const statusText = (status: string): string => {
  switch (status) {
    case 'ok': return 'Bien';
    case 'fail': return 'Mal';
    case 'na': return 'N/A';
    case 'cant': return 'No se puede';
    default: return 'Sin revisar';
  }
};

const statusColor = (status: string): string => {
  switch (status) {
    case 'ok': return '#16a34a';
    case 'fail': return '#f97316';
    case 'na': return '#64748b';
    case 'cant': return '#7c3aed';
    default: return '#94a3b8';
  }
};

const esc = (value?: string): string => (value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));

const renderPhotoGrid = (photos: string[], emptyText = 'Sin fotos'): string => {
  if (!photos.length) return `<p class="muted">${emptyText}</p>`;
  return `<div class="photos">${photos.map((uri) => `<img src="${esc(uri)}" />`).join('')}</div>`;
};

export const generateMantenimientoReport = async (inspection: MantenimientoInspection): Promise<string | null> => {
  try {
    const machineName = getMachineTypeById(inspection.machineType).name;
    const grouped = inspection.checklist.reduce<Record<string, typeof inspection.checklist>>((acc, item) => {
      const key = item.category || 'Checklist';
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

    const html = `
      <!doctype html>
      <html><head><meta charset="utf-8" />
      <style>
        body{font-family:Arial,sans-serif;color:#0f172a;margin:0;padding:24px;background:#f8fafc}
        .header{background:linear-gradient(135deg,#0f2f57,#e87a20);color:white;border-radius:18px;padding:24px;margin-bottom:18px}
        h1{margin:0;font-size:28px} h2{color:#0f2f57;border-bottom:2px solid #e87a20;padding-bottom:6px;margin-top:24px}
        .subtitle{opacity:.9;margin-top:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.field{background:white;border-radius:10px;padding:10px;border:1px solid #e2e8f0}.label{font-size:11px;color:#64748b;text-transform:uppercase}.value{font-weight:700;margin-top:4px}.card{background:white;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid #e2e8f0}.status{display:inline-block;color:white;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700}.muted{color:#64748b}.photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.photos img{width:145px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden}td,th{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#0f2f57;color:white}.footer{margin-top:24px;font-size:11px;color:#64748b;text-align:center}
      </style></head><body>
        <div class="header"><h1>Informe de Mantenimiento</h1><div class="subtitle">INVAL March S.L. · ${esc(inspection.date)}</div></div>
        <h2>Datos generales</h2>
        <div class="grid">
          <div class="field"><div class="label">Cliente</div><div class="value">${esc(inspection.clientName)}</div></div>
          <div class="field"><div class="label">Ubicación</div><div class="value">${esc(inspection.location)}</div></div>
          <div class="field"><div class="label">Técnico</div><div class="value">${esc(inspection.reviewedBy)}</div></div>
          <div class="field"><div class="label">OT</div><div class="value">${esc(inspection.otNumber)}</div></div>
          <div class="field"><div class="label">Tipo máquina</div><div class="value">${esc(machineName)}</div></div>
          <div class="field"><div class="label">Matrícula / serie</div><div class="value">${esc(inspection.licensePlate || inspection.serialNumber)}</div></div>
          <div class="field"><div class="label">Marca</div><div class="value">${esc(inspection.brand)}</div></div>
          <div class="field"><div class="label">Modelo</div><div class="value">${esc(inspection.model)}</div></div>
        </div>
        <h2>Checklist de seguridad</h2>
        ${renderSafetySummaryHTML(inspection.safetyChecklist)}
        <h2>Fotos generales</h2>${renderPhotoGrid(Object.values(inspection.generalPhotos || {}).filter(Boolean))}
        <h2>Checklist de mantenimiento</h2>
        ${Object.entries(grouped).map(([category, items]) => `<div class="card"><h3>${esc(category)}</h3>${items.map((item) => `<div style="margin:10px 0;padding-top:8px;border-top:1px solid #e2e8f0"><span class="status" style="background:${statusColor(item.status)}">${statusText(item.status)}</span> <strong>${esc(item.text)}</strong>${item.comment ? `<p>${esc(item.comment)}</p>` : ''}${renderPhotoGrid(item.photos || [], '')}</div>`).join('')}</div>`).join('')}
        <h2>Materiales</h2>
        ${inspection.materials.length ? `<table><tr><th>Material</th><th>Cantidad</th><th>Referencia</th></tr>${inspection.materials.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.quantity)}</td><td>${esc(m.reference)}</td></tr>`).join('')}</table>` : '<p class="muted">Sin materiales indicados.</p>'}
        <h2>Observaciones</h2><div class="card">${esc(inspection.notes) || '<span class="muted">Sin observaciones.</span>'}</div>
        <div class="footer">ID informe: ${esc(inspection.id)}</div>
      </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
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
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir informe de mantenimiento' });
};
