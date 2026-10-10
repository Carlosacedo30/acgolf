-- 11-oct-2026 (base de datos de acgolf.es / pruebas: svnkgmbfanwftncopqjg)
-- El marcador solo hace falta en las partidas que salen de una liga creada en «Crear liga».
-- Las partidas normales cuentan solas para la liga semanal y mensual, medallas y hándicap.
create or replace function public.es_partida_liga(p_code text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from rounds c
    join rounds l on l.round_name = 'Liga de amigos' and l.course_id is null and l.grupo_id = c.grupo_id
                 and left(c.code, length(l.code)) = l.code
                 and substr(c.code, length(l.code) + 1) ~ '^J[0-9]+$'
    where c.round_name = 'Convocatoria' and c.course_id is null
      and exists (select 1 from jsonb_array_elements(coalesce(c.match_groups, '[]'::jsonb)) e
                  where e->'meta'->>'roundCode' = upper(trim(p_code)))
  );
$$;
revoke all on function public.es_partida_liga(text) from public;
grant execute on function public.es_partida_liga(text) to anon, authenticated;

-- En la vista tarjetas_liga, la condición «tarjeta validada» pasa a ser
-- «(NOT es_partida_liga(r.code)) OR EXISTS (… tarjetas_validadas …)»
do $$
declare d text; n text;
begin
  d := pg_get_viewdef('public.tarjetas_liga'::regclass);
  n := regexp_replace(d, '\(EXISTS \( SELECT 1\s+FROM tarjetas_validadas t',
                         '((NOT es_partida_liga(r.code)) OR EXISTS ( SELECT 1 FROM tarjetas_validadas t');
  if n = d then raise exception 'No se encontró la condición del marcador en tarjetas_liga'; end if;
  execute 'create or replace view public.tarjetas_liga as ' || n;
end $$;
