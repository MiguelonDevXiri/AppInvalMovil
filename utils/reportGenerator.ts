import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { getChecklistByMachineType } from '../data/machineChecklists';
import { ChecklistData, GeneralPhotosData, Machine } from './storage';
import { supabase } from './supabase';

// Función para obtener texto de estado
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'ok':
      return 'Bien';
    case 'fail':
      return 'Mal';
    case 'na':
      return 'No Aplica';
    case 'cant':
      return 'No se puede';
    default:
      return 'No Revisado';
  }
};

// Función para obtener color según estado
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ok':
      return '#4CAF50';
    case 'fail':
      return '#ff7500';
    case 'na':
      return '#9E9E9E';
    case 'cant':
      return '#7c3aed';
    default:
      return '#757575';
  }
};

const isRemoteUri = (uri: string): boolean => uri.startsWith('http://') || uri.startsWith('https://');

const ensureLocalImageUri = async (uri: string): Promise<string> => {
  if (!uri) return uri;
  if (!isRemoteUri(uri)) return uri;

  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}report_img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(uri, targetPath);
  return downloadResult.uri;
};

// Función mejorada para convertir una imagen a base64 con orientación correcta
const getImageBase64WithOrientation = async (
  uri: string, 
  maxWidth: number = 800,
  forThumbnail: boolean = false
): Promise<string> => {
  try {
    const localUri = await ensureLocalImageUri(uri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      console.warn('La imagen no existe en la ruta:', uri);
      return getPlaceholderImageBase64();
    }

    let manipulations: ImageManipulator.Action[] = [];
    
    // Redimensionar manteniendo la proporción de aspecto
    manipulations.push({ resize: { width: maxWidth } });

    const resizedImage = await ImageManipulator.manipulateAsync(
      localUri,
      manipulations,
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64
    });

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen a base64:', error);
    return getPlaceholderImageBase64();
  }
};

// Función para convertir una imagen URI a base64 (para checklist y comentarios)
const getImageBase64 = async (uri: string): Promise<string> => {
  return getImageBase64WithOrientation(uri, 300, false);
};

// Función para obtener imagen thumbnail más grande para fotos generales
const getThumbnailBase64 = async (uri: string): Promise<string> => {
  return getImageBase64WithOrientation(uri, 400, true);
};

// Función para obtener una imagen de placeholder en caso de error
const getPlaceholderImageBase64 = (): string => {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQAAAACFI5MzAAAAA1BMVEXk5+pYdT3IAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAFUlEQVRIie3BAQEAAACAkP6v7ggKAAAuAAGfAAEkOuFjAAAAAElFTkSuQmCC';
};

// Función para obtener el logo en base64
export const getLogoBase64 = (): string => {
  // IMPORTANTE: Reemplaza esto con tu logo real en base64
  return 'data:image/png;base64,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';
};

// Función para obtener abreviatura del tipo de máquina
export const getMachineTypeAbbreviation = (machineTypeId: string): string => {
  const abbreviations: { [key: string]: string } = {
    'autocompactador': 'AC',
    'compactador-estatico': 'CE',
    'rotoprensa': 'RT',
    'volteador': 'V',
    'contenedor': 'C',
    'caja-estatica': 'CJ',
    'prensa-vertical': 'PV',
    'otros': 'O'
  };
  
  return abbreviations[machineTypeId] || 'O';
};

// Función para limpiar nombre de archivo
const cleanFileName = (name: string): string => {
  // Eliminar caracteres especiales y limitar longitud
  return name
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ'\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50);
};

// Función para copiar y renombrar una imagen
const copyImageWithNewName = async (sourceUri: string, newName: string, index: number = 0): Promise<string> => {
  try {
    const localSourceUri = await ensureLocalImageUri(sourceUri);
    const fileInfo = await FileSystem.getInfoAsync(localSourceUri);
    if (!fileInfo.exists) {
      console.warn('La imagen no existe:', sourceUri);
      return '';
    }

    const cleanName = cleanFileName(newName);
    const newFileName = `${cleanName}.jpg`;
    const newPath = `${FileSystem.documentDirectory}${newFileName}`;

    let finalPath = newPath;
    let counter = 1;
    while (true) {
      const exists = await FileSystem.getInfoAsync(finalPath);
      if (!exists.exists) break;
      
      finalPath = `${FileSystem.documentDirectory}${cleanName}_${counter}.jpg`;
      counter++;
    }

    await FileSystem.copyAsync({
      from: localSourceUri,
      to: finalPath
    });

    console.log(`Imagen copiada: ${finalPath.split('/').pop()}`);
    return finalPath;
  } catch (error) {
    console.error('Error al copiar imagen:', error);
    return '';
  }
};

