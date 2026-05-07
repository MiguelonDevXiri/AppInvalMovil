import { getChecklistByMachineType } from '../data/machineChecklists';
import { deletePhotosInFolder, sanitizePathSegment, uploadPhoto } from './photoUpload';
import { parseSafetyChecklist, type SafetyChecklist } from './safetyChecklist';
import { supabase } from './supabase';

export interface MantenimientoMaterial {
  id: string;
  name: string;
  quantity: string;
  reference: string;
  available: boolean | null;
}

export interface MantenimientoChecklistItem {
  id: string;
  category: string;
  text: string;
  status: string;
  comment?: string;
  photos: string[];
}

export interface MantenimientoInspection {
  id: string;
  clientName: string;
  date: string;
  location: string;
  reviewedBy: string;
  machineType: string;
  brand: string;
  model: string;
  serialNumber: string;
  licensePlate: string;
  otNumber?: string;
  notes: string;
  safetyChecklist?: SafetyChecklist | null;
  checklist: MantenimientoChecklistItem[];
  materials: MantenimientoMaterial[];
  generalPhotos: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const GENERAL_POSITIONS = ['front', 'back', 'left', 'right'] as const;
const GENERAL_LABELS: Record<string, string> = { front: 'A1', back: 'A2', left: 'A3', right: 'A4' };
let cache: MantenimientoInspection[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

export const invalidateMantenimientoCache = () => {
  cache = null;
  cacheTime = 0;
};

export const generateUUID = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

const isUUID = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeDateSegment = (value?: string): string => {
  if (!value) return 'sin_fecha';
  return sanitizePathSegment(value.replace(/[.:T]/g, '-').replace(/Z/g, ''), 24) || 'sin_fecha';
};

export const buildMantenimientoStorageBase = (inspection: Pick<MantenimientoInspection, 'id' | 'clientName' | 'licensePlate' | 'date'>): string => {
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 50);
  const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
  const date = normalizeDateSegment(inspection.date);
  const shortId = sanitizePathSegment(inspection.id || 'sin_id', 12);
  return `mantenimiento/${client}_${plate}_${date}_${shortId}`;
};

const getParamString = (value: unknown): string => Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : '');

