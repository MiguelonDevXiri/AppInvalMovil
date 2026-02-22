import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://automisabackend-production.up.railway.app';
const TOKEN_KEY = 'automisa_jwt_token';
const COMPANY_KEY = 'automisa_company_name';

// Mock data for testing before backend is ready
const MOCK_MODE = true;

const MOCK_INSPECTIONS = [
  {
    woId: 'WO-001',
    machineType: 'AC',
    machineName: 'Autocargante Liebherr LTM 1060',
    licensePlate: 'AC-V3471',
    location: 'Obra Paseo de la Castellana 45',
    status: 'pending',
  },
  {
    woId: 'WO-002',
    machineType: 'PV',
    machineName: 'Plataforma Vertical JLG 1930ES',
    licensePlate: 'PV-M2210',
    location: 'Nave Industrial Getafe',
    status: 'pending',
  },
  {
    woId: 'WO-003',
    machineType: 'CE',
    machineName: 'Carretilla Elevadora Toyota 8FGU25',
    licensePlate: 'CE-B1455',
    location: 'Almacén Central Coslada',
    status: 'pending',
  },
];

const MOCK_CHECKLIST_TEMPLATES: Record<string, { categories: { category: string; items: { id: string; text: string }[] }[] }> = {
  AC: {
    categories: [
      {
        category: 'Estado General',
        items: [
          { id: 'ac-gen-1', text: 'Estado general de la carrocería' },
          { id: 'ac-gen-2', text: 'Limpieza general del equipo' },
          { id: 'ac-gen-3', text: 'Pegatinas de seguridad visibles' },
        ],
      },
      {
        category: 'Sistema Hidráulico',
        items: [
          { id: 'ac-hid-1', text: 'Nivel de aceite hidráulico' },
          { id: 'ac-hid-2', text: 'Fugas en mangueras y conexiones' },
          { id: 'ac-hid-3', text: 'Estado de los cilindros' },
        ],
      },
      {
        category: 'Motor y Transmisión',
        items: [
          { id: 'ac-mot-1', text: 'Nivel de aceite motor' },
          { id: 'ac-mot-2', text: 'Nivel de refrigerante' },
          { id: 'ac-mot-3', text: 'Estado de correas' },
          { id: 'ac-mot-4', text: 'Filtro de aire' },
        ],
      },
      {
        category: 'Seguridad',
        items: [
          { id: 'ac-seg-1', text: 'Extintor presente y en fecha' },
          { id: 'ac-seg-2', text: 'Cinturón de seguridad' },
          { id: 'ac-seg-3', text: 'Luces de trabajo funcionando' },
          { id: 'ac-seg-4', text: 'Alarma de retroceso' },
        ],
      },
    ],
  },
  PV: {
    categories: [
      {
        category: 'Estructura',
        items: [
          { id: 'pv-est-1', text: 'Estado de la plataforma' },
          { id: 'pv-est-2', text: 'Barandillas y protecciones' },
          { id: 'pv-est-3', text: 'Suelo antideslizante' },
        ],
      },
      {
        category: 'Sistema Eléctrico',
        items: [
          { id: 'pv-ele-1', text: 'Nivel de carga de baterías' },
          { id: 'pv-ele-2', text: 'Estado de cables y conexiones' },
          { id: 'pv-ele-3', text: 'Panel de control funcional' },
        ],
      },
      {
        category: 'Seguridad',
        items: [
          { id: 'pv-seg-1', text: 'Parada de emergencia funcional' },
          { id: 'pv-seg-2', text: 'Sensor de inclinación' },
          { id: 'pv-seg-3', text: 'Puerta de acceso con cierre' },
        ],
      },
    ],
  },
  CE: {
    categories: [
      {
        category: 'Estado General',
        items: [
          { id: 'ce-gen-1', text: 'Estado general del equipo' },
          { id: 'ce-gen-2', text: 'Estado de horquillas' },
          { id: 'ce-gen-3', text: 'Estado de neumáticos' },
        ],
      },
      {
        category: 'Motor y Fluidos',
        items: [
          { id: 'ce-mot-1', text: 'Nivel de aceite motor' },
          { id: 'ce-mot-2', text: 'Nivel de combustible/carga batería' },
          { id: 'ce-mot-3', text: 'Nivel de aceite hidráulico' },
        ],
      },
      {
        category: 'Seguridad',
        items: [
          { id: 'ce-seg-1', text: 'Claxon funcional' },
          { id: 'ce-seg-2', text: 'Luces de trabajo' },
          { id: 'ce-seg-3', text: 'Freno de servicio' },
          { id: 'ce-seg-4', text: 'Freno de estacionamiento' },
        ],
      },
    ],
  },
};

// Default template for unknown machine types
const DEFAULT_TEMPLATE = {
  categories: [
    {
      category: 'Inspección General',
      items: [
        { id: 'def-1', text: 'Estado general del equipo' },
        { id: 'def-2', text: 'Limpieza y orden' },
        { id: 'def-3', text: 'Documentación presente' },
        { id: 'def-4', text: 'Elementos de seguridad' },
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
    const res = await fetch(`${BASE_URL}/mobile/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyCode, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || 'Error de autenticación' };
    }

    const data = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    if (data.companyName) {
      await AsyncStorage.setItem(COMPANY_KEY, data.companyName);
    }
    return { success: true, companyName: data.companyName };
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
  photos?: Record<string, any[]>
): Promise<{ success: boolean; error?: string }> {
  if (MOCK_MODE) {
    // Simulate a small delay
    await new Promise(r => setTimeout(r, 1000));
    return { success: true };
  }

  try {
    const res = await fetch(`${BASE_URL}/mobile/inspections/${woId}/submit`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ results, comments, photos }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || 'Error al enviar inspección' };
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
