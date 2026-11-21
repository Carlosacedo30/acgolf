-- 2026-11-16 · Soporte por mensajes dentro de la app (chat entre una persona y el super administrador).
-- · soporte_mensajes: cada fila es un mensaje del hilo de una persona (de_soporte = lo escribe el super administrador).
-- · La persona solo ve SU hilo; el super administrador ve todos. Nadie ve el teléfono ni el correo del otro.
-- · Sin reglas de acceso directo: todo pasa por las funciones de abajo. Aditivo, se puede volver a ejecutar.

create table if not exists public.soporte_mensajes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  de_soporte boolean not null default false,
  texto text not null check (char_length(texto) between 1 and 600),
  creado_en timestamptz not null default now(),
  leido_usuario boolean not null default false,
  leido_soporte boolean not null default false
);
create index if not exists soporte_mensajes_hilo on public.soporte_mensajes (user_id, creado_en);
alter table public.soporte_mensajes enable row level security;   -- sin reglas: solo las funciones

-- La persona: lee su hilo (y marca como leídos los mensajes de soporte)
create or replace function public.soporte_mis_mensajes() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'Hay que entrar con tu cuenta'; end if;
  update soporte_mensajes set leido_usuario = true where user_id = auth.uid() and de_soporte and not leido_usuario;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'de_soporte', de_soporte, 'texto', texto, 'cuando', creado_en) order by id), '[]')
    into r from soporte_mensajes where user_id = auth.uid();
  return r;
end; $$;

-- La persona: escribe un mensaje (máximo 600 letras y 20 por hora)
create or replace function public.soporte_enviar(p_texto text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t text := btrim(coalesce(p_texto, ''));
begin
  if auth.uid() is null then raise exception 'Hay que entrar con tu cuenta'; end if;
  if char_length(t) < 1 then raise exception 'Escribe tu mensaje'; end if;
  if char_length(t) > 600 then raise exception 'El mensaje es demasiado largo (máximo 600 letras)'; end if;
  if (select count(*) from soporte_mensajes where user_id = auth.uid() and not de_soporte and creado_en > now() - interval '1 hour') >= 20
    then raise exception 'Has escrito muchos mensajes seguidos. Espera un poco y vuelve a intentarlo.'; end if;
  insert into soporte_mensajes (user_id, de_soporte, texto, leido_usuario) values (auth.uid(), false, t, true);
  return jsonb_build_object('ok', true);
end; $$;

-- La persona: ¿tiene respuestas sin leer? (para el puntito rojo)
create or replace function public.soporte_sin_leer_usuario() returns integer
language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from soporte_mensajes where user_id = auth.uid() and de_soporte and not leido_usuario;
$$;

-- Super administrador: lista de conversaciones (primero las que tienen mensajes sin contestar)
create or replace function public.sa_soporte_hilos() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(h order by (h->>'sin_leer')::int desc, h->>'ultimo_en' desc) from (
    select jsonb_build_object(
      'user_id', m.user_id,
      'nombre', coalesce(nullif(btrim(p.player_name), ''), nullif(btrim(u.raw_user_meta_data->>'nombre'), ''), split_part(u.email, '@', 1)),
      'email', u.email,
      'ultimo', (select left(x.texto, 120) from soporte_mensajes x where x.user_id = m.user_id order by x.id desc limit 1),
      'ultimo_de_soporte', (select x.de_soporte from soporte_mensajes x where x.user_id = m.user_id order by x.id desc limit 1),
      'ultimo_en', max(m.creado_en),
      'sin_leer', count(*) filter (where not m.de_soporte and not m.leido_soporte)
    ) h
    from soporte_mensajes m join auth.users u on u.id = m.user_id left join perfiles p on p.user_id = m.user_id
    group by m.user_id, p.player_name, u.raw_user_meta_data, u.email
  ) q), '[]');
end; $$;

-- Super administrador: abre una conversación (marca como leídos los mensajes de la persona)
create or replace function public.sa_soporte_hilo(p_user uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  update soporte_mensajes set leido_soporte = true where user_id = p_user and not de_soporte and not leido_soporte;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'de_soporte', de_soporte, 'texto', texto, 'cuando', creado_en) order by id)
                   from soporte_mensajes where user_id = p_user), '[]');
end; $$;

-- Super administrador: contesta
create or replace function public.sa_soporte_responder(p_user uuid, p_texto text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t text := btrim(coalesce(p_texto, ''));
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  if char_length(t) < 1 then raise exception 'Escribe tu respuesta'; end if;
  if char_length(t) > 600 then raise exception 'La respuesta es demasiado larga (máximo 600 letras)'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'Esa persona no existe'; end if;
  insert into soporte_mensajes (user_id, de_soporte, texto, leido_soporte) values (p_user, true, t, true);
  return jsonb_build_object('ok', true);
end; $$;

-- Para el círculo rojo: cuántas conversaciones tienen mensajes sin contestar (0 si no eres super administrador)
create or replace function public.sa_soporte_sin_leer() returns integer
language sql stable security definer set search_path to 'public' as $$
  select case when es_super_admin()
    then (select count(distinct user_id)::int from soporte_mensajes where not de_soporte and not leido_soporte) else 0 end;
$$;

revoke all on function public.soporte_mis_mensajes() from public, anon;
revoke all on function public.soporte_enviar(text) from public, anon;
revoke all on function public.soporte_sin_leer_usuario() from public, anon;
revoke all on function public.sa_soporte_hilos() from public, anon;
revoke all on function public.sa_soporte_hilo(uuid) from public, anon;
revoke all on function public.sa_soporte_responder(uuid, text) from public, anon;
revoke all on function public.sa_soporte_sin_leer() from public, anon;
grant execute on function public.soporte_mis_mensajes() to authenticated;
grant execute on function public.soporte_enviar(text) to authenticated;
grant execute on function public.soporte_sin_leer_usuario() to authenticated;
grant execute on function public.sa_soporte_hilos() to authenticated;
grant execute on function public.sa_soporte_hilo(uuid) to authenticated;
grant execute on function public.sa_soporte_responder(uuid, text) to authenticated;
grant execute on function public.sa_soporte_sin_leer() to authenticated;
