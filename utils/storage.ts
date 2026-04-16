import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChecklistByMachineType } from '../data/machineChecklists';
import { supabase } from './supabase';
import {
  buildLegacyMachineStorageBase,
  buildMachineStorageBase,
  deletePhotosInFolder,
  sanitizePathSegment,
  uploadPhoto,
} from './photoUpload';

// Interfaces para tipos (sin cambios)
export interface Machine {
  id: string;
  name: string;
  machineType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  licensePlate?: string;
  otNumber?: string;
  clientName: string;
  clientType?: string;
  location?: string;
  reviewedBy?: string;
  date: string;
  notes?: string;
  commentsWithPhotos?: CommentWithPhoto[];
  inspectionStatus?: string;
}

export interface CommentWithPhoto {
  id: string;
  text: string;
  photoUri: string | null;
}

export interface ChecklistPhotoWithComment {
  uri: string;
  comment?: string;
}

export type ChecklistPhoto = string | string[] | ChecklistPhotoWithComment[];

export interface ChecklistMaterial {
  id: string;
  name: string;
  quantity: string;
  reference: string;
  available: boolean | null;
}

export interface ChecklistData {
  machineId: string;
  results: { [key: string]: string };
  photos: { [key: string]: ChecklistPhoto };
  completedAt: string;
  cantDoComments?: { [key: string]: string };
  materials?: ChecklistMaterial[];
}

export interface GeneralPhotosData {
  machineId: string;
  photos: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
    [key: string]: string | undefined;
  };
  takenAt: string;
}

export interface ExitCheck {
  id: string;
  machineId: string;
  itemId: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  photoUrl?: string | null;
  comment?: string;
}

export interface ExitPhotosData {
  machineId: string;
  photos: {
    d1?: string;
    d2?: string;
    d3?: string;
    d4?: string;
    [key: string]: string | undefined;
  };
  takenAt: string;
}

// Claves legacy de AsyncStorage (para migración)
const LEGACY_KEYS = {
  MACHINES: 'machines',
  CHECKLISTS: 'checklists',
  GENERAL_PHOTOS: 'generalPhotos',
};

// Helper: detectar si un ID es UUID v4
const isUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Helper: generar UUID v4 simple
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const GENERAL_PHOTO_FILE_NAMES: Record<string, string> = {
  front: 'A1',
  back: 'A2',
  left: 'A3',
  right: 'A4',
};

const EXIT_PHOTO_FILE_NAMES: Record<string, string> = {
  d1: 'D1',
  d2: 'D2',
  d3: 'D3',
  d4: 'D4',
};

const getMachineStorageBaseById = async (machineId: string): Promise<string> => {
  const machine = await getMachineById(machineId);
  if (!machine) return `inspecciones/${machineId}`;
  return buildMachineStorageBase(machine);
};

const getLegacyMachineStorageBaseById = async (machineId: string): Promise<string> => {
  const machine = await getMachineById(machineId);
  if (!machine) return `machines/${machineId}`;
  return buildLegacyMachineStorageBase(machine);
};

const buildCommentFileName = (_comment: CommentWithPhoto, index: number): string => {
  return `Comentario_${index + 1}`;
};

const buildChecklistItemLabelMap = (machineType?: string): Record<string, string> => {
  const machineChecklist = getChecklistByMachineType(machineType || 'otros');
  const labelMap: Record<string, string> = {};

  for (const category of machineChecklist) {
    for (const item of category.items) {
      labelMap[item.id] = sanitizePathSegment(item.text, 80) || 'Foto';
    }
  }

  return labelMap;
};

const buildChecklistFileName = (
  itemId: string,
  index: number,
  photo: ChecklistPhotoWithComment | undefined,
  itemLabelMap: Record<string, string>,
): string => {
  const preferredLabel = photo?.comment?.trim()
    ? sanitizePathSegment(photo.comment, 80)
    : itemLabelMap[itemId] || sanitizePathSegment(itemId, 80) || 'Foto';

  const baseLabel = preferredLabel || 'Foto';
  return index === 0 ? baseLabel : `${baseLabel}_${index + 1}`;
};

