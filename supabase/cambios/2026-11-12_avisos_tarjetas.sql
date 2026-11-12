-- 2026-11-12 · Avisos cada 5 minutos mientras falten tarjetas por firmar (elegido por Carlos).
-- En una partida de liga con marcador: cuando el primer jugador termina sus hoyos, a los 5 minutos
-- sale un aviso a TODO el grupo diciendo quién falta, y se repite cada 5 minutos hasta que firman todos.
-- Tope: 4 horas desde que terminó el primero. Horas de silencio (22:00-8:00) se respetan: no se avisa de noche.
-- Cada aviso lleva la misma etiqueta: en el móvil sustituye al anterior (no se amontonan).
create or replace function public._avisos_tarjetas()
 returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; n int := 0; nh int; primero timestamptz; slot int; pend text[]; todos text[]; u uuid; nom text; txt text; otros text;
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
    select string_agg(split_part(x, ' ', 1), ', ') into otros from unnest(pend) x;
    for u, nom in select m.user_id, m.player_name from miembros m
                  where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) in (select sin_acentos(trim(t)) from unnest(todos) t) loop
      if sin_acentos(trim(nom)) in (select sin_acentos(trim(t)) from unnest(pend) t) then
        txt := 'Te falta FIRMAR tu tarjeta de la liga. Ábrela y pulsa el botón grande. Faltan: ' || otros || '.';
        if _encolar(u, '✍️ Falta tu tarjeta', txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      else
        txt := 'Ya firmaste. Aún faltan por firmar: ' || otros || '. Avísales.';
        if _encolar(u, '⏳ Faltan tarjetas por firmar', txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      end if;
    end loop;
  end loop;
  return n;
end; $$;
revoke all on function public._avisos_tarjetas() from anon, authenticated;
-- Se lanza cada 5 minutos junto con el vaciado de la cola (solo en acgolf.es; en pruebas se lanza a mano):
--   select cron.schedule('avisos-tarjetas', '*/5 * * * *', 'select public._avisos_tarjetas(); select public._lanzar_avisos()');

-- ---------- Cartel rojo del Inicio: mis tarjetas sin firmar (y las de los demás) ----------
-- Devuelve las partidas de liga de los últimos 3 días donde el jugador ya terminó sus hoyos o alguien de su partida
-- todavía no tiene la tarjeta oficial: [{code, nombre, mia_pendiente, faltan:[nombres]}]
create or replace function public.mis_tarjetas_pendientes()
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare res jsonb := '[]'::jsonb; r record; nh int; pend text[]; mia_pend boolean; hechos_mios int;
begin
  if auth.uid() is null then return res; end if;
  for r in select rr.code, rr.round_name, rr.course_id, rr.match_groups, m.player_name from rounds rr
           join miembros m on m.grupo_id = rr.grupo_id and m.user_id = auth.uid()
           where rr.created_at > now() - interval '3 days' and rr.code is not null and jsonb_typeof(rr.match_groups) = 'array'
             and es_partida_liga(rr.code) loop
    nh := case when r.course_id ~ '-9v?$' then 9 else 18 end;
    with pl as (
      select (g.ord - 1)::int grupo, (p.ord - 1)::int idx, trim(p.name) nombre
      from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
           jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
      where trim(p.name) <> ''),
    est as (
      select pl.*,
        (select count(*) from marcas m where m.round_code = r.code and m.grupo = pl.grupo and m.jugador_idx = pl.idx and m.golpes is not null) hechos,
        exists (select 1 from tarjetas_validadas t where t.round_code = r.code and t.grupo = pl.grupo and t.jugador_idx = pl.idx) val
      from pl)
    select array_agg(nombre) filter (where not val),
           coalesce(bool_or(not val and hechos >= nh and sin_acentos(nombre) = sin_acentos(trim(r.player_name))), false),
           coalesce(max(hechos) filter (where sin_acentos(nombre) = sin_acentos(trim(r.player_name))), -1)
      into pend, mia_pend, hechos_mios from est;
    -- solo si yo juego en esa partida, alguien ya terminó y falta alguna tarjeta
    if hechos_mios < 0 or pend is null then continue; end if;
    if not exists (select 1 from marcas m where m.round_code = r.code and m.golpes is not null group by m.grupo, m.jugador_idx having count(*) >= nh) then continue; end if;
    res := res || jsonb_build_object('code', r.code, 'nombre', r.round_name, 'mia_pendiente', mia_pend, 'faltan', to_jsonb(pend));
  end loop;
  return res;
end; $$;
revoke all on function public.mis_tarjetas_pendientes() from anon;
grant execute on function public.mis_tarjetas_pendientes() to authenticated;