// Función para exportar todas las imágenes con nombres basados en comentarios
const exportAllImages = async (
  machine: Machine,
  checklistResults: ChecklistData | null,
  generalPhotos: GeneralPhotosData | null
): Promise<string[]> => {
  const exportedPaths: string[] = [];
  let imageCounter = 0;
  
  try {
    console.log('Iniciando exportación de imágenes...');
    
    // Exportar fotos generales con nombre MATRÍCULA_A1..A4
    if (generalPhotos && generalPhotos.photos) {
      console.log('Exportando fotos generales...');
      const idPrefix = cleanFileName(machine.licensePlate?.trim() || machine.serialNumber?.trim() || '');
      const positions: { key: string; label: string }[] = [
        { key: 'front', label: idPrefix ? `${idPrefix}_A1` : 'A1' },
        { key: 'back', label: idPrefix ? `${idPrefix}_A2` : 'A2' },
        { key: 'left', label: idPrefix ? `${idPrefix}_A3` : 'A3' },
        { key: 'right', label: idPrefix ? `${idPrefix}_A4` : 'A4' },
      ];
      for (const pos of positions) {
        const uri = generalPhotos.photos[pos.key];
        if (uri) {
          imageCounter++;
          const path = await copyImageWithNewName(uri, pos.label, imageCounter);
          if (path) exportedPaths.push(path);
        }
      }
    }

    // Exportar fotos del checklist con sus comentarios
    if (checklistResults && checklistResults.photos) {
      console.log('Exportando fotos del checklist...');
      const machineChecklist = getChecklistByMachineType(machine.machineType || 'otros');
      
      for (const [itemId, photos] of Object.entries(checklistResults.photos)) {
        let itemText = itemId;
        for (const category of machineChecklist) {
          const item = category.items.find(i => i.id === itemId);
          if (item) {
            itemText = item.text;
            break;
          }
        }

        const photoArray = Array.isArray(photos) ? photos : [photos];
        
        for (let i = 0; i < photoArray.length; i++) {
          const photo = photoArray[i];
          const uri = typeof photo === 'string' ? photo : (photo as any).uri;
          const comment = typeof photo === 'object' ? (photo as any).comment : '';
          
          if (uri) {
            imageCounter++;
            const fileName = comment && comment.trim() !== '' ? comment : itemText;
            const path = await copyImageWithNewName(uri, fileName, imageCounter);
            if (path) exportedPaths.push(path);
          }
        }
      }
    }

    // Exportar fotos de comentarios específicos
    if (machine.commentsWithPhotos) {
      console.log('Exportando fotos de comentarios específicos...');
      
      for (const commentWithPhoto of machine.commentsWithPhotos) {
        if (commentWithPhoto.photoUri) {
          imageCounter++;
          const fileName = commentWithPhoto.text && commentWithPhoto.text.trim() !== ''
            ? commentWithPhoto.text
            : `Comentario_${imageCounter}`;
          
          const path = await copyImageWithNewName(commentWithPhoto.photoUri, fileName, imageCounter);
          if (path) exportedPaths.push(path);
        }
      }
    }

    console.log(`Total de imágenes exportadas: ${exportedPaths.length}`);
    return exportedPaths;
  } catch (error) {
    console.error('Error al exportar imágenes:', error);
    return exportedPaths;
  }
};

// Función actualizada para procesar comentarios con fotos embebidas
const processComments = async (machine: Machine): Promise<string> => {
  if (!machine.notes && !machine.commentsWithPhotos) {
    return 'No se añadieron comentarios.';
  }

  let htmlContent = '';

  if (machine.commentsWithPhotos && machine.commentsWithPhotos.length > 0) {
    // Procesar todas las fotos de comentarios en paralelo
    const photoPromises = machine.commentsWithPhotos.map((comment) =>
      comment.photoUri ? getImageBase64(comment.photoUri).catch(() => '') : Promise.resolve('')
    );
    const photoResults = await Promise.all(photoPromises);

    for (let i = 0; i < machine.commentsWithPhotos.length; i++) {
      const comment = machine.commentsWithPhotos[i];

      htmlContent += `
        <div class="comment-block">
          <strong class="comment-title">
            Comentario #${i + 1}:
          </strong>
          <div class="comment-text">
            ${comment.text || 'Sin texto'}
          </div>
      `;

      if (comment.photoUri && photoResults[i]) {
        htmlContent += `
            <div class="comment-photo-wrap">
              <img src="${photoResults[i]}" class="comment-photo" />
            </div>
          `;
      }

      htmlContent += '</div>';
    }
  } else if (machine.notes) {
    htmlContent = machine.notes.replace(/\n/g, '<br>');
    htmlContent = htmlContent.replace(
      /#(\d+):/g,
      '<strong class="comment-title">Comentario #$1:</strong>'
    );
  }

  return htmlContent || 'No se añadieron comentarios específicos.';
};

// Función para procesar una foto y extraer uri y comentario
const processPhotoItem = (photoItem: any): { uri: string, comment?: string } => {
  if (typeof photoItem === 'string') {
    return { uri: photoItem };
  } else if (photoItem && typeof photoItem === 'object') {
    return { 
      uri: photoItem.uri || '', 
      comment: photoItem.comment 
    };
  }
  
  return { uri: '' };
};

