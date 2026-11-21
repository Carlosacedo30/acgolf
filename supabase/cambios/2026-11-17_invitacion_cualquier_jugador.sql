-- 17-nov-2026 (norma de Carlos): cualquier jugador del grupo puede ver el enlace/QR de invitación y mandarlo.
-- Cambiar el enlace (p_nuevo = true) sigue siendo solo del administrador.
create or replace function public.invitacion_de_mi_grupo(p_nuevo boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare yo record;
begin
  select p.*, g.tipo into yo from perfiles p join grupos g on g.id = p.grupo_id where p.user_id = auth.uid();
  if yo is null or yo.tipo <> 'liga' then return null; end if;
  if p_nuevo and not yo.es_admin then return null; end if;
  if p_nuevo then update grupos set codigo_invitacion = upper(substr(md5(random()::text), 1, 8)) where id = yo.grupo_id; end if;
  return (select jsonb_build_object('grupo', nombre, 'codigo', codigo_invitacion) from grupos where id = yo.grupo_id);
end; $$;
