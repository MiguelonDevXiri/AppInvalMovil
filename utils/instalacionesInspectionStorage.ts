import { deletePhotosInFolder, sanitizePathSegment, uploadPhoto } from './photoUpload';
import { supabase } from './supabase';

export interface InstalacionMaterial {
  id: string;
  name: string;
  quantity: string;
  reference: string;
}

export interface InstalacionInspection {
  id: string;
  clientName: string;
  avisoDate: string;
  avisoTime: string;
  location: string;
  reviewedBy: string;
  machineType: string;
  machineBrand: string;
  machineModel: string;
  serialNumber: string;
  licensePlate: string;
  otNumber?: string;
  workDescription: string;
  notes: string;
  materiales: InstalacionMaterial[];
  photoSite1?: string;
  photoSite2?: string;
  photoSite3?: string;
  photoSite4?: string;
  worksCorrectly: boolean | null;
  worksCorrectlyReason: string;
  staysRunning: boolean | null;
  staysRunningReason: string;
  pressuresChecked: boolean | null;
  pressuresCheckedReason: string;
  finalPhoto?: string;
  finalPhoto2?: string;
  finalPhoto3?: string;
  finalPhoto4?: string;
  createdAt: string;
  updatedAt: string;
}

const SITE_PHOTO_SUFFIXES: Record<string, string> = {
  photoSite1: 'S1',
  photoSite2: 'S2',
  photoSite3: 'S3',
  photoSite4: 'S4',
};

const SITE_PHOTO_FIELDS = ['photoSite1', 'photoSite2', 'photoSite3', 'photoSite4'] as const;
const FINAL_PHOTO_UPLOADS = [
  { field: 'finalPhoto' as const, storageSuffix: 'final', position: 'finalPhoto1' },
  { field: 'finalPhoto2' as const, storageSuffix: 'final_2', position: 'finalPhoto2' },
  { field: 'finalPhoto3' as const, storageSuffix: 'final_3', position: 'finalPhoto3' },
  { field: 'finalPhoto4' as const, storageSuffix: 'final_4', position: 'finalPhoto4' },
];

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const normalizeDateSegment = (value?: string): string => {
  if (!value) return 'sin_fecha';
  const normalized = value.replace(/[.:]/g, '-').replace(/[T]/g, '_').replace(/[Z]/g, '').trim();
  const sanitized = sanitizePathSegment(normalized, 20);
  return sanitized || 'sin_fecha';
};

const buildInstalacionesStorageBase = (
  inspection: Pick<InstalacionInspection, 'licensePlate' | 'clientName' | 'avisoDate'>
): string => {
  const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 40);
  const date = normalizeDateSegment(inspection.avisoDate);
  return `instalaciones/${plate}_${client}_${date}`;
};

let instalacionesCache: InstalacionInspection[] | null = null;
let instalacionesCacheTime = 0;
const CACHE_TTL = 30000;

export const invalidateInstalacionesCache = () => {
  instalacionesCache = null;
  instalacionesCacheTime = 0;
};