// Función para generar informe HTML
export const generateHTMLReport = async (
  machine: Machine,
  checklistResults: ChecklistData | null,
  generalPhotos: GeneralPhotosData | null
): Promise<string> => {
  const date = new Date().toLocaleDateString();
  const machineChecklist = getChecklistByMachineType(machine.machineType || 'otros');

  const statusCounts = {
    ok: 0,
    fail: 0,
    na: 0,
    pending: 0,
  };

  let generalPhotosThumbnails = '';
  const photoIdPrefix = cleanFileName(machine.licensePlate?.trim() || machine.serialNumber?.trim() || '');
  const generalPhotoLabelMap: Record<string, string> = {
    front: photoIdPrefix ? `${photoIdPrefix}_A1` : 'A1',
    back: photoIdPrefix ? `${photoIdPrefix}_A2` : 'A2',
    left: photoIdPrefix ? `${photoIdPrefix}_A3` : 'A3',
    right: photoIdPrefix ? `${photoIdPrefix}_A4` : 'A4',
  };

  if (generalPhotos && generalPhotos.photos) {
    const photoPromises: Promise<string>[] = [];
    const photoLabels: string[] = [];

    if (generalPhotos.photos.front) {
      photoPromises.push(getThumbnailBase64(generalPhotos.photos.front));
      photoLabels.push(generalPhotoLabelMap.front);
    }
    if (generalPhotos.photos.back) {
      photoPromises.push(getThumbnailBase64(generalPhotos.photos.back));
      photoLabels.push(generalPhotoLabelMap.back);
    }
    if (generalPhotos.photos.left) {
      photoPromises.push(getThumbnailBase64(generalPhotos.photos.left));
      photoLabels.push(generalPhotoLabelMap.left);
    }
    if (generalPhotos.photos.right) {
      photoPromises.push(getThumbnailBase64(generalPhotos.photos.right));
      photoLabels.push(generalPhotoLabelMap.right);
    }

    const thumbnails = await Promise.all(photoPromises);

    generalPhotosThumbnails = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon">01</div>
          <div class="section-header-text">
            <div class="section-title">Fotografías generales</div>
            <div class="section-subtitle">Vista general de la máquina inspeccionada</div>
          </div>
        </div>
        <div class="photos-grid">
          ${thumbnails.map((thumb, idx) => `${idx % 2 === 0 ? '<div class="photos-row">' : ''}
            <div class="photo-card">
              <img src="${thumb}" class="header-thumbnail" />
              <div class="header-photo-label">${photoLabels[idx]}</div>
            </div>
          ${idx % 2 === 1 || idx === thumbnails.length - 1 ? '</div>' : ''}`).join('')}
        </div>
      </div>
    `;
  }

  let checklistHtml = '';

  if (checklistResults && checklistResults.results) {
    console.log('Generando HTML para checklist con resultados:', Object.keys(checklistResults.results).length);

    Object.values(checklistResults.results).forEach((status) => {
      if (status === 'ok') statusCounts.ok++;
      else if (status === 'fail') statusCounts.fail++;
      else if (status === 'na') statusCounts.na++;
      else if (status === 'cant') statusCounts.pending++;
      else statusCounts.pending++;
    });

    checklistHtml += `
      <div class="section">
    `;

    for (const category of machineChecklist) {
      const activeItems = category.items.filter(item => checklistResults.results[item.id] !== undefined);

      if (activeItems.length > 0) {
        type ActiveItem = typeof category.items[number];
        // Pre-process all photos for fail items in this category in parallel
        const failItemsWithPhotos: { item: ActiveItem; photoArray: any[] }[] = [];
        for (const item of activeItems) {
          const status = checklistResults.results[item.id];
          const itemPhotos = checklistResults.photos?.[item.id];
          if (status === 'fail' && itemPhotos) {
            let photoArray: any[] = [];
            if (Array.isArray(itemPhotos)) photoArray = itemPhotos;
            else if (typeof itemPhotos === 'string') photoArray = [itemPhotos];
            else if (typeof itemPhotos === 'object' && itemPhotos !== null) photoArray = [itemPhotos];
            if (photoArray.length > 0) {
              failItemsWithPhotos.push({ item, photoArray });
            }
          }
        }

        // Resolve all photo base64 in parallel for this category
        const allPhotoPromises: Promise<string>[] = [];
        const photoIndexMap: { itemId: string; startIdx: number; count: number; comments: (string | undefined)[] }[] = [];
        for (const { item, photoArray } of failItemsWithPhotos) {
          const startIdx = allPhotoPromises.length;
          const comments: (string | undefined)[] = [];
          for (const p of photoArray) {
            const { uri, comment } = processPhotoItem(p);
            allPhotoPromises.push(getImageBase64(uri).catch(() => ''));
            comments.push(comment);
          }
          photoIndexMap.push({ itemId: item.id, startIdx, count: photoArray.length, comments });
        }
        const allPhotoResults = await Promise.all(allPhotoPromises);

        // Build a lookup: itemId -> resolved photo HTML
        const photoHtmlByItemId: Record<string, string> = {};
        for (const { itemId, startIdx, count, comments } of photoIndexMap) {
          let photoHtml = '';
          for (let pi = 0; pi < count; pi++) {
            const base64Image = allPhotoResults[startIdx + pi];
            if (base64Image) {
              photoHtml += `<div class="evidence-photo-container">
                <div class="evidence-photo-frame"><img src="${base64Image}" class="evidence-photo" /></div>
                ${comments[pi] ? `<div class="photo-comment-inline">${comments[pi]}</div>` : ''}
              </div>`;
            }
          }
          if (photoHtml) {
            photoHtmlByItemId[itemId] = photoHtml;
          }
        }

        // Helper to generate item row + optional photos inline (now sync for photos)
        const generateItemWithPhotos = (item: ActiveItem) => {
          const status = checklistResults.results[item.id];
          const statusText = getStatusText(status);
          const statusClass = status;
          
          let html = `
              <tr>
                <td class="item-text">${item.text}</td>
                <td class="status-cell">
                  <span class="status-pill ${statusClass}">
                    <span class="status-dot ${statusClass}"></span>
                    ${statusText}
                  </span>
                </td>
              </tr>`;

          if (status === 'cant' && checklistResults.cantDoComments?.[item.id]) {
            html += `<tr><td colspan="2" style="padding: 4px 8px;"><div style="background: #f3f0ff; border-left: 3px solid #7c3aed; padding: 4px 8px; border-radius: 4px; font-size: 8px; color: #5b21b6;"><strong>Motivo:</strong> ${checklistResults.cantDoComments[item.id]}</div></td></tr>`;
          }

          if (photoHtmlByItemId[item.id]) {
            html += `<tr><td colspan="2" class="photo-cell"><div class="evidence-photos-grid">${photoHtmlByItemId[item.id]}</div></td></tr>`;
          }
          return html;
        };

        // Helper to generate a mini-table
        const generateMiniTable = (items: ActiveItem[]) => {
          let html = `<table class="checklist-table">
              <thead>
                <tr>
                  <th style="width: 70%;">Ítem</th>
                  <th style="width: 30%; text-align:center;">Estado</th>
                </tr>
              </thead>
              <tbody>`;
          for (const item of items) {
            html += generateItemWithPhotos(item);
          }
          html += `</tbody></table>`;
          return html;
        };

        // Reparto equilibrado en 2 columnas, teniendo en cuenta el peso visual de fotos/comentarios
        const estimateItemWeight = (item: ActiveItem) => {
          let weight = 1;
          if (photoHtmlByItemId[item.id]) weight += 2;
          if (checklistResults.cantDoComments?.[item.id]) weight += 1;
          return weight;
        };

        const leftItems: ActiveItem[] = [];
        const rightItems: ActiveItem[] = [];
        let leftWeight = 0;
        let rightWeight = 0;

        for (const item of activeItems) {
          const weight = estimateItemWeight(item);
          if (leftWeight <= rightWeight) {
            leftItems.push(item);
            leftWeight += weight;
          } else {
            rightItems.push(item);
            rightWeight += weight;
          }
        }

        checklistHtml += `
          <div class="category">
            <div class="category-banner">${category.category}</div>
            <div class="checklist-two-col">
              <div class="checklist-col">${generateMiniTable(leftItems)}</div>
              <div class="checklist-col">${rightItems.length > 0 ? generateMiniTable(rightItems) : ''}</div>
            </div>
          </div>`;
      }
    }

    checklistHtml += `</div>`;
  } else {
    console.log('No hay resultados de checklist, mostrando observaciones generales');
    checklistHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon">02</div>
          <div class="section-header-text">
            <div class="section-title">Observaciones generales</div>
            <div class="section-subtitle">No hay checklist registrado para esta inspección</div>
          </div>
        </div>
        <div class="notes-section">
          <p>${await processComments(machine)}</p>
        </div>
      </div>
    `;
  }

  let commentsHtml = '';
  if ((machine.notes || machine.commentsWithPhotos) && checklistResults && checklistResults.results) {
    commentsHtml = `
      <div class="section comments-section">
        <div class="section-header">
          <div class="section-icon">03</div>
          <div class="section-header-text">
            <div class="section-title">Comentarios específicos</div>
            <div class="section-subtitle">Observaciones adicionales del técnico</div>
          </div>
        </div>
        <div class="comments-content">
          ${await processComments(machine)}
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Informe de Inspección - ${machine.name}</title>
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
          background-image: url('${getLogoBase64()}');
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          width: 500px;
          height: 500px;
          opacity: 0.04;
          z-index: -1;
          pointer-events: none;
        }

        .page-shell {
          width: 100%;
        }

        .header {
          background: linear-gradient(135deg, #0a1f3d 0%, #0f2f57 30%, #173f73 70%, #1a4a85 100%);
          color: white;
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(15, 47, 87, 0.25);
        }

        .header-top {
          display: table;
          width: 100%;
        }

        .header-brand,
        .header-meta {
          display: table-cell;
          vertical-align: middle;
        }

        .header-meta {
          text-align: right;
          width: 42%;
          font-size: 9px;
          color: #c5d8ef;
          line-height: 1.6;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-badge {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          background: #ffffff;
          text-align: center;
          vertical-align: middle;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .company-logo {
          max-width: 58px;
          max-height: 58px;
          vertical-align: middle;
          display: inline-block;
        }

        .header-kicker {
          font-size: 9px;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #c5d8ef;
          margin-bottom: 4px;
          border-bottom: 2px solid #e87a20;
          padding-bottom: 4px;
          display: inline-block;
        }

        h1 {
          font-size: 22px;
          color: #ffffff;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
        }

        .header-subline {
          font-size: 11px;
          color: #c5d8ef;
        }

        .header-meta strong {
          color: #ffffff;
          font-size: 12px;
          display: block;
          margin-bottom: 3px;
        }

        .info-grid {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-spacing: 12px 0;
          margin: 0 -12px 20px -12px;
        }

        .info-card {
          display: table-cell;
          vertical-align: top;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }

        .info-card-header {
          padding: 8px 12px;
          color: white;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .info-card-header.blue {
          background: linear-gradient(135deg, #0f2f57 0%, #173f73 100%);
          border-bottom: 3px solid #e87a20;
        }

        .info-card-header.coral {
          background: linear-gradient(135deg, #e87a20 0%, #c2410c 100%);
          border-bottom: 3px solid #0f2f57;
        }

        .info-card-body {
          padding: 6px 12px;
        }

        .info-row {
          margin-bottom: 0;
          padding: 8px 0;
          border-bottom: 1px solid #eceff3;
        }

        .info-row:last-child {
          margin-bottom: 0;
          padding-bottom: 6px;
          border-bottom: 0;
        }

        .info-label {
          font-size: 9px;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 12px;
          font-weight: bold;
          color: #111827;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-header {
          display: table;
          width: 100%;
          margin-bottom: 10px;
        }

        .section-icon,
        .section-header-text {
          display: table-cell;
          vertical-align: middle;
        }

        .section-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0f2f57 0%, #e87a20 100%);
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-align: center;
          line-height: 38px;
          box-shadow: 0 2px 6px rgba(15, 47, 87, 0.2);
        }

        .section-header-text {
          padding-left: 10px;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #0f2f57;
          margin-bottom: 2px;
        }

        .section-subtitle {
          font-size: 9px;
          color: #6b7280;
        }

        .summary-strip {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-spacing: 8px 0;
          margin: 0 -8px 12px -8px;
        }

        .summary-card {
          display: table-cell;
          text-align: center;
          padding: 6px 4px;
          border-radius: 10px;
          color: white;
          font-weight: bold;
        }

        .summary-ok { background: #16a34a; }
        .summary-fail { background: #e87a20; }
        .summary-na { background: #6b7280; }

        .summary-value {
          font-size: 18px;
          line-height: 1;
          margin-bottom: 4px;
        }

        .summary-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .photos-grid {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-spacing: 10px 10px;
          margin: 0 -10px;
        }

        .photos-row {
          display: table-row;
        }

        .photo-card {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .header-thumbnail {
          width: 100%;
          height: auto;
          max-height: 190px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .header-photo-label {
          font-size: 9px;
          color: #0f2f57;
          margin-top: 8px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category {
          margin-bottom: 16px;
        }

        .category-banner {
          background: linear-gradient(90deg, #0f2f57 0%, #173f73 60%, #e87a20 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 10px 10px 0 0;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        /* Single column checklist - no two-col needed */

        .checklist-two-col {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-spacing: 10px 0;
          margin: 0 -10px;
        }

        .checklist-col {
          display: table-cell;
          width: 50%;
          vertical-align: top;
        }

        .checklist-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          border: 0.5px solid #e2e8f0;
          border-top: 0;
          border-radius: 0 0 10px 10px;
          overflow: hidden;
        }

        .checklist-table th,
        .checklist-table td {
          border-bottom: 0.5px solid #e2e8f0;
          padding: 7px 10px;
          text-align: left;
          vertical-align: middle;
        }

        .checklist-table th {
          background: #0f2f57;
          color: white;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 3px solid #e87a20;
          padding: 8px 10px;
        }

        .item-text {
          color: #1f2937;
          font-size: 12px;
          line-height: 1.5;
        }

        .status-cell,
        .evidence-indicator-cell {
          text-align: center;
        }

        .status-pill {
          display: inline-block;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          letter-spacing: 0.3px;
        }

        .status-pill.ok {
          background: #dcfce7;
          color: #15803d;
          border: 0.5px solid #bbf7d0;
        }

        .status-pill.fail {
          background: #fff7ed;
          color: #9a3412;
          border: 0.5px solid #fed7aa;
        }

        .status-pill.na {
          background: #f3f4f6;
          color: #4b5563;
          border: 0.5px solid #e5e7eb;
        }

        .status-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          margin-right: 4px;
        }

        .status-dot.ok { background: #16a34a; }
        .status-dot.fail { background: #e87a20; }
        .status-dot.na { background: #6b7280; }
        .status-dot.cant { background: #7c3aed; }
        .status-pill.cant {
          background: #f5f3ff;
          color: #5b21b6;
          border: 0.5px solid #c4b5fd;
        }

        .evidence-indicator {
          display: inline-block;
          font-size: 9px;
          font-weight: bold;
          color: #e87a20;
          background: #fff3e0;
          border: 1px solid #f5c088;
          border-radius: 999px;
          padding: 4px 8px;
        }

        .no-evidence {
          color: #9ca3af;
          font-weight: bold;
        }

        .photo-cell {
          padding: 6px 8px !important;
          background: #fafbfd;
        }

        .evidence-photos-grid {
          display: block;
        }

        .evidence-photo-container {
          display: table;
          width: 100%;
          margin-bottom: 6px;
          page-break-inside: avoid;
        }

        .evidence-photo-frame {
          display: table-cell;
          width: 90px;
          vertical-align: top;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 3px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .evidence-photo {
          width: 100%;
          height: auto;
          max-height: 80px;
          object-fit: contain;
          border-radius: 4px;
        }

        .photo-comment-inline {
          display: table-cell;
          vertical-align: middle;
          padding-left: 8px;
          background: #fff7ed;
          border-left: 3px solid #e87a20;
          font-size: 11px;
          line-height: 1.4;
          border-radius: 0 6px 6px 0;
          color: #9a3412;
          padding: 6px 9px 6px 9px;
        }

        .comments-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .comments-content {
          font-size: 13px;
          line-height: 1.6;
        }

        .comments-content > div {
          background: #fafbfd;
          border-left: 4px solid #e87a20;
          border-radius: 0 10px 10px 0;
          padding: 12px 14px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .comment-photo {
          width: 100%;
          height: auto;
          max-height: 160px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
        }

        .notes-section {
          padding: 14px;
          background: #fafbfd;
          border-radius: 10px;
          border-left: 4px solid #e87a20;
          font-size: 11px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .comment-block {
          margin-bottom: 16px;
          page-break-inside: avoid;
          background: #fafbfd;
          border-left: 4px solid #e87a20;
          border-radius: 0 10px 10px 0;
          padding: 12px 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .comment-title {
          color: #0f2f57;
          display: block;
          margin-top: 0;
          margin-bottom: 5px;
          font-size: 13px;
          font-weight: bold;
        }

        .comment-text {
          margin-left: 0;
          margin-bottom: 8px;
          font-size: 13px;
          color: #1f2937;
          line-height: 1.6;
        }

        .comment-photo-wrap {
          margin: 10px 0 4px;
          text-align: center;
        }

        .checklist-table tbody tr:nth-child(even) > td {
          background: #f8fafc;
        }

        .footer {
          margin-top: 28px;
          text-align: center;
          font-size: 8px;
          color: #6b7280;
          padding-top: 0;
        }

        .footer-separator {
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #e87a20 20%, #0f2f57 80%, transparent 100%);
          border-radius: 2px;
          margin-bottom: 14px;
        }

        .footer-logo {
          max-width: 110px;
          max-height: 40px;
          object-fit: contain;
          margin-bottom: 8px;
          opacity: 0.85;
        }

        .footer-address {
          font-size: 8px;
          color: #374151;
          font-weight: bold;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .footer-legal {
          font-size: 6.5px;
          color: #9ca3af;
          line-height: 1.4;
          text-align: justify;
          padding: 0 15px;
        }

        .error-text {
          color: #e87a20;
          font-style: italic;
          font-size: 9px;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="page-shell">
        <div class="header">
          <div class="header-top">
            <div class="header-brand">
              <div class="brand-wrap">
                <div class="logo-badge">
                  <img src="${getLogoBase64()}" class="company-logo" alt="Logo Empresa" />
                </div>
                <div>
                  <div class="header-kicker">Mantenimientos y reparaciones</div>
                  <h1>Informe de inspección</h1>
                  <div class="header-subline">Documento técnico de revisión visual y funcional</div>
                </div>
              </div>
            </div>
            <div class="header-meta">
              <strong>INVAL M.S.L.</strong><br />
              Fecha: ${date}<br />
              Técnico: ${machine.reviewedBy || 'No especificado'}
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-card-header blue">Datos del cliente</div>
            <div class="info-card-body">
              <div class="info-row"><div class="info-label">Cliente</div><div class="info-value">${machine.clientName || 'No especificado'}</div></div>
              <div class="info-row"><div class="info-label">Ubicación</div><div class="info-value">${machine.location || 'No especificado'}</div></div>
              <div class="info-row"><div class="info-label">Revisado por</div><div class="info-value">${machine.reviewedBy || 'No especificado'}</div></div>
              <div class="info-row"><div class="info-label">Fecha</div><div class="info-value">${date}</div></div>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-header coral">Datos de la máquina</div>
            <div class="info-card-body">
              <div class="info-row"><div class="info-label">Nombre</div><div class="info-value">${machine.name}</div></div>
              <div class="info-row"><div class="info-label">Tipo</div><div class="info-value">${getMachineTypeAbbreviation(machine.machineType || 'otros')}</div></div>
              <div class="info-row"><div class="info-label">Marca / Modelo</div><div class="info-value">${machine.brand || 'No especificado'} / ${machine.model || 'No especificado'}</div></div>
              <div class="info-row"><div class="info-label">Nº Serie</div><div class="info-value">${machine.serialNumber || 'No especificado'}</div></div>
              <div class="info-row"><div class="info-label">Matrícula</div><div class="info-value">${machine.licensePlate || 'No especificado'}</div></div>
            </div>
          </div>
        </div>

        ${generalPhotosThumbnails}
        ${checklistHtml}
        ${commentsHtml}

        <div class="footer">
          <div class="footer-separator"></div>
          <img src="${getLogoBase64()}" class="footer-logo" alt="Logo INVAL" />
          <p class="footer-address">C/. Dels Argenters, s/nº - Pol. El Alter<br/>46290 ALCÁCER (VALENCIA) - Apdo. 147<br/>Tel.: 96 110 04 29 · Fax: 96 123 06 68<br/>inval@inval-sl.com</p>
          <p class="footer-legal">De conformidad con lo que establece la Ley Orgánica 15/1999 de Protección de Datos de Carácter Personal, le informamos que sus datos personales serán incluidos dentro de un fichero automatizado bajo la responsabilidad de INVAL M. S.L., con la finalidad de poder atender los compromisos derivados de la relación que mantenemos con usted. Puede ejercer sus derechos de ACCESO, RECTIFICACIÓN, OPOSICIÓN Y CANCELACIÓN de los datos personales objeto de tratamiento ante INVAL, M.S.L. IND. EL ALTER ALCÁCER 46290 - VALENCIA. Si en el plazo de 50 días no nos comunica lo contrario, entenderemos que nos da su consentimiento para que los datos no han sido modificados, que se compromete a notificarnos cualquier variación y que tenemos el consentimiento para remitirles publicidad y/o información que pueda ser de su interés, vía postal.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Función principal para generar y compartir PDF con imágenes en ZIP
export const sharePDFReport = async (
  machine: Machine, 
  checklistResults: ChecklistData | null, 
  generalPhotos: GeneralPhotosData | null,
  onProgress?: (percent: number, text: string) => void
): Promise<boolean> => {
  try {
    console.log("=== INICIANDO GENERACIÓN DE PDF CON IMÁGENES EN ZIP ===");
    
    onProgress?.(15, 'Procesando fotos...');
    const reportHTML = await generateHTMLReport(machine, checklistResults, generalPhotos);
    onProgress?.(50, 'Generando PDF...');
    
    const clientName = cleanFileName(machine.clientName);
    const machineTypeAbbr = getMachineTypeAbbreviation(machine.machineType || 'otros');
    
    let identifier = '';
    if (machine.licensePlate && machine.licensePlate.trim() !== '') {
      identifier = cleanFileName(machine.licensePlate.trim());
    } else if (machine.serialNumber && machine.serialNumber.trim() !== '') {
      identifier = cleanFileName(machine.serialNumber.trim());
    }
    
    let pdfFileName = `${clientName}_${machineTypeAbbr}`;
    if (identifier) {
      pdfFileName += `_${identifier}`;
    }
    pdfFileName += '.pdf';
    
    const pdfOptions = {
      html: reportHTML,
      width: 595,
      height: 842,
      base64: false,
    };
    
    const { uri: pdfUri } = await Print.printToFileAsync(pdfOptions);
    console.log(`PDF generado en: ${pdfUri}`);
    onProgress?.(65, 'Empaquetando archivos...');
    
    const pdfBase64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    onProgress?.(70, 'Exportando imágenes...');
    const exportedImages = await exportAllImages(machine, checklistResults, generalPhotos);
    
    const zipFile = new JSZip();
    zipFile.file(pdfFileName, pdfBase64, { base64: true });
    
    for (let i = 0; i < exportedImages.length; i++) {
      const imagePath = exportedImages[i];
      if (imagePath) {
        try {
          const imageInfo = await FileSystem.getInfoAsync(imagePath);
          if (imageInfo.exists) {
            const fileName = imagePath.split('/').pop() || `imagen_${i + 1}.jpg`;
            const imageBase64 = await FileSystem.readAsStringAsync(imagePath, {
              encoding: FileSystem.EncodingType.Base64
            });
            
            zipFile.file(fileName, imageBase64, { base64: true });
          }
        } catch (error) {
          console.error(`Error al agregar imagen ${i + 1}:`, error);
        }
      }
    }
    
    onProgress?.(85, 'Comprimiendo ZIP...');
    const zipBase64 = await zipFile.generateAsync({ 
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
    
    let zipFileName = `${clientName}_${machineTypeAbbr}`;
    if (identifier) {
      zipFileName += `_${identifier}`;
    }
    zipFileName += '.zip';
    
    const zipPath = `${FileSystem.documentDirectory}${zipFileName}`;
    
    await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    await FileSystem.deleteAsync(pdfUri, { idempotent: true });
    
    for (const imagePath of exportedImages) {
      if (imagePath) {
        await FileSystem.deleteAsync(imagePath, { idempotent: true });
      }
    }
    
    const zipInfo = await FileSystem.getInfoAsync(zipPath);
    if (!zipInfo.exists) {
      throw new Error('No se pudo crear el archivo ZIP');
    }
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Error', 'El compartir no está disponible en este dispositivo');
        return false;
      }
      
      // Subir PDF a Supabase Storage
      onProgress?.(92, 'Subiendo PDF a la nube...');
      try {
        const pdfStoragePath = `inspecciones/${cleanFileName(machine.clientName)}_${cleanFileName(machine.licensePlate || machine.serialNumber || '')}/informe_${pdfFileName}`;
        await supabase.storage.from('inspection-photos').upload(pdfStoragePath, decode(pdfBase64), {
          contentType: 'application/pdf',
          upsert: true,
        });
        // Guardar referencia en la máquina
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(pdfStoragePath);
        if (urlData?.publicUrl) {
          await supabase.from('machines').update({ pdf_url: urlData.publicUrl }).eq('id', machine.id);
        }
        console.log('PDF subido a Supabase Storage');
      } catch (uploadErr) {
        console.warn('No se pudo subir el PDF a Supabase (no crítico):', uploadErr);
      }

      onProgress?.(95, 'Abriendo compartir...');
      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: `Compartir Informe - ${machine.clientName}`
      });
      
      Alert.alert(
        'Informe generado',
        `Se ha generado el archivo ZIP con el PDF y ${exportedImages.length} imágenes.\n\nNombre: ${zipFileName}`,
        [{ text: 'OK' }]
      );
      
      return true;
    } else {
      window.open(zipPath, '_blank');
      return true;
    }
  } catch (error) {
    console.error('Error al generar o compartir el informe:', error);
    Alert.alert(
      'Error al generar informe', 
      'Ocurrió un problema al generar o compartir el informe. Por favor intenta nuevamente.\n\nError: ' + (error as Error).message
    );
    return false;
  }
};

// Función para generar y compartir un informe HTML
export const shareHTMLReport = async (
  machine: Machine, 
  checklistResults: ChecklistData | null, 
  generalPhotos: GeneralPhotosData | null
): Promise<boolean> => {
  try {
    const reportHTML = await generateHTMLReport(machine, checklistResults, generalPhotos);
    
    const fileName = `informe_${machine.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, reportHTML, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(filePath);
        return true;
      } else {
        throw new Error('El compartir no está disponible en este dispositivo');
      }
    } else {
      window.open(filePath, '_blank');
      return true;
    }
  } catch (error) {
    console.error('Error al compartir informe HTML:', error);
    throw error;
  }
};