const dbRowToInspection = (row: any, checklistRows: any[], photoRows: any[], materialRows: any[]): MantenimientoInspection => {
  const generalPhotos: Record<string, string> = {};
  for (const photo of photoRows || []) {
    if (photo.photo_type === 'general' && photo.position) generalPhotos[photo.position] = photo.photo_url;
  }

  const checklist = (checklistRows || []).map((item: any) => ({
    id: item.item_id,
    category: item.category || '',
    text: item.item_text || item.item_id,
    status: item.status || '',
    comment: item.comment || '',
    photos: (photoRows || [])
      .filter((photo: any) => photo.photo_type === 'checklist' && photo.item_id === item.item_id)
      .sort((a: any, b: any) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
      .map((photo: any) => photo.photo_url as string),
  }));

  return {
    id: row.id,
    clientName: row.client_name || '',
    date: row.inspection_date || row.created_at || '',
    location: row.location || '',
    reviewedBy: row.reviewed_by || '',
    machineType: row.machine_type || 'otros',
    brand: row.brand || '',
    model: row.model || '',
    serialNumber: row.serial_number || '',
    licensePlate: row.license_plate || '',
    otNumber: row.ot_number || '',
    notes: row.notes || '',
    safetyChecklist: row.safety_checklist ? parseSafetyChecklist(row.safety_checklist, 'full') : null,
    checklist,
    materials: (materialRows || []).map((material: any) => ({
      id: material.id,
      name: material.name || '',
      quantity: material.quantity || '',
      reference: material.reference || '',
      available: typeof material.available === 'boolean' ? material.available : null,
    })),
    generalPhotos,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

export const getMantenimientoInspections = async (): Promise<MantenimientoInspection[]> => {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;
  try {
    const { data, error } = await supabase.from('mantenimiento_inspections').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error al obtener mantenimientos:', error);
      return [];
    }
    const inspections: MantenimientoInspection[] = [];
    for (const row of data || []) {
      const [{ data: checklist }, { data: photos }, { data: materials }] = await Promise.all([
        supabase.from('mantenimiento_checklist_results').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('mantenimiento_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('mantenimiento_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      ]);
      inspections.push(dbRowToInspection(row, checklist || [], photos || [], materials || []));
    }
    cache = inspections;
    cacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error);
    return [];
  }
};

export const getMantenimientoInspectionById = async (id: string): Promise<MantenimientoInspection | null> => {
  try {
    const { data: row, error } = await supabase.from('mantenimiento_inspections').select('*').eq('id', id).single();
    if (error || !row) return null;
    const [{ data: checklist }, { data: photos }, { data: materials }] = await Promise.all([
      supabase.from('mantenimiento_checklist_results').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('mantenimiento_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('mantenimiento_materials').select('*').eq('inspection_id', id).order('sort_order'),
    ]);
    return dbRowToInspection(row, checklist || [], photos || [], materials || []);
  } catch (error) {
    console.error('Error al obtener mantenimiento:', error);
    return null;
  }
};

export const createEmptyMantenimientoInspection = (machineType = 'otros'): MantenimientoInspection => {
  const now = new Date().toISOString();
  const checklist = getChecklistByMachineType(machineType).flatMap((category) => category.items.map((item) => ({
    id: item.id,
    category: category.category,
    text: item.text,
    status: '',
    comment: '',
    photos: [],
  })));
  return { id: generateUUID(), clientName: '', date: now.slice(0, 10), location: '', reviewedBy: '', machineType, brand: '', model: '', serialNumber: '', licensePlate: '', otNumber: '', notes: '', safetyChecklist: null, checklist, materials: [], generalPhotos: {}, createdAt: now, updatedAt: now };
};

export const saveMantenimientoInspection = async (inspection: MantenimientoInspection): Promise<MantenimientoInspection> => {
  const now = new Date().toISOString();
  const inspectionId = isUUID(inspection.id) ? inspection.id : generateUUID();
  const saved = { ...inspection, id: inspectionId, createdAt: inspection.createdAt || now, updatedAt: now };
  const storageBase = buildMantenimientoStorageBase(saved);

  const { error } = await supabase.from('mantenimiento_inspections').upsert({
    id: inspectionId,
    client_name: saved.clientName,
    inspection_date: saved.date,
    location: saved.location,
    reviewed_by: saved.reviewedBy,
    machine_type: saved.machineType,
    brand: saved.brand || null,
    model: saved.model || null,
    serial_number: saved.serialNumber || null,
    license_plate: saved.licensePlate || null,
    ot_number: saved.otNumber || null,
    notes: saved.notes || null,
    safety_checklist: saved.safetyChecklist || null,
    created_at: saved.createdAt,
    updated_at: now,
  });
  if (error) throw error;

  await Promise.all([
    supabase.from('mantenimiento_checklist_results').delete().eq('inspection_id', inspectionId),
    supabase.from('mantenimiento_photos').delete().eq('inspection_id', inspectionId),
    supabase.from('mantenimiento_materials').delete().eq('inspection_id', inspectionId),
  ]);

  for (const [index, position] of GENERAL_POSITIONS.entries()) {
    const uri = saved.generalPhotos[position];
    if (!uri) continue;
    const url = await uploadPhoto(uri, `${storageBase}/generales/${GENERAL_LABELS[position]}.jpg`);
    if (url) await supabase.from('mantenimiento_photos').insert({ id: generateUUID(), inspection_id: inspectionId, photo_type: 'general', position, photo_url: url, sort_order: index });
  }

  for (const [index, item] of saved.checklist.entries()) {
    await supabase.from('mantenimiento_checklist_results').insert({ id: generateUUID(), inspection_id: inspectionId, item_id: item.id, category: item.category, item_text: item.text, status: item.status || null, comment: item.comment || null, sort_order: index });
    for (const [photoIndex, uri] of (item.photos || []).entries()) {
      const name = sanitizePathSegment(item.text || item.id, 70);
      const url = await uploadPhoto(uri, `${storageBase}/checklist/${item.id}/${name}_${photoIndex + 1}.jpg`);
      if (url) await supabase.from('mantenimiento_photos').insert({ id: generateUUID(), inspection_id: inspectionId, photo_type: 'checklist', item_id: item.id, photo_url: url, sort_order: photoIndex });
    }
  }

  if (saved.materials.length > 0) {
    await supabase.from('mantenimiento_materials').insert(saved.materials.map((material, index) => ({
      id: isUUID(material.id) ? material.id : generateUUID(),
      inspection_id: inspectionId,
      name: material.name,
      quantity: material.quantity,
      reference: material.reference || null,
      available: material.available,
      sort_order: index,
    })));
  }

  invalidateMantenimientoCache();
  return saved;
};

export const deleteMantenimientoInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getMantenimientoInspectionById(id);
    if (inspection) await deletePhotosInFolder(buildMantenimientoStorageBase(inspection));
    await Promise.all([
      supabase.from('mantenimiento_checklist_results').delete().eq('inspection_id', id),
      supabase.from('mantenimiento_photos').delete().eq('inspection_id', id),
      supabase.from('mantenimiento_materials').delete().eq('inspection_id', id),
    ]);
    const { error } = await supabase.from('mantenimiento_inspections').delete().eq('id', id);
    if (error) return false;
    invalidateMantenimientoCache();
    return true;
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error);
    return false;
  }
};

