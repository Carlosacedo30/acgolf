-- 2026-11-14 · Norma de Carlos: quien no entrega su tarjeta, pasada 1 HORA (antes eran 3) desde que termina el primero,
-- si los golpes coinciden hoyo a hoyo con los de su marcador, la tarjeta se entrega sola (origen = 'sistema').
-- SOLO pruebas (qjtsjcfalettgvrlwwnr). En la base REAL solo con permiso de Carlos.
create or replace function public._cerrar_tarjetas_auto()
 returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; q record; n int := 0; nh int; primero timestamptz; u uuid;
begin
  for r in select code, grupo_id, course_id, match_groups from rounds
           where created_at > now() - interval '3 days' and code is not null and grupo_id is not null
             and jsonb_typeof(match_groups) = 'array' and es_partida_liga(code) loop
    nh := case when r.course_id ~ '-9v?$' then 9 else 18 end;
    select min(ult) into primero from (
      select (select max(m.updated_at) from marcas m where m.round_code = r.code and m.grupo = (g.ord - 1)::int and m.jugador_idx = (p.ord - 1)::int) ult,
             (select count(*) from marcas m where m.round_code = r.code and m.grupo = (g.ord - 1)::int and m.jugador_idx = (p.ord - 1)::int and m.golpes is not null) hechos
      from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
           jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
      where trim(p.name) <> '') z where hechos >= nh;
    if primero is null or now() < primero + interval '1 hour' then continue; end if;
    for q in select (g.ord - 1)::int grupo, (p.ord - 1)::int idx, trim(p.name) nombre
             from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
                  jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
             where trim(p.name) <> '' loop
      if exists (select 1 from tarjetas_validadas t where t.round_code = r.code and t.grupo = q.grupo and t.jugador_idx = q.idx) then continue; end if;
      if not _tarjeta_ok(r.code, q.grupo, q.idx) then continue; end if;
      insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name, origen, nota)
      values (r.code, q.grupo, q.idx, q.nombre, 'sistema', 'Entregada por el sistema a la hora: los golpes coincidían')
      on conflict do nothing;
      n := n + 1;
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(q.nombre) loop
        perform _encolar(u, '✅ Tarjeta cerrada', 'Tu tarjeta de la liga se entregó sola porque tus golpes y los de tu marcador coincidían.', '?partida=' || r.code, 'cierre-' || r.code);
      end loop;
    end loop;
  end loop;
  return n;
end; $$;
