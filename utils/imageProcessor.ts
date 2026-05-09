/**
 * Módulo compartido de procesamiento de imágenes para PDFs.
 * 
 * Optimizaciones:
 * - Procesamiento en paralelo con concurrencia limitada (3 a la vez)
 * - Tamaños reducidos adaptados al PDF A4
 * - Limpieza automática de archivos temporales
 * - Compresión optimizada
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const PLACEHOLDER_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQAAAACFI5MzAAAAA1BMVEXk5+pYdT3IAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAFUlEQVRIie3BAQEAAACAkP6v7ggKAAAuAAGfAAEkOuFjAAAAAElFTkSuQmCC';

/** Máximo de imágenes procesándose a la vez */
const CONCURRENCY = 3;

/** Ancho por defecto para fotos de evidencia en checklist */
export const WIDTH_EVIDENCE = 200;
/** Ancho por defecto para fotos generales */
export const WIDTH_GENERAL = 280;
/** Ancho por defecto para thumbnails pequeños */
export const WIDTH_THUMBNAIL = 250;

const isRemoteUri = (uri: string): boolean =>
  uri.startsWith('http://') || uri.startsWith('https://');

/**
 * Si la URI es remota, la descarga a un archivo local temporal.
 */
const ensureLocal = async (uri: string): Promise<string> => {
  if (!uri || !isRemoteUri(uri)) return uri;
  const target = `${FileSystem.cacheDirectory}img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const result = await FileSystem.downloadAsync(uri, target);
  return result.uri;
};

/**
 * Convierte una imagen a base64 data-URI, redimensionada y comprimida.
 * Limpia el archivo temporal del resize.
 */
export const imageToBase64 = async (
  uri: string,
  maxWidth: number = WIDTH_EVIDENCE,
  compress: number = 0.35,
): Promise<string> => {
  if (!uri) return PLACEHOLDER_BASE64;
  try {
    const localUri = await ensureLocal(uri);
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return PLACEHOLDER_BASE64;

    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG },
    );

    const base64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Limpiar archivo temporal del resize
    FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => {});
    // Si descargamos un remoto, limpiar también
    if (isRemoteUri(uri) && localUri !== uri) {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen a base64:', error);
    return PLACEHOLDER_BASE64;
  }
};

/**
 * Procesa un array de URIs en paralelo con concurrencia limitada.
 * Mucho más rápido que hacerlo secuencial cuando hay muchas fotos.
 */
export const processImagesParallel = async (
  uris: string[],
  maxWidth: number = WIDTH_EVIDENCE,
  compress: number = 0.35,
): Promise<string[]> => {
  if (!uris.length) return [];

  const results: string[] = new Array(uris.length).fill('');
  let cursor = 0;

  const worker = async () => {
    while (cursor < uris.length) {
      const idx = cursor++;
      const uri = uris[idx];
      if (!uri) { results[idx] = ''; continue; }
      results[idx] = await imageToBase64(uri, maxWidth, compress).catch(() => '');
    }
  };

  // Lanzar N workers en paralelo
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, uris.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
};

/**
 * Placeholder base64 para cuando no hay imagen.
 */
export const getPlaceholderBase64 = (): string => PLACEHOLDER_BASE64;
