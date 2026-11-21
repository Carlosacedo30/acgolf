-- 2026-11-17 · Inicio: avisos de TODOS mis grupos (norma de Carlos, 17-nov-2026).
-- Devuelve lo que hay abierto en los OTROS grupos donde juega la persona (no el grupo activo):
--   · partidas organizadas (round_name 'Convocatoria') que aún no han pasado,
--   · ligas ('Liga de amigos') creadas en los últimos 8 meses,
--   · la inscripción a la Ryder ('Inscripción Ryder') si la persona está en un grupo permitido (ryder_ins_permitido()).
-- Solo lectura, solo de grupos de los que la persona es miembro. 'jugador' = cómo se llama ella en ese grupo.
create or replace function public.avisos_otros_grupos() returns jsonb
language sql stable security definer set search_path to 'public' as $$
  with activo as (select grupo_id from perfiles where user_id = auth.uid()),
  mios as (
    select g.id, g.nombre, m.player_name jugador
    from miembros m join grupos g on g.id = m.grupo_id
    where m.user_id = auth.uid() and g.id <> coalesce((select grupo_id from activo), '00000000-0000-0000-0000-000000000000'::uuid)
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
     where r.course_id is null and r.round_name = 'Inscripción Ryder' and ryder_ins_permitido()
       and r.grupo_id is distinct from (select grupo_id from activo)
       and r.created_at > now() - interval '8 months'
  )
  select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'grupo_id', f.gid, 'grupo', f.grupo, 'jugador', f.jugador,
           'code', f.code, 'match_groups', f.match_groups, 'updated_at', f.updated_at) order by f.created_at desc), '[]'::jsonb)
  from filas f;
$$;
revoke all on function public.avisos_otros_grupos() from public, anon;
grant execute on function public.avisos_otros_grupos() to authenticated;
