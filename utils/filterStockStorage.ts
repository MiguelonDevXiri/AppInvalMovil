import { supabase } from './supabase';

export type FilterLocation = 'almacen' | 'furgoneta';
export type FilterExtractionDestination = 'taller' | 'preventivo';

export interface FilterStockItem {
  reference: string;
  description?: string | null;
  warehouseQty: number;
  vanQty: number;
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

interface FilterStockRow {
  reference: string;
  description: string | null;
  warehouse_qty: number | null;
  van_qty: number | null;
  updated_at: string | null;
}

const normalizeReference = (reference: string) => reference.trim().toUpperCase();

const rowToStockItem = (row: FilterStockRow): FilterStockItem => ({
  reference: row.reference,
  description: row.description,
  warehouseQty: row.warehouse_qty ?? 0,
  vanQty: row.van_qty ?? 0,
  updatedAt: row.updated_at,
});

export async function getFilterStock(): Promise<FilterStockItem[]> {
  const { data, error } = await supabase
    .from('filters_stock')
    .select('*')
    .order('reference', { ascending: true });

  if (error) throw error;
  return ((data || []) as FilterStockRow[]).map(rowToStockItem);
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

export async function replenishFilterStock(params: {
  reference: string;
  quantity: number;
  location: FilterLocation;
  technicianName?: string | null;
}) {
  const reference = normalizeReference(params.reference);
  const quantity = Number(params.quantity);
  if (!reference) throw new Error('Inserta una referencia.');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Inserta una cantidad válida.');

  const current = await getStockRow(reference);
  const nextWarehouseQty = params.location === 'almacen'
    ? (current?.warehouseQty ?? 0) + quantity
    : (current?.warehouseQty ?? 0) - quantity;
  const nextVanQty = params.location === 'furgoneta'
    ? (current?.vanQty ?? 0) + quantity
    : (current?.vanQty ?? 0);

  if (params.location === 'furgoneta' && nextWarehouseQty < 0) {
    throw new Error(`No hay stock suficiente en almacén. Disponible: ${current?.warehouseQty ?? 0}.`);
  }

  const { error: upsertError } = await supabase.from('filters_stock').upsert({
    reference,
    warehouse_qty: nextWarehouseQty,
    van_qty: nextVanQty,
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

  const current = await getStockRow(reference);
  if (!current) throw new Error('Esta referencia no existe en stock.');

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

export async function searchFilterCrosses(reference: string) {
  const ref = normalizeReference(reference);
  if (!ref) return [];

  const { data, error } = await supabase
    .from('filters_crosses')
    .select('*')
    .or(`reference.ilike.%${ref}%,equivalent_reference.ilike.%${ref}%`)
    .order('reference', { ascending: true });

  if (error) throw error;
  return data || [];
}
