-- 2026-11-14 · El nombre de la liga (el que se puso al crearla) sale en los avisos de partidos organizados (norma de Carlos).
-- · «Mañana juegas»: «Mañana juegas la jornada N de «Liga» en <campo> a las <hora>».
-- · Avisos de tarjetas (entregar): con el nombre de la liga en el título y en el texto.
-- Si la partida no es de una liga, los avisos quedan como antes.
create or replace function public._nombre_liga_conv(p_conv text, p_grupo uuid)
 returns text language sql stable security definer set search_path to 'public' as $$
  select (select g->'meta'->'liga'->>'nombre' from jsonb_array_elements(coalesce(l.match_groups, '[]'::jsonb)) g where g->'meta'->'liga' is not null limit 1)
  from rounds l
  where l.round_name = 'Liga de amigos' and l.course_id is null and l.grupo_id = p_grupo
    and left(upper(trim(p_conv)), length(l.code)) = l.code and substr(upper(trim(p_conv)), length(l.code) + 1) ~ '^J[0-9]+$'
  order by length(l.code) desc limit 1;
$$;
-- Nombre de la liga de una partida ya creada (la que cuelga de una jornada)
create or replace function public._nombre_liga_partida(p_code text, p_grupo uuid)
 returns text language sql stable security definer set search_path to 'public' as $$
  select public._nombre_liga_conv(c.code, p_grupo)
  from rounds c
  where c.round_name = 'Convocatoria' and c.course_id is null and c.grupo_id = p_grupo
    and exists (select 1 from jsonb_array_elements(coalesce(c.match_groups, '[]'::jsonb)) e where e->'meta'->>'roundCode' = upper(trim(p_code)))
  limit 1;
$$;
revoke all on function public._nombre_liga_conv(text, uuid), public._nombre_liga_partida(text, uuid) from public, anon, authenticated;

create or replace function public._avisos_recordatorio()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare r record; s record; manana date := ((now() at time zone 'Europe/Madrid')::date + 1); n int := 0; u uuid; meta jsonb; liga text; jornada text; titulo text; texto text;
begin
  if extract(hour from now() at time zone 'Europe/Madrid') <> 20 then return 0; end if;
  for r in select id, code, grupo_id, match_groups from rounds where course_id is null and round_name = 'Convocatoria' and created_at > now() - interval '60 days' loop
    select g->'meta' into meta from jsonb_array_elements(r.match_groups) g where g ? 'meta' limit 1;
    if meta is null or meta->>'date' is distinct from manana::text then continue; end if;
    if not (insert_aviso_hecho('recordatorio:' || r.id || ':' || manana)) then continue; end if;
    liga := _nombre_liga_conv(r.code, r.grupo_id); jornada := (regexp_match(r.code, 'J([0-9]+)$'))[1];
    for s in select g->>'time' hora, p jugador from jsonb_array_elements(r.match_groups) g, jsonb_array_elements_text(coalesce(g->'players','[]'::jsonb)) p
             where coalesce(g->>'time', '') <> '' and trim(p) <> '' loop
      titulo := '⛳ Mañana juegas' || coalesce(' · ' || liga, '');
      texto := 'Mañana juegas ' || case when liga is not null and jornada is not null then 'la jornada ' || jornada || ' de «' || liga || '» ' else '' end
               || 'en ' || _nombre_campo(meta->>'courseId') || ' a las ' || regexp_replace(s.hora, '^0', '') || '. ¡Buen golf!';
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(s.jugador)) loop
        if _encolar(u, titulo, texto, '?conv=' || r.code, 'recordatorio-' || r.id) then n := n + 1; end if;
      end loop;
    end loop;
  end loop;
  return n;
end; $$;

create or replace function public._avisos_tarjetas()
 returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; n int := 0; liga text; en text; nh int; primero timestamptz; slot int; pend text[]; todos text[]; u uuid; nom text; txt text; otros text;
begin
  if coalesce(current_setting('acgolf.sin_silencio', true), '') <> '1' and _hora_permitida(now()) > now() then return 0; end if;  -- (la llave solo sirve para probar)
  for r in select code, grupo_id, course_id, match_groups from rounds
           where created_at > now() - interval '2 days' and code is not null and grupo_id is not null
             and jsonb_typeof(match_groups) = 'array' and es_partida_liga(code) loop
    nh := case when r.course_id ~ '-9v?$' then 9 else 18 end;
    with pl as (
      select (g.ord - 1)::int grupo, (p.ord - 1)::int idx, trim(p.name) nombre
      from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
           jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
      where trim(p.name) <> ''),
    est as (
      select pl.*,
        (select count(*) from marcas m where m.round_code = r.code and m.grupo = pl.grupo and m.jugador_idx = pl.idx and m.golpes is not null) hechos,
        (select max(m.updated_at) from marcas m where m.round_code = r.code and m.grupo = pl.grupo and m.jugador_idx = pl.idx) ult,
        exists (select 1 from tarjetas_validadas t where t.round_code = r.code and t.grupo = pl.grupo and t.jugador_idx = pl.idx) val
      from pl)
    select min(ult) filter (where hechos >= nh), array_agg(nombre) filter (where not val), array_agg(nombre)
      into primero, pend, todos from est;
    if primero is null or pend is null or coalesce(array_length(pend, 1), 0) = 0 then continue; end if;
    if now() < primero + interval '5 minutes' or now() > primero + interval '4 hours' then continue; end if;
    slot := floor(extract(epoch from now() - primero) / 300)::int;
    insert into avisos_hechos (clave) values ('tarjetas:' || r.code || ':' || slot) on conflict do nothing;
    if not found then continue; end if;
    select string_agg(x, ', ') into otros from unnest(pend) x;
    liga := _nombre_liga_partida(r.code, r.grupo_id); en := coalesce(' de «' || liga || '»', ' de la liga');
    for u, nom in select m.user_id, m.player_name from miembros m
                  where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) in (select sin_acentos(trim(t)) from unnest(todos) t) loop
      if sin_acentos(trim(nom)) in (select sin_acentos(trim(t)) from unnest(pend) t) then
        txt := 'Te falta ENTREGAR tu tarjeta' || en || '. Ábrela y pulsa ENTREGAR TARJETA. Faltan: ' || otros || '.';
        if _encolar(u, '✍️ Falta tu tarjeta' || coalesce(' · ' || liga, ''), txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      else
        txt := 'Ya entregaste tu tarjeta' || en || '. Aún faltan por entregar: ' || otros || '. Avísales.';
        if _encolar(u, '⏳ Faltan tarjetas por entregar' || coalesce(' · ' || liga, ''), txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      end if;
    end loop;
  end loop;
  return n;
end; $$;
revoke all on function public._avisos_tarjetas() from anon, authenticated;
revoke all on function public._avisos_recordatorio() from anon, authenticated;