const getGeneralPhotoFileName = (position: string): string => {
  return GENERAL_PHOTO_FILE_NAMES[position] || sanitizePathSegment(position, 30) || 'Foto';
};

// ==================== CACHE ====================

let machinesCache: Machine[] | null = null;
let machinesCacheTime: number = 0;
const MACHINES_CACHE_TTL = 30000; // 30 seconds

export const invalidateMachinesCache = () => {
  machinesCache = null;
  machinesCacheTime = 0;
};

// ==================== MACHINES ====================

export const getMachines = async (): Promise<Machine[]> => {
  const now = Date.now();
  if (machinesCache && (now - machinesCacheTime) < MACHINES_CACHE_TTL) {
    return machinesCache;
  }
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener máquinas:', error);
      return [];
    }

    // Mapear de DB a interfaz Machine
    const machines: Machine[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name || '',
      machineType: row.machine_type || undefined,
      brand: row.brand || undefined,
      model: row.model || undefined,
      serialNumber: row.serial_number || undefined,
      licensePlate: row.license_plate || undefined,
      otNumber: row.ot_number || undefined,
      clientName: row.client_name || '',
      clientType: row.client_type || undefined,
      location: row.location || undefined,
      reviewedBy: row.reviewed_by || undefined,
      date: row.date || row.created_at || '',
      notes: row.notes || undefined,
      inspectionStatus: row.inspection_status || undefined,
    }));

    // Cargar comments con fotos para cada máquina
    for (const machine of machines) {
      const { data: comments } = await supabase
        .from('machine_comments')
        .select('*')
        .eq('machine_id', machine.id)
        .order('created_at', { ascending: true });

      if (comments && comments.length > 0) {
        machine.commentsWithPhotos = comments.map((c: any) => ({
          id: c.id,
          text: c.text || '',
          photoUri: c.photo_url || null,
        }));
      }
    }

    console.log(`Se encontraron ${machines.length} máquinas`);
    machinesCache = machines;
    machinesCacheTime = Date.now();
    return machines;
  } catch (error) {
    console.error('Error al obtener máquinas:', error);
    return [];
  }
};

export const getMachineById = async (machineId: string): Promise<Machine | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }

    console.log(`Buscando máquina con ID: ${machineId}`);
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (error || !data) {
      console.log('Máquina no encontrada');
      return null;
    }

    const machine: Machine = {
      id: data.id,
      name: data.name || '',
      machineType: data.machine_type || undefined,
      brand: data.brand || undefined,
      model: data.model || undefined,
      serialNumber: data.serial_number || undefined,
      licensePlate: data.license_plate || undefined,
      otNumber: data.ot_number || undefined,
      clientName: data.client_name || '',
      clientType: data.client_type || undefined,
      location: data.location || undefined,
      reviewedBy: data.reviewed_by || undefined,
      date: data.date || data.created_at || '',
      notes: data.notes || undefined,
      inspectionStatus: data.inspection_status || undefined,
    };

    // Cargar comments
    const { data: comments } = await supabase
      .from('machine_comments')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: true });

    if (comments && comments.length > 0) {
      machine.commentsWithPhotos = comments.map((c: any) => ({
        id: c.id,
        text: c.text || '',
        photoUri: c.photo_url || null,
      }));
    }

    console.log('Máquina encontrada:', machine);
    return machine;
  } catch (error) {
    console.error('Error al obtener máquina por ID:', error);
    return null;
  }
};

