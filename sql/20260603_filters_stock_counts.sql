-- Recuentos físicos de stock de filtros hidráulicos INVAL
create table if not exists public.filters_stock_counts (
  id uuid primary key default gen_random_uuid(),
  reference text not null references public.filters_stock(reference) on update cascade on delete restrict,
  expected_warehouse_qty integer not null default 0,
  expected_van_qty integer not null default 0,
  counted_warehouse_qty integer not null default 0 check (counted_warehouse_qty >= 0),
  counted_van_qty integer not null default 0 check (counted_van_qty >= 0),
  warehouse_difference integer generated always as (counted_warehouse_qty - expected_warehouse_qty) stored,
  van_difference integer generated always as (counted_van_qty - expected_van_qty) stored,
  notes text,
  technician_name text,
  counted_at timestamptz not null default now()
);

create index if not exists filters_stock_counts_counted_at_idx on public.filters_stock_counts(counted_at desc);
create index if not exists filters_stock_counts_reference_counted_at_idx on public.filters_stock_counts(reference, counted_at desc);

alter table public.filters_stock_counts enable row level security;

drop policy if exists "filters_stock_counts_anon_select" on public.filters_stock_counts;
create policy "filters_stock_counts_anon_select" on public.filters_stock_counts for select to anon using (true);

drop policy if exists "filters_stock_counts_anon_insert" on public.filters_stock_counts;
create policy "filters_stock_counts_anon_insert" on public.filters_stock_counts for insert to anon with check (true);

drop policy if exists "filters_stock_counts_anon_update" on public.filters_stock_counts;
create policy "filters_stock_counts_anon_update" on public.filters_stock_counts for update to anon using (true) with check (true);
