-- 2026-10-10 · PRUEBAS / acgolf.es · Códigos de administrador
-- Solo el super_admin nombra administradores: crea un código de un solo uso y se lo manda a quien quiera.
--   código sin grupo  → quien lo use crea un grupo nuevo y es su administrador
--   código con grupo  → quien lo use pasa a ser administrador de ese grupo
-- Sin código ya nadie puede crear grupos (salvo el super_admin). Se puede volver a ejecutar.

create table if not exists public.codigos_admin (
  codigo text primary key,
  grupo_id uuid references public.grupos(id) on delete cascade,
  nota text,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  caduca_en timestamptz not null default now() + interval '30 days',
  usado_por uuid references auth.users(id),
  usado_en timestamptz
);
alter table public.codigos_admin enable row level security;  -- sin reglas: solo se usa por funciones

-- El super_admin crea un código
create or replace function public.sa_crear_codigo_admin(p_grupo uuid default null, p_nota text default null) returns text
language plpgsql security definer set search_path to 'public' as $$
declare c text;
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if p_grupo is not null and not exists (select 1 from grupos where id = p_grupo) then raise exception 'Ese grupo no existe'; end if;
  loop
    c := 'ADM-' || upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 6));
    exit when length(c) = 10 and not exists (select 1 from codigos_admin where codigo = c);
  end loop;
  insert into codigos_admin (codigo, grupo_id, nota, creado_por) values (c, p_grupo, nullif(trim(coalesce(p_nota, '')), ''), auth.uid());
  return c;
end; $$;

-- El super_admin ve sus códigos
create or replace function public.sa_codigos_admin() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'codigo', c.codigo, 'nota', c.nota, 'grupo', g.nombre, 'creado', c.creado_en, 'caduca', c.caduca_en,
      'usado_en', c.usado_en, 'usado_por', (select email from auth.users where id = c.usado_por),
      'grupo_creado', (select nombre from grupos where id = c.grupo_id)
    ) order by c.creado_en desc) from codigos_admin c left join grupos g on g.id = c.grupo_id), '[]');
end; $$;

-- El super_admin anula un código sin usar
create or replace function public.sa_anular_codigo_admin(p_codigo text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  update codigos_admin set caduca_en = now() where codigo = upper(trim(p_codigo)) and usado_en is null;
end; $$;

-- Cualquiera (con cuenta) puede ver para qué sirve un código antes de usarlo
create or replace function public.info_codigo_admin(p_codigo text) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('valido', c.usado_en is null and c.caduca_en > now(), 'usado', c.usado_en is not null,
                            'caducado', c.caduca_en <= now(), 'grupo', g.nombre, 'nuevo', c.grupo_id is null)
  from codigos_admin c left join grupos g on g.id = c.grupo_id where c.codigo = upper(trim(p_codigo));
$$;

-- Usar el código: crea el grupo nuevo (si el código no tiene grupo) o hace administrador del grupo del código
create or replace function public.usar_codigo_admin(p_codigo text, p_nombre_grupo text, p_player text, p_hcp numeric, p_version text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare c record; g uuid; nm text := initcap(regexp_replace(trim(coalesce(p_player,'')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  select * into c from codigos_admin where codigo = upper(trim(p_codigo)) for update;
  if c is null then raise exception 'Ese código de administrador no existe'; end if;
  if c.usado_en is not null then raise exception 'Ese código ya se ha usado. Pide otro.'; end if;
  if c.caduca_en <= now() then raise exception 'Ese código ha caducado. Pide otro.'; end if;
  if c.grupo_id is null then
    if coalesce(trim(p_nombre_grupo), '') = '' then raise exception 'Ponle un nombre al grupo'; end if;
    if coalesce(p_version,'') = '' then raise exception 'Hay que aceptar la política de privacidad'; end if;
    if nm = '' then raise exception 'Escribe tu nombre'; end if;
    if p_hcp is null or p_hcp < -10 or p_hcp > 54 then raise exception 'Pon tu hándicap (entre -10 y 54)'; end if;
    insert into grupos (nombre, tipo, creado_por) values (trim(p_nombre_grupo), 'liga', auth.uid()) returning id into g;
    insert into league_players (grupo_id, name, hcp, hcp_base, active) values (g, nm, round(p_hcp, 1), round(p_hcp, 1), true);
    perform _entrar_en_grupo(g, nm, true, p_version);
  else
    g := c.grupo_id;
    perform _meter_en_grupo(auth.uid(), g, true);
    update miembros set es_admin = true where user_id = auth.uid() and grupo_id = g;
    update perfiles set grupo_id = g, player_name = (select player_name from miembros where user_id = auth.uid() and grupo_id = g), es_admin = true
      where user_id = auth.uid();
  end if;
  update codigos_admin set usado_por = auth.uid(), usado_en = now(), grupo_id = g where codigo = c.codigo;
  return mi_perfil();
end; $$;

-- Crear grupo «a pelo» ya solo lo puede hacer el super_admin
create or replace function public.crear_grupo(p_nombre text, p_player text, p_hcp numeric, p_version text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare g uuid; nm text := initcap(regexp_replace(trim(coalesce(p_player,'')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if not es_super_admin() then raise exception 'Para crear un grupo hace falta un código de administrador'; end if;
  if coalesce(p_version,'') = '' then raise exception 'Hay que aceptar la política de privacidad'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Ponle un nombre al grupo'; end if;
  if nm = '' then raise exception 'Escribe tu nombre'; end if;
  if p_hcp is null or p_hcp < -10 or p_hcp > 54 then raise exception 'Pon tu hándicap (entre -10 y 54)'; end if;
  insert into grupos (nombre, tipo, creado_por) values (trim(p_nombre), 'liga', auth.uid()) returning id into g;
  insert into league_players (grupo_id, name, hcp, hcp_base, active) values (g, nm, round(p_hcp, 1), round(p_hcp, 1), true);
  return _entrar_en_grupo(g, nm, true, p_version);
end; $$;

revoke execute on function public.sa_crear_codigo_admin(uuid,text), public.sa_codigos_admin(), public.sa_anular_codigo_admin(text),
  public.info_codigo_admin(text), public.usar_codigo_admin(text,text,text,numeric,text) from public, anon;
grant execute on function public.sa_crear_codigo_admin(uuid,text), public.sa_codigos_admin(), public.sa_anular_codigo_admin(text),
  public.info_codigo_admin(text), public.usar_codigo_admin(text,text,text,numeric,text) to authenticated;