export const saveMachine = async (machineData: Machine): Promise<Machine> => {
  try {
    // Si el ID no es UUID (datos viejos de AsyncStorage), generar nuevo UUID
    let machineId = machineData.id;
    if (!isUUID(machineId)) {
      machineId = generateUUID();
    }

    const dbRow = {
      id: machineId,
      name: machineData.name,
      machine_type: machineData.machineType || null,
      brand: machineData.brand || null,
      model: machineData.model || null,
      serial_number: machineData.serialNumber || null,
      license_plate: machineData.licensePlate || null,
      ot_number: machineData.otNumber || null,
      client_name: machineData.clientName,
      client_type: machineData.clientType || null,
      location: machineData.location || null,
      reviewed_by: machineData.reviewedBy || null,
      date: machineData.date,
      notes: machineData.notes || null,
    };

    const { data, error } = await supabase
      .from('machines')
      .upsert(dbRow)
      .select()
      .single();

    if (error) {
      console.error('Error al guardar máquina:', error);
      throw error;
    }

    const savedMachine: Machine = {
      ...machineData,
      id: data.id,
    };

    // Guardar comments si existen
    if (machineData.commentsWithPhotos && machineData.commentsWithPhotos.length > 0) {
      await saveMachineComments(data.id, machineData.notes || '', machineData.commentsWithPhotos);
    }

    invalidateMachinesCache();
    console.log('Máquina guardada exitosamente:', savedMachine);
    return savedMachine;
  } catch (error) {
    console.error('Error al guardar máquina:', error);
    throw error;
  }
};

export const saveMachineComments = async (
  machineId: string,
  comments: string,
  commentsWithPhotos?: CommentWithPhoto[]
): Promise<boolean> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return false;
    }

    console.log(`Guardando comentarios para máquina con ID: ${machineId}`);

    const basePath = await getMachineStorageBaseById(machineId);

    // Actualizar notes en la máquina
    await supabase
      .from('machines')
      .update({ notes: comments })
      .eq('id', machineId);

    if (commentsWithPhotos) {
      // Borrar comments existentes
      await supabase
        .from('machine_comments')
        .delete()
        .eq('machine_id', machineId);

      // Insertar nuevos comments
      for (let index = 0; index < commentsWithPhotos.length; index++) {
        const comment = commentsWithPhotos[index];
        let photoUrl: string | null = null;
        if (comment.photoUri) {
          const storagePath = `${basePath}/comentarios/${buildCommentFileName(comment, index)}.jpg`;
          photoUrl = await uploadPhoto(comment.photoUri, storagePath);
        }

        await supabase.from('machine_comments').insert({
          id: isUUID(comment.id) ? comment.id : generateUUID(),
          machine_id: machineId,
          text: comment.text,
          photo_url: photoUrl,
        });
      }
    }

    console.log('Comentarios guardados exitosamente');
    return true;
  } catch (error) {
    console.error('Error al guardar comentarios:', error);
    return false;
  }
};

