-- Stock mínimo configurable por referencia para filtros hidráulicos INVAL
-- Base por defecto: 2 uds, alineado con las alertas de app/panel.
alter table public.filters_stock
  add column if not exists minimum_qty integer not null default 2 check (minimum_qty >= 0);

alter table public.filters_stock
  alter column minimum_qty set default 2;

update public.filters_stock
set minimum_qty = 2
where minimum_qty = 0;
