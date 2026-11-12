-- 2026-11-12 · Norma de Carlos: ninguna tarjeta puede quedar sin cerrar.
-- · A las 3 horas de que termine el primero de la partida, el sistema cierra solo las tarjetas que COINCIDEN
--   (lo apuntado por el jugador y por su marcador es igual, hoyo a hoyo). Queda anotado: origen = 'sistema'.
-- · Las que no coinciden o tienen hoyos sin apuntar salen en la lista del administrador, que las cierra (origen = 'administrador').
-- Se lanza cada 5 minutos:  select cron.schedule('cerrar-tarjetas-auto', '*/5 * * * *', 'select public._cerrar_tarjetas_auto(); select public._lanzar_avisos()');
alter table public.tarjetas_validadas add column if not exists origen text;
alter table public.tarjetas_validadas add column if not exists nota text;

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
    if primero is null or now() < primero + interval '3 hours' then continue; end if;
    for q in select (g.ord - 1)::int grupo, (p.ord - 1)::int idx, trim(p.name) nombre
             from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
                  jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
             where trim(p.name) <> '' loop
      if exists (select 1 from tarjetas_validadas t where t.round_code = r.code and t.grupo = q.grupo and t.jugador_idx = q.idx) then continue; end if;
      if not _tarjeta_ok(r.code, q.grupo, q.idx) then continue; end if;
      insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name, origen, nota)
      values (r.code, q.grupo, q.idx, q.nombre, 'sistema', 'Cerrada por el sistema a las 3 horas: los golpes coincidían')
      on conflict do nothing;
      n := n + 1;
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(q.nombre) loop
        perform _encolar(u, '✅ Tarjeta cerrada', 'Tu tarjeta de la liga se cerró sola porque tus golpes y los de tu marcador coincidían.', '?partida=' || r.code, 'cierre-' || r.code);
      end loop;
    end loop;
  end loop;
  return n;
end; $$;
revoke all on function public._cerrar_tarjetas_auto() from anon, authenticated;

-- Lista del administrador: tarjetas sin cerrar de sus grupos (últimos 14 días)
create or replace function public.tarjetas_sin_cerrar_admin()
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare res jsonb := '[]'::jsonb; r record; q record; nh int; hechos int; motivo text;
begin
  if auth.uid() is null then return res; end if;
  for r in select rr.code, rr.round_name, rr.course_id, rr.match_groups, rr.created_at from rounds rr
           where rr.created_at > now() - interval '14 days' and rr.code is not null and jsonb_typeof(rr.match_groups) = 'array'
             and exists (select 1 from miembros m where m.grupo_id = rr.grupo_id and m.user_id = auth.uid() and m.es_admin)
             and es_partida_liga(rr.code) order by rr.created_at desc loop
    nh := case when r.course_id ~ '-9v?$' then 9 else 18 end;
    for q in select (g.ord - 1)::int grupo, (p.ord - 1)::int idx, trim(p.name) nombre
             from jsonb_array_elements(r.match_groups) with ordinality g(v, ord),
                  jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
             where trim(p.name) <> '' loop
      if exists (select 1 from tarjetas_validadas t where t.round_code = r.code and t.grupo = q.grupo and t.jugador_idx = q.idx) then continue; end if;
      select count(*) into hechos from marcas m where m.round_code = r.code and m.grupo = q.grupo and m.jugador_idx = q.idx and m.golpes is not null;
      -- solo si en esa partida ya terminó alguien (si no, aún se está jugando)
      if not exists (select 1 from marcas m where m.round_code = r.code and m.golpes is not null group by m.grupo, m.jugador_idx having count(*) >= nh) then continue; end if;
      motivo := case when not exists (select 1 from marcadores k where k.round_code = r.code and k.grupo = q.grupo and k.jugador_idx = q.idx) then 'sin_marcador'
                     when hechos < nh then 'faltan_hoyos'
                     when not _tarjeta_ok(r.code, q.grupo, q.idx) then 'no_coincide'
                     else 'sin_firmar' end;
      res := res || jsonb_build_object('code', r.code, 'nombre', r.round_name, 'grupo', q.grupo, 'idx', q.idx, 'jugador', q.nombre, 'motivo', motivo);
    end loop;
  end loop;
  return res;
end; $$;
revoke all on function public.tarjetas_sin_cerrar_admin() from anon;
grant execute on function public.tarjetas_sin_cerrar_admin() to authenticated;

-- El administrador cierra una tarjeta (queda anotado que la cerró él)
create or replace function public.cerrar_tarjeta_admin(p_code text, p_grupo int, p_idx int)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_nombre text;
begin
  if not exists (select 1 from rounds r join miembros m on m.grupo_id = r.grupo_id and m.user_id = auth.uid() and m.es_admin where r.code = p_code) then
    raise exception 'Solo el administrador puede cerrar tarjetas';
  end if;
  select trim(p.name) into v_nombre from rounds r cross join lateral jsonb_array_elements_text(r.match_groups->p_grupo->'players') with ordinality p(name, ord)
   where r.code = p_code and p.ord - 1 = p_idx;
  if v_nombre is null then raise exception 'No existe ese jugador en la partida'; end if;
  insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name, origen, nota)
  values (p_code, p_grupo, p_idx, v_nombre, 'administrador', 'Cerrada por el administrador')
  on conflict do nothing;
  return true;
end; $$;
revoke all on function public.cerrar_tarjeta_admin(text, int, int) from anon;
grant execute on function public.cerrar_tarjeta_admin(text, int, int) to authenticated;
