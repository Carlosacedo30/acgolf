-- 2026-10-10 · PRUEBAS / acgolf.es · Roles (RBAC) sobre las tablas que ya existen
--   super_admin  → tabla super_admins (ve y gestiona todo)
--   group_admin  → miembros.es_admin = true (gestiona solo su grupo)
--   user         → miembros.es_admin = false (solo ve su grupo)
-- Equivalencias con la petición: users = perfiles + auth.users · groups = grupos · group_members = miembros
-- Se puede volver a ejecutar sin romper nada (idempotente).

-- ===================== 1. Rol super_admin =====================
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);
alter table public.super_admins enable row level security;
drop policy if exists "super_admins: solo super" on public.super_admins;

create or replace function public.es_super_admin() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

create or replace function public.soy_admin_de(p_grupo uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from miembros where user_id = auth.uid() and grupo_id = p_grupo and es_admin);
$$;

create policy "super_admins: solo super" on public.super_admins for select to authenticated using (es_super_admin());

-- ===================== 2. Reglas de lectura por rol =====================
-- grupos: super ve todos; admin y usuario ven el suyo (la regla «grupo propio» ya existe)
drop policy if exists "grupos: super ve todos" on public.grupos;
create policy "grupos: super ve todos" on public.grupos for select to authenticated using (es_super_admin());
drop policy if exists "grupos: los míos" on public.grupos;
create policy "grupos: los míos" on public.grupos for select to authenticated
  using (exists (select 1 from miembros m where m.grupo_id = grupos.id and m.user_id = auth.uid()));

-- miembros: super ve todos; admin ve los de su grupo; usuario solo su fila (la regla «mis membresias» ya existe)
drop policy if exists "miembros: super ve todos" on public.miembros;
create policy "miembros: super ve todos" on public.miembros for select to authenticated using (es_super_admin());
drop policy if exists "miembros: admin ve su grupo" on public.miembros;
create policy "miembros: admin ve su grupo" on public.miembros for select to authenticated using (soy_admin_de(grupo_id));

-- perfiles (users): super ve todos; los demás solo el suyo (la regla «perfil propio lectura» ya existe)
drop policy if exists "perfiles: super ve todos" on public.perfiles;
create policy "perfiles: super ve todos" on public.perfiles for select to authenticated using (es_super_admin());

-- Las escrituras siguen yendo solo por funciones que comprueban el rol (no hay reglas de escritura directa).

-- ===================== 3. Ayudantes internos =====================
-- Mete a un usuario en un grupo (crea su jugador en el grupo si no existe)
create or replace function public._meter_en_grupo(p_user uuid, p_grupo uuid, p_admin boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
declare nm text; h numeric;
begin
  select coalesce((select player_name from perfiles where user_id = p_user),
                  (select player_name from miembros where user_id = p_user order by unido_en limit 1),
                  initcap(split_part((select email from auth.users where id = p_user), '@', 1))) into nm;
  if exists (select 1 from miembros where user_id = p_user and grupo_id = p_grupo) then
    update miembros set es_admin = p_admin or es_admin where user_id = p_user and grupo_id = p_grupo;
    return;
  end if;
  select lp.hcp into h from league_players lp join miembros m on m.grupo_id = lp.grupo_id and m.player_name = lp.name
    where m.user_id = p_user and lp.hcp is not null order by m.unido_en desc limit 1;
  insert into league_players (grupo_id, name, hcp, hcp_base, active) values (p_grupo, nm, h, h, true)
    on conflict (grupo_id, name) do update set active = true;
  insert into miembros (user_id, grupo_id, player_name, es_admin, unido_en) values (p_user, p_grupo, nm, p_admin, now());
  -- si aún no tenía grupo activo, este pasa a serlo
  if not exists (select 1 from perfiles where user_id = p_user) then
    insert into perfiles (user_id, player_name, es_admin, privacidad_version, grupo_id)
      values (p_user, nm, p_admin, 'admin-alta', p_grupo);
  end if;
end; $$;

-- Saca a un usuario de un grupo (si estaba dentro, pasa a otro de sus grupos o vuelve a la bienvenida)
create or replace function public._sacar_de_grupo(p_user uuid, p_grupo uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare otro record;
begin
  delete from miembros where user_id = p_user and grupo_id = p_grupo;
  if exists (select 1 from perfiles where user_id = p_user and grupo_id = p_grupo) then
    select * into otro from miembros where user_id = p_user order by unido_en desc limit 1;
    if otro is null then delete from perfiles where user_id = p_user;
    else update perfiles set grupo_id = otro.grupo_id, player_name = otro.player_name, es_admin = otro.es_admin where user_id = p_user;
    end if;
  end if;
end; $$;

-- Mantiene perfiles.es_admin al día con el grupo activo
create or replace function public._sync_perfil_admin(p_user uuid) returns void
language sql security definer set search_path to 'public' as $$
  update perfiles p set es_admin = coalesce((select m.es_admin from miembros m where m.user_id = p.user_id and m.grupo_id = p.grupo_id), false)
  where p.user_id = p_user;
$$;

-- ===================== 4. Panel super_admin =====================
create or replace function public.sa_grupos() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', g.id, 'nombre', g.nombre, 'tipo', g.tipo, 'creado', g.creado_en,
      'miembros', (select count(*) from miembros m where m.grupo_id = g.id),
      'admins', (select coalesce(jsonb_agg(m.player_name order by m.player_name), '[]') from miembros m where m.grupo_id = g.id and m.es_admin)
    ) order by g.tipo desc, g.nombre) from grupos g), '[]');