const parseJsonParam = <T>(value: unknown, fallback: T): T => {
  const text = getParamString(value);
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

export const inspectionToParams = (inspection: MantenimientoInspection): any => ({
  inspectionId: inspection.id,
  clientName: inspection.clientName,
  date: inspection.date,
  location: inspection.location,
  reviewedBy: inspection.reviewedBy,
  machineType: inspection.machineType,
  brand: inspection.brand,
  model: inspection.model,
  serialNumber: inspection.serialNumber,
  licensePlate: inspection.licensePlate,
  otNumber: inspection.otNumber || '',
  notes: inspection.notes || '',
  safetyChecklist: inspection.safetyChecklist ? JSON.stringify(inspection.safetyChecklist) : '',
  generalPhotos: JSON.stringify(inspection.generalPhotos || {}),
  checklist: JSON.stringify(inspection.checklist || []),
  materials: JSON.stringify(inspection.materials || []),
  createdAt: inspection.createdAt || '',
});

export const paramsToInspection = (params: any): MantenimientoInspection => {
  const machineType = getParamString(params.machineType) || 'otros';
  const base = createEmptyMantenimientoInspection(machineType);
  return {
    ...base,
    id: getParamString(params.inspectionId) || generateUUID(),
    clientName: getParamString(params.clientName),
    date: getParamString(params.date) || new Date().toISOString().slice(0, 10),
    location: getParamString(params.location),
    reviewedBy: getParamString(params.reviewedBy),
    machineType,
    brand: getParamString(params.brand),
    model: getParamString(params.model),
    serialNumber: getParamString(params.serialNumber),
    licensePlate: getParamString(params.licensePlate),
    otNumber: getParamString(params.otNumber),
    notes: getParamString(params.notes),
    safetyChecklist: params.safetyChecklist ? parseSafetyChecklist(getParamString(params.safetyChecklist), 'full') : null,
    checklist: parseJsonParam<MantenimientoChecklistItem[]>(params.checklist, base.checklist),
    materials: parseJsonParam<MantenimientoMaterial[]>(params.materials, []),
    generalPhotos: parseJsonParam<Record<string, string>>(params.generalPhotos, {}),
    createdAt: getParamString(params.createdAt) || base.createdAt,
  };
};
