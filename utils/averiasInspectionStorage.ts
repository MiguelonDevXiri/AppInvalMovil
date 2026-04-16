import { supabase } from './supabase';
import { sanitizePathSegment, uploadPhoto, deletePhotosInFolder } from './photoUpload';

// ==================== TIPOS ====================

export interface AveriaDefect {
  id: string;
  description: string;
  photos: string[];
}

export interface AveriaInspection {
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
  // Averías detectadas (lista dinámica)
  defects: AveriaDefect[];
  // Intervención / Solución
  solucionDescription: string;
  solucionPhotos: string[];
  // Materiales
  materiales: Array<{ id: string; name: string; quantity: string; reference: string }>;
  // Fotos generales
  photoGeneral1?: string;
  photoGeneral2?: string;
  photoGeneral3?: string;
  photoGeneral4?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ==================== HELPERS ====================

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

const buildAveriasStorageBase = (inspection: Pick<AveriaInspection, 'licensePlate' | 'clientName' | 'avisoDate'>): string => {
  const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 40);
  const date = normalizeDateSegment(inspection.avisoDate);
  return `averias/${plate}_${client}_${date}`;
};

const GENERAL_PHOTO_SUFFIXES: Record<string, string> = {
  photoGeneral1: 'A1',
  photoGeneral2: 'A2',
  photoGeneral3: 'A3',
  photoGeneral4: 'A4',
};

// ==================== CACHE ====================

let averiasCache: AveriaInspection[] | null = null;
let averiasCacheTime: number = 0;
const CACHE_TTL = 30000;

export const invalidateAveriasCache = () => {
  averiasCache = null;
  averiasCacheTime = 0;
};

// ==================== DB → MODELO ====================

