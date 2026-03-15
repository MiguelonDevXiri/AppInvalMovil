import AsyncStorage from '@react-native-async-storage/async-storage';

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
  materiales: Array<{ id: string; name: string; quantity: string }>;
  technicianName: string;
  technicianSignature: string;
  clientSignatureName: string;
  clientSignature: string;
  createdAt: string;
  updatedAt: string;
}

const ACTECO_INSPECTIONS_KEY = 'actecoInspections';

// Obtener todas las inspecciones
export const getActecoInspections = async (): Promise<ActecoInspection[]> => {
  try {
    const inspectionsJson = await AsyncStorage.getItem(ACTECO_INSPECTIONS_KEY);
    if (!inspectionsJson) {
      return [];
    }
    return JSON.parse(inspectionsJson);
  } catch (error) {
    console.error('Error al obtener inspecciones ACTECO:', error);
    return [];
  }
};

// Obtener una inspección por ID
export const getActecoInspectionById = async (id: string): Promise<ActecoInspection | null> => {
  try {
    const inspections = await getActecoInspections();
    const inspection = inspections.find(i => i.id === id);
    return inspection || null;
  } catch (error) {
    console.error('Error al obtener inspección ACTECO:', error);
    return null;
  }
};

// Guardar o actualizar una inspección
export const saveActecoInspection = async (inspection: ActecoInspection): Promise<ActecoInspection> => {
  try {
    const inspections = await getActecoInspections();
    
    const existingIndex = inspections.findIndex(i => i.id === inspection.id);
    
    const inspectionWithTimestamp = {
      ...inspection,
      updatedAt: new Date().toISOString(),
      createdAt: inspection.createdAt || new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Actualizar existente
      inspections[existingIndex] = inspectionWithTimestamp;
      console.log('✅ Inspección actualizada:', inspection.id);
    } else {
      // Crear nueva
      inspections.push(inspectionWithTimestamp);
      console.log('✅ Inspección creada:', inspection.id);
    }
    
    await AsyncStorage.setItem(ACTECO_INSPECTIONS_KEY, JSON.stringify(inspections));
    return inspectionWithTimestamp;
  } catch (error) {
    console.error('❌ Error al guardar inspección ACTECO:', error);
    throw error;
  }
};

// Eliminar una inspección
export const deleteActecoInspection = async (id: string): Promise<boolean> => {
  try {
    const inspections = await getActecoInspections();
    const filteredInspections = inspections.filter(i => i.id !== id);
    await AsyncStorage.setItem(ACTECO_INSPECTIONS_KEY, JSON.stringify(filteredInspections));
    console.log('✅ Inspección eliminada:', id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar inspección ACTECO:', error);
    return false;
  }
};

// Convertir de params (ruta) a ActecoInspection
export const paramsToInspection = (params: any): ActecoInspection => {
  // Parsear materiales si viene como string
  let materiales = [];
  if (params.materiales) {
    try {
      materiales = typeof params.materiales === 'string' 
        ? JSON.parse(params.materiales) 
        : params.materiales;
    } catch (e) {
      console.error('Error al parsear materiales:', e);
    }
  }
  
  // Parsear fotos de avería si viene como string
  let averiaPhotos = [];
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
    materiales: materiales,
    technicianName: params.technicianName || '',
    technicianSignature: params.technicianSignature || '',
    clientSignatureName: params.clientSignatureName || '',
    clientSignature: params.clientSignature || '',
    createdAt: params.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Convertir de ActecoInspection a params (para navegación)
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
    materiales: JSON.stringify(inspection.materiales),
    technicianName: inspection.technicianName,
    technicianSignature: inspection.technicianSignature,
    clientSignatureName: inspection.clientSignatureName,
    clientSignature: inspection.clientSignature,
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt
  };
};

export default {
  getActecoInspections,
  getActecoInspectionById,
  saveActecoInspection,
  deleteActecoInspection,
  paramsToInspection,
  inspectionToParams
};