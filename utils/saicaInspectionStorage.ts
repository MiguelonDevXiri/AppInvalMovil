import { supabase } from './supabase';
import { sanitizePathSegment, uploadPhoto, deletePhotosInFolder } from './photoUpload';
import { parseSafetyChecklist, type SafetyChecklist } from './safetyChecklist';

// ==================== TIPOS ====================

export interface SaicaIntervention {
  id: string;
  description: string;
  proposedSolution?: string;
  photos: string[];
}

export interface SaicaInspection {
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
  // Informes Saica detectadas (lista dinámica)
  interventions: SaicaIntervention[];
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

const buildSaicaStorageBase = (inspection: Pick<SaicaInspection, 'licensePlate' | 'clientName' | 'avisoDate'>): string => {
  const plate = sanitizePathSegment(inspection.licensePlate || 'sin_matricula', 30);
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 40);
  const date = normalizeDateSegment(inspection.avisoDate);
  return `saica/${plate}_${client}_${date}`;
};

const GENERAL_PHOTO_SUFFIXES: Record<string, string> = {
  photoGeneral1: 'maquina',
  photoGeneral2: 'placa',
  photoGeneral3: 'foto_3',
  photoGeneral4: 'foto_4',
};

// ==================== CACHE ====================

let saicaCache: SaicaInspection[] | null = null;
let saicaCacheTime: number = 0;
const CACHE_TTL = 30000;

export const invalidateSaicaCache = () => {
  saicaCache = null;
  saicaCacheTime = 0;
};

// ==================== DB → MODELO ====================

