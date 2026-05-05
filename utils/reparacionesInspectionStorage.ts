import * as FileSystem from 'expo-file-system/legacy';
import { buildRecordStorageSuffix, deletePhoto, deletePhotosInFolder, sanitizePathSegment, uploadPhoto } from './photoUpload';
import { parseSafetyChecklist, type SafetyChecklist } from './safetyChecklist';
import { supabase } from './supabase';

export interface ReparacionRepair {
  id: string;
  description: string;
  photos: string[];
}

export interface ReparacionMaterial {
  id: string;
  name: string;
  quantity: string;
  reference: string;
  available: boolean | null;
}

export interface ReparacionExitCheck {
  id: string;
  repairId: string;
  checked: boolean;
  comment: string;
  photoUrl: string;
  verifiedBy: string;
  verifiedAt: string;
}

export interface ReparacionExitMaterial {
  id: string;
  materialId?: string | null;
  name: string;
  quantity: string;
  reference: string;
  available: boolean | null;
  checked: boolean;
  isExtra: boolean;
}

export interface ReparacionExitData {
  checks: ReparacionExitCheck[];
  materials: ReparacionExitMaterial[];
  note: string;
  reviewedBy: string;
  generalPhotos: string[];
  completedAt: string;
}

export interface ReparacionInspection {
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
  notes: string;
  safetyChecklist?: SafetyChecklist | null;
  generalPhotos: string[];
  repairs: ReparacionRepair[];
  materials: ReparacionMaterial[];
  exitStatus?: 'pending' | 'completed' | 'draft' | string;
  exitNotes?: string;
  exitReviewedBy?: string;
  exitCompletedAt?: string;
  pdfUrl?: string;
  exitPdfUrl?: string;
  exitData?: ReparacionExitData | null;
  createdAt: string;
  updatedAt: string;
}

const CACHE_TTL = 30000;

let reparacionesCache: ReparacionInspection[] | null = null;
let reparacionesCacheTime = 0;
let reparacionesSummaryCache: ReparacionInspection[] | null = null;
let reparacionesSummaryCacheTime = 0;

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const isUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

const getParamString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
};

const parseJsonArray = <T,>(value: unknown): T[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error('Error al parsear JSON de reparaciones:', error);
    return [];
  }
};

const normalizeDateSegment = (value?: string): string => {
  if (!value) return 'sin_fecha';

  const normalized = value
    .replace(/[.:]/g, '-')
    .replace(/[T]/g, '_')
    .replace(/[Z]/g, '')
    .trim();

  return sanitizePathSegment(normalized, 20) || 'sin_fecha';
};

export const buildReparacionesStorageBase = (
  inspection: Pick<ReparacionInspection, 'licensePlate' | 'clientName' | 'avisoDate'> & { id?: string }
): string => {
  const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 40);
  const date = normalizeDateSegment(inspection.avisoDate);
  const record = buildRecordStorageSuffix(inspection.id, inspection.avisoDate);
  return `reparaciones/${plate}_${client}_${date}_${record}`;
};

const legacyPdfSegment = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

const buildLegacyReparacionesStorageBase = (
  inspection: Pick<ReparacionInspection, 'licensePlate' | 'clientName' | 'avisoDate'>
): string => {
  return `reparaciones/${legacyPdfSegment(inspection.licensePlate || 'sin_matricula')}_${legacyPdfSegment(inspection.clientName || 'cliente')}_${legacyPdfSegment(inspection.avisoDate || 'sin_fecha')}`;
};

const buildReparacionesPdfFileName = (type: 'entrada' | 'salida'): string => {
  return type === 'entrada' ? 'informe_entrada.pdf' : 'informe_salida.pdf';
};

export const buildReparacionesPdfStoragePath = (
  inspection: Pick<ReparacionInspection, 'licensePlate' | 'clientName' | 'avisoDate'> & { id?: string },
  type: 'entrada' | 'salida'
): string => `${buildReparacionesStorageBase(inspection)}/${buildReparacionesPdfFileName(type)}`;

const buildLegacyReparacionesPdfStoragePath = (
  inspection: Pick<ReparacionInspection, 'licensePlate' | 'clientName' | 'avisoDate'>,
  type: 'entrada' | 'salida'
): string => `${buildLegacyReparacionesStorageBase(inspection)}/${buildReparacionesPdfFileName(type)}`;

