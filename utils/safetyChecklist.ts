export type SafetyChecklistMode = 'full' | 'fire-only';
export type SafetyChecklistModuleKey = 'inspection' | 'averia' | 'saica' | 'instalacion' | 'urgencia' | 'reparacion' | 'mantenimiento';

export interface SafetyChecklistModuleConfig {
  mode: SafetyChecklistMode;
  title: string;
  subtitle: string;
  accent: string;
  gradient: readonly [string, string, string];
  nextPath?: string;
}

export const SAFETY_CHECKLIST_MODULE_CONFIG: Record<SafetyChecklistModuleKey, SafetyChecklistModuleConfig> = {
  inspection: {
    mode: 'fire-only',
    title: 'Seguridad previa',
    subtitle: 'Antes de empezar la inspección, revisa solo el riesgo de incendio.',
    accent: '#e87a20',
    gradient: ['#c2410c', '#e87a20', '#fdba74'],
  },
  averia: {
    mode: 'full',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido de seguridad antes de intervenir la avería.',
    accent: '#7c3aed',
    gradient: ['#6d28d9', '#7c3aed', '#c4b5fd'],
    nextPath: '/(tabs)/averia-defects-form',
  },
  saica: {
    mode: 'full',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido de seguridad antes de crear el informe Saica.',
    accent: '#7c3aed',
    gradient: ['#6d28d9', '#7c3aed', '#c4b5fd'],
    nextPath: '/(tabs)/saica-photos-form',
  },
  reparacion: {
    mode: 'fire-only',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido antes de arrancar la reparación en taller.',
    accent: '#b45309',
    gradient: ['#92400e', '#d97706', '#fbbf24'],
    nextPath: '/(tabs)/reparacion-repairs-form',
  },
  instalacion: {
    mode: 'full',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido de seguridad antes de iniciar la instalación.',
    accent: '#0f766e',
    gradient: ['#0f766e', '#14b8a6', '#5eead4'],
    nextPath: '/(tabs)/instalacion-site-photos-form',
  },
  urgencia: {
    mode: 'full',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido de seguridad antes de atender la urgencia.',
    accent: '#e87a20',
    gradient: ['#0f2f57', '#e87a20', '#fdba74'],
    nextPath: '/(tabs)/acteco-general-photo',
  },
  mantenimiento: {
    mode: 'full',
    title: 'Seguridad previa',
    subtitle: 'Checklist rápido de seguridad antes del mantenimiento.',
    accent: '#2563eb',
    gradient: ['#0f2f57', '#2563eb', '#60a5fa'],
    nextPath: '/(tabs)/mantenimiento-checklist-form',
  },
};

export interface FireRiskChecklist {
  hasRisk: boolean | null;
  workTypes: string[];
  otherWorkType: string;
  riskReason: string;
  flammableMaterialNearby: boolean | null;
  areaClean: boolean | null;
  combustiblesRemoved: boolean | null;
  extinguisherNearby: boolean | null;
  safeToWork: boolean | null;
}

export interface ElectricalRiskChecklist {
  hasRisk: boolean | null;
  canCutPower: boolean | null;
  powerCut: boolean | null;
  absenceOfVoltageVerified: boolean | null;
  energizedElementsNearby: boolean | null;
}

export interface EntrapmentRiskChecklist {
  hasRisk: boolean | null;
  lockoutApplied: boolean | null;
  safetyPadlockUsed: boolean | null;
  interventionSignaled: boolean | null;
}

export interface SafetyChecklist {
  version: 1;
  mode: SafetyChecklistMode;
  fire: FireRiskChecklist;
  electrical: ElectricalRiskChecklist | null;
  entrapment: EntrapmentRiskChecklist | null;
  otherRisksNotes: string;
  completedAt: string;
}

export interface SafetySummarySection {
  id: string;
  title: string;
  status: 'safe' | 'warning' | 'neutral';
  summary: string;
  details: string[];
}

const FIRE_WORK_LABELS: Record<string, string> = {
  soldadura: 'Soldadura',
  radial: 'Radial',
  chispa: 'Chispa',
  calor: 'Calor',
  otros: 'Otros trabajos similares',
};

const normalizeBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return null;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeStringArray = (value: unknown): string[] => {
  const source = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return value.split(',');
        }
      })()
    : value;

  if (!Array.isArray(source)) return [];

  return source
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

export const createEmptySafetyChecklist = (mode: SafetyChecklistMode = 'full'): SafetyChecklist => ({
  version: 1,
  mode,
  fire: {
    hasRisk: null,
    workTypes: [],
    otherWorkType: '',
    riskReason: '',
    flammableMaterialNearby: null,
    areaClean: null,
    combustiblesRemoved: null,
    extinguisherNearby: null,
    safeToWork: null,
  },
  electrical: mode === 'full'
    ? {
        hasRisk: null,
        canCutPower: null,
        powerCut: null,
        absenceOfVoltageVerified: null,
        energizedElementsNearby: null,
      }
    : null,
  entrapment: mode === 'full'
    ? {
        hasRisk: null,
        lockoutApplied: null,
        safetyPadlockUsed: null,
        interventionSignaled: null,
      }
    : null,
  otherRisksNotes: '',
  completedAt: '',
});

