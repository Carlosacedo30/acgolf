-- 2026-11-16 · Promociones: ahora también salen (y reciben el correo) las cuentas que se registraron pero no llegaron a poner nombre ni grupo.
-- Antes la lista de personas salía solo de «perfiles» y esas cuentas no aparecían. Ahora sale de las cuentas (auth.users) y el perfil es opcional.
-- Para las que no tienen perfil: nombre = el que escribieron al registrarse (si lo hay), sin grupo, tipo 'S' (sin grupo), «Novedades» encendidas.
create or replace function public.sa_promo_candidatos(p_promo uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', t.user_id, 'nombre', t.nombre, 'correo', t.correo, 'grupo', t.grupo, 'desde', t.desde,
      'tipo', t.tipo, 'solo', t.solo, 'ya', t.ya, 'sin_novedades', t.sin_novedades) order by t.desde desc)
    from (
      select u.id as user_id,
        coalesce(nullif(btrim(p.player_name), ''), nullif(btrim(u.raw_user_meta_data->>'nombre'), '')) as nombre,
        lower(u.email) as correo, g.nombre as grupo, u.created_at as desde,
        case when p.user_id is null then 'S' when coalesce(g.creado_por = p.user_id, m.es_admin, false) then 'A' else 'B' end as tipo,
        coalesce((select count(*) from miembros x where x.grupo_id = g.id) = 1, false) as solo,
        exists (select 1 from promos_enviadas_a e where e.promocion_id = p_promo and e.user_id = u.id) as ya,
        coalesce(p.sin_novedades, false) as sin_novedades
      from auth.users u
      left join perfiles p on p.user_id = u.id
      left join grupos g on g.id = p.grupo_id
      left join miembros m on m.user_id = u.id and m.grupo_id = p.grupo_id
      where u.email is not null and lower(u.email) not like '%@acgolf.es'
    ) t), '[]');
end; $$;

create or replace function public._promo_para_ids(p_ids uuid[], p_promo uuid)
returns table(user_id uuid, email text, nombre text, grupo text)
language sql security definer set search_path to 'public' as $$
  select u.id, lower(u.email),
         coalesce(nullif(btrim(p.player_name), ''), nullif(btrim(u.raw_user_meta_data->>'nombre'), '')),
         g.nombre
  from auth.users u
  left join perfiles p on p.user_id = u.id
  left join grupos g on g.id = p.grupo_id
  where u.id = any(p_ids) and u.email is not null and lower(u.email) not like '%@acgolf.es'
    and (not coalesce((select r.solo_novedades from promociones r where r.id = p_promo), false) or not coalesce(p.sin_novedades, false))
    and not exists (select 1 from promos_enviadas_a e where e.promocion_id = p_promo and e.user_id = u.id)
  order by lower(u.email);
$$;
