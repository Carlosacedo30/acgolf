-- 2026-10-10 · PRUEBAS / acgolf.es · Avisos por correo a todo el grupo (Brevo)
-- Al crear una partida, la app pide a la función «avisar» que mande un correo a los demás del grupo.
-- La función usa estas dos piezas de la base de datos (solo las puede usar el servidor, nunca el móvil).
-- Cada jugador puede dejar de recibirlos en «Mi cuenta». Se puede volver a ejecutar.

alter table public.miembros add column if not exists sin_correos boolean not null default false;

-- Para no mandar dos veces el aviso de la misma partida
create table if not exists public.avisos_enviados (
  ronda_id uuid primary key references public.rounds(id) on delete cascade,
  grupo_id uuid,
  enviado_por uuid,
  correos int,
  enviado_en timestamptz not null default now()
);
alter table public.avisos_enviados enable row level security;  -- sin reglas: solo el servidor

-- Lo usa la función «avisar»: comprueba que quien avisa es del grupo de la partida,
-- apunta el aviso (una sola vez por partida) y devuelve a quién mandarlo.
create or replace function public._aviso_partida(p_user uuid, p_code text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; quien text; lista jsonb;
begin
  select id, grupo_id, code, course_name, round_name into r from rounds where code = upper(trim(p_code)) order by created_at desc limit 1;
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into quien from miembros where user_id = p_user and grupo_id = r.grupo_id;
  if quien is null then raise exception 'No eres de ese grupo'; end if;
  insert into avisos_enviados (ronda_id, grupo_id, enviado_por) values (r.id, r.grupo_id, p_user) on conflict do nothing;
  if not found then return jsonb_build_object('repetido', true); end if;
  select coalesce(jsonb_agg(jsonb_build_object('email', u.email, 'nombre', m.player_name)), '[]') into lista
    from miembros m join auth.users u on u.id = m.user_id
    where m.grupo_id = r.grupo_id and m.user_id <> p_user and not m.sin_correos and u.email is not null;
  update avisos_enviados set correos = jsonb_array_length(lista) where ronda_id = r.id;
  return jsonb_build_object('repetido', false, 'grupo', (select nombre from grupos where id = r.grupo_id),
    'quien', quien, 'code', r.code, 'campo', r.course_name, 'nombre', r.round_name, 'para', lista);
end; $$;
revoke execute on function public._aviso_partida(uuid, text) from public, anon, authenticated;
grant execute on function public._aviso_partida(uuid, text) to service_role;

-- Cada jugador: ¿quiere avisos por correo de su grupo activo?
create or replace function public.mis_correos(p_quiero boolean default null) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare g uuid := mi_grupo(); v boolean;
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if p_quiero is not null then
    update miembros set sin_correos = not p_quiero where user_id = auth.uid() and grupo_id = g;
  end if;
  select not sin_correos into v from miembros where user_id = auth.uid() and grupo_id = g;
  return coalesce(v, true);
end; $$;
revoke execute on function public.mis_correos(boolean) from public, anon;
grant execute on function public.mis_correos(boolean) to authenticated;
