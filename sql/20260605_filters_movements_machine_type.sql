-- Añade el tipo de máquina donde se gastó cada filtro.
alter table public.filters_movements
  add column if not exists machine_type text;

create index if not exists filters_movements_machine_type_idx
  on public.filters_movements(machine_type)
  where machine_type is not null;