const isRemoteUri = (value: string): boolean => value.startsWith('http://') || value.startsWith('https://');

const getUploadSourceUri = async (uri: string, prefix: string): Promise<string> => {
  if (!uri || !isRemoteUri(uri)) {
    return uri;
  }

  const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const result = await FileSystem.downloadAsync(uri, targetPath);
  return result.uri;
};

const getUploadSourceUrisSequential = async (uris: string[], prefix: string): Promise<string[]> => {
  const results: string[] = [];
  for (const uri of uris) {
    results.push(await getUploadSourceUri(uri, prefix));
  }
  return results;
};

type SupabaseResult = { error?: unknown };

const runSupabase = async <T extends SupabaseResult>(operation: PromiseLike<T>, context: string): Promise<T> => {
  const result = await operation;

  if (result.error) {
    console.error(context, result.error);
    throw result.error;
  }

  return result;
};

const mapMaterials = (rows: any[]): ReparacionMaterial[] => {
  return rows.map((row) => ({
    id: row.id,
    name: row.name || '',
    quantity: row.quantity || '',
    reference: row.reference || '',
    available: typeof row.available === 'boolean' ? row.available : null,
  }));
};

const mapExitMaterials = (
  inspectionMaterials: ReparacionMaterial[],
  exitMaterialRows: any[]
): ReparacionExitMaterial[] => {
  const exitRows = exitMaterialRows.map((row) => ({
    id: row.id,
    materialId: row.material_id || null,
    name: row.name || '',
    quantity: row.quantity || '',
    reference: row.reference || '',
    available: typeof row.available === 'boolean' ? row.available : null,
    checked: Boolean(row.checked),
    isExtra: Boolean(row.is_extra),
  }));

  const reviewedOriginalMaterials = inspectionMaterials.map((material) => {
    const exitMaterial = exitRows.find((item) => item.materialId === material.id && !item.isExtra);

    return {
      id: exitMaterial?.id || material.id,
      materialId: material.id,
      name: exitMaterial?.name || material.name,
      quantity: exitMaterial?.quantity || material.quantity,
      reference: exitMaterial?.reference || material.reference,
      available: exitMaterial ? exitMaterial.available : material.available,
      checked: exitMaterial?.checked || false,
      isExtra: false,
    };
  });

  const extraMaterials = exitRows.filter((item) => item.isExtra || !item.materialId);
  return [...reviewedOriginalMaterials, ...extraMaterials];
};

