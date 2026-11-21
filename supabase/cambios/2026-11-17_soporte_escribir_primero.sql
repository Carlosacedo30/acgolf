-- 17-nov-2026 · Soporte: el super administrador puede escribir primero a una persona.
-- Lista de cuentas para elegir a quién escribir (solo super administrador). La respuesta se manda con sa_soporte_responder (ya existe).
create or replace function public.sa_soporte_personas() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(x order by (x->>'sin_perfil') desc, x->>'alta' desc) from (
    select jsonb_build_object(
      'user_id', u.id,
      'nombre', coalesce(nullif(btrim(p.player_name), ''), nullif(btrim(u.raw_user_meta_data->>'nombre'), ''), split_part(u.email, '@', 1)),
      'email', u.email,
      'confirmado', u.email_confirmed_at is not null,
      'sin_perfil', (p.user_id is null or coalesce(btrim(p.player_name), '') = '' or p.grupo_id is null),
      'grupo', g.nombre,
      'alta', u.created_at
    ) x
    from auth.users u left join perfiles p on p.user_id = u.id left join grupos g on g.id = p.grupo_id
    order by u.created_at desc limit 500
  ) q), '[]');
end; $$;
revoke all on function public.sa_soporte_personas() from public, anon;
grant execute on function public.sa_soporte_personas() to authenticated;
