-- Catálogo de filtros desde foto enviada por Miguel.
-- Se usan solo las 3 primeras columnas: referencia principal + 2 alternativas.
-- Las referencias principales se insertan en filters_stock para bloquear entradas fuera de catálogo.

with catalog(reference, alt1, alt2) as (
  values
    ('2626014', null, 'HF35102'),
    ('2626133', 'ADH93641', null),
    ('2626091', 'CS050P25-HYD16332', null),
    ('2626080', 'CS0700P10A', 'WD10018 21.58'),
    ('2626090', 'CS070P25A', 'WD10005'),
    ('2626084', 'A120C25/HID4672', 'CS100P10A/WD12002'),
    ('2626096', 'A110C68', 'W940/51-13,14'),
    ('0612027', 'MF0301P10NB', 'HID18640'),
    ('2626018', null, 'HID19853'),
    ('2626020', 'SH77002', null),
    ('0619017', 'MF0301P25NB', 'HID18234=18640'),
    ('2626074', 'CR111C25/HID18237', 'MF1001P25NB'),
    ('2626063', 'MF1002P25NB-HID5542', 'HF7904'),
    ('2626013', 'MF1003P25NBP01/R130G25B', null),
    ('2626017', 'MF1003P25NBP01/R130G25B', null),
    ('2626012', null, null),
    ('2626082', 'MF180TP25NBP01/R140C10', 'HID5544 23-76'),
    ('2626088', 'MF4001P25NBP01', null),
    ('2626077', 'MF4002P10NB/HID18257', 'HID5548'),
    ('2626085', 'R530C25/CRE100CV1', 'SH63326'),
    ('2626094', 'R530C25', 'MF4002P25NB'),
    ('2626065', 'R531G25', 'SH51105'),
    ('2626039', null, 'HID18974/CARTES'),
    ('2626011', '0165R020ON/WG255 PC TDC', 'HID11994 63,09'),
    ('2626099', null, null),
    ('2626081', null, 'H024ORNV16'),
    ('2626089', '0060R020ON/RHR60G10B', 'HY13160'),
    ('2626070', '0075R010BN3HVDAC', 'SH74190/SH74151'),
    ('2626110', 'PLANTA ALICANTE', null),
    ('2626126', 'RL7631/ALICANTE Y ORIHUELA', 'ST1875'),
    ('2626026', '852514 MIC 3-er', null),
    ('2626098', 'HVDA0005L003P', null),
    ('2626054', 'MF0201P25NB', null),
    ('2626037', null, null),
    ('2626016', '852940mic25', 'HID14451'),
    ('2626095', 'H10XL-A00-0-M PC TDC', 'ST1971 R928005891'),
    ('2626049', '040ORN010BN', 'R928005891'),
    ('2626036', 'PLANTA ALICANTE/VALENCIA', null),
    ('2626108', 'SH53052', null),
    ('2626126', 'PC FAES PATERNA 2914/CSR', null),
    ('2626030', 'SUPER RLR631E10B', null),
    ('2626010', 'T80689SG1M90', null)
), normalized as (
  select distinct
    upper(trim(reference)) as reference,
    nullif(upper(trim(alt1)), '') as alt1,
    nullif(upper(trim(alt2)), '') as alt2
  from catalog
  where reference ~ '^[0-9]{7}$'
), stock_refs as (
  insert into public.filters_stock (reference, description)
  select distinct reference, 'Filtro hidráulico'
  from normalized
  on conflict (reference) do update
    set description = coalesce(public.filters_stock.description, excluded.description)
  returning reference
), crosses as (
  select reference, alt1 as equivalent_reference, 'Alternativa 1' as brand from normalized where alt1 is not null
  union all
  select reference, alt2 as equivalent_reference, 'Alternativa 2' as brand from normalized where alt2 is not null
)
insert into public.filters_crosses (reference, equivalent_reference, brand, notes)
select reference, equivalent_reference, brand, 'Catálogo foto 2026-06-04'
from crosses
where equivalent_reference is not null and equivalent_reference <> reference
on conflict (reference, equivalent_reference) do update
  set brand = excluded.brand,
      notes = excluded.notes;
