import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces para tipos
export interface Machine {
  id: string;
  name: string;
  machineType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  licensePlate?: string;
  clientName: string;
  clientType?: string;
  location?: string;
  reviewedBy?: string;
  date: string;
  notes?: string;
  commentsWithPhotos?: CommentWithPhoto[]; // Nuevo campo para comentarios con fotos
}

// Nueva interfaz para comentarios con fotos
export interface CommentWithPhoto {
  id: string;
  text: string;
  photoUri: string | null;
}

// Interfaz para fotos con comentarios del checklist
export interface ChecklistPhotoWithComment {
  uri: string;
  comment?: string;
}

export type ChecklistPhoto = string | string[] | ChecklistPhotoWithComment[];

export interface ChecklistData {
  machineId: string;
  results: { [key: string]: string };
  photos: { [key: string]: ChecklistPhoto };
  completedAt: string;
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

// Claves para los diferentes tipos de datos
const KEYS = {
  MACHINES: 'machines',
  CHECKLISTS: 'checklists',
  GENERAL_PHOTOS: 'generalPhotos',
};

// Función para obtener todas las máquinas
export const getMachines = async (): Promise<Machine[]> => {
  try {
    const machinesJson = await AsyncStorage.getItem(KEYS.MACHINES);
    if (!machinesJson) {
      console.log('No hay máquinas guardadas');
      return [];
    }
    const machines = JSON.parse(machinesJson);
    console.log(`Se encontraron ${machines.length} máquinas`);
    return machines;
  } catch (error) {
    console.error('Error al obtener máquinas:', error);
    return [];
  }
};

// Función para obtener una máquina por ID
export const getMachineById = async (machineId: string): Promise<Machine | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }
    
    console.log(`Buscando máquina con ID: ${machineId}`);
    const machines = await getMachines();
    const machine = machines.find(m => m.id === machineId);
    
    if (machine) {
      console.log('Máquina encontrada:', machine);
      return machine;
    } else {
      console.log('Máquina no encontrada');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener máquina por ID:', error);
    return null;
  }
};

// Función para guardar una nueva máquina
export const saveMachine = async (machineData: Machine): Promise<Machine> => {
  try {
    const machines = await getMachines();
    
    const existingIndex = machines.findIndex(m => m.id === machineData.id);
    
    if (existingIndex >= 0) {
      console.log(`Actualizando máquina existente con ID: ${machineData.id}`);
      machines[existingIndex] = machineData;
    } else {
      console.log(`Añadiendo nueva máquina con ID: ${machineData.id}`);
      machines.push(machineData);
    }
    
    await AsyncStorage.setItem(KEYS.MACHINES, JSON.stringify(machines));
    console.log('Máquina guardada exitosamente:', machineData);
    return machineData;
  } catch (error) {
    console.error('Error al guardar máquina:', error);
    throw error;
  }
};

// Función para guardar comentarios de una máquina (actualizada)
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
    const machines = await getMachines();
    const machineIndex = machines.findIndex(m => m.id === machineId);
    
    if (machineIndex >= 0) {
      machines[machineIndex].notes = comments;
      if (commentsWithPhotos) {
        machines[machineIndex].commentsWithPhotos = commentsWithPhotos;
      }
      await AsyncStorage.setItem(KEYS.MACHINES, JSON.stringify(machines));
      console.log('Comentarios guardados exitosamente');
      return true;
    } else {
      console.error('Máquina no encontrada');
      return false;
    }
  } catch (error) {
    console.error('Error al guardar comentarios:', error);
    return false;
  }
};

// Función para eliminar una máquina
export const deleteMachine = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Iniciando eliminación de máquina con ID: ${machineId}`);
    
    const machines = await getMachines();
    
    const machineExists = machines.some(m => m.id === machineId);
    if (!machineExists) {
      console.error(`No se encontró máquina con ID: ${machineId}`);
      return false;
    }
    
    const filteredMachines = machines.filter(m => m.id !== machineId);
    await AsyncStorage.setItem(KEYS.MACHINES, JSON.stringify(filteredMachines));
    console.log(`Máquina eliminada de la lista principal`);
    
    await deleteChecklistByMachineId(machineId);
    console.log(`Checklist asociado eliminado`);
    
    await deleteGeneralPhotosByMachineId(machineId);
    console.log(`Fotos generales asociadas eliminadas`);
    
    console.log(`Máquina con ID ${machineId} eliminada correctamente`);
    return true;
  } catch (error) {
    console.error('Error al eliminar máquina:', error);
    return false;
  }
};

// Función para obtener el checklist de una máquina
export const getChecklistByMachineId = async (machineId: string): Promise<ChecklistData | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }
    
    console.log(`Buscando checklist para máquina con ID: ${machineId}`);
    const checklistsJson = await AsyncStorage.getItem(KEYS.CHECKLISTS);
    
    if (!checklistsJson) {
      console.log('No hay checklists guardados');
      return null;
    }
    
    const checklists = JSON.parse(checklistsJson);
    const checklist = checklists.find((c: ChecklistData) => c.machineId === machineId);
    
    if (checklist) {
      console.log('Checklist encontrado');
      
      if (checklist.photos) {
        const migratedPhotos: { [key: string]: ChecklistPhoto } = {};
        
        Object.entries(checklist.photos).forEach(([itemId, photoData]) => {
          if (Array.isArray(photoData)) {
            if (photoData.length > 0 && typeof photoData[0] === 'object') {
              migratedPhotos[itemId] = photoData;
            } else {
              migratedPhotos[itemId] = (photoData as string[]).map(uri => ({ uri }));
            }
          } else if (typeof photoData === 'string') {
            migratedPhotos[itemId] = [{ uri: photoData }];
          }
        });
        
        checklist.photos = migratedPhotos;
      }
      
      return checklist;
    } else {
      console.log('No se encontró checklist para esta máquina');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener checklist:', error);
    return null;
  }
};

// Función para guardar un checklist
export const saveChecklist = async (checklistData: ChecklistData): Promise<ChecklistData> => {
  try {
    if (!checklistData.machineId) {
      console.error('ID de máquina no proporcionado en el checklist');
      throw new Error('ID de máquina requerido');
    }
    
    console.log(`Guardando checklist para máquina con ID: ${checklistData.machineId}`);
    const checklistsJson = await AsyncStorage.getItem(KEYS.CHECKLISTS);
    const checklists = checklistsJson ? JSON.parse(checklistsJson) : [];
    
    const existingIndex = checklists.findIndex((c: ChecklistData) => c.machineId === checklistData.machineId);
    
    if (existingIndex >= 0) {
      console.log('Actualizando checklist existente');
      checklists[existingIndex] = checklistData;
    } else {
      console.log('Añadiendo nuevo checklist');
      checklists.push(checklistData);
    }
    
    await AsyncStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(checklists));
    console.log('Checklist guardado exitosamente');
    return checklistData;
  } catch (error) {
    console.error('Error al guardar checklist:', error);
    throw error;
  }
};

// Función para eliminar el checklist de una máquina
export const deleteChecklistByMachineId = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Eliminando checklist para máquina con ID: ${machineId}`);
    const checklistsJson = await AsyncStorage.getItem(KEYS.CHECKLISTS);
    
    if (checklistsJson) {
      const checklists = JSON.parse(checklistsJson);
      const updatedChecklists = checklists.filter((c: ChecklistData) => c.machineId !== machineId);
      await AsyncStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(updatedChecklists));
      console.log('Checklist eliminado exitosamente');
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar checklist:', error);
    return false;
  }
};

