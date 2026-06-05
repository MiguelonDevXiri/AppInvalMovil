import { supabase } from './supabase';

export type FilterLocation = 'almacen' | 'furgoneta';
export type FilterExtractionDestination = 'taller' | 'preventivo';

export interface FilterStockItem {
  reference: string;
  description?: string | null;
  warehouseQty: number;
  vanQty: number;
  minimumQty?: number | null;
  recommendedQty?: number | null;
  codes?: string[];
  equivalents?: string[];
  updatedAt?: string | null;
}

export interface FilterMovement {
  id: string;
  reference: string;
  movementType: 'reponer' | 'extraer';
  location: FilterLocation;
  destination?: FilterExtractionDestination | null;
  quantity: number;
  notes?: string | null;
  technicianName?: string | null;
  createdAt: string;
}

export interface FilterStockCountDraft {
  reference: string;
  expectedWarehouseQty: number;
  expectedVanQty: number;
  countedWarehouseQty: number;
  countedVanQty: number;
  notes?: string | null;
}

export interface FilterStockCount extends FilterStockCountDraft {
  id: string;
  warehouseDifference: number;
  vanDifference: number;
  technicianName?: string | null;
  countedAt: string;
}

interface FilterStockRow {
  reference: string;
  description: string | null;
  warehouse_qty: number | null;
  van_qty: number | null;
  minimum_qty?: number | null;
  recommended_qty?: number | null;
  updated_at: string | null;
}

interface FilterCrossRowDb {
  id: string;
  reference: string;
  equivalent_reference: string;
  brand: string | null;
  notes: string | null;
  created_at: string;
}

export interface FilterCrossRow {
  id: string;
  reference: string;
  equivalentReference: string;
  brand?: string | null;
  notes?: string | null;
  createdAt: string;
}

const normalizeReference = (reference: string) => reference.trim().toUpperCase();
const normalizeSearchToken = (value: string) => normalizeReference(value).replace(/[^A-Z0-9]/g, '');

const referenceMatchesSearch = (value: string | null | undefined, search: string) => {
  if (!value) return false;
  const normalizedValue = normalizeReference(value);
  const normalizedSearch = normalizeReference(search);
  const compactValue = normalizeSearchToken(value);
  const compactSearch = normalizeSearchToken(search);

  return normalizedValue.includes(normalizedSearch) || (!!compactSearch && compactValue.includes(compactSearch));
};

const rowToStockItem = (row: FilterStockRow): FilterStockItem => ({
  reference: row.reference,
  description: row.description,
  warehouseQty: row.warehouse_qty ?? 0,
  vanQty: row.van_qty ?? 0,
  minimumQty: typeof row.minimum_qty === 'number' ? row.minimum_qty : null,
  recommendedQty: typeof row.recommended_qty === 'number' ? row.recommended_qty : null,
  updatedAt: row.updated_at,
});

const rowToCrossItem = (row: FilterCrossRowDb): FilterCrossRow => ({
  id: row.id,
  reference: row.reference,
  equivalentReference: row.equivalent_reference,
  brand: row.brand,
  notes: row.notes,
  createdAt: row.created_at,
});

export function getFilterErrorMessage(error: unknown, fallback = 'Ha ocurrido un error al trabajar con filtros.') {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.includes('recommended_qty')) {
      return 'Falta aplicar el SQL de stock recomendado (`20260604_filters_stock_recommended_qty.sql`).';
    }
    if (message.includes('filters_stock_counts')) {
      return 'Falta aplicar el SQL de recuentos físicos (`20260603_filters_stock_counts.sql`).';
    }
    if (message.includes('filters_stock') || message.includes('filters_movements') || message.includes('filters_crosses')) {
      return 'Falta aplicar el SQL base del módulo de filtros (`20260601_filters_stock.sql`).';
    }
    return message || fallback;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

export async function getFilterStock(): Promise<FilterStockItem[]> {
  const { data, error } = await supabase
    .from('filters_stock')
    .select('*')
    .order('reference', { ascending: true });

  if (error) throw error;
  return ((data || []) as FilterStockRow[]).map(rowToStockItem);
}


export async function getFilterCatalogStock(): Promise<FilterStockItem[]> {
  const [stock, crosses] = await Promise.all([getFilterStock(), getAllFilterCrosses()]);
  const codesByReference = new Map<string, string[]>();
  const equivalentsByReference = new Map<string, string[]>();

  for (const cross of crosses) {
    const isCode = cross.brand === 'Código INVAL';
    const targetMap = isCode ? codesByReference : equivalentsByReference;
    const list = targetMap.get(cross.reference) || [];
    if (!list.includes(cross.equivalentReference)) {
      list.push(cross.equivalentReference);
    }
    targetMap.set(cross.reference, list);
  }

  return stock.map((item) => ({
    ...item,
    codes: codesByReference.get(item.reference) || [],
    equivalents: equivalentsByReference.get(item.reference) || [],
  }));
}

async function getAllFilterCrosses(): Promise<FilterCrossRow[]> {
  const { data, error } = await supabase
    .from('filters_crosses')
    .select('*')
    .order('reference', { ascending: true });

  if (error) throw error;
  return ((data || []) as FilterCrossRowDb[]).map(rowToCrossItem);
}