end; $$;

create or replace function public.sa_usuarios() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email,
      'nombre', coalesce((select player_name from perfiles where user_id = u.id), (select player_name from miembros where user_id = u.id limit 1), '(sin nombre)'),
      'super', exists (select 1 from super_admins s where s.user_id = u.id),
      'grupos', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre, 'rol', case when m.es_admin then 'group_admin' else 'user' end) order by g.nombre), '[]')
                 from miembros m join grupos g on g.id = m.grupo_id where m.user_id = u.id)
    ) order by u.email) from auth.users u), '[]');
end; $$;

create or replace function public.sa_crear_grupo(p_nombre text, p_admin_email text default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare g uuid; u uuid;
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Ponle un nombre al grupo'; end if;
  insert into grupos (nombre, tipo, creado_por) values (trim(p_nombre), 'liga', auth.uid()) returning id into g;
  if coalesce(trim(p_admin_email), '') <> '' then
    select id into u from auth.users where lower(email) = lower(trim(p_admin_email));
    if u is null then raise exception 'Ese correo no tiene cuenta en acgolf'; end if;
    perform _meter_en_grupo(u, g, true);
  end if;
  return g;
end; $$;

create or replace function public.sa_borrar_grupo(p_grupo uuid) returns text
language plpgsql security definer set search_path to 'public' as $$
declare g record; p record; otro record;
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  select * into g from grupos where id = p_grupo;
  if g is null then raise exception 'Ese grupo no existe'; end if;
  if g.id = '00000000-0000-0000-0000-000000000001' then raise exception 'Los Iscariotes no se pueden borrar'; end if;
  insert into respaldo.grupos_borrados (grupo_id, nombre, borrado_por, copia) values (g.id, g.nombre, auth.uid(), jsonb_build_object(
    'grupo', to_jsonb(g),
    'miembros', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from miembros x where x.grupo_id = g.id),
    'jugadores', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from league_players x where x.grupo_id = g.id),
    'partidas', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from rounds x where x.grupo_id = g.id)));
  for p in select user_id from miembros where grupo_id = g.id loop perform _sacar_de_grupo(p.user_id, g.id); end loop;
  delete from normas_aceptacion where grupo_id = g.id;
  delete from player_handicaps where grupo_id = g.id;
  delete from handicap_historial where grupo_id = g.id;
  delete from gd_history where grupo_id = g.id;
  delete from rounds where grupo_id = g.id;
  delete from league_players where grupo_id = g.id;
  delete from grupos where id = g.id;
  return g.nombre;
end; $$;

-- Cambiar rol: 'super_admin' (global), o 'group_admin' / 'user' dentro de un grupo
create or replace function public.sa_cambiar_rol(p_user uuid, p_rol text, p_grupo uuid default null) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if p_rol = 'super_admin' then
    insert into super_admins (user_id) values (p_user) on conflict do nothing;
  elsif p_rol = 'no_super' then
    if p_user = auth.uid() then raise exception 'No puedes quitarte a ti mismo el super administrador'; end if;
    delete from super_admins where user_id = p_user;
  elsif p_rol in ('group_admin', 'user') then
    if p_grupo is null then raise exception 'Falta el grupo'; end if;
    if p_rol = 'group_admin' then perform _meter_en_grupo(p_user, p_grupo, true); end if;
    update miembros set es_admin = (p_rol = 'group_admin') where user_id = p_user and grupo_id = p_grupo;
    perform _sync_perfil_admin(p_user);
  else
    raise exception 'Rol no válido';
  end if;
