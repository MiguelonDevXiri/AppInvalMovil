import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://automisabackend-production.up.railway.app';
const TOKEN_KEY = 'automisa_jwt_token';
const COMPANY_KEY = 'automisa_company_name';

// Mock data for testing before backend is ready
const MOCK_MODE = true;

const MOCK_INSPECTIONS = [
  {
    wo_id: 'WO-2026-0001',
    machine_type: 'autocompactador',
    machine_name: 'AC Mediterráneo Basura',
    license_plate: 'AC-V3471',
    location: 'Polígono Fuente del Jarro, Paterna',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'assigned',
    is_overdue: false,
  },
  {
    wo_id: 'WO-2026-0002',
    machine_type: 'compactador-estatico',
    machine_name: 'CE Valencia Centro',
    license_plate: 'CE-V1102',
    location: 'Centro Comercial Aqua, Valencia',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'assigned',
    is_overdue: false,
  },
  {
    wo_id: 'WO-2026-0003',
    machine_type: 'prensa-vertical',
    machine_name: 'PV Almacén Norte',
    license_plate: 'PV-V5501',
    location: 'Nave Industrial Riba-roja',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'in_progress',
    is_overdue: false,
  },
  {
    wo_id: 'WO-2026-0004',
    machine_type: 'autocompactador',
    machine_name: 'AC Getafe Basura',
    license_plate: 'AC-V8821',
    location: 'Mercadona Getafe',
    scheduled_date: '2026-02-20',
    status: 'assigned',
    is_overdue: true,
  },
];