const dbRowToInspection = (
  row: any,
  generalPhotoRows: any[],
  repairRows: any[],
  repairPhotoRows: any[],
  materialRows: any[],
  exitCheckRows: any[],
  exitMaterialRows: any[],
  exitPhotoRows: any[]
): ReparacionInspection => {
  const generalPhotos = generalPhotoRows
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((photo) => photo.photo_url)
    .filter(Boolean);

  const repairs = repairRows.map((repair) => ({
    id: repair.id,
    description: repair.description || '',
    photos: repairPhotoRows
      .filter((photo) => photo.repair_id === repair.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((photo) => photo.photo_url),
  }));

  const materials = mapMaterials(materialRows);
  const exitChecks = exitCheckRows.map((rowItem) => ({
    id: rowItem.id,
    repairId: rowItem.repair_id || '',
    checked: Boolean(rowItem.checked),
    comment: rowItem.comment || '',
    photoUrl: rowItem.photo_url || '',
    verifiedBy: rowItem.verified_by || '',
    verifiedAt: rowItem.verified_at || '',
  }));

  const exitMaterials = mapExitMaterials(materials, exitMaterialRows);
  const exitGeneralPhotos = exitPhotoRows
    .filter((photo) => !photo.photo_type || photo.photo_type === 'general')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((photo) => photo.photo_url)
    .filter(Boolean)
    .slice(0, 4);

  const hasExitData = Boolean(
    row.exit_status ||
      row.exit_notes ||
      row.exit_reviewed_by ||
      row.exit_completed_at ||
      exitChecks.length > 0 ||
      exitMaterialRows.length > 0 ||
      exitGeneralPhotos.length > 0
  );

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
    notes: row.notes || '',
    safetyChecklist: row.safety_checklist ? parseSafetyChecklist(row.safety_checklist, 'fire-only') : null,
    generalPhotos,
    repairs,
    materials,
    exitStatus: row.exit_status || 'pending',
    exitNotes: row.exit_notes || '',
    exitReviewedBy: row.exit_reviewed_by || '',
    exitCompletedAt: row.exit_completed_at || '',
    pdfUrl: row.pdf_url || '',
    exitPdfUrl: row.exit_pdf_url || '',
    exitData: hasExitData
      ? {
          checks: exitChecks,
          materials: exitMaterials,
          note: row.exit_notes || '',
          reviewedBy: row.exit_reviewed_by || '',
          generalPhotos: exitGeneralPhotos,
          completedAt: row.exit_completed_at || '',
        }
      : null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

const loadInspectionWithChildren = async (row: any): Promise<ReparacionInspection> => {
  const [
    { data: generalPhotos },
    { data: repairs },
    { data: repairPhotos },
    { data: materials },
    { data: exitChecks },
    { data: exitMaterials },
    { data: exitPhotos },
  ] = await Promise.all([
    runSupabase(
      supabase.from('reparaciones_general_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar fotos generales de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_repairs').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar trabajos de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_repair_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar fotos de trabajos de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar materiales de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_exit_checks').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar comprobaciones de salida de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_exit_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar materiales de salida de reparación'
    ),
    runSupabase(
      supabase.from('reparaciones_exit_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
      'Error al cargar fotos de salida de reparación'
    ),
  ]);

  return dbRowToInspection(
    row,
    generalPhotos || [],
    repairs || [],
    repairPhotos || [],
    materials || [],
    exitChecks || [],
    exitMaterials || [],
    exitPhotos || []
  );
};

export const invalidateReparacionesCache = () => {
  reparacionesCache = null;
  reparacionesCacheTime = 0;
  reparacionesSummaryCache = null;
  reparacionesSummaryCacheTime = 0;
};


const dbRowToInspectionSummary = (row: any): ReparacionInspection => ({
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
  notes: row.notes || '',
  safetyChecklist: row.safety_checklist ? parseSafetyChecklist(row.safety_checklist, 'fire-only') : null,
  generalPhotos: [],
  repairs: [],
  materials: [],
  exitStatus: row.exit_status || 'pending',
  exitNotes: row.exit_notes || '',
  exitReviewedBy: row.exit_reviewed_by || '',
  exitCompletedAt: row.exit_completed_at || '',
  pdfUrl: row.pdf_url || '',
  exitPdfUrl: row.exit_pdf_url || '',
  exitData: null,
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

export const getReparacionesInspections = async (options?: { includeChildren?: boolean }): Promise<ReparacionInspection[]> => {
  const includeChildren = options?.includeChildren ?? true;
  const now = Date.now();

  if (!includeChildren && reparacionesSummaryCache && now - reparacionesSummaryCacheTime < CACHE_TTL) {
    return reparacionesSummaryCache;
  }

  if (includeChildren && reparacionesCache && now - reparacionesCacheTime < CACHE_TTL) {
    return reparacionesCache;
  }

  try {
    const { data, error } = await supabase
      .from('reparaciones_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener reparaciones:', error);
      return [];
    }

    if (!includeChildren) {
      const summaries = (data || []).map((row) => dbRowToInspectionSummary(row));
      reparacionesSummaryCache = summaries;
      reparacionesSummaryCacheTime = Date.now();
      return summaries;
    }

    const inspections = await Promise.all((data || []).map((row) => loadInspectionWithChildren(row)));
    reparacionesCache = inspections;
    reparacionesCacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener reparaciones:', error);
    return [];
  }
};

export const getReparacionInspectionById = async (id: string): Promise<ReparacionInspection | null> => {
  try {
    const { data, error } = await supabase
      .from('reparaciones_inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return loadInspectionWithChildren(data);
  } catch (error) {
    console.error('Error al obtener la reparación:', error);
    return null;
  }
};

export const saveReparacionInspection = async (
  inspection: ReparacionInspection
): Promise<ReparacionInspection> => {
  try {
    const inspectionId = isUUID(inspection.id) ? inspection.id : generateUUID();
    const now = new Date().toISOString();

    const normalizedRepairs = inspection.repairs.map((repair) => ({
      ...repair,
      id: isUUID(repair.id) ? repair.id : generateUUID(),
    }));

    const normalizedGeneralPhotos = Array.isArray(inspection.generalPhotos)
      ? inspection.generalPhotos.filter(Boolean).slice(0, 4)
      : [];

    const preparedRepairs = [];
    for (const repair of normalizedRepairs) {
      preparedRepairs.push({
        ...repair,
        photos: await getUploadSourceUrisSequential(repair.photos || [], 'reparacion_repair'),
      });
    }

    const preparedGeneralPhotos = await getUploadSourceUrisSequential(normalizedGeneralPhotos, 'reparacion_general');

    const normalizedMaterials = inspection.materials.map((material) => ({
      ...material,
      id: isUUID(material.id) ? material.id : generateUUID(),
    }));

    const { error: upsertError } = await supabase.from('reparaciones_inspections').upsert({
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
      notes: inspection.notes || null,
      safety_checklist: inspection.safetyChecklist || null,
      pdf_url: inspection.pdfUrl || null,
      exit_pdf_url: inspection.exitPdfUrl || null,
      created_at: inspection.createdAt || now,
      updated_at: now,
    });

    if (upsertError) {
      console.error('Error al guardar la reparación:', upsertError);
      throw upsertError;
    }

    const storageBase = buildReparacionesStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    await deletePhotosInFolder(`${storageBase}/reparaciones`);
    await deletePhotosInFolder(`${storageBase}/entrada`);
    await runSupabase(supabase.from('reparaciones_repair_photos').delete().eq('inspection_id', inspectionId), 'Error al limpiar fotos de reparaciones');
    await runSupabase(supabase.from('reparaciones_repairs').delete().eq('inspection_id', inspectionId), 'Error al limpiar reparaciones');
    await runSupabase(supabase.from('reparaciones_materials').delete().eq('inspection_id', inspectionId), 'Error al limpiar materiales de reparación');
    await runSupabase(supabase.from('reparaciones_general_photos').delete().eq('inspection_id', inspectionId), 'Error al limpiar fotos generales de reparación');

    for (let photoIndex = 0; photoIndex < preparedGeneralPhotos.length; photoIndex += 1) {
      const photoUri = preparedGeneralPhotos[photoIndex];
      if (!photoUri) continue;

      const storagePath = `${storageBase}/entrada/foto_general_${photoIndex + 1}.jpg`;
      const photoUrl = await uploadPhoto(photoUri, storagePath);

      if (!photoUrl) continue;

      await runSupabase(
        supabase.from('reparaciones_general_photos').insert({
          id: generateUUID(),
          inspection_id: inspectionId,
          photo_url: photoUrl,
          sort_order: photoIndex,
        }),
        'Error al insertar foto general de reparación'
      );
    }

    for (let repairIndex = 0; repairIndex < preparedRepairs.length; repairIndex += 1) {
      const repair = preparedRepairs[repairIndex];

      await runSupabase(
        supabase.from('reparaciones_repairs').insert({
          id: repair.id,
          inspection_id: inspectionId,
          description: repair.description,
          sort_order: repairIndex,
        }),
        'Error al insertar reparación'
      );

      for (let photoIndex = 0; photoIndex < repair.photos.length; photoIndex += 1) {
        const photoUri = repair.photos[photoIndex];
        if (!photoUri) continue;

        const storagePath = `${storageBase}/reparaciones/reparacion_${repairIndex + 1}/foto_${photoIndex + 1}.jpg`;
        const photoUrl = await uploadPhoto(photoUri, storagePath);

        if (!photoUrl) continue;

        await runSupabase(
          supabase.from('reparaciones_repair_photos').insert({
            id: generateUUID(),
            inspection_id: inspectionId,
            repair_id: repair.id,
            photo_url: photoUrl,
            sort_order: photoIndex,
          }),
          'Error al insertar foto de reparación'
        );
      }
    }

    if (normalizedMaterials.length > 0) {
      await runSupabase(
        supabase.from('reparaciones_materials').insert(
          normalizedMaterials.map((material, index) => ({
            id: material.id,
            inspection_id: inspectionId,
            name: material.name,
            quantity: material.quantity,
            reference: material.reference,
            available: typeof material.available === 'boolean' ? material.available : null,
            sort_order: index,
          }))
        ),
        'Error al insertar materiales de reparación'
      );
    }

    const savedInspection: ReparacionInspection = {
      ...inspection,
      id: inspectionId,
      generalPhotos: normalizedGeneralPhotos,
      repairs: preparedRepairs,
      materials: normalizedMaterials,
      createdAt: inspection.createdAt || now,
      updatedAt: now,
    };

    invalidateReparacionesCache();
    return savedInspection;
  } catch (error) {
    console.error('Error al guardar la reparación:', error);
    throw error;
  }
};

export const saveReparacionExit = async (
  inspectionId: string,
  exitData: ReparacionExitData
): Promise<ReparacionInspection | null> => {
  try {
    const inspection = await getReparacionInspectionById(inspectionId);
    if (!inspection) {
      throw new Error('La reparación no existe');
    }

    const completedAt = exitData.completedAt || new Date().toISOString();
    const storageBase = buildReparacionesStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    const preparedChecks = [];
    for (const check of exitData.checks) {
      preparedChecks.push({
        ...check,
        photoUrl: check.photoUrl ? await getUploadSourceUri(check.photoUrl, 'reparacion_exit_check') : '',
      });
    }

    const preparedExitGeneralPhotos = await getUploadSourceUrisSequential(
      (exitData.generalPhotos || []).filter(Boolean).slice(0, 4),
      'reparacion_exit_general'
    );

    await deletePhotosInFolder(`${storageBase}/exit_checks`);
    await deletePhotosInFolder(`${storageBase}/salida`);
    await runSupabase(supabase.from('reparaciones_exit_checks').delete().eq('inspection_id', inspectionId), 'Error al borrar comprobaciones de salida');
    await runSupabase(supabase.from('reparaciones_exit_materials').delete().eq('inspection_id', inspectionId), 'Error al borrar materiales de salida');
    await runSupabase(supabase.from('reparaciones_exit_photos').delete().eq('inspection_id', inspectionId), 'Error al borrar fotos de salida');

    const repairOrderById = new Map(inspection.repairs.map((repair, index) => [repair.id, index]));

    if (preparedChecks.length > 0) {
      const checkRows: Record<string, unknown>[] = [];

      for (let index = 0; index < preparedChecks.length; index += 1) {
        const check = preparedChecks[index];
        let uploadedPhotoUrl: string | null = null;

        if (check.photoUrl) {
          const repairNumber = (repairOrderById.get(check.repairId) ?? index) + 1;
          uploadedPhotoUrl = await uploadPhoto(check.photoUrl, `${storageBase}/exit_checks/reparacion_${repairNumber}.jpg`);
        }

        checkRows.push({
          id: isUUID(check.id) ? check.id : generateUUID(),
          inspection_id: inspectionId,
          repair_id: check.repairId || null,
          checked: check.checked,
          comment: check.comment || null,
          photo_url: uploadedPhotoUrl,
          verified_by: check.verifiedBy || exitData.reviewedBy || null,
          verified_at: check.verifiedAt || completedAt,
          sort_order: index,
        });
      }

      await runSupabase(
        supabase.from('reparaciones_exit_checks').insert(checkRows),
        'Error al insertar comprobaciones de salida'
      );
    }

    for (let photoIndex = 0; photoIndex < preparedExitGeneralPhotos.length; photoIndex += 1) {
      const photoUri = preparedExitGeneralPhotos[photoIndex];
      if (!photoUri) continue;

      const photoUrl = await uploadPhoto(photoUri, `${storageBase}/salida/foto_general_${photoIndex + 1}.jpg`);
      if (!photoUrl) continue;

      await runSupabase(
        supabase.from('reparaciones_exit_photos').insert({
          id: generateUUID(),
          inspection_id: inspectionId,
          photo_type: 'general',
          photo_url: photoUrl,
          sort_order: photoIndex,
        }),
        'Error al insertar foto de salida'
      );
    }

    if (exitData.materials.length > 0) {
      await runSupabase(
        supabase.from('reparaciones_exit_materials').insert(
          exitData.materials.map((material, index) => ({
            id: isUUID(material.id) ? material.id : generateUUID(),
            inspection_id: inspectionId,
            material_id: material.materialId || null,
            name: material.name,
            quantity: material.quantity,
            reference: material.reference,
            available: typeof material.available === 'boolean' ? material.available : null,
            checked: material.checked,
            is_extra: material.isExtra,
            sort_order: index,
          }))
        ),
        'Error al insertar materiales de salida'
      );
    }

    await runSupabase(
      supabase
        .from('reparaciones_inspections')
        .update({
          exit_status: 'completed',
          exit_notes: exitData.note || null,
          exit_reviewed_by: exitData.reviewedBy || null,
          exit_completed_at: completedAt,
          exit_pdf_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId),
      'Error al marcar salida de reparación como completada'
    );

    invalidateReparacionesCache();
    return getReparacionInspectionById(inspectionId);
  } catch (error) {
    console.error('Error al guardar la salida de reparación:', error);
    throw error;
  }
};

export const deleteReparacionExit = async (inspectionId: string): Promise<boolean> => {
  try {
    const inspection = await getReparacionInspectionById(inspectionId);
    if (!inspection) {
      return false;
    }

    const storageBase = buildReparacionesStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    await deletePhotosInFolder(`${storageBase}/exit_checks`);
    await deletePhotosInFolder(`${storageBase}/salida`);
    await deletePhoto(buildReparacionesPdfStoragePath(inspection, 'salida'));
    await deletePhoto(buildLegacyReparacionesPdfStoragePath(inspection, 'salida'));
    await runSupabase(supabase.from('reparaciones_exit_checks').delete().eq('inspection_id', inspectionId), 'Error al borrar comprobaciones de salida');
    await runSupabase(supabase.from('reparaciones_exit_materials').delete().eq('inspection_id', inspectionId), 'Error al borrar materiales de salida');
    await runSupabase(supabase.from('reparaciones_exit_photos').delete().eq('inspection_id', inspectionId), 'Error al borrar fotos de salida');

    const { error } = await supabase
      .from('reparaciones_inspections')
      .update({
        exit_status: 'pending',
        exit_notes: null,
        exit_reviewed_by: null,
        exit_completed_at: null,
        exit_pdf_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inspectionId);

    if (error) {
      console.error('Error al borrar la salida de reparación:', error);
      return false;
    }

    invalidateReparacionesCache();
    return true;
  } catch (error) {
    console.error('Error al borrar la salida de reparación:', error);
    return false;
  }
};

export const deleteReparacionInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getReparacionInspectionById(id);
    if (inspection) {
      const storageBase = buildReparacionesStorageBase({
        licensePlate: inspection.licensePlate,
        clientName: inspection.clientName,
        avisoDate: inspection.avisoDate,
      });
      await deletePhotosInFolder(storageBase);
      await deletePhotosInFolder(buildLegacyReparacionesStorageBase(inspection));
      await deletePhoto(buildReparacionesPdfStoragePath(inspection, 'entrada'));
      await deletePhoto(buildReparacionesPdfStoragePath(inspection, 'salida'));
      await deletePhoto(buildLegacyReparacionesPdfStoragePath(inspection, 'entrada'));
      await deletePhoto(buildLegacyReparacionesPdfStoragePath(inspection, 'salida'));
    }

    await deletePhotosInFolder(`reparaciones/${id}`);

    await runSupabase(supabase.from('reparaciones_exit_checks').delete().eq('inspection_id', id), 'Error al eliminar comprobaciones de salida');
    await runSupabase(supabase.from('reparaciones_exit_materials').delete().eq('inspection_id', id), 'Error al eliminar materiales de salida');
    await runSupabase(supabase.from('reparaciones_exit_photos').delete().eq('inspection_id', id), 'Error al eliminar fotos de salida');
    await runSupabase(supabase.from('reparaciones_repair_photos').delete().eq('inspection_id', id), 'Error al eliminar fotos de reparaciones');
    await runSupabase(supabase.from('reparaciones_repairs').delete().eq('inspection_id', id), 'Error al eliminar reparaciones');
    await runSupabase(supabase.from('reparaciones_materials').delete().eq('inspection_id', id), 'Error al eliminar materiales');
    await runSupabase(supabase.from('reparaciones_general_photos').delete().eq('inspection_id', id), 'Error al eliminar fotos generales');

    const { error } = await supabase.from('reparaciones_inspections').delete().eq('id', id);

    if (error) {
      console.error('Error al eliminar la reparación:', error);
      return false;
    }

    invalidateReparacionesCache();
    return true;
  } catch (error) {
    console.error('Error al eliminar la reparación:', error);
    return false;
  }
};

export const buildExitDraftFromInspection = (
  inspection: ReparacionInspection
): ReparacionExitData => {
  const existingChecks = new Map((inspection.exitData?.checks || []).map((check) => [check.repairId, check]));
  const existingMaterials = new Map(
    (inspection.exitData?.materials || [])
      .filter((material) => material.materialId)
      .map((material) => [material.materialId as string, material])
  );

  const extraMaterials = (inspection.exitData?.materials || []).filter(
    (material) => material.isExtra || !material.materialId
  );

  return {
    checks: inspection.repairs.map((repair) => ({
      id: existingChecks.get(repair.id)?.id || repair.id,
      repairId: repair.id,
      checked: existingChecks.get(repair.id)?.checked || false,
      comment: existingChecks.get(repair.id)?.comment || '',
      photoUrl: existingChecks.get(repair.id)?.photoUrl || '',
      verifiedBy: existingChecks.get(repair.id)?.verifiedBy || inspection.exitReviewedBy || '',
      verifiedAt: existingChecks.get(repair.id)?.verifiedAt || inspection.exitCompletedAt || '',
    })),
    materials: [
      ...inspection.materials.map((material) => {
        const existingMaterial = existingMaterials.get(material.id);
        return {
          id: existingMaterial?.id || material.id,
          materialId: material.id,
          name: existingMaterial?.name || material.name,
          quantity: existingMaterial?.quantity || material.quantity,
          reference: existingMaterial?.reference || material.reference,
          available: existingMaterial ? existingMaterial.available : material.available,
          checked: existingMaterial?.checked || false,
          isExtra: false,
        };
      }),
      ...extraMaterials.map((material) => ({
        ...material,
        materialId: material.materialId || null,
        isExtra: true,
      })),
    ],
    note: inspection.exitData?.note || inspection.exitNotes || '',
    reviewedBy: inspection.exitData?.reviewedBy || inspection.exitReviewedBy || '',
    generalPhotos: (inspection.exitData?.generalPhotos || []).filter(Boolean).slice(0, 4),
    completedAt: inspection.exitData?.completedAt || inspection.exitCompletedAt || '',
  };
};

export const paramsToInspection = (params: any): ReparacionInspection => {
  const repairs = parseJsonArray<ReparacionRepair>(params.repairs).map((repair) => ({
    id: repair.id || generateUUID(),
    description: repair.description || '',
    photos: Array.isArray(repair.photos) ? repair.photos : [],
  }));

  const materials = parseJsonArray<ReparacionMaterial>(params.materials).map((material) => ({
    id: material.id || generateUUID(),
    name: material.name || '',
    quantity: material.quantity || '',
    reference: material.reference || '',
    available: typeof material.available === 'boolean' ? material.available : null,
  }));

  return {
    id: getParamString(params.inspectionId) || `reparacion_${Date.now()}`,
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
    notes: getParamString(params.notes),
    safetyChecklist: params.safetyChecklist ? parseSafetyChecklist(params.safetyChecklist, 'fire-only') : null,
    generalPhotos: parseJsonArray<string>(params.generalPhotos).filter(Boolean).slice(0, 4),
    repairs,
    materials,
    exitStatus: getParamString(params.exitStatus) || 'pending',
    exitNotes: getParamString(params.exitNotes),
    exitReviewedBy: getParamString(params.exitReviewedBy),
    exitCompletedAt: getParamString(params.exitCompletedAt),
    pdfUrl: getParamString(params.pdfUrl),
    exitPdfUrl: getParamString(params.exitPdfUrl),
    exitData: null,
    createdAt: getParamString(params.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const inspectionToParams = (inspection: ReparacionInspection): any => {
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
    licensePlate: inspection.licensePlate || '',
    otNumber: inspection.otNumber || '',
    notes: inspection.notes || '',
    safetyChecklist: inspection.safetyChecklist ? JSON.stringify(inspection.safetyChecklist) : '',
    generalPhotos: JSON.stringify(inspection.generalPhotos || []),
    repairs: JSON.stringify(inspection.repairs),
    materials: JSON.stringify(inspection.materials),
    exitStatus: inspection.exitStatus || 'pending',
    exitNotes: inspection.exitNotes || '',
    exitReviewedBy: inspection.exitReviewedBy || '',
    exitCompletedAt: inspection.exitCompletedAt || '',
    pdfUrl: inspection.pdfUrl || '',
    exitPdfUrl: inspection.exitPdfUrl || '',
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt,
  };
};

export default {
  getReparacionesInspections,
  getReparacionInspectionById,
  saveReparacionInspection,
  saveReparacionExit,
  deleteReparacionExit,
  deleteReparacionInspection,
  paramsToInspection,
  inspectionToParams,
  buildExitDraftFromInspection,
};
