-- 2026-11-17 · «Publica tu Ryder»: cada grupo organiza la suya (norma de Carlos).
-- Quién puede ver y apuntarse a una inscripción:
--   · cualquier miembro del grupo que la creó,
--   · cualquiera con cuenta si el organizador encendió «Abrir a jugadores de otros grupos» (meta.abierta = true),
--   · en las inscripciones antiguas (sin meta.abierta, como la Sevilla–Betis) sigue la lista de grupos de ryder_ins_permitido().
create or replace function public.ryder_ins_puede(p_grupo uuid, p_mg jsonb) returns boolean
language plpgsql stable security definer set search_path to 'public' as $$
declare m jsonb := null; g jsonb;
begin
  if auth.uid() is null then return false; end if;
  if p_grupo is not null and exists (select 1 from miembros where user_id = auth.uid() and grupo_id = p_grupo) then return true; end if;
  for g in select * from jsonb_array_elements(coalesce(p_mg, '[]'::jsonb)) loop
    if g ? 'meta' then m := g->'meta'; end if;
  end loop;
  if m is not null and m ? 'abierta' then return coalesce((m->>'abierta')::boolean, false); end if;
  return ryder_ins_permitido();
end; $$;
revoke all on function public.ryder_ins_puede(uuid, jsonb) from public, anon;
grant execute on function public.ryder_ins_puede(uuid, jsonb) to authenticated;

create or replace function public.ryder_ins_leer(p_code text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare r record;
begin
  if not exists (select 1 from perfiles where user_id = auth.uid()) then return null; end if;
  select id, code, match_groups, updated_at, grupo_id into r from rounds
   where round_name = 'Inscripción Ryder' and course_id is null
     and ((p_code is not null and code = upper(p_code)) or (p_code is null and grupo_id = mi_grupo()))
   order by created_at desc limit 1;
  if not found then return null; end if;
  if not ryder_ins_puede(r.grupo_id, r.match_groups) then return null; end if;
  return jsonb_build_object('id', r.id, 'code', r.code, 'match_groups', r.match_groups, 'updated_at', r.updated_at);
end; $$;

create or replace function public.ryder_ins_apuntar(p_code text, p_equipo int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; nombre text; g jsonb; nuevo jsonb := '[]'::jsonb; pl jsonb; n text; cap text; cerrada boolean := false;
begin
  select player_name into nombre from perfiles where user_id = auth.uid();
  if nombre is null or btrim(nombre) = '' then raise exception 'Primero completa tu nombre en «Mi cuenta».'; end if;
  if p_equipo not in (0, 1, 2) then raise exception 'Equipo no válido'; end if;
  select * into r from rounds where code = upper(p_code) and round_name = 'Inscripción Ryder' and course_id is null for update;
  if not found then raise exception 'No se ha encontrado la inscripción.'; end if;
  if not ryder_ins_puede(r.grupo_id, r.match_groups) then raise exception 'Esta Ryder es solo para los jugadores del grupo que la organiza.'; end if;
  for g in select * from jsonb_array_elements(r.match_groups) loop
    if g ? 'meta' then cerrada := coalesce((g->'meta'->>'cerrada')::boolean, false); end if;
  end loop;
  if cerrada then raise exception 'La lista está cerrada.'; end if;
  for g in select * from jsonb_array_elements(r.match_groups) loop
    cap := g->>'capitan';
    if g ? 'equipo' and cap is not null and cap <> ''
       and lower(translate(cap, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = lower(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))
       and (g->>'equipo')::int <> p_equipo then
      raise exception 'Eres capitán de tu equipo y no puedes cambiar. Habla con el organizador.';
    end if;
  end loop;
  for g in select * from jsonb_array_elements(r.match_groups) loop
    if g ? 'equipo' then
      pl := '[]'::jsonb;
      for n in select jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) loop
        if lower(translate(n, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) <> lower(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) then pl := pl || to_jsonb(n); end if;
      end loop;
      if (g->>'equipo')::int = p_equipo then pl := pl || to_jsonb(nombre); end if;
      g := jsonb_set(g, '{players}', pl);
    end if;
    nuevo := nuevo || jsonb_build_array(g);
  end loop;
  update rounds set match_groups = nuevo, updated_at = now() where id = r.id;
  return (select jsonb_build_object('id', id, 'code', code, 'match_groups', match_groups, 'updated_at', updated_at) from rounds where id = r.id);
end; $$;
revoke all on function public.ryder_ins_leer(text) from public, anon;
revoke all on function public.ryder_ins_apuntar(text, int) from public, anon;
grant execute on function public.ryder_ins_leer(text) to authenticated;
grant execute on function public.ryder_ins_apuntar(text, int) to authenticated;

-- «Tus otros grupos» (Inicio): la Ryder sale si es de uno de MIS grupos, o es de las antiguas con lista de grupos permitidos
create or replace function public.avisos_otros_grupos() returns jsonb
language sql stable security definer set search_path to 'public' as $$
  with activo as (select grupo_id from perfiles where user_id = auth.uid()),
  mios as (
    select g.id, g.nombre, m.player_name jugador
    from miembros m join grupos g on g.id = m.grupo_id
    where m.user_id = auth.uid() and g.id <> coalesce((select grupo_id from activo), '00000000-0000-0000-0000-000000000000'::uuid)
      -- «Solo grupos donde juego» (Carlos, 17-nov): si solo eres administrador de un grupo y tu nombre no sale en ninguna partida suya del último año, no te avisa
      and (not m.es_admin or exists (select 1 from rounds r2 where r2.grupo_id = g.id and r2.created_at > now() - interval '12 months'
           and position(lower(m.player_name) in lower(r2.match_groups::text)) > 0))
  ),
  filas as (
    select 'convocatoria' tipo, mi.id gid, mi.nombre grupo, mi.jugador, r.code, r.match_groups, r.updated_at, r.created_at
      from rounds r join mios mi on mi.id = r.grupo_id
     where r.course_id is null and r.round_name = 'Convocatoria' and r.created_at > now() - interval '45 days'
    union all
    select 'liga', mi.id, mi.nombre, mi.jugador, r.code, r.match_groups, r.updated_at, r.created_at
      from rounds r join mios mi on mi.id = r.grupo_id
     where r.course_id is null and r.round_name = 'Liga de amigos' and r.created_at > now() - interval '8 months'
    union all
    select 'ryder', g.id, g.nombre, (select player_name from perfiles where user_id = auth.uid()), r.code, r.match_groups, r.updated_at, r.created_at
      from rounds r join grupos g on g.id = r.grupo_id
     where r.course_id is null and r.round_name = 'Inscripción Ryder'
       and r.grupo_id is distinct from (select grupo_id from activo)
       and r.created_at > now() - interval '8 months'
       and (exists (select 1 from mios mi where mi.id = r.grupo_id)
            or (not exists (select 1 from jsonb_array_elements(r.match_groups) e where e ? 'meta' and (e->'meta') ? 'abierta') and ryder_ins_permitido()))
  )
  select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'grupo_id', f.gid, 'grupo', f.grupo, 'jugador', f.jugador,
           'code', f.code, 'match_groups', f.match_groups, 'updated_at', f.updated_at) order by f.created_at desc), '[]'::jsonb)
  from filas f;
$$;
revoke all on function public.avisos_otros_grupos() from public, anon;
grant execute on function public.avisos_otros_grupos() to authenticated;