export const deleteMachine = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Iniciando eliminación de máquina con ID: ${machineId}`);

    const basePath = await getMachineStorageBaseById(machineId);
    const legacyBasePath = await getLegacyMachineStorageBaseById(machineId);

    // Borrar fotos del Storage
    await deletePhotosInFolder(basePath);
    await deletePhotosInFolder(legacyBasePath);
    await deletePhotosInFolder(`machines/${machineId}`);

    // Borrar máquina (CASCADE borra checklists, photos, comments)
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', machineId);

    if (error) {
      console.error('Error al eliminar máquina:', error);
      return false;
    }

    invalidateMachinesCache();
    console.log(`Máquina con ID ${machineId} eliminada correctamente`);
    return true;
  } catch (error) {
    console.error('Error al eliminar máquina:', error);
    return false;
  }
};

// ==================== CHECKLISTS ====================

export const getChecklistByMachineId = async (machineId: string): Promise<ChecklistData | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }

    console.log(`Buscando checklist para máquina con ID: ${machineId}`);

    // Obtener resultados del checklist
    const { data: results, error: resultsError } = await supabase
      .from('checklist_results')
      .select('*')
      .eq('machine_id', machineId);

    if (resultsError || !results || results.length === 0) {
      console.log('No se encontró checklist para esta máquina');
      return null;
    }

    // Reconstruir el objeto results
    const resultsMap: { [key: string]: string } = {};
    let completedAt = '';

    const cantDoCommentsMap: { [key: string]: string } = {};
    for (const row of results) {
      resultsMap[row.item_id] = row.result || row.status;
      if ((row.result === 'cant' || row.status === 'cant') && row.comment) {
        cantDoCommentsMap[row.item_id] = row.comment;
      }
      if (row.completed_at) completedAt = row.completed_at;
    }

    // Obtener fotos del checklist
    const { data: photos } = await supabase
      .from('checklist_photos')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: true });

    let materials: ChecklistMaterial[] | undefined;
    try {
      const { data: materialsRows, error: materialsError } = await supabase
        .from('checklist_materials')
        .select('*')
        .eq('machine_id', machineId)
        .order('sort_order');

      if (materialsError) {
        console.warn('No se pudieron cargar los materiales del checklist:', materialsError.message);
      } else if (materialsRows && materialsRows.length > 0) {
        materials = materialsRows.map((row: any) => ({
          id: row.id,
          name: row.name || '',
          quantity: row.quantity || '',
          reference: row.reference || '',
          available: typeof row.available === 'boolean' ? row.available : null,
        }));
      }
    } catch (materialsError) {
      console.warn('No se pudieron cargar los materiales del checklist:', materialsError);
    }

    // Reconstruir el objeto photos agrupado por item_id
    const photosMap: { [key: string]: ChecklistPhotoWithComment[] } = {};

    if (photos) {
      for (const photo of photos) {
        if (!photosMap[photo.item_id]) {
          photosMap[photo.item_id] = [];
        }
        photosMap[photo.item_id].push({
          uri: photo.photo_url,
          comment: photo.comment || undefined,
        });
      }
    }

    const checklistData: ChecklistData = {
      machineId,
      results: resultsMap,
      photos: photosMap,
      completedAt: completedAt || new Date().toISOString(),
      cantDoComments: Object.keys(cantDoCommentsMap).length > 0 ? cantDoCommentsMap : undefined,
      materials,
    };

    console.log('Checklist encontrado');
    return checklistData;
  } catch (error) {
    console.error('Error al obtener checklist:', error);
    return null;
  }
};

export const saveChecklist = async (checklistData: ChecklistData): Promise<ChecklistData> => {
  try {
    if (!checklistData.machineId) {
      console.error('ID de máquina no proporcionado en el checklist');
      throw new Error('ID de máquina requerido');
    }

    console.log(`Guardando checklist para máquina con ID: ${checklistData.machineId}`);
    const machineId = checklistData.machineId;
    const basePath = await getMachineStorageBaseById(machineId);
    const machine = await getMachineById(machineId);
    const itemLabelMap = buildChecklistItemLabelMap(machine?.machineType);

    // Borrar resultados y fotos existentes
    await supabase.from('checklist_results').delete().eq('machine_id', machineId);
    await supabase.from('checklist_photos').delete().eq('machine_id', machineId);

    // Insertar resultados
    const resultRows = Object.entries(checklistData.results).map(([itemId, result]) => ({
      id: generateUUID(),
      machine_id: machineId,
      item_id: itemId,
      result,
      status: result,
      comment: result === 'cant' && checklistData.cantDoComments?.[itemId] ? checklistData.cantDoComments[itemId] : null,
      completed_at: checklistData.completedAt,
    }));

    if (resultRows.length > 0) {
      const { error: insertError } = await supabase
        .from('checklist_results')
        .insert(resultRows);

      if (insertError) {
        console.error('Error al guardar resultados del checklist:', insertError);
        throw insertError;
      }
    }

    // Insertar fotos
    if (checklistData.photos) {
      for (const [itemId, photoData] of Object.entries(checklistData.photos)) {
        let photosArray: ChecklistPhotoWithComment[] = [];

        if (Array.isArray(photoData)) {
          if (photoData.length > 0 && typeof photoData[0] === 'object') {
            photosArray = photoData as ChecklistPhotoWithComment[];
          } else {
            photosArray = (photoData as string[]).map(uri => ({ uri }));
          }
        } else if (typeof photoData === 'string') {
          photosArray = [{ uri: photoData }];
        }

        for (let i = 0; i < photosArray.length; i++) {
          const photo = photosArray[i];
          const checklistFileName = buildChecklistFileName(itemId, i, photo, itemLabelMap);
          const storagePath = `${basePath}/checklist/${checklistFileName}.jpg`;
          const photoUrl = await uploadPhoto(photo.uri, storagePath);

          if (photoUrl) {
            await supabase.from('checklist_photos').insert({
              id: generateUUID(),
              machine_id: machineId,
              item_id: itemId,
              photo_url: photoUrl,
              comment: photo.comment || null,
            });
          }
        }
      }
    }

    const validMaterials = (checklistData.materials || []).filter((material) => {
      return material.name.trim() !== '' || material.quantity.trim() !== '' || material.reference.trim() !== '';
    });

    try {
      const { error: deleteMaterialsError } = await supabase
        .from('checklist_materials')
        .delete()
        .eq('machine_id', machineId);

      if (deleteMaterialsError) {
        throw deleteMaterialsError;
      }
    } catch (materialsError) {
      console.warn('No se pudieron borrar los materiales previos del checklist:', materialsError);
      if (validMaterials.length > 0) {
        throw materialsError;
      }
    }

    if (validMaterials.length > 0) {
      const materialRows = validMaterials.map((material, index) => ({
        id: isUUID(material.id) ? material.id : generateUUID(),
        machine_id: machineId,
        name: material.name,
        quantity: material.quantity,
        reference: material.reference,
        available: typeof material.available === 'boolean' ? material.available : null,
        sort_order: index,
      }));

      const { error: insertMaterialsError } = await supabase
        .from('checklist_materials')
        .insert(materialRows);

      if (insertMaterialsError) {
        console.error('Error al guardar materiales del checklist:', insertMaterialsError);
        throw insertMaterialsError;
      }
    }

    console.log('Checklist guardado exitosamente');
    return {
      ...checklistData,
      materials: validMaterials,
    };
  } catch (error) {
    console.error('Error al guardar checklist:', error);
    throw error;
  }
};

export const deleteChecklistByMachineId = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Eliminando checklist para máquina con ID: ${machineId}`);

    const basePath = await getMachineStorageBaseById(machineId);
    const legacyBasePath = await getLegacyMachineStorageBaseById(machineId);

    await supabase.from('checklist_photos').delete().eq('machine_id', machineId);
    await supabase.from('checklist_results').delete().eq('machine_id', machineId);
    try {
      await supabase.from('checklist_materials').delete().eq('machine_id', machineId);
    } catch (materialsError) {
      console.warn('No se pudieron borrar los materiales del checklist:', materialsError);
    }

    // Borrar fotos del Storage
    await deletePhotosInFolder(`${basePath}/checklist`);
    await deletePhotosInFolder(`${legacyBasePath}/checklist`);
    await deletePhotosInFolder(`machines/${machineId}/checklist`);

    console.log('Checklist eliminado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al eliminar checklist:', error);
    return false;
  }
};