const dbRowToInspection = (
  row: any,
  interventionsRows: any[],
  interventionPhotosRows: any[],
  photosRows: any[],
  materialsRows: any[]
): SaicaInspection => {
  // Agrupar fotos por interventiono
  const interventions: SaicaIntervention[] = interventionsRows.map((d: any) => ({
    id: d.id,
    description: d.description || '',
    proposedSolution: d.proposed_solution || '',
    photos: interventionPhotosRows
      .filter((p: any) => p.intervention_id === d.id)
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
    safetyChecklist: row.safety_checklist ? parseSafetyChecklist(row.safety_checklist, 'full') : null,
    interventions,
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

export const getSaicaInspections = async (): Promise<SaicaInspection[]> => {
  const now = Date.now();
  if (saicaCache && (now - saicaCacheTime) < CACHE_TTL) {
    return saicaCache;
  }
  try {
    const { data, error } = await supabase
      .from('saica_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener informes Saica:', error);
      return [];
    }

    const inspections: SaicaInspection[] = [];

    for (const row of (data || [])) {
      const [
        { data: interventions },
        { data: interventionPhotos },
        { data: photos },
        { data: materials },
      ] = await Promise.all([
        supabase.from('saica_interventions').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('saica_intervention_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('saica_photos').select('*').eq('inspection_id', row.id).order('sort_order'),
        supabase.from('saica_materials').select('*').eq('inspection_id', row.id).order('sort_order'),
      ]);

      inspections.push(dbRowToInspection(row, interventions || [], interventionPhotos || [], photos || [], materials || []));
    }

    saicaCache = inspections;
    saicaCacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener informes Saica:', error);
    return [];
  }
};

export const getSaicaInspectionById = async (id: string): Promise<SaicaInspection | null> => {
  try {
    const { data: row, error } = await supabase
      .from('saica_inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) return null;

    const [
      { data: interventions },
      { data: interventionPhotos },
      { data: photos },
      { data: materials },
    ] = await Promise.all([
      supabase.from('saica_interventions').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('saica_intervention_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('saica_photos').select('*').eq('inspection_id', id).order('sort_order'),
      supabase.from('saica_materials').select('*').eq('inspection_id', id).order('sort_order'),
    ]);

    return dbRowToInspection(row, interventions || [], interventionPhotos || [], photos || [], materials || []);
  } catch (error) {
    console.error('Error al obtener informe Saica:', error);
    return null;
  }
};

export const saveSaicaInspection = async (inspection: SaicaInspection): Promise<SaicaInspection> => {
  try {
    let inspectionId = inspection.id;
    if (!isUUID(inspectionId)) {
      inspectionId = generateUUID();
    }

    const now = new Date().toISOString();

    // 1. Upsert inspección principal
    const { error: upsertError } = await supabase
      .from('saica_inspections')
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
        safety_checklist: inspection.safetyChecklist || null,
        solucion_description: inspection.solucionDescription,
        created_at: inspection.createdAt || now,
        updated_at: now,
      });

    if (upsertError) {
      console.error('❌ Error al guardar informe Saica:', upsertError);
      throw upsertError;
    }

    const storageBase = buildSaicaStorageBase({
      licensePlate: inspection.licensePlate,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
    });

    // 2. Limpiar datos anteriores
    await supabase.from('saica_intervention_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('saica_interventions').delete().eq('inspection_id', inspectionId);
    await supabase.from('saica_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('saica_materials').delete().eq('inspection_id', inspectionId);

    // 3. Guardar interventionos y sus fotos
    if (inspection.interventions && inspection.interventions.length > 0) {
      for (let i = 0; i < inspection.interventions.length; i++) {
        const intervention = inspection.interventions[i];
        const interventionId = isUUID(intervention.id) ? intervention.id : generateUUID();

        await supabase.from('saica_interventions').insert({
          id: interventionId,
          inspection_id: inspectionId,
          description: intervention.description,
          proposed_solution: intervention.proposedSolution || null,
          sort_order: i,
        });

        // Fotos del interventiono
        if (intervention.photos && intervention.photos.length > 0) {
          for (let j = 0; j < intervention.photos.length; j++) {
            const uri = intervention.photos[j];
            if (uri) {
              const storagePath = `${storageBase}/intervenciones/saica_${i + 1}_foto_${j + 1}.jpg`;
              const photoUrl = await uploadPhoto(uri, storagePath);
              if (photoUrl) {
                await supabase.from('saica_intervention_photos').insert({
                  id: generateUUID(),
                  intervention_id: interventionId,
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
          await supabase.from('saica_photos').insert({
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
            await supabase.from('saica_photos').insert({
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
      await supabase.from('saica_materials').insert(materialRows);
    }

    const savedInspection = {
      ...inspection,
      id: inspectionId,
      updatedAt: now,
      createdAt: inspection.createdAt || now,
    };

    invalidateSaicaCache();
    console.log('✅ Informe Saica guardada:', inspectionId);
    return savedInspection;
  } catch (error) {
    console.error('❌ Error al guardar informe Saica:', error);
    throw error;
  }
};

export const deleteSaicaInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getSaicaInspectionById(id);
    if (inspection) {
      const storageBase = buildSaicaStorageBase({
        licensePlate: inspection.licensePlate,
        clientName: inspection.clientName,
        avisoDate: inspection.avisoDate,
      });
      await deletePhotosInFolder(storageBase);
    }
    await deletePhotosInFolder(`saica/${id}`);

    await supabase.from('saica_intervention_photos').delete().eq('inspection_id', id);
    await supabase.from('saica_interventions').delete().eq('inspection_id', id);
    await supabase.from('saica_photos').delete().eq('inspection_id', id);
    await supabase.from('saica_materials').delete().eq('inspection_id', id);

    const { error } = await supabase
      .from('saica_inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error al eliminar informe Saica:', error);
      return false;
    }

    invalidateSaicaCache();
    console.log('✅ Informe Saica eliminada:', id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar informe Saica:', error);
    return false;
  }
};

// ==================== CONVERSORES PARAMS ↔ MODELO ====================

export const paramsToInspection = (params: any): SaicaInspection => {
  const getParamString = (value: unknown): string => {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : '';
    }

    return typeof value === 'string' ? value : '';
  };

  let interventions: SaicaIntervention[] = [];
  if (params.interventions) {
    try {
      interventions = typeof params.interventions === 'string' ? JSON.parse(params.interventions) : params.interventions;
    } catch (e) {
      console.error('Error al parsear interventions:', e);
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

  const safetyChecklist = params.safetyChecklist
    ? parseSafetyChecklist(params.safetyChecklist, 'full')
    : null;

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
    otNumber: getParamString(params.otNumber),
    notes: getParamString(params.notes) || getParamString(params.observaciones),
    safetyChecklist,
    interventions,
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

export const inspectionToParams = (inspection: SaicaInspection): any => {
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
    interventions: JSON.stringify(inspection.interventions),
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
  getSaicaInspections,
  getSaicaInspectionById,
  saveSaicaInspection,
  deleteSaicaInspection,
  paramsToInspection,
  inspectionToParams,
};
