
export interface MachineType {
  id: string;
  name: string;
}

// Definir los tipos de máquinas disponibles
export const MACHINE_TYPES: MachineType[] = [
  {
    id: 'autocompactador',
    name: 'Autocompactadores'
  },
  {
    id: 'volteador',
    name: 'Volteadores'
  },
  {
    id: 'rotoprensa',
    name: 'Rotoprensas'
  },
  {
    id: 'compactador-estatico',
    name: 'Compactador Estático'
  },
  {
    id: 'contenedor',
    name: 'Contenedores'
  },
  {
    id: 'caja-estatica',
    name: 'Caja Estática'
  },
  {
    id: 'prensa-vertical',
    name: 'Prensa Vertical'
  },
  {
    id: 'otros',
    name: 'Otros'
  }
];

// Función para obtener un tipo de máquina por ID
export const getMachineTypeById = (id: string): MachineType => {
  const foundType = MACHINE_TYPES.find(type => type.id === id);
  return foundType || MACHINE_TYPES[MACHINE_TYPES.length - 1]; // Devuelve 'otros' si no encuentra
};

export default {
  MACHINE_TYPES,
  getMachineTypeById
};