// ==================== GENERAL PHOTOS ====================

export const getGeneralPhotosByMachineId = async (machineId: string): Promise<GeneralPhotosData | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }

    console.log(`Buscando fotos generales para máquina con ID: ${machineId}`);

    const { data: photos, error } = await supabase
      .from('machine_photos')
      .select('*')
      .eq('machine_id', machineId);

    if (error || !photos || photos.length === 0) {
      console.log('No se encontraron fotos generales para esta máquina');
      return null;
    }

    const photosObj: { [key: string]: string | undefined } = {};
    let takenAt = '';

    for (const photo of photos) {
      photosObj[photo.position] = photo.photo_url;
      if (photo.taken_at) takenAt = photo.taken_at;
    }

    const generalPhotos: GeneralPhotosData = {
      machineId,
      photos: photosObj,
      takenAt: takenAt || new Date().toISOString(),
    };

    console.log('Fotos generales encontradas');
    return generalPhotos;
  } catch (error) {
    console.error('Error al obtener fotos generales:', error);
    return null;
  }
};

export const saveGeneralPhotos = async (photosData: GeneralPhotosData): Promise<GeneralPhotosData> => {
  try {
    if (!photosData.machineId) {
      console.error('ID de máquina no proporcionado en los datos de fotos');
      throw new Error('ID de máquina requerido');
    }

    console.log(`Guardando fotos generales para máquina con ID: ${photosData.machineId}`);
    const machineId = photosData.machineId;
    const basePath = await getMachineStorageBaseById(machineId);
    const machine = await getMachineById(machineId);
    const idPrefix = machine
      ? sanitizePathSegment(machine.licensePlate?.trim() || machine.serialNumber?.trim() || '', 30)
      : '';

    // Borrar fotos existentes de la DB
    await supabase.from('machine_photos').delete().eq('machine_id', machineId);

    // Subir cada foto y guardar en DB
    for (const [position, uri] of Object.entries(photosData.photos)) {
      if (uri) {
        const posLabel = getGeneralPhotoFileName(position);
        const fileName = idPrefix ? `${idPrefix}_${posLabel}` : posLabel;
        const storagePath = `${basePath}/general/${fileName}.jpg`;
        const photoUrl = await uploadPhoto(uri, storagePath);

        if (photoUrl) {
          await supabase.from('machine_photos').insert({
            id: generateUUID(),
            machine_id: machineId,
            position,
            photo_url: photoUrl,
            taken_at: photosData.takenAt,
          });
        }
      }
    }

    console.log('Fotos generales guardadas exitosamente');
    return photosData;
  } catch (error) {
    console.error('Error al guardar fotos generales:', error);
    throw error;
  }
};

