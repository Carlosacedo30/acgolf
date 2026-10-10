-- 2026-10-10 · PRUEBAS / acgolf.es · Cuentas «sin nombre» en el panel del super administrador
-- Son cuentas que se crearon pero nunca terminaron el alta (no confirmaron el correo o no eligieron nombre).
-- El panel ahora dice si confirmó el correo y deja reenviarle el correo o borrar la cuenta.

create or replace function public.sa_usuarios() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email,
      'nombre', coalesce((select player_name from perfiles where user_id = u.id), (select player_name from miembros where user_id = u.id limit 1), '(sin nombre)'),
      'sin_nombre', not exists (select 1 from perfiles where user_id = u.id) and not exists (select 1 from miembros where user_id = u.id),
      'confirmado', u.email_confirmed_at is not null,
      'creado', u.created_at,
      'super', exists (select 1 from super_admins s where s.user_id = u.id),
      'grupos', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre, 'rol', case when m.es_admin then 'group_admin' else 'user' end) order by g.nombre), '[]')
                 from miembros m join grupos g on g.id = m.grupo_id where m.user_id = u.id)
    ) order by u.email) from auth.users u), '[]');
end; $$;

-- Borrar una cuenta que nunca terminó el alta (sin grupo ni nombre). Las demás no se pueden borrar desde aquí.
create or replace function public.sa_borrar_usuario(p_user uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if p_user = auth.uid() then raise exception 'No puedes borrar tu propia cuenta desde aquí'; end if;
  if exists (select 1 from perfiles where user_id = p_user) or exists (select 1 from miembros where user_id = p_user) then
    raise exception 'Esa cuenta ya está en un grupo. Sácala antes del grupo.';
  end if;
  if exists (select 1 from super_admins where user_id = p_user) then raise exception 'Es super administrador'; end if;
  delete from auth.users where id = p_user;
end; $$;
revoke execute on function public.sa_borrar_usuario(uuid) from public, anon;
grant execute on function public.sa_borrar_usuario(uuid) to authenticated;
