import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Importar las imágenes de forma estática
// Estas deben coincidir con tus archivos en assets/images/
const IMAGES = {
  'images/logo-inval.png': require('../../assets/images/logo-inval'),
  'images/watermark-inval.png': require('../../assets/images/watermark-inval'),
  'images/footer-logo.png': require('../../assets/images/footer-logo'),
};

/**
 * Convierte una imagen local (de assets) a base64
 * @param assetPath - Ruta relativa desde assets, ejemplo: 'images/logo-inval.png'
 * @returns string en formato data:image/...;base64,...
 */
export const loadLocalImageAsBase64 = async (assetPath: string): Promise<string> => {
  try {
    // Obtener la imagen del mapa estático
    const imageModule = IMAGES[assetPath as keyof typeof IMAGES];
    
    if (!imageModule) {
      console.warn(`No se encontró la imagen: ${assetPath}`);
      console.warn('Imágenes disponibles:', Object.keys(IMAGES));
      return '';
    }

    // Cargar el asset
    const asset = Asset.fromModule(imageModule);
    await asset.downloadAsync();
    
    if (!asset.localUri) {
      console.warn(`No se pudo cargar la imagen: ${assetPath}`);
      return '';
    }

    // Leer el archivo como base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Determinar el tipo MIME según la extensión
    const extension = assetPath.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png';
    
    if (extension === 'jpg' || extension === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (extension === 'png') {
      mimeType = 'image/png';
    } else if (extension === 'gif') {
      mimeType = 'image/gif';
    }

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error al cargar imagen local ${assetPath}:`, error);
    return '';
  }
};

/**
 * Carga múltiples imágenes locales a la vez
 * @param assetPaths - Array de rutas relativas
 * @returns Objeto con las imágenes en base64
 */
export const loadMultipleLocalImages = async (
  assetPaths: { [key: string]: string }
): Promise<{ [key: string]: string }> => {
  const result: { [key: string]: string } = {};
  
  for (const [key, path] of Object.entries(assetPaths)) {
    result[key] = await loadLocalImageAsBase64(path);
  }
  
  return result;
};

export default {
  loadLocalImageAsBase64,
  loadMultipleLocalImages,
};