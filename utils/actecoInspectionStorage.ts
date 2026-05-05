import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { buildActecoStorageBase, buildLegacyActecoStorageBase, deletePhotosInFolder, uploadPhoto } from './photoUpload';
import { parseSafetyChecklist, type SafetyChecklist } from './safetyChecklist';

// Tipo para la inspección ACTECO (formato usado en la app)
export interface ActecoInspection {
  id: string;
  clientName: string;
  avisoDate: string;
  avisoTime: string;
  location: string;
  requestedBy: string;
  machineType: string;
  machineBrand: string;
  machineModel: string;
  serialNumber: string;
  licensePlate?: string;
  otNumber?: string;
  photoGeneral1?: string;
  photoGeneral2?: string;
  photoGeneral3?: string;
  photoGeneral4?: string;
  hasAveria: boolean;
  avisoAveria: string;
  averiaDetectada: string;
  causaAveria: string;
  averiaPhotos: string[];
  tieneSolucion: boolean;
  observaciones: string;
  safetyChecklist?: SafetyChecklist | null;
  materiales: Array<{ id: string; name: string; quantity: string }>;
  technicianName: string;
  technicianSignature: string;
  clientSignatureName: string;
  clientSignature: string;
  createdAt: string;
  updatedAt: string;
}

const LEGACY_KEY = 'actecoInspections';

// Helper: generar UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper: detectar si un ID es UUID
const isUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const GENERAL_PHOTO_FILE_NAMES: Record<string, string> = {
  photoGeneral1: 'Frontal',
  photoGeneral2: 'Posterior',
  photoGeneral3: 'Lateral_Izquierdo',
  photoGeneral4: 'Lateral_Derecho',
};

const getActecoStorageBaseByInspection = (inspection: Pick<ActecoInspection, 'id' | 'clientName' | 'avisoDate' | 'location'>): string => {
  return buildActecoStorageBase(inspection);
};

// ==================== CACHE ====================

let actecoCache: ActecoInspection[] | null = null;
let actecoCacheTime: number = 0;
const ACTECO_CACHE_TTL = 30000; // 30 seconds

export const invalidateActecoCache = () => {
  actecoCache = null;
  actecoCacheTime = 0;
};

// Obtener todas las inspecciones
export const getActecoInspections = async (): Promise<ActecoInspection[]> => {
  const now = Date.now();
  if (actecoCache && (now - actecoCacheTime) < ACTECO_CACHE_TTL) {
    return actecoCache;
  }
  try {
    const { data, error } = await supabase
      .from('acteco_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener inspecciones ACTECO:', error);
      return [];
    }

    const inspections: ActecoInspection[] = [];

    for (const row of (data || [])) {
      // Obtener fotos
      const { data: photos } = await supabase
        .from('acteco_photos')
        .select('*')
        .eq('inspection_id', row.id)
        .order('created_at', { ascending: true });

      // Obtener materiales
      const { data: materials } = await supabase
        .from('acteco_materials')
        .select('*')
        .eq('inspection_id', row.id)
        .order('created_at', { ascending: true });

      inspections.push(dbRowToInspection(row, photos || [], materials || []));
    }

    actecoCache = inspections;
    actecoCacheTime = Date.now();
    return inspections;
  } catch (error) {
    console.error('Error al obtener inspecciones ACTECO:', error);
    return [];
  }
};

// Obtener una inspección por ID
export const getActecoInspectionById = async (id: string): Promise<ActecoInspection | null> => {
  try {
    const { data: row, error } = await supabase
      .from('acteco_inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      return null;
    }

    const { data: photos } = await supabase
      .from('acteco_photos')
      .select('*')
      .eq('inspection_id', id)
      .order('created_at', { ascending: true });

    const { data: materials } = await supabase
      .from('acteco_materials')
      .select('*')
      .eq('inspection_id', id)
      .order('created_at', { ascending: true });

    return dbRowToInspection(row, photos || [], materials || []);
  } catch (error) {
    console.error('Error al obtener inspección ACTECO:', error);
    return null;
  }
};