export const parseSafetyChecklist = (
  value: unknown,
  fallbackMode: SafetyChecklistMode = 'full'
): SafetyChecklist => {
  const base = createEmptySafetyChecklist(fallbackMode);

  if (!value) return base;

  let source: unknown = value;
  if (typeof value === 'string') {
    try {
      source = JSON.parse(value) as unknown;
    } catch {
      return base;
    }
  }

  if (!source || typeof source !== 'object') return base;

  const row = source as Record<string, unknown>;
  const mode = row.mode === 'fire-only' || row.mode === 'full' ? row.mode : fallbackMode;
  const next = createEmptySafetyChecklist(mode);

  const fire = row.fire && typeof row.fire === 'object' ? row.fire as Record<string, unknown> : {};
  const electrical = row.electrical && typeof row.electrical === 'object' ? row.electrical as Record<string, unknown> : {};
  const entrapment = row.entrapment && typeof row.entrapment === 'object' ? row.entrapment as Record<string, unknown> : {};

  next.version = 1;
  next.mode = mode;
  next.fire = {
    hasRisk: normalizeBoolean(fire.hasRisk),
    workTypes: normalizeStringArray(fire.workTypes),
    otherWorkType: normalizeString(fire.otherWorkType),
    riskReason: normalizeString(fire.riskReason),
    flammableMaterialNearby: normalizeBoolean(fire.flammableMaterialNearby),
    areaClean: normalizeBoolean(fire.areaClean),
    combustiblesRemoved: normalizeBoolean(fire.combustiblesRemoved),
    extinguisherNearby: normalizeBoolean(fire.extinguisherNearby),
    safeToWork: normalizeBoolean(fire.safeToWork),
  };

  if (mode === 'full') {
    next.electrical = {
      hasRisk: normalizeBoolean(electrical.hasRisk),
      canCutPower: normalizeBoolean(electrical.canCutPower),
      powerCut: normalizeBoolean(electrical.powerCut),
      absenceOfVoltageVerified: normalizeBoolean(electrical.absenceOfVoltageVerified),
      energizedElementsNearby: normalizeBoolean(electrical.energizedElementsNearby),
    };

    next.entrapment = {
      hasRisk: normalizeBoolean(entrapment.hasRisk),
      lockoutApplied: normalizeBoolean(entrapment.lockoutApplied),
      safetyPadlockUsed: normalizeBoolean(entrapment.safetyPadlockUsed),
      interventionSignaled: normalizeBoolean(entrapment.interventionSignaled),
    };
  }

  next.otherRisksNotes = normalizeString(row.otherRisksNotes);
  next.completedAt = normalizeString(row.completedAt);

  return next;
};

export const getSafetyBooleanLabel = (value: boolean | null | undefined): string => {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  return 'Pendiente';
};

export const getFireWorkTypeLabel = (value: string): string => {
  return FIRE_WORK_LABELS[value] || value;
};

export const hasMeaningfulSafetyChecklist = (value: SafetyChecklist | null | undefined): boolean => {
  if (!value) return false;

  if (value.fire.hasRisk !== null) return true;
  if (value.fire.workTypes.length > 0) return true;
  if (value.fire.otherWorkType.trim()) return true;
  if (value.fire.riskReason.trim()) return true;
  if (value.fire.flammableMaterialNearby !== null) return true;
  if (value.fire.areaClean !== null) return true;
  if (value.fire.combustiblesRemoved !== null) return true;
  if (value.fire.extinguisherNearby !== null) return true;
  if (value.fire.safeToWork !== null) return true;

  if (value.electrical) {
    if (value.electrical.hasRisk !== null) return true;
    if (value.electrical.canCutPower !== null) return true;
    if (value.electrical.powerCut !== null) return true;
    if (value.electrical.absenceOfVoltageVerified !== null) return true;
    if (value.electrical.energizedElementsNearby !== null) return true;
  }

  if (value.entrapment) {
    if (value.entrapment.hasRisk !== null) return true;
    if (value.entrapment.lockoutApplied !== null) return true;
    if (value.entrapment.safetyPadlockUsed !== null) return true;
    if (value.entrapment.interventionSignaled !== null) return true;
  }

  return value.otherRisksNotes.trim().length > 0;
};