// Real checklist templates matching the backend (same as machineChecklists.ts)
const MOCK_CHECKLIST_TEMPLATES: Record<string, { machine_type: string; version: number; categories: { category: string; items: { id: string; text: string }[] }[] }> = {
  autocompactador: {
    machine_type: 'autocompactador',
    version: 1,
    categories: [
      {
        category: 'General',
        items: [
          { id: 'auto_gen1', text: 'Estado gancho delantero' },
          { id: 'auto_gen2', text: 'Estado gancho trasero' },
          { id: 'auto_gen3', text: 'Estado suelo' },
          { id: 'auto_gen4', text: 'Estado vigas' },
          { id: 'auto_gen5', text: 'Estado rodillos traseros' },
          { id: 'auto_gen6', text: 'Estado rodillos delanteros' },
          { id: 'auto_gen7', text: 'Estado carraca cierre puerta descarga' },
          { id: 'auto_gen8', text: 'Estado uñas cierre puerta descarga' },
          { id: 'auto_gen9', text: 'Estado chapa y pintura (agujeros en chapa)' },
          { id: 'auto_gen10', text: 'Estado toldo/tapa tolva' },
          { id: 'auto_gen11', text: 'Pegatinas riesgo eléctrico' },
          { id: 'auto_gen12', text: 'Pegatina inval' },
          { id: 'auto_gen13', text: 'Pegatinas seguridad' },
          { id: 'auto_gen14', text: 'Estado plato prensor' },
          { id: 'auto_gen15', text: 'Estado protecciones botoneras' },
        ],
      },
      {
        category: 'Electricidad',
        items: [
          { id: 'auto_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
          { id: 'auto_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
          { id: 'auto_elec3', text: 'Estado conexión mando muelle' },
          { id: 'auto_elec4', text: 'Estado clavija inversora' },
          { id: 'auto_elec5', text: 'Estado seccionador candable' },
          { id: 'auto_elec6', text: 'Funcionamiento correcto de la máquina' },
          { id: 'auto_elec7', text: '¿La máquina para sola?' },
          { id: 'auto_elec8', text: 'Estado fotocélulas' },
          { id: 'auto_elec9', text: 'Funciona la luz de lleno' },
        ],
      },
      {
        category: 'Hidráulica',
        items: [
          { id: 'auto_hidr1', text: '¿Hay fugas de aceite?' },
          { id: 'auto_hidr2', text: 'Estado cilindros' },
          { id: 'auto_hidr3', text: 'Estado válvula inversora' },
          { id: 'auto_hidr4', text: '¿Hace el cambio bien?' },
          { id: 'auto_hidr5', text: '¿Las presiones son correctas?' },
        ],
      },
    ],
  },
  'compactador-estatico': {
    machine_type: 'compactador-estatico',
    version: 1,
    categories: [
      {
        category: 'General',
        items: [
          { id: 'comp_gen1', text: 'Estado guías rodadura' },
          { id: 'comp_gen2', text: 'Estado faldillas' },
          { id: 'comp_gen3', text: 'Estado lona rascadora' },
          { id: 'comp_gen4', text: 'Estado chapa y pintura' },
          { id: 'comp_gen5', text: 'Estado tolva' },
          { id: 'comp_gen6', text: 'Estado patas' },
          { id: 'comp_gen7', text: 'Estado brazos tensores' },
          { id: 'comp_gen8', text: 'Pegatinas seguridad' },
          { id: 'comp_gen9', text: 'Estado plato prensor' },
          { id: 'comp_gen10', text: 'Estado protecciones botoneras' },
        ],
      },
      {
        category: 'Electricidad',
        items: [
          { id: 'comp_elec1', text: 'Estado botoneras' },
          { id: 'comp_elec2', text: '¿Funciona los paros de emergencia?' },
          { id: 'comp_elec3', text: 'Estado seccionador candable' },
          { id: 'comp_elec4', text: 'Funcionamiento correcto' },
          { id: 'comp_elec5', text: 'Estado fotocélulas' },
          { id: 'comp_elec6', text: 'Estado finales de carrera' },
        ],
      },
      {
        category: 'Hidráulica',
        items: [
          { id: 'comp_hidr1', text: '¿Hay fugas de aceite?' },
          { id: 'comp_hidr2', text: 'Estado cilindros' },
          { id: 'comp_hidr3', text: '¿Las presiones son correctas?' },
        ],
      },
    ],
  },
  'prensa-vertical': {
    machine_type: 'prensa-vertical',
    version: 1,
    categories: [
      {
        category: 'General',
        items: [
          { id: 'prensa_gen1', text: 'Estado plato prensor' },
          { id: 'prensa_gen2', text: 'Estado guías' },
          { id: 'prensa_gen3', text: 'Estado cierre puerta' },
          { id: 'prensa_gen4', text: 'Estado soporte fleje' },
          { id: 'prensa_gen5', text: 'Estado chapa y pintura' },
          { id: 'prensa_gen6', text: 'Pegatinas seguridad' },
          { id: 'prensa_gen7', text: 'Estado extractor de balas' },
        ],
      },
      {
        category: 'Electricidad',
        items: [
          { id: 'prensa_elec1', text: 'Estado botoneras' },
          { id: 'prensa_elec2', text: '¿Funciona los paros de emergencia?' },
          { id: 'prensa_elec3', text: 'Funcionamiento correcto' },
          { id: 'prensa_elec4', text: '¿Funciona la función a dos manos?' },
        ],
      },
      {
        category: 'Hidráulica',
        items: [
          { id: 'prensa_hidr1', text: '¿Hay fugas de aceite?' },
          { id: 'prensa_hidr2', text: 'Estado cilindros' },
          { id: 'prensa_hidr3', text: '¿La máquina no se baja sola?' },
          { id: 'prensa_hidr4', text: '¿Las presiones son correctas?' },
        ],
      },
    ],
  },
};

// Default template for unknown machine types
const DEFAULT_TEMPLATE = {
  machine_type: 'otros',
  version: 1,
  categories: [
    {
      category: 'Estado General',
      items: [
        { id: 'gen1', text: 'Aspecto general y limpieza' },
        { id: 'gen2', text: 'Estructura y carcasa' },
        { id: 'gen3', text: 'Pintura y acabados' },
        { id: 'gen4', text: 'Etiquetas y placas de identificación' },
      ],
    },
    {
      category: 'Seguridad',
      items: [
        { id: 'seg1', text: 'Protecciones y guardas' },
        { id: 'seg2', text: 'Sistemas de seguridad' },
        { id: 'seg3', text: 'Señalización de riesgos' },
      ],
    },
  ],
};

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(companyCode: string, password: string): Promise<{ success: boolean; error?: string; companyName?: string }> {
  if (MOCK_MODE) {
    // Mock: accept any non-empty credentials
    if (companyCode && password) {
      await AsyncStorage.setItem(TOKEN_KEY, 'mock-jwt-token-' + Date.now());
      await AsyncStorage.setItem(COMPANY_KEY, companyCode.toUpperCase());
      return { success: true, companyName: companyCode.toUpperCase() };
    }
    return { success: false, error: 'Código o contraseña incorrectos' };
  }

  try {
    const res = await fetch(`${BASE_URL}/mobile/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_code: companyCode, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.detail || data.message || 'Error de autenticación' };
    }

    const data = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    const name = data.company_name || data.companyName || '';
    if (name) {
      await AsyncStorage.setItem(COMPANY_KEY, name);
    }
    return { success: true, companyName: name };
  } catch (e: any) {
    return { success: false, error: 'Error de conexión: ' + (e.message || 'sin red') };
  }
}

export async function getMyInspections(): Promise<any[]> {
  if (MOCK_MODE) {
    return MOCK_INSPECTIONS;
  }

  const res = await fetch(`${BASE_URL}/mobile/my-inspections`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener inspecciones');
  return res.json();
}

export async function getChecklistTemplate(machineType: string): Promise<{ categories: { category: string; items: { id: string; text: string }[] }[] }> {
  if (MOCK_MODE) {
    return MOCK_CHECKLIST_TEMPLATES[machineType] || DEFAULT_TEMPLATE;
  }

  const res = await fetch(`${BASE_URL}/mobile/checklist-template/${machineType}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener template');
  return res.json();
}

export async function submitInspection(
  woId: string,
  results: Record<string, string>,
  comments: string,
  photos?: Record<string, any[]>,
  generalPhotos?: string[]
): Promise<{ success: boolean; error?: string }> {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 1000));
    return { success: true };
  }

  try {
    // Flatten photos from Record<itemId, PhotoWithComment[]> to string[] (URIs)
    const flatPhotos: string[] = [];
    if (photos) {
      for (const itemPhotos of Object.values(photos)) {
        for (const p of itemPhotos) {
          if (p && typeof p === 'object' && p.uri) {
            flatPhotos.push(p.uri);
          } else if (typeof p === 'string') {
            flatPhotos.push(p);
          }
        }
      }
    }

    const res = await fetch(`${BASE_URL}/mobile/inspections/${woId}/submit`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        results,
        comments,
        photos: flatPhotos.length > 0 ? flatPhotos : undefined,
        general_photos: generalPhotos && generalPhotos.length > 0 ? generalPhotos : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.detail || data.message || 'Error al enviar inspección' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Error de conexión: ' + (e.message || '') };
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function getCompanyName(): Promise<string> {
  return (await AsyncStorage.getItem(COMPANY_KEY)) || '';
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(COMPANY_KEY);
}
