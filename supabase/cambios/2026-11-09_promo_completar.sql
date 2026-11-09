-- 2026-11-09 · Al enviar a «un grupo», «todos» o «una persona», cada correo lleva su nombre y el nombre de su grupo.
create or replace function public._promo_completar(p_emails text[], p_grupo uuid default null)
returns table(email text, user_id uuid, nombre text, grupo text)
language sql security definer set search_path to 'public' as $$
  select distinct on (lower(u.email)) lower(u.email), p.user_id, p.player_name,
         coalesce((select g.nombre from grupos g where g.id = p_grupo), g2.nombre)
  from auth.users u
  join perfiles p on p.user_id = u.id
  left join grupos g2 on g2.id = p.grupo_id
  where lower(u.email) = any (select lower(x) from unnest(p_emails) x)
  order by lower(u.email);
$$;
revoke execute on function public._promo_completar(text[], uuid) from public, anon, authenticated;
grant execute on function public._promo_completar(text[], uuid) to service_role;