const dbRowToInspection = (
  row: any,
  defectsRows: any[],
  defectPhotosRows: any[],
  photosRows: any[],
  materialsRows: any[]
): AveriaInspection => {
  // Agrupar fotos por defecto
  const defects: AveriaDefect[] = defectsRows.map((d: any) => ({
    id: d.id,
    description: d.description || '',
    photos: defectPhotosRows
      .filter((p: any) => p.defect_id === d.id)
      .map((p: any) => p.photo_url),
  }));

  // Fotos generales y de solución
  const generalPhotos: Record<string, string> = {};
  const solucionPhotos: string[] = [];
  for (const photo of photosRows) {
    if (photo.photo_type === 'general' && photo.position) {
      generalPhotos[photo.position] = photo.photo_url;
    } else if (photo.photo_type === 'solucion') {
      solucionPhotos.push(photo.photo_url);
    }
  }

  return {
    id: row.id,
    clientName: row.client_name || '',
    avisoDate: row.aviso_date || '',
    avisoTime: row.aviso_time || '',
    location: row.location || '',
    reviewedBy: row.reviewed_by || row.technician_name || '',
    machineType: row.machine_type || '',
    machineBrand: row.machine_brand || '',
    machineModel: row.machine_model || '',
    serialNumber: row.serial_number || '',
    licensePlate: row.license_plate || '',
    otNumber: row.ot_number || '',
    notes: row.notes || '',
    defects,
    solucionDescription: row.solucion_description || '',
    solucionPhotos,
    materiales: materialsRows.map((m: any) => ({
      id: m.id,
      name: m.name || '',
      quantity: m.quantity || '',
      reference: m.reference || '',
    })),
    photoGeneral1: generalPhotos['photoGeneral1'] || '',
    photoGeneral2: generalPhotos['photoGeneral2'] || '',
    photoGeneral3: generalPhotos['photoGeneral3'] || '',
    photoGeneral4: generalPhotos['photoGeneral4'] || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

// ==================== CRUD ====================

export const getAveriasInspections = async (): Promise<AveriaInspection[]> => {
  const now = Date.now();
  if (averiasCache && (now - averiasCacheTime) < CACHE_TTL) {
    return averiasCache;
  }
  try {
    const { data, error } = await supabase
      .from('averias_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener averías:', error);
      return [];
    }

    const inspections: AveriaInspection[] = [];

    for (const row of (data || [])) {
      const [
        { data: defects },
        { data: defectPhotos },
        { data: photos },
        { data: materials },
      ] = await Promise.all([
        supabase.from('averias_defects').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('averias_defect_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('averias_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('averias_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      ]);

      inspections.push(dbRowToInspection(row, defects || [], defectPhotos || [], photos || [], materials || []));
    }

    averiasCache = inspections;
    averiasCacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener averías:', error);
    return [];
  }
};

export const getAveriaInspectionById = async (id: string): Promise<AveriaInspection | null> => {
  try {
    const { data: row, error } = await supabase
      .from('averias_inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) return null;

    const [
      { data: defects },
      { data: defectPhotos },
      { data: photos },
      { data: materials },
    ] = await Promise.all([
      supabase.from('averias_defects').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('averias_defect_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('averias_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('averias_materials').select('*').eq('inspection_id', id).order('sort_order'),
    ]);

    return dbRowToInspection(row, defects || [], defectPhotos || [], photos || [], materials || []);
  } catch (error) {
    console.error('Error al obtener avería:', error);
    return null;
  }
};

export const saveAveriaInspection = async (inspection: AveriaInspection): Promise<AveriaInspection> => {
  try {
    let inspectionId = inspection.id;
    if (!isUUID(inspectionId)) {
      inspectionId = generateUUID();
    }

    const now = new Date().toISOString();

    // 1. Upsert inspección principal
    const { error: upsertError } = await supabase
      .from('averias_inspections')
      .upsert({
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
        solucion_description: inspection.solucionDescription,
        created_at: inspection.createdAt || now,
        updated_at: now,
      });

    if (upsertError) {
      console.error('❌ Error al guardar avería:', upsertError);
      throw upsertError;
    }

    const storageBase = buildAveriasStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    // 2. Limpiar datos anteriores
    await supabase.from('averias_defect_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('averias_defects').delete().eq('inspection_id', inspectionId);
    await supabase.from('averias_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('averias_materials').delete().eq('inspection_id', inspectionId);

    // 3. Guardar defectos y sus fotos
    if (inspection.defects && inspection.defects.length > 0) {
      for (let i = 0; i < inspection.defects.length; i++) {
        const defect = inspection.defects[i];
        const defectId = isUUID(defect.id) ? defect.id : generateUUID();

        await supabase.from('averias_defects').insert({
          id: defectId,
          inspection_id: inspectionId,
          description: defect.description,
          sort_order: i,
        });

        // Fotos del defecto
        if (defect.photos && defect.photos.length > 0) {
          for (let j = 0; j < defect.photos.length; j++) {
            const uri = defect.photos[j];
            if (uri) {
              const storagePath = `${storageBase}/defectos/averia_${i + 1}_foto_${j + 1}.jpg`;
              const photoUrl = await uploadPhoto(uri, storagePath);
              if (photoUrl) {
                await supabase.from('averias_defect_photos').insert({
                  id: generateUUID(),
                  defect_id: defectId,
                  inspection_id: inspectionId,
                  photo_url: photoUrl,
                  sort_order: j,
                });
              }
            }
          }
        }
      }
    }

    // 4. Fotos generales
    const generalPhotoFields = ['photoGeneral1', 'photoGeneral2', 'photoGeneral3', 'photoGeneral4'] as const;
    for (const field of generalPhotoFields) {
      const uri = inspection[field];
      if (uri) {
        const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
        const storagePath = `${storageBase}/general/${plate}_${GENERAL_PHOTO_SUFFIXES[field]}.jpg`;
        const photoUrl = await uploadPhoto(uri, storagePath);
        if (photoUrl) {
          await supabase.from('averias_photos').insert({
            id: generateUUID(),
            inspection_id: inspectionId,
            photo_type: 'general',
            position: field,
            photo_url: photoUrl,
          });
        }
      }
    }

    // 5. Fotos de solución
    if (inspection.solucionPhotos && inspection.solucionPhotos.length > 0) {
      for (let i = 0; i < inspection.solucionPhotos.length; i++) {
        const uri = inspection.solucionPhotos[i];
        if (uri) {
          const storagePath = `${storageBase}/solucion/Solucion_${i + 1}.jpg`;
          const photoUrl = await uploadPhoto(uri, storagePath);
          if (photoUrl) {
            await supabase.from('averias_photos').insert({
              id: generateUUID(),
              inspection_id: inspectionId,
              photo_type: 'solucion',
              position: null,
              photo_url: photoUrl,
              sort_order: i,
            });
          }
        }
      }
    }

    // 6. Materiales
    if (inspection.materiales && inspection.materiales.length > 0) {
      const materialRows = inspection.materiales.map((m, i) => ({
        id: isUUID(m.id) ? m.id : generateUUID(),
        inspection_id: inspectionId,
        name: m.name,
        quantity: m.quantity,
        reference: m.reference,
        sort_order: i,
      }));
      await supabase.from('averias_materials').insert(materialRows);
    }

    const savedInspection = {
      ...inspection,
      id: inspectionId,
      updatedAt: now,
      createdAt: inspection.createdAt || now,
    };

    invalidateAveriasCache();
    console.log('✅ Avería guardada:', inspectionId);
    return savedInspection;
  } catch (error) {
    console.error('❌ Error al guardar avería:', error);
    throw error;
  }
};

export const deleteAveriaInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getAveriaInspectionById(id);
    if (inspection) {
      const storageBase = buildAveriasStorageBase({
        licensePlate: inspection.licensePlate,
        clientName: inspection.clientName,
        avisoDate: inspection.avisoDate,
      });
      await deletePhotosInFolder(storageBase);
    }
    await deletePhotosInFolder(`averias/${id}`);

    const { error } = await supabase
      .from('averias_inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error al eliminar avería:', error);
      return false;
    }

    invalidateAveriasCache();
    console.log('✅ Avería eliminada:', id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar avería:', error);
    return false;
  }
};

// ==================== CONVERSORES PARAMS ↔ MODELO ====================

export const paramsToInspection = (params: any): AveriaInspection => {
  let defects: AveriaDefect[] = [];
  if (params.defects) {
    try {
      defects = typeof params.defects === 'string' ? JSON.parse(params.defects) : params.defects;
    } catch (e) {
      console.error('Error al parsear defects:', e);
    }
  }

  let solucionPhotos: string[] = [];
  if (params.solucionPhotos) {
    try {
      solucionPhotos = typeof params.solucionPhotos === 'string'
        ? JSON.parse(params.solucionPhotos)
        : Array.isArray(params.solucionPhotos)
        ? params.solucionPhotos
        : [params.solucionPhotos];
    } catch (e) {
      console.error('Error al parsear solucionPhotos:', e);
    }
  }

  let materiales: Array<{ id: string; name: string; quantity: string; reference: string }> = [];
  if (params.materiales) {
    try {
      materiales = typeof params.materiales === 'string' ? JSON.parse(params.materiales) : params.materiales;
    } catch (e) {
      console.error('Error al parsear materiales:', e);
    }
  }

  return {
    id: params.inspectionId || `inspection_${Date.now()}`,
    clientName: params.clientName || '',
    avisoDate: params.avisoDate || '',
    avisoTime: params.avisoTime || '',
    location: params.location || '',
    reviewedBy: params.reviewedBy || '',
    machineType: params.machineType || '',
    machineBrand: params.brand || '',
    machineModel: params.model || '',
    serialNumber: params.serialNumber || '',
    licensePlate: params.licensePlate || '',
    otNumber: params.otNumber || '',
    notes: params.notes || params.observaciones || '',
    defects,
    solucionDescription: params.solucionDescription || '',
    solucionPhotos,
    materiales,
    photoGeneral1: params.photoGeneral1 || '',
    photoGeneral2: params.photoGeneral2 || '',
    photoGeneral3: params.photoGeneral3 || '',
    photoGeneral4: params.photoGeneral4 || '',
    createdAt: params.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const inspectionToParams = (inspection: AveriaInspection): any => {
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
    defects: JSON.stringify(inspection.defects),
    solucionDescription: inspection.solucionDescription,
    solucionPhotos: JSON.stringify(inspection.solucionPhotos),
    materiales: JSON.stringify(inspection.materiales),
    photoGeneral1: inspection.photoGeneral1 || '',
    photoGeneral2: inspection.photoGeneral2 || '',
    photoGeneral3: inspection.photoGeneral3 || '',
    photoGeneral4: inspection.photoGeneral4 || '',
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt,
  };
};

export default {
  getAveriasInspections,
  getAveriaInspectionById,
  saveAveriaInspection,
  deleteAveriaInspection,
  paramsToInspection,
  inspectionToParams,
};