export async function getFilterReferences(): Promise<string[]> {
  const stock = await getFilterStock();
  return stock.map((item) => item.reference);
}

async function getStockRow(reference: string): Promise<FilterStockItem | null> {
  const ref = normalizeReference(reference);
  const { data, error } = await supabase
    .from('filters_stock')
    .select('*')
    .eq('reference', ref)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToStockItem(data as FilterStockRow) : null;
}


async function assertKnownReference(reference: string): Promise<FilterStockItem> {
  const current = await getStockRow(reference);
  if (!current) {
    throw new Error('Referencia no permitida. Elige una referencia de la tabla de filtros para evitar errores de escritura.');
  }
  return current;
}

export async function replenishFilterStock(params: {
  reference: string;
  quantity: number;
  location: FilterLocation;
  technicianName?: string | null;
  description?: string | null;
}) {
  const reference = normalizeReference(params.reference);
  const quantity = Number(params.quantity);
  if (!reference) throw new Error('Inserta una referencia.');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Inserta una cantidad válida.');

  const current = await assertKnownReference(reference);
  const nextWarehouseQty = params.location === 'almacen'
    ? (current?.warehouseQty ?? 0) + quantity
    : (current?.warehouseQty ?? 0) - quantity;
  const nextVanQty = params.location === 'furgoneta'
    ? (current?.vanQty ?? 0) + quantity
    : (current?.vanQty ?? 0);

  if (params.location === 'furgoneta' && nextWarehouseQty < 0) {
    throw new Error(`No hay stock suficiente en almacén. Disponible: ${current?.warehouseQty ?? 0}.`);
  }

  const nextDescription = current?.description?.trim() || params.description?.trim() || null;

  const { error: upsertError } = await supabase.from('filters_stock').upsert({
    reference,
    warehouse_qty: nextWarehouseQty,
    van_qty: nextVanQty,
    description: nextDescription,
  });
  if (upsertError) throw upsertError;

  const { error: movementError } = await supabase.from('filters_movements').insert({
    reference,
    movement_type: 'reponer',
    location: params.location,
    quantity,
    technician_name: params.technicianName || null,
    notes: params.location === 'furgoneta' ? 'Reposición de furgoneta descontada del almacén' : null,
  });
  if (movementError) throw movementError;
}

export async function extractFilterStock(params: {
  reference: string;
  quantity: number;
  location: FilterLocation;
  destination: FilterExtractionDestination;
  technicianName?: string | null;
}) {
  const reference = normalizeReference(params.reference);
  const quantity = Number(params.quantity);
  if (!reference) throw new Error('Inserta una referencia.');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Inserta una cantidad válida.');

  const current = await assertKnownReference(reference);

  const available = params.location === 'almacen' ? current.warehouseQty : current.vanQty;
  if (available < quantity) {
    throw new Error(`No hay stock suficiente en ${params.location}. Disponible: ${available}.`);
  }

  const { error: updateError } = await supabase
    .from('filters_stock')
    .update({
      warehouse_qty: params.location === 'almacen' ? current.warehouseQty - quantity : current.warehouseQty,
      van_qty: params.location === 'furgoneta' ? current.vanQty - quantity : current.vanQty,
    })
    .eq('reference', reference);
  if (updateError) throw updateError;

  const { error: movementError } = await supabase.from('filters_movements').insert({
    reference,
    movement_type: 'extraer',
    location: params.location,
    destination: params.destination,
    quantity,
    technician_name: params.technicianName || null,
  });
  if (movementError) throw movementError;
}

export async function saveFilterStockCounts(params: {
  counts: FilterStockCountDraft[];
  technicianName?: string | null;
}) {
  const rows = params.counts
    .map((count) => ({
      reference: normalizeReference(count.reference),
      expected_warehouse_qty: Number(count.expectedWarehouseQty) || 0,
      expected_van_qty: Number(count.expectedVanQty) || 0,
      counted_warehouse_qty: Number(count.countedWarehouseQty) || 0,
      counted_van_qty: Number(count.countedVanQty) || 0,
      notes: count.notes?.trim() || null,
      technician_name: params.technicianName || null,
    }))
    .filter((count) => count.reference);

  if (rows.length === 0) throw new Error('No hay referencias para guardar.');
  const invalid = rows.find((count) => count.counted_warehouse_qty < 0 || count.counted_van_qty < 0);
  if (invalid) throw new Error('Las cantidades reales no pueden ser negativas.');

  const { error } = await supabase.from('filters_stock_counts').insert(rows);
  if (error) throw error;
}

export async function searchFilterCrosses(reference: string): Promise<FilterCrossRow[]> {
  const ref = normalizeReference(reference);
  if (!ref) return [];

  const [crosses, stock] = await Promise.all([getAllFilterCrosses(), getFilterStock()]);
  const matchedReferences = new Set<string>();

  for (const item of crosses) {
    if (referenceMatchesSearch(item.reference, ref) || referenceMatchesSearch(item.equivalentReference, ref)) {
      matchedReferences.add(item.reference);
    }
  }

  for (const item of stock) {
    if (referenceMatchesSearch(item.reference, ref)) {
      matchedReferences.add(item.reference);
    }
  }

  if (matchedReferences.size === 0) return [];

  return crosses.filter((item) => matchedReferences.has(item.reference));
}
