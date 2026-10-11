-- 2026-10-11 · Contador de jugadores que usan la app (solo lo ve el super administrador)
-- Devuelve cuántas cuentas hay, cuántas han entrado esta semana y hoy, y cuántos jugadores hay en cada grupo (cada uno contado una sola vez).
create or replace function public.contador_app() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_super_admin() then return null; end if;
  return jsonb_build_object(
    'jugadores', (select count(*) from perfiles),
    'sin_terminar', (select count(*) from auth.users u where not exists (select 1 from perfiles p where p.user_id = u.id)),
    -- «han usado la app»: la sesión del móvil se renueva sola mientras se usa
    'semana', (select count(distinct s.user_id) from auth.sessions s join perfiles p on p.user_id = s.user_id where coalesce(s.refreshed_at, s.updated_at) > now() - interval '7 days'),
    'hoy', (select count(distinct s.user_id) from auth.sessions s join perfiles p on p.user_id = s.user_id
            where coalesce(s.refreshed_at, s.updated_at) > (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')),
    -- Cada jugador cuenta UNA sola vez: en el grupo de liga que tiene abierto; si tiene abierto el personal,
    -- en el primer grupo de liga al que se unió; si no está en ninguno, en «solo sus partidas».
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
