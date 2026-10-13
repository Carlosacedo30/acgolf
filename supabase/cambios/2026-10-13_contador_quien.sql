-- 2026-10-13 · Contador (solo super administrador): además de cuántos, quién ha usado la app hoy y esta semana
create or replace function public.contador_app() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare hoy0 timestamptz := (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid');
begin
  if not es_super_admin() then return null; end if;
  return jsonb_build_object(
    'jugadores', (select count(*) from perfiles),
    'sin_terminar', (select count(*) from auth.users u where not exists (select 1 from perfiles p where p.user_id = u.id)),
    'semana', (select count(distinct s.user_id) from auth.sessions s join perfiles p on p.user_id = s.user_id where coalesce(s.refreshed_at, s.updated_at) > now() - interval '7 days'),
    'hoy', (select count(distinct s.user_id) from auth.sessions s join perfiles p on p.user_id = s.user_id
            where coalesce(s.refreshed_at, s.updated_at) > hoy0),
    -- Quién: nombre, grupo que tiene abierto y última vez (hora de Madrid), el más reciente primero
    'hoy_lista', coalesce((select jsonb_agg(jsonb_build_object('jugador', x.player_name, 'grupo', x.grupo, 'hora', to_char(x.ultima at time zone 'Europe/Madrid', 'HH24:MI')) order by x.ultima desc) from (
        select p.player_name, (select g.nombre from grupos g where g.id = p.grupo_id) as grupo, max(coalesce(s.refreshed_at, s.updated_at)) as ultima
        from auth.sessions s join perfiles p on p.user_id = s.user_id
        where coalesce(s.refreshed_at, s.updated_at) > hoy0
        group by p.user_id, p.player_name, p.grupo_id) x), '[]'::jsonb),
    'semana_lista', coalesce((select jsonb_agg(jsonb_build_object('jugador', x.player_name, 'grupo', x.grupo, 'dia', to_char(x.ultima at time zone 'Europe/Madrid', 'DD/MM HH24:MI')) order by x.ultima desc) from (
        select p.player_name, (select g.nombre from grupos g where g.id = p.grupo_id) as grupo, max(coalesce(s.refreshed_at, s.updated_at)) as ultima
        from auth.sessions s join perfiles p on p.user_id = s.user_id
        where coalesce(s.refreshed_at, s.updated_at) > now() - interval '7 days'
        group by p.user_id, p.player_name, p.grupo_id) x), '[]'::jsonb),
    'grupos', coalesce((select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'jugadores', x.n) order by x.n desc, x.nombre) from (
        select g.nombre, count(*) as n from (
          select coalesce(
            (select pg.id from grupos pg where pg.id = p.grupo_id and pg.tipo = 'liga'),
            (select m.grupo_id from miembros m join grupos g2 on g2.id = m.grupo_id where m.user_id = p.user_id and g2.tipo = 'liga' order by m.unido_en limit 1)
          ) as gid from perfiles p) c
        join grupos g on g.id = c.gid group by g.nombre) x), '[]'::jsonb),
    'solo_personal', (select count(*) from perfiles p where not exists (select 1 from miembros m join grupos g on g.id = m.grupo_id where m.user_id = p.user_id and g.tipo = 'liga'))
  );
end $$;
revoke execute on function public.contador_app() from public, anon;
grant execute on function public.contador_app() to authenticated;