// Helper: convertir fila DB + fotos + materiales a ActecoInspection
const dbRowToInspection = (row: any, photos: any[], materials: any[]): ActecoInspection => {
  // Separar fotos generales y de avería
  const generalPhotos: { [key: string]: string } = {};
  const averiaPhotos: string[] = [];

  for (const photo of photos) {
    if (photo.photo_type === 'general' && photo.position) {
      generalPhotos[photo.position] = photo.photo_url;
    } else if (photo.photo_type === 'averia') {
      averiaPhotos.push(photo.photo_url);
    }
  }

  return {
    id: row.id,
    clientName: row.client_name || '',
    avisoDate: row.aviso_date || '',
    avisoTime: row.aviso_time || '',
    location: row.location || '',
    requestedBy: row.requested_by || '',
    machineType: row.machine_type || '',
    machineBrand: row.machine_brand || '',
    machineModel: row.machine_model || '',
    serialNumber: row.serial_number || '',
    licensePlate: row.license_plate || '',
    otNumber: row.ot_number || '',
    photoGeneral1: generalPhotos['photoGeneral1'] || '',
    photoGeneral2: generalPhotos['photoGeneral2'] || '',
    photoGeneral3: generalPhotos['photoGeneral3'] || '',
    photoGeneral4: generalPhotos['photoGeneral4'] || '',
    hasAveria: row.has_averia || false,
    avisoAveria: row.aviso_averia || '',
    averiaDetectada: row.averia_detectada || '',
    causaAveria: row.causa_averia || '',
    averiaPhotos,
    tieneSolucion: row.tiene_solucion || false,
    observaciones: row.observaciones || '',
    safetyChecklist: row.safety_checklist ? parseSafetyChecklist(row.safety_checklist, 'full') : null,
    materiales: materials.map((m: any) => ({
      id: m.id,
      name: m.name,
      quantity: m.quantity,
    })),
    technicianName: row.technician_name || '',
    technicianSignature: row.technician_signature || '',
    clientSignatureName: row.client_signature_name || '',
    clientSignature: row.client_signature || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

// Guardar o actualizar una inspección
export const saveActecoInspection = async (inspection: ActecoInspection): Promise<ActecoInspection> => {
  try {
    // Generar UUID si es necesario
    let inspectionId = inspection.id;
    if (!isUUID(inspectionId)) {
      inspectionId = generateUUID();
    }

    const now = new Date().toISOString();

    // 1. Upsert en acteco_inspections
    const dbRow = {
      id: inspectionId,
      client_name: inspection.clientName,
      aviso_date: inspection.avisoDate,
      aviso_time: inspection.avisoTime,
      location: inspection.location,
      requested_by: inspection.requestedBy,
      machine_type: inspection.machineType,
      machine_brand: inspection.machineBrand,
      machine_model: inspection.machineModel,
      serial_number: inspection.serialNumber,
      license_plate: inspection.licensePlate || null,
      ot_number: inspection.otNumber || null,
      has_averia: inspection.hasAveria,
      aviso_averia: inspection.avisoAveria,
      averia_detectada: inspection.averiaDetectada,
      causa_averia: inspection.causaAveria,
      tiene_solucion: inspection.tieneSolucion,
      observaciones: inspection.observaciones,
      safety_checklist: inspection.safetyChecklist || null,
      technician_name: inspection.technicianName,
      technician_signature: inspection.technicianSignature,
      client_signature_name: inspection.clientSignatureName,
      client_signature: inspection.clientSignature,
      created_at: inspection.createdAt || now,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from('acteco_inspections')
      .upsert(dbRow);

    if (upsertError) {
      console.error('❌ Error al guardar inspección ACTECO:', upsertError);
      throw upsertError;
    }

    const storageBase = getActecoStorageBaseByInspection({
      id: inspectionId,
      clientName: inspection.clientName,
      avisoDate: inspection.avisoDate,
      location: inspection.location,
    });

    // 2. Borrar fotos y materiales existentes (se reinsertarán)
    await supabase.from('acteco_photos').delete().eq('inspection_id', inspectionId);
    await supabase.from('acteco_materials').delete().eq('inspection_id', inspectionId);

    // 3. Subir fotos generales
    const generalPhotoFields = ['photoGeneral1', 'photoGeneral2', 'photoGeneral3', 'photoGeneral4'] as const;
    for (const field of generalPhotoFields) {
      const uri = inspection[field];
      if (uri) {
        const storagePath = `${storageBase}/general/${GENERAL_PHOTO_FILE_NAMES[field]}.jpg`;
        const photoUrl = await uploadPhoto(uri, storagePath);
        if (photoUrl) {
          await supabase.from('acteco_photos').insert({
            id: generateUUID(),
            inspection_id: inspectionId,
            photo_type: 'general',
            position: field,
            photo_url: photoUrl,
          });
        }
      }
    }

    // 4. Subir fotos de avería
    if (inspection.averiaPhotos && inspection.averiaPhotos.length > 0) {
      for (let i = 0; i < inspection.averiaPhotos.length; i++) {
        const uri = inspection.averiaPhotos[i];
        if (uri) {
          const storagePath = `${storageBase}/averia/Averia_${i + 1}.jpg`;
          const photoUrl = await uploadPhoto(uri, storagePath);
          if (photoUrl) {
            await supabase.from('acteco_photos').insert({
              id: generateUUID(),
              inspection_id: inspectionId,
              photo_type: 'averia',
              position: null,
              photo_url: photoUrl,
            });
          }
        }
      }
    }

    // 5. Guardar materiales
    if (inspection.materiales && inspection.materiales.length > 0) {
      const materialRows = inspection.materiales.map(m => ({
        id: isUUID(m.id) ? m.id : generateUUID(),
        inspection_id: inspectionId,
        name: m.name,
        quantity: m.quantity,
      }));

      await supabase.from('acteco_materials').insert(materialRows);
    }

    const savedInspection = {
      ...inspection,
      id: inspectionId,
      updatedAt: now,
      createdAt: inspection.createdAt || now,
    };

    invalidateActecoCache();
    console.log('✅ Inspección guardada:', inspectionId);
    return savedInspection;
  } catch (error) {
    console.error('❌ Error al guardar inspección ACTECO:', error);
    throw error;
  }
};

// Eliminar una inspección
export const deleteActecoInspection = async (id: string): Promise<boolean> => {
  try {
    const inspection = await getActecoInspectionById(id);
    const storageBase = inspection
      ? getActecoStorageBaseByInspection({
          id: inspection.id,
          clientName: inspection.clientName,
          avisoDate: inspection.avisoDate,
          location: inspection.location,
        })
      : `urgencias/${id}`;
    const legacyStorageBase = inspection
      ? buildLegacyActecoStorageBase({
          id: inspection.id,
          clientName: inspection.clientName,
          avisoDate: inspection.avisoDate,
          location: inspection.location,
        })
      : `acteco/${id}`;

    // Borrar fotos del Storage
    await deletePhotosInFolder(storageBase);
    await deletePhotosInFolder(legacyStorageBase);
    await deletePhotosInFolder(`acteco/${id}`);

    await supabase.from('acteco_photos').delete().eq('inspection_id', id);
    await supabase.from('acteco_materials').delete().eq('inspection_id', id);

    const { error } = await supabase
      .from('acteco_inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error al eliminar inspección ACTECO:', error);
      return false;
    }

    invalidateActecoCache();
    console.log('✅ Inspección eliminada:', id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar inspección ACTECO:', error);
    return false;
  }
};

// Convertir de params (ruta) a ActecoInspection (sin cambios)
export const paramsToInspection = (params: any): ActecoInspection => {
  let materiales: Array<{ id: string; name: string; quantity: string }> = [];
  if (params.materiales) {
    try {
      materiales = typeof params.materiales === 'string' 
        ? JSON.parse(params.materiales) 
        : params.materiales;
    } catch (e) {
      console.error('Error al parsear materiales:', e);
    }
  }
  
  let averiaPhotos: string[] = [];
  if (params.averiaPhotos) {
    try {
      averiaPhotos = typeof params.averiaPhotos === 'string'
        ? JSON.parse(params.averiaPhotos)
        : Array.isArray(params.averiaPhotos)
        ? params.averiaPhotos
        : [params.averiaPhotos];
    } catch (e) {
      console.error('Error al parsear fotos de avería:', e);
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
    requestedBy: params.requestedBy || '',
    machineType: params.machineType || '',
    machineBrand: params.brand || '',
    machineModel: params.model || '',
    serialNumber: params.serialNumber || '',
    licensePlate: params.licensePlate || '',
    otNumber: params.otNumber || '',
    photoGeneral1: params.photoGeneral1 || '',
    photoGeneral2: params.photoGeneral2 || '',
    photoGeneral3: params.photoGeneral3 || '',
    photoGeneral4: params.photoGeneral4 || '',
    hasAveria: params.hasAveria === 'true' || params.hasAveria === true,
    avisoAveria: params.avisoAveria || '',
    averiaDetectada: params.averiaDetectada || '',
    causaAveria: params.causaAveria || '',
    averiaPhotos: averiaPhotos,
    tieneSolucion: params.tieneSolucion === 'true' || params.tieneSolucion === true,
    observaciones: params.observaciones || '',
    safetyChecklist,
    materiales: materiales,
    technicianName: params.technicianName || '',
    technicianSignature: params.technicianSignature || '',
    clientSignatureName: params.clientSignatureName || '',
    clientSignature: params.clientSignature || '',
    createdAt: params.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Convertir de ActecoInspection a params (para navegación) (sin cambios)
export const inspectionToParams = (inspection: ActecoInspection): any => {
  return {
    inspectionId: inspection.id,
    clientName: inspection.clientName,
    avisoDate: inspection.avisoDate,
    avisoTime: inspection.avisoTime,
    location: inspection.location,
    requestedBy: inspection.requestedBy,
    machineType: inspection.machineType,
    brand: inspection.machineBrand,
    model: inspection.machineModel,
    serialNumber: inspection.serialNumber,
    licensePlate: inspection.licensePlate || '',
    otNumber: inspection.otNumber || '',
    photoGeneral1: inspection.photoGeneral1 || '',
    photoGeneral2: inspection.photoGeneral2 || '',
    photoGeneral3: inspection.photoGeneral3 || '',
    photoGeneral4: inspection.photoGeneral4 || '',
    hasAveria: inspection.hasAveria ? 'true' : 'false',
    avisoAveria: inspection.avisoAveria,
    averiaDetectada: inspection.averiaDetectada,
    causaAveria: inspection.causaAveria,
    averiaPhotos: JSON.stringify(inspection.averiaPhotos),
    tieneSolucion: inspection.tieneSolucion ? 'true' : 'false',
    observaciones: inspection.observaciones,
    safetyChecklist: inspection.safetyChecklist ? JSON.stringify(inspection.safetyChecklist) : '',
    materiales: JSON.stringify(inspection.materiales),
    technicianName: inspection.technicianName,
    technicianSignature: inspection.technicianSignature,
    clientSignatureName: inspection.clientSignatureName,
    clientSignature: inspection.clientSignature,
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt
  };
};

// Migración de AsyncStorage a Supabase
export const migrateActecoFromAsyncStorage = async (): Promise<boolean> => {
  try {
    const inspectionsJson = await AsyncStorage.getItem(LEGACY_KEY);
    if (!inspectionsJson) {
      console.log('No hay inspecciones ACTECO legacy para migrar');
      return true;
    }

    const legacyInspections: ActecoInspection[] = JSON.parse(inspectionsJson);
    if (legacyInspections.length === 0) return true;

    console.log(`🔄 Migrando ${legacyInspections.length} inspecciones ACTECO...`);

    for (const inspection of legacyInspections) {
      await saveActecoInspection(inspection);
      console.log(`✅ Inspección ACTECO migrada: ${inspection.id}`);
    }

    await AsyncStorage.removeItem(LEGACY_KEY);
    console.log('🎉 Migración ACTECO completada');
    return true;
  } catch (error) {
    console.error('❌ Error en migración ACTECO:', error);
    return false;
  }
};

export default {
  getActecoInspections,
  getActecoInspectionById,
  saveActecoInspection,
  deleteActecoInspection,
  paramsToInspection,
  inspectionToParams,
  migrateActecoFromAsyncStorage,
};
