-- 2026-10-26 · Al tocar un aviso del móvil se abre la página de la que habla
-- · «Mañana juegas»      → abre esa convocatoria (?conv=CODIGO)
-- · «Ganador de la semana» → abre Ganadores en esa semana (?ver=ganadores&semana=AAAA-MM-DD)
-- · «Hándicap actualizado» → abre Mi hándicap (?ver=handicap)
-- («Nueva partida» ya abría la partida con ?partida=CODIGO.)
-- Solo cambia la dirección del aviso; el resto de cada función queda igual.

create or replace function public._avisos_recordatorio()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare r record; s record; manana date := ((now() at time zone 'Europe/Madrid')::date + 1); n int := 0; u uuid; meta jsonb;
begin
  if extract(hour from now() at time zone 'Europe/Madrid') <> 20 then return 0; end if;
  for r in select id, code, grupo_id, match_groups from rounds where course_id is null and round_name = 'Convocatoria' and created_at > now() - interval '60 days' loop
    select g->'meta' into meta from jsonb_array_elements(r.match_groups) g where g ? 'meta' limit 1;
    if meta is null or meta->>'date' is distinct from manana::text then continue; end if;
    if not (insert_aviso_hecho('recordatorio:' || r.id || ':' || manana)) then continue; end if;
    for s in select g->>'time' hora, p jugador from jsonb_array_elements(r.match_groups) g, jsonb_array_elements_text(coalesce(g->'players','[]'::jsonb)) p
             where coalesce(g->>'time', '') <> '' and trim(p) <> '' loop
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(s.jugador)) loop
        if _encolar(u, '⛳ Mañana juegas', 'Mañana juegas en ' || _nombre_campo(meta->>'courseId') || ' a las ' || regexp_replace(s.hora, '^0', '') || '. ¡Buen golf!', '?conv=' || r.code, 'recordatorio-' || r.id) then n := n + 1; end if;
      end loop;
    end loop;
  end loop;
  return n;
end; $$;

create or replace function public._avisos_ganador()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare g record; p jsonb; lunes date := (date_trunc('week', now() at time zone 'Europe/Madrid')::date - 7); n int := 0; u uuid; texto text;
begin
  if extract(isodow from now() at time zone 'Europe/Madrid') <> 1 or extract(hour from now() at time zone 'Europe/Madrid') <> 10 then return 0; end if;
  for g in select id, nombre from grupos where tipo = 'liga' loop
    perform set_config('acgolf.grupo', g.id::text, true);
    p := premios_semana(lunes);
    if p is null or p->'iscariote' is null or jsonb_typeof(p->'iscariote') = 'null' then continue; end if;
    if not insert_aviso_hecho('ganador:' || g.id || ':' || lunes) then continue; end if;
    texto := (p->'iscariote'->>'jugador') || ' es el ' || _nombre_campeon(g.nombre) || ' de la semana con ' || (p->'iscariote'->>'neto') || ' netos. Toca para ver todos los premios.';
    for u in select distinct user_id from miembros where grupo_id = g.id loop
      if _encolar(u, '🏆 ' || _nombre_campeon(g.nombre) || ' de la semana', texto, '?ver=ganadores&semana=' || lunes, 'ganador-' || lunes) then n := n + 1; end if;
    end loop;
  end loop;
  perform set_config('acgolf.grupo', '', true);
  return n;
end; $$;

create or replace function public._aviso_handicap()
 returns trigger language plpgsql security definer set search_path to 'public' as $$
declare u uuid;
begin
  if new.hcp_antes is not distinct from new.hcp_despues or new.grupo_id is null then return new; end if;
  for u in select m.user_id from miembros m where m.grupo_id = new.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(new.player_name)) loop
    perform _encolar(u, '⛳ Hándicap actualizado',
      'Tu hándicap ha ' || case when new.hcp_despues < new.hcp_antes then 'bajado' else 'subido' end || ' de ' || replace(to_char(new.hcp_antes, 'FM990.0'), '.', ',')
      || ' a ' || replace(to_char(new.hcp_despues, 'FM990.0'), '.', ',') || case when new.hcp_despues < new.hcp_antes then '. ¡Enhorabuena!' else '.' end,
      '?ver=handicap', 'hcp');
  end loop;
  return new;
exception when others then return new;  -- un fallo en el aviso nunca debe frenar el cálculo del hándicap
end; $$;
