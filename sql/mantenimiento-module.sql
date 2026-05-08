-- Módulo Mantenimiento INVAL
-- Ejecutar en Supabase SQL Editor. Guarda informes en tablas propias mantenimiento_*.

create extension if not exists pgcrypto;

create table if not exists public.mantenimiento_inspections (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  inspection_date date,
  location text not null,
  reviewed_by text not null,
  machine_type text not null default 'otros',
  brand text,
  model text,
  serial_number text,
  license_plate text,
  ot_number text,
  notes text,
  pdf_url text,
  safety_checklist jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mantenimiento_checklist_results (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.mantenimiento_inspections(id) on delete cascade,
  item_id text not null,
  category text,
  item_text text,
  status text check (status in ('ok','fail','na','cant') or status is null),
  comment text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mantenimiento_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.mantenimiento_inspections(id) on delete cascade,
  photo_type text not null check (photo_type in ('general','checklist')),
  position text,
  item_id text,
  photo_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mantenimiento_materials (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.mantenimiento_inspections(id) on delete cascade,
  name text not null,
  quantity text,
  reference text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.mantenimiento_inspections add column if not exists pdf_url text;

create index if not exists idx_mantenimiento_inspections_created_at on public.mantenimiento_inspections(created_at desc);
create index if not exists idx_mantenimiento_inspections_machine_type on public.mantenimiento_inspections(machine_type);
create index if not exists idx_mantenimiento_checklist_inspection on public.mantenimiento_checklist_results(inspection_id, sort_order);
create index if not exists idx_mantenimiento_photos_inspection on public.mantenimiento_photos(inspection_id, photo_type, sort_order);
create index if not exists idx_mantenimiento_materials_inspection on public.mantenimiento_materials(inspection_id, sort_order);

alter table public.mantenimiento_inspections enable row level security;
alter table public.mantenimiento_checklist_results enable row level security;
alter table public.mantenimiento_photos enable row level security;
alter table public.mantenimiento_materials enable row level security;

-- Políticas abiertas para anon/auth, siguiendo patrón de la app móvil existente.
do $$ begin
  create policy "mantenimiento_inspections_select" on public.mantenimiento_inspections for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "mantenimiento_inspections_insert" on public.mantenimiento_inspections for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "mantenimiento_inspections_update" on public.mantenimiento_inspections for update using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "mantenimiento_inspections_delete" on public.mantenimiento_inspections for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin create policy "mantenimiento_checklist_select" on public.mantenimiento_checklist_results for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_checklist_insert" on public.mantenimiento_checklist_results for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_checklist_update" on public.mantenimiento_checklist_results for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_checklist_delete" on public.mantenimiento_checklist_results for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "mantenimiento_photos_select" on public.mantenimiento_photos for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_photos_insert" on public.mantenimiento_photos for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_photos_update" on public.mantenimiento_photos for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_photos_delete" on public.mantenimiento_photos for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "mantenimiento_materials_select" on public.mantenimiento_materials for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_materials_insert" on public.mantenimiento_materials for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_materials_update" on public.mantenimiento_materials for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "mantenimiento_materials_delete" on public.mantenimiento_materials for delete using (true); exception when duplicate_object then null; end $$;

comment on table public.mantenimiento_inspections is 'Cabecera de informes de mantenimiento de app móvil INVAL';
comment on table public.mantenimiento_checklist_results is 'Resultados bien/mal/N/A/no se puede del checklist de mantenimiento';
comment on table public.mantenimiento_photos is 'Fotos generales y de checklist de mantenimiento. Storage path incluye id de informe para evitar sobrescrituras.';
comment on table public.mantenimiento_materials is 'Materiales opcionales de mantenimiento';