// Genera el PDF y lo sube a Supabase Storage sin compartir (se llama al guardar fotos)
export const generateAndUploadPDF = async (
  machine: Machine,
  checklistResults: ChecklistData | null,
  generalPhotos: GeneralPhotosData | null,
  onProgress?: (percent: number, text: string) => void
): Promise<string | null> => {
  try {
    console.log("=== GENERANDO Y SUBIENDO PDF A SUPABASE ===");
    onProgress?.(20, 'Generando informe...');
    const reportHTML = await generateHTMLReport(machine, checklistResults, generalPhotos);

    onProgress?.(50, 'Creando PDF...');
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: reportHTML,
      width: 595,
      height: 842,
      base64: false,
    });
    console.log(`PDF generado en: ${pdfUri}`);

    onProgress?.(70, 'Leyendo PDF...');
    const pdfBase64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const clientName = cleanFileName(machine.clientName);
    const machineTypeAbbr = getMachineTypeAbbreviation(machine.machineType || 'otros');
    let identifier = '';
    if (machine.licensePlate && machine.licensePlate.trim() !== '') {
      identifier = cleanFileName(machine.licensePlate.trim());
    } else if (machine.serialNumber && machine.serialNumber.trim() !== '') {
      identifier = cleanFileName(machine.serialNumber.trim());
    }
    let pdfFileName = `${clientName}_${machineTypeAbbr}`;
    if (identifier) pdfFileName += `_${identifier}`;
    pdfFileName += '.pdf';

    onProgress?.(85, 'Subiendo PDF a la nube...');
    const pdfStoragePath = `inspecciones/${cleanFileName(machine.clientName)}_${cleanFileName(machine.licensePlate || machine.serialNumber || '')}/informe_${pdfFileName}`;
    await supabase.storage.from('inspection-photos').upload(pdfStoragePath, decode(pdfBase64), {
      contentType: 'application/pdf',
      upsert: true,
    });

    const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(pdfStoragePath);
    if (urlData?.publicUrl) {
      await supabase.from('machines').update({ pdf_url: urlData.publicUrl }).eq('id', machine.id);
      console.log('PDF subido y referencia guardada:', urlData.publicUrl);
    }

    // Limpiar archivo temporal
    await FileSystem.deleteAsync(pdfUri, { idempotent: true });

    onProgress?.(100, 'PDF listo');
    return urlData?.publicUrl || null;
  } catch (error) {
    console.error('Error al generar/subir PDF:', error);
    return null;
  }
};

export default {
  generateHTMLReport,
  shareHTMLReport,
  sharePDFReport,
  generateAndUploadPDF,
  getStatusText,
};