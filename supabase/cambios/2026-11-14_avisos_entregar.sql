-- 2026-11-14 · Avisos de tarjetas: «entregar» en vez de «firmar» y nombres completos (norma de Carlos). Solo cambia los textos.
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
    select string_agg(x, ', ') into otros from unnest(pend) x;
    for u, nom in select m.user_id, m.player_name from miembros m
                  where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) in (select sin_acentos(trim(t)) from unnest(todos) t) loop
      if sin_acentos(trim(nom)) in (select sin_acentos(trim(t)) from unnest(pend) t) then
        txt := 'Te falta ENTREGAR tu tarjeta de la liga. Ábrela y pulsa ENTREGAR TARJETA. Faltan: ' || otros || '.';
        if _encolar(u, '✍️ Falta tu tarjeta', txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      else
        txt := 'Ya entregaste tu tarjeta. Aún faltan por entregar: ' || otros || '. Avísales.';
        if _encolar(u, '⏳ Faltan tarjetas por entregar', txt, '?partida=' || r.code, 'tarjetas-' || r.code) then n := n + 1; end if;
      end if;
    end loop;
  end loop;
  return n;
end; $$;
revoke all on function public._avisos_tarjetas() from anon, authenticated;
