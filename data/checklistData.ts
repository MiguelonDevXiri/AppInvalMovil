// Definir interfaces para los tipos
export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

// Lista de categorías e ítems para el checklist de inspección
const checklistData: ChecklistCategory[] = [
  {
    category: 'Estado General',
    items: [
      { id: 'gen1', text: 'Aspecto general y limpieza' },
      { id: 'gen2', text: 'Estructura y carcasa' },
      { id: 'gen3', text: 'Pintura y acabados' },
      { id: 'gen4', text: 'Etiquetas y placas de identificación' },
    ]
  },
  {
    category: 'Sistema Eléctrico',
    items: [
      { id: 'elec1', text: 'Cables y conexiones' },
      { id: 'elec2', text: 'Panel de control' },
      { id: 'elec3', text: 'Luces indicadoras' },
      { id: 'elec4', text: 'Interruptores y botones' },
      { id: 'elec5', text: 'Toma de corriente y enchufe' },
    ]
  },
  {
    category: 'Sistema Mecánico',
    items: [
      { id: 'mec1', text: 'Motor y transmisión' },
      { id: 'mec2', text: 'Correas y cadenas' },
      { id: 'mec3', text: 'Rodamientos y cojinetes' },
      { id: 'mec4', text: 'Engranajes y poleas' },
      { id: 'mec5', text: 'Sistema de lubricación' },
    ]
  },
  {
    category: 'Seguridad',
    items: [
      { id: 'seg1', text: 'Protecciones y guardas' },
      { id: 'seg2', text: 'Botón de emergencia' },
      { id: 'seg3', text: 'Señalización de riesgos' },
      { id: 'seg4', text: 'Sistemas anti-atrapamiento' },
    ]
  },
  {
    category: 'Funcionalidad',
    items: [
      { id: 'func1', text: 'Encendido y apagado' },
      { id: 'func2', text: 'Operación en vacío' },
      { id: 'func3', text: 'Operación con carga' },
      { id: 'func4', text: 'Velocidades y ajustes' },
      { id: 'func5', text: 'Ruido y vibraciones' },
    ]
  },
  {
    category: 'Accesorios y Complementos',
    items: [
      { id: 'acc1', text: 'Herramientas incluidas' },
      { id: 'acc2', text: 'Accesorios adicionales' },
      { id: 'acc3', text: 'Manuales y documentación' },
    ]
  }
];

export default checklistData;