end; $$;

-- ===================== 5. Panel group_admin (y el super también puede usarlo) =====================
create or replace function public.ga_miembros(p_grupo uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not (es_super_admin() or soy_admin_de(p_grupo)) then raise exception 'Solo el administrador del grupo'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'nombre', m.player_name, 'email', u.email,
      'rol', case when m.es_admin then 'group_admin' else 'user' end, 'desde', m.unido_en) order by m.es_admin desc, m.player_name)
    from miembros m join auth.users u on u.id = m.user_id where m.grupo_id = p_grupo), '[]');
end; $$;

create or replace function public.ga_anadir(p_grupo uuid, p_email text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare u uuid;
begin
  if not (es_super_admin() or soy_admin_de(p_grupo)) then raise exception 'Solo el administrador del grupo'; end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then raise exception 'Ese correo aún no tiene cuenta. Mándale el enlace de invitación del grupo.'; end if;
  if exists (select 1 from miembros where user_id = u and grupo_id = p_grupo) then raise exception 'Ya está en el grupo'; end if;
  perform _meter_en_grupo(u, p_grupo, false);
  return (select player_name from miembros where user_id = u and grupo_id = p_grupo);
end; $$;

create or replace function public.ga_quitar(p_grupo uuid, p_user uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not (es_super_admin() or soy_admin_de(p_grupo)) then raise exception 'Solo el administrador del grupo'; end if;
  if p_user = auth.uid() and not es_super_admin() then raise exception 'No puedes quitarte a ti mismo'; end if;
  if (select es_admin from miembros where user_id = p_user and grupo_id = p_grupo)
     and (select count(*) from miembros where grupo_id = p_grupo and es_admin) = 1 then
    raise exception 'Es el único administrador del grupo: nombra otro antes de quitarlo';
  end if;
  perform _sacar_de_grupo(p_user, p_grupo);
end; $$;

-- ===================== 6. mi_perfil dice también si soy super_admin =====================
create or replace function public.mi_perfil() returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select to_jsonb(x) from (
    select p.player_name, p.es_admin, p.privacidad_version, p.privacidad_aceptada_en, u.email, p.grupo_id,
           g.nombre as grupo, g.tipo as grupo_tipo, g.marca as grupo_marca,
           (select count(*) from miembros m where m.user_id = p.user_id) as num_grupos,
           exists (select 1 from super_admins s where s.user_id = p.user_id) as es_super
    from perfiles p join auth.users u on u.id = p.user_id join grupos g on g.id = p.grupo_id where p.user_id = auth.uid()
  ) x;
$$;

-- ===================== 7. Permisos =====================
revoke execute on function public._meter_en_grupo(uuid,uuid,boolean), public._sacar_de_grupo(uuid,uuid), public._sync_perfil_admin(uuid)
  from public, anon, authenticated;
revoke execute on function public.es_super_admin(), public.soy_admin_de(uuid), public.sa_grupos(), public.sa_usuarios(),
  public.sa_crear_grupo(text,text), public.sa_borrar_grupo(uuid), public.sa_cambiar_rol(uuid,text,uuid),
  public.ga_miembros(uuid), public.ga_anadir(uuid,text), public.ga_quitar(uuid,uuid), public.mi_perfil() from public, anon;
grant execute on function public.es_super_admin(), public.soy_admin_de(uuid), public.sa_grupos(), public.sa_usuarios(),
  public.sa_crear_grupo(text,text), public.sa_borrar_grupo(uuid), public.sa_cambiar_rol(uuid,text,uuid),
  public.ga_miembros(uuid), public.ga_anadir(uuid,text), public.ga_quitar(uuid,uuid), public.mi_perfil() to authenticated;

-- ===================== 8. Seed: super_admin =====================
insert into public.super_admins (user_id)
select id from auth.users where lower(email) = 'carlosacedo30@gmail.com'
on conflict do nothing;