export const buildSafetySummarySections = (value: SafetyChecklist | null | undefined): SafetySummarySection[] => {
  if (!value) return [];

  const sections: SafetySummarySection[] = [];
  const fireTools = value.fire.workTypes.map(getFireWorkTypeLabel);
  if (value.fire.otherWorkType.trim()) {
    fireTools.push(value.fire.otherWorkType.trim());
  }

  if (value.fire.hasRisk === true) {
    const fireDetails = [
      fireTools.length > 0 ? `Herramienta / trabajo: ${fireTools.join(', ')}` : '',
      value.fire.riskReason ? `Motivo: ${value.fire.riskReason}` : '',
      `Material inflamable cerca: ${getSafetyBooleanLabel(value.fire.flammableMaterialNearby)}`,
      `Zona limpia: ${getSafetyBooleanLabel(value.fire.areaClean)}`,
      `Combustibles retirados: ${getSafetyBooleanLabel(value.fire.combustiblesRemoved)}`,
      `Extintor cerca: ${getSafetyBooleanLabel(value.fire.extinguisherNearby)}`,
      `Seguro trabajar: ${getSafetyBooleanLabel(value.fire.safeToWork)}`,
    ].filter(Boolean);

    sections.push({
      id: 'fire',
      title: 'Riesgo de incendio',
      status: value.fire.safeToWork === false ? 'warning' : 'warning',
      summary: 'Hay riesgo por trabajos en caliente.',
      details: fireDetails,
    });
  } else {
    sections.push({
      id: 'fire',
      title: 'Riesgo de incendio',
      status: value.fire.hasRisk === false ? 'safe' : 'neutral',
      summary: value.fire.hasRisk === false
        ? 'Sin riesgo por soldadura, radial, chispa o calor.'
        : 'Sin revisar.',
      details: [],
    });
  }

  if (value.mode === 'full' && value.electrical) {
    if (value.electrical.hasRisk === true) {
      sections.push({
        id: 'electrical',
        title: 'Riesgo eléctrico',
        status: 'warning',
        summary: 'Hay riesgo eléctrico en la intervención.',
        details: [
          `Se puede cortar la corriente: ${getSafetyBooleanLabel(value.electrical.canCutPower)}`,
          `Corriente cortada: ${getSafetyBooleanLabel(value.electrical.powerCut)}`,
          `Ausencia de tensión verificada: ${getSafetyBooleanLabel(value.electrical.absenceOfVoltageVerified)}`,
          `Elementos energizados cerca: ${getSafetyBooleanLabel(value.electrical.energizedElementsNearby)}`,
        ],
      });
    } else {
      sections.push({
        id: 'electrical',
        title: 'Riesgo eléctrico',
        status: value.electrical.hasRisk === false ? 'safe' : 'neutral',
        summary: value.electrical.hasRisk === false ? 'Sin riesgo eléctrico declarado.' : 'Sin revisar.',
        details: [],
      });
    }
  }

  if (value.mode === 'full' && value.entrapment) {
    if (value.entrapment.hasRisk === true) {
      sections.push({
        id: 'entrapment',
        title: 'Atrapamiento / puesta en marcha',
        status: 'warning',
        summary: 'Hay riesgo de atrapamiento o arranque inesperado.',
        details: [
          `Bloqueo aplicado: ${getSafetyBooleanLabel(value.entrapment.lockoutApplied)}`,
          `Candado de seguridad usado: ${getSafetyBooleanLabel(value.entrapment.safetyPadlockUsed)}`,
          `Intervención señalizada: ${getSafetyBooleanLabel(value.entrapment.interventionSignaled)}`,
        ],
      });
    } else {
      sections.push({
        id: 'entrapment',
        title: 'Atrapamiento / puesta en marcha',
        status: value.entrapment.hasRisk === false ? 'safe' : 'neutral',
        summary: value.entrapment.hasRisk === false ? 'Sin riesgo de arranque accidental declarado.' : 'Sin revisar.',
        details: [],
      });
    }
  }

  if (value.mode === 'full') {
    sections.push({
      id: 'other',
      title: 'Otros riesgos / observaciones',
      status: value.otherRisksNotes.trim() ? 'warning' : 'safe',
      summary: value.otherRisksNotes.trim() || 'Sin observaciones adicionales.',
      details: [],
    });
  }

  return sections;
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDetailHtml = (detail: string): string => {
  const separatorIndex = detail.indexOf(':');

  if (separatorIndex === -1) {
    return escapeHtml(detail);
  }

  const label = escapeHtml(detail.slice(0, separatorIndex).trim());
  const value = escapeHtml(detail.slice(separatorIndex + 1).trim());
  return `<strong>${label}:</strong> ${value}`;
};

export const renderSafetySummaryHTML = (
  value: SafetyChecklist | null | undefined,
  title: string = '🛡️ RESUMEN DE SEGURIDAD'
): string => {
  if (!value || !hasMeaningfulSafetyChecklist(value)) return '';

  const rows = buildSafetySummarySections(value)
    .map((section) => {
      const details = section.details.length > 0
        ? `<div style="margin-top:4px; color:#64748b; line-height:1.45;">${section.details.map((detail) => formatDetailHtml(detail)).join('<br />')}</div>`
        : '';

      return `
        <tr>
          <td style="font-weight:bold;">${escapeHtml(section.title)}</td>
          <td>
            <div>${escapeHtml(section.summary)}</div>
            ${details}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="section">
      <div class="section-header">${escapeHtml(title)}</div>
      <div class="section-content" style="padding: 0;">
        <table class="materials-table safety-table">
          <thead>
            <tr>
              <th style="width: 32%;">Bloque</th>
              <th style="width: 68%;">Resumen</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
};