// Función para obtener fotos generales de una máquina
export const getGeneralPhotosByMachineId = async (machineId: string): Promise<GeneralPhotosData | null> => {
  try {
    if (!machineId) {
      console.error('ID de máquina no proporcionado');
      return null;
    }
    
    console.log(`Buscando fotos generales para máquina con ID: ${machineId}`);
    const photosJson = await AsyncStorage.getItem(KEYS.GENERAL_PHOTOS);
    
    if (!photosJson) {
      console.log('No hay fotos generales guardadas');
      return null;
    }
    
    const photos = JSON.parse(photosJson);
    const machinePhotos = photos.find((p: GeneralPhotosData) => p.machineId === machineId);
    
    if (machinePhotos) {
      console.log('Fotos generales encontradas');
      return machinePhotos;
    } else {
      console.log('No se encontraron fotos generales para esta máquina');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener fotos generales:', error);
    return null;
  }
};

// Función para guardar fotos generales
export const saveGeneralPhotos = async (photosData: GeneralPhotosData): Promise<GeneralPhotosData> => {
  try {
    if (!photosData.machineId) {
      console.error('ID de máquina no proporcionado en los datos de fotos');
      throw new Error('ID de máquina requerido');
    }
    
    console.log(`Guardando fotos generales para máquina con ID: ${photosData.machineId}`);
    const photosJson = await AsyncStorage.getItem(KEYS.GENERAL_PHOTOS);
    const photos = photosJson ? JSON.parse(photosJson) : [];
    
    const existingIndex = photos.findIndex((p: GeneralPhotosData) => p.machineId === photosData.machineId);
    
    if (existingIndex >= 0) {
      console.log('Actualizando fotos generales existentes');
      photos[existingIndex] = photosData;
    } else {
      console.log('Añadiendo nuevas fotos generales');
      photos.push(photosData);
    }
    
    await AsyncStorage.setItem(KEYS.GENERAL_PHOTOS, JSON.stringify(photos));
    console.log('Fotos generales guardadas exitosamente');
    return photosData;
  } catch (error) {
    console.error('Error al guardar fotos generales:', error);
    throw error;
  }
};

// Función para eliminar fotos generales de una máquina
export const deleteGeneralPhotosByMachineId = async (machineId: string): Promise<boolean> => {
  try {
    console.log(`Eliminando fotos generales para máquina con ID: ${machineId}`);
    const photosJson = await AsyncStorage.getItem(KEYS.GENERAL_PHOTOS);
    
    if (photosJson) {
      const photos = JSON.parse(photosJson);
      const updatedPhotos = photos.filter((p: GeneralPhotosData) => p.machineId !== machineId);
      await AsyncStorage.setItem(KEYS.GENERAL_PHOTOS, JSON.stringify(updatedPhotos));
      console.log('Fotos generales eliminadas exitosamente');
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar fotos generales:', error);
    return false;
  }
};

// Función para limpiar todos los datos de la aplicación
export const clearAllData = async (): Promise<boolean> => {
  try {
    console.log('Limpiando todos los datos de la aplicación');
    await AsyncStorage.removeItem(KEYS.MACHINES);
    await AsyncStorage.removeItem(KEYS.CHECKLISTS);
    await AsyncStorage.removeItem(KEYS.GENERAL_PHOTOS);
    console.log('Datos limpiados exitosamente');
    return true;
  } catch (error) {
    console.error('Error al limpiar todos los datos:', error);
    return false;
  }
};

// Exportar todas las funciones y constantes
export default {
  KEYS,
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
  clearAllData,
};