import AsyncStorage from '@react-native-async-storage/async-storage';

// Definir tipos
export type ActecoMaterial = {
  cantidad: string;
  material: string;
};

export type ActecoReport = {
  id: string;
  cliente: string;
  fecha: string;
  horaAviso: string;
  ubicacion: string;
  pedidoPor: string;
  tipoMaquina: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  fotoGeneral?: string;
  averiaDetectada?: string;
  causaAveria?: string;
  fotoAveria?: string;
  tieneSolucion?: boolean;
  observaciones?: string;
  materiales?: ActecoMaterial[];
  createdAt: string;
};

const ACTECO_KEY = 'actecoReports';

export const getActecoReports = async (): Promise<ActecoReport[]> => {
  try {
    const reportsJson = await AsyncStorage.getItem(ACTECO_KEY);
    if (!reportsJson) {
      return [];
    }
    return JSON.parse(reportsJson);
  } catch (error) {
    console.error('Error al obtener informes ACTECO:', error);
    return [];
  }
};

export const getActecoReportById = async (reportId: string): Promise<ActecoReport | null> => {
  try {
    const reports = await getActecoReports();
    const report = reports.find(r => r.id === reportId);
    return report || null;
  } catch (error) {
    console.error('Error al obtener informe ACTECO:', error);
    return null;
  }
};

export const saveActecoReport = async (report: ActecoReport): Promise<ActecoReport> => {
  try {
    const reports = await getActecoReports();
    
    const existingIndex = reports.findIndex(r => r.id === report.id);
    
    const reportWithTimestamp = {
      ...report,
      createdAt: report.createdAt || new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      reports[existingIndex] = reportWithTimestamp;
    } else {
      reports.push(reportWithTimestamp);
    }
    
    await AsyncStorage.setItem(ACTECO_KEY, JSON.stringify(reports));
    return reportWithTimestamp;
  } catch (error) {
    console.error('Error al guardar informe ACTECO:', error);
    throw error;
  }
};

export const updateActecoReport = async (reportId: string, updates: Partial<ActecoReport>): Promise<boolean> => {
  try {
    const reports = await getActecoReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    
    if (reportIndex >= 0) {
      reports[reportIndex] = { ...reports[reportIndex], ...updates };
      await AsyncStorage.setItem(ACTECO_KEY, JSON.stringify(reports));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al actualizar informe ACTECO:', error);
    return false;
  }
};

export const deleteActecoReport = async (reportId: string): Promise<boolean> => {
  try {
    const reports = await getActecoReports();
    const filteredReports = reports.filter(r => r.id !== reportId);
    await AsyncStorage.setItem(ACTECO_KEY, JSON.stringify(filteredReports));
    return true;
  } catch (error) {
    console.error('Error al eliminar informe ACTECO:', error);
    return false;
  }
};

// Export por defecto (opcional, para compatibilidad)
const actecoStorage = {
  getActecoReports,
  getActecoReportById,
  saveActecoReport,
  updateActecoReport,
  deleteActecoReport,
};

export default actecoStorage;