const dbRowToInspection = (
  row: any,
  photosRows: any[],
  materialsRows: any[]
): InstalacionInspection => {
  const sitePhotos: Record<string, string> = {};
  const finalPhotos = (photosRows || [])
    .filter((photo) => photo.photo_type === 'final' && photo.photo_url)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((photo) => photo.photo_url as string);

  for (const photo of photosRows || []) {
    if (photo.photo_type === 'site' && photo.position) {
      sitePhotos[photo.position] = photo.photo_url;
    }
  }

  return {
    id: row.id,
    clientName: row.client_name || '',
    avisoDate: row.aviso_date || '',
    avisoTime: row.aviso_time || '',
    location: row.location || '',
    reviewedBy: row.reviewed_by || '',
    machineType: row.machine_type || '',
    machineBrand: row.machine_brand || '',
    machineModel: row.machine_model || '',
    serialNumber: row.serial_number || '',
    licensePlate: row.license_plate || '',
    otNumber: row.ot_number || '',
    workDescription: row.work_description || '',
    notes: row.notes || '',
    materiales: (materialsRows || []).map((material: any) => ({
      id: material.id,
      name: material.name || '',
      quantity: material.quantity || '',
      reference: material.reference || '',
    })),
    photoSite1: sitePhotos.photoSite1 || '',
    photoSite2: sitePhotos.photoSite2 || '',
    photoSite3: sitePhotos.photoSite3 || '',
    photoSite4: sitePhotos.photoSite4 || '',
    worksCorrectly: typeof row.machine_works_correctly === 'boolean' ? row.machine_works_correctly : null,
    worksCorrectlyReason: row.machine_works_correctly_reason || '',
    staysRunning: typeof row.machine_stays_running === 'boolean' ? row.machine_stays_running : null,
    staysRunningReason: row.machine_stays_running_reason || '',
    pressuresChecked: typeof row.pressures_checked === 'boolean' ? row.pressures_checked : null,
    pressuresCheckedReason: row.pressures_checked_reason || '',
    finalPhoto: finalPhotos[0] || '',
    finalPhoto2: finalPhotos[1] || '',
    finalPhoto3: finalPhotos[2] || '',
    finalPhoto4: finalPhotos[3] || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

export const getInstalacionesInspections = async (): Promise<InstalacionInspection[]> => {
  const now = Date.now();
  if (instalacionesCache && now - instalacionesCacheTime < CACHE_TTL) {
    return instalacionesCache;
  }

  try {
    const { data, error } = await supabase
      .from('instalaciones_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener instalaciones:', error);
      return [];
    }

    const inspections: InstalacionInspection[] = [];

    for (const row of data || []) {
      const [{ data: photos }, { data: materials }] = await Promise.all([
        supabase.from('instalaciones_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('instalaciones_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      ]);

      inspections.push(dbRowToInspection(row, photos || [], materials || []));
    }

    instalacionesCache = inspections;
    instalacionesCacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener instalaciones:', error);
    return [];
  }
};

export const getInstalacionInspectionById = async (id: string): Promise<InstalacionInspection | null> => {
  try {
    const { data: row, error } = await supabase
      .from('instalaciones_inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) return null;

    const [{ data: photos }, { data: materials }] = await Promise.all([
      supabase.from('instalaciones_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('instalaciones_materials').select('*').eq('inspection_id', id).order('sort_order'),
    ]);

    return dbRowToInspection(row, photos || [], materials || []);
  } catch (error) {
    console.error('Error al obtener instalación:', error);
    return null;
  }
};

export const saveInstalacionInspection = async (
  inspection: InstalacionInspection
): Promise<InstalacionInspection> => {
  try {
    let inspectionId = inspection.id;
    if (!isUUID(inspectionId)) {
      inspectionId = generateUUID();
    }

    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from('instalaciones_inspections').upsert({
      id: inspectionId,
      client_name: inspection.clientName,
      aviso_date: inspection.avisoDate,
      aviso_time: inspection.avisoTime,
      location: inspection.location,
      reviewed_by: inspection.reviewedBy,
      machine_type: inspection.machineType,
      machine_brand: inspection.machineBrand,
      machine_model: inspection.machineModel,
      serial_number: inspection.serialNumber,
      license_plate: inspection.licensePlate || null,
      ot_number: inspection.otNumber || null,
      work_description: inspection.workDescription,
      notes: inspection.notes || null,
      machine_works_correctly: inspection.worksCorrectly,
      machine_works_correctly_reason: inspection.worksCorrectlyReason || null,
      machine_stays_running: inspection.staysRunning,
      machine_stays_running_reason: inspection.staysRunningReason || null,
      pressures_checked: inspection.pressuresChecked,
      pressures_checked_reason: inspection.pressuresCheckedReason || null,
      created_at: inspection.createdAt || now,
      updated_at: now,
    });

    if (upsertError) {
      console.error('❌ Error al guardar instalación:', upsertError);
      throw upsertError;
    }

    const storageBase = buildInstalacionesStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    await supabase.from('instalaciones_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('instalaciones_materials').delete().eq('inspection_id', inspectionId);

    const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);

    for (const [index, field] of SITE_PHOTO_FIELDS.entries()) {
      const uri = inspection[field];
      if (!uri) continue;

      const storagePath = `${storageBase}/sitio/${plate}_${SITE_PHOTO_SUFFIXES[field]}.jpg`;
      const photoUrl = await uploadPhoto(uri, storagePath);

      if (photoUrl) {
        await supabase.from('instalaciones_photos').insert({
          id: generateUUID(),
          inspection_id: inspectionId,
          photo_type: 'site',
          position: field,
          photo_url: photoUrl,
          sort_order: index,
        });
      }
    }

    for (const [index, config] of FINAL_PHOTO_UPLOADS.entries()) {
      const uri = inspection[config.field];
      if (!uri) continue;

      const storagePath = `${storageBase}/final/${plate}_${config.storageSuffix}.jpg`;
      const finalPhotoUrl = await uploadPhoto(uri, storagePath);

      if (finalPhotoUrl) {
        await supabase.from('instalaciones_photos').insert({
          id: generateUUID(),
          inspection_id: inspectionId,
          photo_type: 'final',
          position: config.position,
          photo_url: finalPhotoUrl,
          sort_order: index,
        });
      }
    }

    if (inspection.materiales.length > 0) {
      const materialRows = inspection.materiales.map((material, index) => ({
        id: isUUID(material.id) ? material.id : generateUUID(),
        inspection_id: inspectionId,
        name: material.name,
        quantity: material.quantity,
        reference: material.reference,
        sort_order: index,
      }));

      await supabase.from('instalaciones_materials').insert(materialRows);
    }

    const savedInspection: InstalacionInspection = {
      ...inspection,
      id: inspectionId,
      createdAt: inspection.createdAt || now,
      updatedAt: now,
    };

    invalidateInstalacionesCache();
    console.log('✅ Instalación guardada:', inspectionId);
    return savedInspection;
  } catch (error) {
    console.error('❌ Error al guardar instalación:', error);
    throw error;
  }
};

export const deleteInstalacionInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getInstalacionInspectionById(id);

    if (inspection) {
      const storageBase = buildInstalacionesStorageBase({
        licensePlate: inspection.licensePlate,
        clientName: inspection.clientName,
        avisoDate: inspection.avisoDate,
      });
      await deletePhotosInFolder(storageBase);
    }

    await deletePhotosInFolder(`instalaciones/${id}`);

    const { error } = await supabase.from('instalaciones_inspections').delete().eq('id', id);

    if (error) {
      console.error('❌ Error al eliminar instalación:', error);
      return false;
    }

    invalidateInstalacionesCache();
    console.log('✅ Instalación eliminada:', id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar instalación:', error);
    return false;
  }
};

const getParamString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
};

const getParamBoolean = (value: unknown): boolean | null => {
  if (Array.isArray(value)) {
    return getParamBoolean(value[0]);
  }

  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
};

export const paramsToInspection = (params: any): InstalacionInspection => {
  let materiales: InstalacionMaterial[] = [];

  if (params.materiales) {
    try {
      materiales = typeof params.materiales === 'string' ? JSON.parse(params.materiales) : params.materiales;
    } catch (error) {
      console.error('Error al parsear materiales de instalación:', error);
    }
  }

  return {
    id: getParamString(params.inspectionId) || `inspection_${Date.now()}`,
    clientName: getParamString(params.clientName),
    avisoDate: getParamString(params.avisoDate),
    avisoTime: getParamString(params.avisoTime),
    location: getParamString(params.location),
    reviewedBy: getParamString(params.reviewedBy),
    machineType: getParamString(params.machineType),
    machineBrand: getParamString(params.brand),
    machineModel: getParamString(params.model),
    serialNumber: getParamString(params.serialNumber),
    licensePlate: getParamString(params.licensePlate),
    otNumber: getParamString(params.otNumber),
    workDescription: getParamString(params.workDescription),
    notes: getParamString(params.notes) || getParamString(params.observaciones),
    materiales,
    photoSite1: getParamString(params.photoSite1),
    photoSite2: getParamString(params.photoSite2),
    photoSite3: getParamString(params.photoSite3),
    photoSite4: getParamString(params.photoSite4),
    worksCorrectly: getParamBoolean(params.worksCorrectly),
    worksCorrectlyReason: getParamString(params.worksCorrectlyReason),
    staysRunning: getParamBoolean(params.staysRunning),
    staysRunningReason: getParamString(params.staysRunningReason),
    pressuresChecked: getParamBoolean(params.pressuresChecked),
    pressuresCheckedReason: getParamString(params.pressuresCheckedReason),
    finalPhoto: getParamString(params.finalPhoto) || getParamString(params.finalPhoto1),
    finalPhoto2: getParamString(params.finalPhoto2),
    finalPhoto3: getParamString(params.finalPhoto3),
    finalPhoto4: getParamString(params.finalPhoto4),
    createdAt: getParamString(params.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const inspectionToParams = (inspection: InstalacionInspection): any => {
  return {
    inspectionId: inspection.id,
    clientName: inspection.clientName,
    avisoDate: inspection.avisoDate,
    avisoTime: inspection.avisoTime,
    location: inspection.location,
    reviewedBy: inspection.reviewedBy,
    machineType: inspection.machineType,
    brand: inspection.machineBrand,
    model: inspection.machineModel,
    serialNumber: inspection.serialNumber,
    licensePlate: inspection.licensePlate,
    otNumber: inspection.otNumber || '',
    workDescription: inspection.workDescription,
    notes: inspection.notes || '',
    materiales: JSON.stringify(inspection.materiales || []),
    photoSite1: inspection.photoSite1 || '',
    photoSite2: inspection.photoSite2 || '',
    photoSite3: inspection.photoSite3 || '',
    photoSite4: inspection.photoSite4 || '',
    worksCorrectly: inspection.worksCorrectly === null ? '' : String(inspection.worksCorrectly),
    worksCorrectlyReason: inspection.worksCorrectlyReason || '',
    staysRunning: inspection.staysRunning === null ? '' : String(inspection.staysRunning),
    staysRunningReason: inspection.staysRunningReason || '',
    pressuresChecked: inspection.pressuresChecked === null ? '' : String(inspection.pressuresChecked),
    pressuresCheckedReason: inspection.pressuresCheckedReason || '',
    finalPhoto: inspection.finalPhoto || '',
    finalPhoto1: inspection.finalPhoto || '',
    finalPhoto2: inspection.finalPhoto2 || '',
    finalPhoto3: inspection.finalPhoto3 || '',
    finalPhoto4: inspection.finalPhoto4 || '',
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt,
  };
};

export default {
  getInstalacionesInspections,
  getInstalacionInspectionById,
  saveInstalacionInspection,
  deleteInstalacionInspection,
  paramsToInspection,
  inspectionToParams,
};
