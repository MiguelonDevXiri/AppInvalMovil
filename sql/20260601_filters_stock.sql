-- Stock de filtros hidráulicos INVAL
create table if not exists public.filters_stock (
  reference text primary key,
  warehouse_qty integer not null default 0 check (warehouse_qty >= 0),
  van_qty integer not null default 0 check (van_qty >= 0),
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.filters_movements (
  id uuid primary key default gen_random_uuid(),
  reference text not null references public.filters_stock(reference) on update cascade on delete restrict,
  movement_type text not null check (movement_type in ('reponer', 'extraer')),
  location text not null check (location in ('almacen', 'furgoneta')),
  destination text check (destination in ('taller', 'preventivo')),
  quantity integer not null check (quantity > 0),
  notes text,
  technician_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.filters_crosses (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  equivalent_reference text not null,
  brand text,
  notes text,
  created_at timestamptz not null default now(),
  unique(reference, equivalent_reference)
);

create index if not exists filters_movements_reference_created_at_idx on public.filters_movements(reference, created_at desc);
create index if not exists filters_crosses_reference_idx on public.filters_crosses(reference);

create or replace function public.touch_filters_stock_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists filters_stock_touch_updated_at on public.filters_stock;
create trigger filters_stock_touch_updated_at
before update on public.filters_stock
for each row execute function public.touch_filters_stock_updated_at();

alter table public.filters_stock enable row level security;
alter table public.filters_movements enable row level security;
alter table public.filters_crosses enable row level security;

drop policy if exists "filters_stock_anon_select" on public.filters_stock;
create policy "filters_stock_anon_select" on public.filters_stock for select to anon using (true);
drop policy if exists "filters_stock_anon_insert" on public.filters_stock;
create policy "filters_stock_anon_insert" on public.filters_stock for insert to anon with check (true);
drop policy if exists "filters_stock_anon_update" on public.filters_stock;
create policy "filters_stock_anon_update" on public.filters_stock for update to anon using (true) with check (true);

drop policy if exists "filters_movements_anon_select" on public.filters_movements;
create policy "filters_movements_anon_select" on public.filters_movements for select to anon using (true);
drop policy if exists "filters_movements_anon_insert" on public.filters_movements;
create policy "filters_movements_anon_insert" on public.filters_movements for insert to anon with check (true);

drop policy if exists "filters_crosses_anon_select" on public.filters_crosses;
create policy "filters_crosses_anon_select" on public.filters_crosses for select to anon using (true);
drop policy if exists "filters_crosses_anon_insert" on public.filters_crosses;
create policy "filters_crosses_anon_insert" on public.filters_crosses for insert to anon with check (true);
drop policy if exists "filters_crosses_anon_update" on public.filters_crosses;
create policy "filters_crosses_anon_update" on public.filters_crosses for update to anon using (true) with check (true);
