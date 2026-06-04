-- Stock recomendado configurable por referencia para filtros hidráulicos INVAL
-- Mínimo = alerta crítica. Recomendado = nivel objetivo para ir cómodo.
alter table public.filters_stock
  add column if not exists recommended_qty integer not null default 4 check (recommended_qty >= 0);

alter table public.filters_stock
  alter column recommended_qty set default 4;

update public.filters_stock
set recommended_qty = greatest(coalesce(recommended_qty, 0), coalesce(minimum_qty, 2), 4)
where recommended_qty = 0 or recommended_qty < coalesce(minimum_qty, 2);
