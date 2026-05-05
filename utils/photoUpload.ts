import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'inspection-photos';
const MAX_SEGMENT_LENGTH = 50;
const MAX_BASE_SEGMENT_LENGTH = 60;

const truncateSegment = (value: string, maxLength: number = MAX_SEGMENT_LENGTH): string => {
  if (!value) return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const normalizeDateSegment = (value?: string): string => {
  if (!value) return 'sin_fecha';

  const normalized = value
    .replace(/[.:]/g, '-')
    .replace(/[T]/g, '_')
    .replace(/[Z]/g, '')
    .trim();

  const sanitized = sanitizePathSegment(normalized, 20);
  return sanitized || 'sin_fecha';
};

const buildShortId = (value?: string): string => {
  const sanitized = sanitizePathSegment(value || '', 12).replace(/_/g, '');
  return sanitized.slice(0, 8) || 'sin_id';
};

export const buildRecordStorageSuffix = (id?: string, fallback?: string): string => {
  const recordId = buildShortId(id);
  if (recordId !== 'sin_id') return recordId;
  return buildShortId(fallback);
};

export const sanitizePathSegment = (value: string, maxLength: number = MAX_SEGMENT_LENGTH): string => {
  if (!value) return '';

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[_-]+|[_-]+$/g, '');

  return truncateSegment(normalized, maxLength) || 'sin_dato';
};

export const buildMachineStorageBase = (machine: {
  clientName?: string;
  date?: string;
  machineType?: string;
  licensePlate?: string;
  serialNumber?: string;
  id?: string;
}): string => {
  const client = sanitizePathSegment(machine.clientName || 'cliente', MAX_BASE_SEGMENT_LENGTH);
  const licensePlate = sanitizePathSegment(machine.licensePlate || 'sin_matricula', 30);
  const record = buildRecordStorageSuffix(machine.id, machine.date);

  return `inspecciones/${client}_${licensePlate}_${record}`;
};

export const buildLegacyMachineStorageBase = (machine: {
  clientName?: string;
  date?: string;
  machineType?: string;
  licensePlate?: string;
  serialNumber?: string;
  id?: string;
}): string => {
  const client = sanitizePathSegment(machine.clientName || 'cliente', 40);
  const machineType = sanitizePathSegment(
    machine.machineType || machine.licensePlate || machine.serialNumber || 'maquina',
    30,
  );
  const date = normalizeDateSegment(machine.date);
  const shortId = buildShortId(machine.id);

  return `machines/${client}_${machineType}_${date}_${shortId}`;
};

export const buildActecoStorageBase = (inspection: {
  clientName?: string;
  avisoDate?: string;
  location?: string;
  id?: string;
}): string => {
  const location = sanitizePathSegment(inspection.location || 'sin_ubicacion', MAX_BASE_SEGMENT_LENGTH);
  const date = normalizeDateSegment(inspection.avisoDate);
  const record = buildRecordStorageSuffix(inspection.id, inspection.avisoDate);

  return `urgencias/${location}_${date}_${record}`;
};

export const buildAveriasStorageBase = (inspection: {
  clientName?: string;
  avisoDate?: string;
  location?: string;
  id?: string;
}): string => {
  const location = sanitizePathSegment(inspection.location || 'sin_ubicacion', MAX_BASE_SEGMENT_LENGTH);
  const date = normalizeDateSegment(inspection.avisoDate);
  const record = buildRecordStorageSuffix(inspection.id, inspection.avisoDate);

  return `averias/${location}_${date}_${record}`;
};

export const buildLegacyActecoStorageBase = (inspection: {
  clientName?: string;
  avisoDate?: string;
  location?: string;
  id?: string;
}): string => {
  const client = sanitizePathSegment(inspection.clientName || 'cliente', 40);
  const date = normalizeDateSegment(inspection.avisoDate);
  const shortId = buildShortId(inspection.id);

  return `acteco/${client}_URGENCIAS_${date}_${shortId}`;
};

// Subir una foto desde URI local a Supabase Storage
export const uploadPhoto = async (localUri: string, storagePath: string): Promise<string | null> => {
  try {
    if (!localUri || localUri.startsWith('http')) return localUri;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPhoto:', error);
    return null;
  }
};

// Borrar una foto de Storage
export const deletePhoto = async (storagePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);
    return !error;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
};

const listAllFiles = async (folderPath: string): Promise<string[]> => {
  const collectedPaths: string[] = [];
  const pendingFolders: string[] = [folderPath];

  while (pendingFolders.length > 0) {
    const currentFolder = pendingFolders.pop();
    if (!currentFolder) continue;

    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(currentFolder);

    if (error) {
      console.error('Error listing folder:', error);
      continue;
    }

    for (const file of files || []) {
      const itemPath = `${currentFolder}/${file.name}`;
      if ((file as any).id) {
        collectedPaths.push(itemPath);
      } else {
        pendingFolders.push(itemPath);
      }
    }
  }

  return collectedPaths;
};

// Borrar todas las fotos de un directorio (incluyendo subcarpetas)
export const deletePhotosInFolder = async (folderPath: string): Promise<boolean> => {
  try {
    const paths = await listAllFiles(folderPath);

    if (paths.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) {
        console.error('Error deleting folder files:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
};
