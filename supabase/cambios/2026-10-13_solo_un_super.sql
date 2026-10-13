-- 2026-10-13 · PRUEBAS / acgolf.es · Un solo super administrador: Carlos
-- Ya no se puede nombrar a nadie más super administrador desde la app. Se puede volver a ejecutar.
create or replace function public.sa_cambiar_rol(p_user uuid, p_rol text, p_grupo uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if p_rol in ('super_admin', 'no_super') then
    raise exception 'El super administrador es único y no se puede cambiar';
  elsif p_rol in ('group_admin', 'user') then
    if p_grupo is null then raise exception 'Falta el grupo'; end if;
    if p_rol = 'group_admin' then perform _meter_en_grupo(p_user, p_grupo, true); end if;
    update miembros set es_admin = (p_rol = 'group_admin') where user_id = p_user and grupo_id = p_grupo;
    perform _sync_perfil_admin(p_user);
  else
    raise exception 'Rol no válido';
  end if;
end; $$;