export const deleteGeneralPhotosByMachineId = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Eliminando fotos generales para máquina con ID: ${machineId}`);

    const basePath = await getMachineStorageBaseById(machineId);
    const legacyBasePath = await getLegacyMachineStorageBaseById(machineId);

    await supabase.from('machine_photos').delete().eq('machine_id', machineId);
    await deletePhotosInFolder(`${basePath}/general`);
    await deletePhotosInFolder(`${legacyBasePath}/general`);
    await deletePhotosInFolder(`machines/${machineId}/general`);

    console.log('Fotos generales eliminadas exitosamente');
    return true;
  } catch (error) {
    console.error('Error al eliminar fotos generales:', error);
    return false;
  }
};

// ==================== EXIT INSPECTION ====================

export const getExitChecksByMachineId = async (machineId: string): Promise<ExitCheck[]> => {
  try {
    if (!machineId) return [];

    const { data, error } = await supabase
      .from('exit_checks')
      .select('*')
      .eq('machine_id', machineId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      machineId: row.machine_id,
      itemId: row.item_id,
      verified: row.verified || false,
      verifiedBy: row.verified_by || undefined,
      verifiedAt: row.verified_at || undefined,
      photoUrl: row.photo_url || null,
      comment: row.comment || '',
    }));
  } catch (error) {
    console.error('Error al obtener exit checks:', error);
    return [];
  }
};

export const saveExitChecks = async (machineId: string, checks: ExitCheck[]): Promise<boolean> => {
  try {
    if (!machineId) return false;

    const basePath = await getMachineStorageBaseById(machineId);

    // Borrar checks existentes
    await supabase.from('exit_checks').delete().eq('machine_id', machineId);

    for (const check of checks) {
      let photoUrl: string | null = check.photoUrl || null;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const storagePath = `${basePath}/exit_checks/${sanitizePathSegment(check.itemId, 80)}.jpg`;
        photoUrl = await uploadPhoto(photoUrl, storagePath);
      }

      await supabase.from('exit_checks').insert({
        id: isUUID(check.id) ? check.id : generateUUID(),
        machine_id: machineId,
        item_id: check.itemId,
        verified: check.verified,
        verified_by: check.verifiedBy || null,
        verified_at: check.verifiedAt || new Date().toISOString(),
        photo_url: photoUrl,
        comment: check.comment || null,
      });
    }

    console.log('Exit checks guardados exitosamente');
    return true;
  } catch (error) {
    console.error('Error al guardar exit checks:', error);
    return false;
  }
};

export const getExitPhotosByMachineId = async (machineId: string): Promise<ExitPhotosData | null> => {
  try {
    if (!machineId) return null;

    const { data: photos, error } = await supabase
      .from('exit_photos')
      .select('*')
      .eq('machine_id', machineId);

    if (error || !photos || photos.length === 0) return null;

    const photosObj: { [key: string]: string | undefined } = {};
    let takenAt = '';

    for (const photo of photos) {
      photosObj[photo.position] = photo.photo_url;
      if (photo.taken_at) takenAt = photo.taken_at;
    }

    return {
      machineId,
      photos: photosObj,
      takenAt: takenAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error al obtener exit photos:', error);
    return null;
  }
};

export const saveExitPhotos = async (photosData: ExitPhotosData): Promise<ExitPhotosData> => {
  try {
    if (!photosData.machineId) throw new Error('ID de máquina requerido');

    const machineId = photosData.machineId;
    const basePath = await getMachineStorageBaseById(machineId);
    const machine = await getMachineById(machineId);
    const idPrefix = machine
      ? sanitizePathSegment(machine.licensePlate?.trim() || machine.serialNumber?.trim() || '', 30)
      : '';

    // Borrar fotos de salida existentes
    await supabase.from('exit_photos').delete().eq('machine_id', machineId);

    for (const [position, uri] of Object.entries(photosData.photos)) {
      if (uri) {
        const posLabel = EXIT_PHOTO_FILE_NAMES[position] || position.toUpperCase();
        const fileName = idPrefix ? `${idPrefix}_${posLabel}` : posLabel;
        const storagePath = `${basePath}/salida/${fileName}.jpg`;
        const photoUrl = await uploadPhoto(uri, storagePath);

        if (photoUrl) {
          await supabase.from('exit_photos').insert({
            id: generateUUID(),
            machine_id: machineId,
            position,
            photo_url: photoUrl,
            taken_at: photosData.takenAt,
          });
        }
      }
    }

    console.log('Exit photos guardadas exitosamente');
    return photosData;
  } catch (error) {
    console.error('Error al guardar exit photos:', error);
    throw error;
  }
};

export const deleteExitInspection = async (machineId: string): Promise<boolean> => {
  try {
    if (!machineId) return false;

    const basePath = await getMachineStorageBaseById(machineId);

    // Borrar exit_checks (fotos de checks incluidas)
    await deletePhotosInFolder(`${basePath}/exit_checks`);
    await supabase.from('exit_checks').delete().eq('machine_id', machineId);

    // Borrar exit_photos (fotos D1-D4)
    await deletePhotosInFolder(`${basePath}/salida`);
    await supabase.from('exit_photos').delete().eq('machine_id', machineId);

    // Resetear exit_pdf_url y estado a "entrada"
    await supabase
      .from('machines')
      .update({ inspection_status: 'entrada', exit_pdf_url: null })
      .eq('id', machineId);

    invalidateMachinesCache();
    console.log(`Inspección de salida eliminada para máquina ${machineId}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar inspección de salida:', error);
    return false;
  }
};

