-- 2026-10-26 · Avisos en el móvil (notificaciones), primero en la versión de pruebas.
-- Aplicado en svnkgmbfanwftncopqjg (acgolf.es / pruebas).
-- · Cada móvil que acepta los avisos guarda aquí su «dirección» de avisos (no es un dato personal sensible).
-- · La llave privada para firmar los avisos va en el Vault de Supabase (nombre «vapid_privada»), nunca en el código.

create table if not exists public.avisos_movil (
  endpoint  text primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  p256dh    text not null,
  auth      text not null,
  creado_en timestamptz not null default now(),
  ultimo_ok timestamptz
);
create index if not exists avisos_movil_user on public.avisos_movil(user_id);
alter table public.avisos_movil enable row level security;
-- Sin políticas: nadie la lee ni la toca desde fuera; solo con las funciones de abajo.

-- Partidas ya avisadas al móvil (para no avisar dos veces)
create table if not exists public.avisos_movil_enviados (
  ronda_id   uuid primary key,
  enviado_por uuid,
  moviles    int not null default 0,
  enviado_en timestamptz not null default now()
);
alter table public.avisos_movil_enviados enable row level security;

-- Guardar / quitar el aviso de ESTE móvil (lo llama la app con la cuenta que ha entrado)
create or replace function public.movil_guardar(p_endpoint text, p_p256dh text, p_auth text)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or coalesce(p_p256dh,'') = '' or coalesce(p_auth,'') = '' then
    raise exception 'Datos del móvil no válidos';
  end if;
  insert into avisos_movil (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, creado_en = now();
  return true;
end; $$;

create or replace function public.movil_quitar(p_endpoint text)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  delete from avisos_movil where endpoint = p_endpoint and user_id = auth.uid();
  return true;
end; $$;

revoke all on function public.movil_guardar(text, text, text) from public, anon;
revoke all on function public.movil_quitar(text) from public, anon;
grant execute on function public.movil_guardar(text, text, text) to authenticated;
grant execute on function public.movil_quitar(text) to authenticated;

-- A quién avisar de una partida nueva: los jugadores apuntados en ella (menos quien la crea) que tengan avisos en el móvil
create or replace function public._aviso_movil(p_user uuid, p_code text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare r record; quien text; nombres text[]; lista jsonb;
begin
  select id, grupo_id, code, course_name, round_name, match_groups into r from rounds where code = upper(trim(p_code)) order by created_at desc limit 1;
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into quien from miembros where user_id = p_user and grupo_id = r.grupo_id;
  if quien is null then raise exception 'No eres de ese grupo'; end if;
  insert into avisos_movil_enviados (ronda_id, enviado_por) values (r.id, p_user) on conflict do nothing;
  if not found then return jsonb_build_object('repetido', true); end if;
  select coalesce(array_agg(distinct sin_acentos(trim(n))), '{}') into nombres
    from jsonb_array_elements(coalesce(r.match_groups, '[]'::jsonb)) g,
         jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) p,
         regexp_split_to_table(p, '\s*/\s*') n
    where trim(n) <> '';
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]') into lista
    from miembros m join avisos_movil a on a.user_id = m.user_id
    where m.grupo_id = r.grupo_id and m.user_id <> p_user and sin_acentos(trim(m.player_name)) = any(nombres);
  update avisos_movil_enviados set moviles = jsonb_array_length(lista) where ronda_id = r.id;
  return jsonb_build_object('repetido', false, 'grupo', (select nombre from grupos where id = r.grupo_id),
    'quien', quien, 'code', r.code, 'campo', r.course_name, 'nombre', r.round_name, 'para', lista);
end; $$;

-- Móviles de una cuenta (para el aviso de prueba del super administrador)
create or replace function public._moviles_de(p_user uuid)
 returns jsonb language sql security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]') from avisos_movil where user_id = p_user;
$$;

-- La llave privada (solo la lee la función del servidor)
create or replace function public._vapid_privada()
 returns text language sql security definer set search_path to 'public' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_privada' limit 1;
$$;

-- Funciones internas: solo el servidor (service_role)
revoke all on function public._aviso_movil(uuid, text) from public, anon, authenticated;
revoke all on function public._moviles_de(uuid) from public, anon, authenticated;
revoke all on function public._vapid_privada() from public, anon, authenticated;
grant execute on function public._aviso_movil(uuid, text) to service_role;
grant execute on function public._moviles_de(uuid) to service_role;
grant execute on function public._vapid_privada() to service_role;