export const updateMachineInspectionStatus = async (machineId: string, status: string): Promise<boolean> => {
  try {
    if (!machineId) return false;

    const { error } = await supabase
      .from('machines')
      .update({ inspection_status: status })
      .eq('id', machineId);

    if (error) {
      console.error('Error al actualizar inspection_status:', error);
      return false;
    }

    invalidateMachinesCache();
    return true;
  } catch (error) {
    console.error('Error al actualizar inspection_status:', error);
    return false;
  }
};

// ==================== CLEAR ALL ====================

export const clearAllData = async (): Promise<boolean> => {
  try {
    console.log('Limpiando todos los datos de la aplicación');

    // Borrar todo de Supabase
    const { data: machines } = await supabase
      .from('machines')
      .select('id, client_name, date, machine_type, license_plate, serial_number');
    if (machines) {
      for (const m of machines) {
        const machineData = {
          id: m.id,
          clientName: m.client_name || '',
          date: m.date || '',
          machineType: m.machine_type || '',
          licensePlate: m.license_plate || '',
          serialNumber: m.serial_number || '',
        };
        const basePath = buildMachineStorageBase(machineData);
        const legacyBasePath = buildLegacyMachineStorageBase(machineData);
        await deletePhotosInFolder(basePath);
        await deletePhotosInFolder(legacyBasePath);
        await deletePhotosInFolder(`machines/${m.id}`);
      }
    }

    await supabase.from('checklist_photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('checklist_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    try {
      await supabase.from('checklist_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (materialsError) {
      console.warn('No se pudieron limpiar los materiales del checklist:', materialsError);
    }
    await supabase.from('machine_photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('machine_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('machines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Limpiar también AsyncStorage legacy
    await AsyncStorage.removeItem(LEGACY_KEYS.MACHINES);
    await AsyncStorage.removeItem(LEGACY_KEYS.CHECKLISTS);
    await AsyncStorage.removeItem(LEGACY_KEYS.GENERAL_PHOTOS);

    console.log('Datos limpiados exitosamente');
    return true;
  } catch (error) {
    console.error('Error al limpiar todos los datos:', error);
    return false;
  }
};

// ==================== MIGRACIÓN ====================

export const migrateFromAsyncStorage = async (): Promise<boolean> => {
  try {
    console.log('🔄 Iniciando migración de AsyncStorage a Supabase...');

    // Verificar si hay datos legacy
    const machinesJson = await AsyncStorage.getItem(LEGACY_KEYS.MACHINES);
    if (!machinesJson) {
      console.log('No hay datos legacy para migrar');
      return true;
    }

    const legacyMachines: Machine[] = JSON.parse(machinesJson);
    if (legacyMachines.length === 0) {
      console.log('No hay máquinas legacy para migrar');
      return true;
    }

    console.log(`Migrando ${legacyMachines.length} máquinas...`);

    // Mapa de IDs viejos a nuevos
    const idMap: { [oldId: string]: string } = {};

    for (const machine of legacyMachines) {
      const newId = isUUID(machine.id) ? machine.id : generateUUID();
      idMap[machine.id] = newId;

      const savedMachine = await saveMachine({ ...machine, id: newId });
      console.log(`✅ Máquina migrada: ${machine.name} (${machine.id} → ${newId})`);
    }

    // Migrar checklists
    const checklistsJson = await AsyncStorage.getItem(LEGACY_KEYS.CHECKLISTS);
    if (checklistsJson) {
      const legacyChecklists: ChecklistData[] = JSON.parse(checklistsJson);
      for (const checklist of legacyChecklists) {
        const newMachineId = idMap[checklist.machineId] || checklist.machineId;
        await saveChecklist({ ...checklist, machineId: newMachineId });
        console.log(`✅ Checklist migrado para máquina: ${newMachineId}`);
      }
    }

    // Migrar fotos generales
    const photosJson = await AsyncStorage.getItem(LEGACY_KEYS.GENERAL_PHOTOS);
    if (photosJson) {
      const legacyPhotos: GeneralPhotosData[] = JSON.parse(photosJson);
      for (const photos of legacyPhotos) {
        const newMachineId = idMap[photos.machineId] || photos.machineId;
        await saveGeneralPhotos({ ...photos, machineId: newMachineId });
        console.log(`✅ Fotos generales migradas para máquina: ${newMachineId}`);
      }
    }

    // Marcar migración como completada y limpiar datos legacy
    await AsyncStorage.setItem('migration_completed', 'true');
    await AsyncStorage.removeItem(LEGACY_KEYS.MACHINES);
    await AsyncStorage.removeItem(LEGACY_KEYS.CHECKLISTS);
    await AsyncStorage.removeItem(LEGACY_KEYS.GENERAL_PHOTOS);

    console.log('🎉 Migración completada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return false;
  }
};

// Exportar todas las funciones y constantes
export default {
  KEYS: LEGACY_KEYS,
  getMachines,
  getMachineById,
  saveMachine,
  saveMachineComments,
  deleteMachine,
  getChecklistByMachineId,
  saveChecklist,
  deleteChecklistByMachineId,
  getGeneralPhotosByMachineId,
  saveGeneralPhotos,
  deleteGeneralPhotosByMachineId,
  getExitChecksByMachineId,
  saveExitChecks,
  getExitPhotosByMachineId,
  saveExitPhotos,
  updateMachineInspectionStatus,
  clearAllData,
  migrateFromAsyncStorage,
};
