-- 2026-11-12 · El hoyo 19 (hilo de la partida), primero SOLO en la base de PRUEBAS.
-- Aplicado en qjtsjcfalettgvrlwwnr (acgolf-PRUEBAS). NO está en la base REAL (svnkgmbfanwftncopqjg): hace falta permiso de Carlos.
-- · Un hilo por partida (ronda). Solo lo ve y lo escribe el grupo de esa partida.
-- · Se guarda solo lo que escribe la gente: número de frase (0-12), texto corto (80 letras), foto pequeña, reacciones y un voto.
-- · Se borra a los 5 días (al abrir cualquier hilo se borran los mensajes viejos).
-- · Las tablas no se tocan desde fuera: todo va por las funciones de abajo (como avisos_movil).
-- · Todos los límites están en UN solo sitio: hoyo19_limites().

create or replace function public.hoyo19_limites()
 returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'dias', 5,              -- días que dura el hilo
    'fotos', 4,             -- fotos por partida (en total)
    'letras', 80,           -- letras de la frase escrita
    'espera_seg', 3,        -- segundos mínimos entre dos mensajes del mismo jugador
    'max_por_jugador', 60,  -- mensajes por jugador y partida
    'foto_max_chars', 70000 -- tamaño máximo de la foto (≈ 50 KB)
  );
$$;

alter function public.hoyo19_limites() set search_path to 'public';

create table if not exists public.hoyo19_mensajes (
  id         bigint generated always as identity primary key,
  ronda_code text not null references public.rounds(code) on delete cascade,
  grupo_id   uuid not null references public.grupos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  jugador    text not null,
  tipo       text not null check (tipo in ('frase','texto','foto','chivito','confeti')),
  frase_n    smallint check (frase_n between 0 and 12),
  texto      text check (texto is null or char_length(texto) <= 80),
  foto       text,
  creado_en  timestamptz not null default now(),
  constraint hoyo19_tipo_datos check (
    (tipo = 'frase'   and frase_n is not null) or
    (tipo = 'texto'   and texto is not null and char_length(trim(texto)) > 0) or
    (tipo = 'foto'    and foto is not null) or
    (tipo = 'chivito') or
    (tipo = 'confeti')
  )
);
create index if not exists hoyo19_mensajes_ronda on public.hoyo19_mensajes(ronda_code, id);
create index if not exists hoyo19_mensajes_creado on public.hoyo19_mensajes(creado_en);
alter table public.hoyo19_mensajes enable row level security;

create table if not exists public.hoyo19_reacciones (
  mensaje_id bigint not null references public.hoyo19_mensajes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null check (emoji in ('★','😂','🔥','👏','🍺')),
  creado_en  timestamptz not null default now(),
  primary key (mensaje_id, user_id, emoji)
);
alter table public.hoyo19_reacciones enable row level security;

create table if not exists public.hoyo19_votos (
  ronda_code text not null references public.rounds(code) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  jugador    text not null check (char_length(jugador) between 1 and 60),
  creado_en  timestamptz not null default now(),
  primary key (ronda_code, user_id)
);
alter table public.hoyo19_votos enable row level security;
-- Sin políticas: nadie las lee ni las toca desde fuera; solo con las funciones de abajo.

revoke all on table public.hoyo19_mensajes, public.hoyo19_reacciones, public.hoyo19_votos from anon, authenticated;

-- Comprobar que quien pregunta es del grupo de la partida y que el hilo no ha caducado
create or replace function public._hoyo19_acceso(p_code text, out o_grupo uuid, out o_nombre text, out o_code text)
 language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  select code, grupo_id, updated_at into r from rounds where code = upper(trim(p_code));
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into o_nombre from miembros where user_id = auth.uid() and grupo_id = r.grupo_id;
  if o_nombre is null then raise exception 'No eres de ese grupo'; end if;
  if r.updated_at < now() - make_interval(days => (hoyo19_limites()->>'dias')::int) then
    raise exception 'El hilo de esta partida ya se ha borrado';
  end if;
  o_grupo := r.grupo_id; o_code := r.code;
end; $$;
revoke all on function public._hoyo19_acceso(text) from public, anon, authenticated;

-- Leer el hilo (solo lo nuevo desde p_desde). Las fotos NO viajan aquí: se piden una a una con hoyo19_foto.
create or replace function public.hoyo19_leer(p_code text, p_desde bigint default 0)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a record; msgs jsonb; reac jsonb; vots jsonb; mio text; fotos_usadas int;
begin
  select * into a from _hoyo19_acceso(p_code);
  -- limpieza: se borran los mensajes de más de 5 días
  delete from hoyo19_mensajes where creado_en < now() - make_interval(days => (hoyo19_limites()->>'dias')::int);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'jugador', jugador, 'tipo', tipo, 'frase_n', frase_n, 'texto', texto,
           'tiene_foto', foto is not null, 'creado_en', creado_en, 'mio', user_id = auth.uid()) order by id), '[]')
    into msgs from hoyo19_mensajes where ronda_code = a.o_code and id > coalesce(p_desde, 0);
  select coalesce(jsonb_agg(jsonb_build_object('mensaje_id', mensaje_id, 'emoji', emoji, 'n', n, 'mia', mia)), '[]')
    into reac from (
      select r.mensaje_id, r.emoji, count(*) n, bool_or(r.user_id = auth.uid()) mia
      from hoyo19_reacciones r join hoyo19_mensajes m on m.id = r.mensaje_id
      where m.ronda_code = a.o_code group by r.mensaje_id, r.emoji) x;
  select coalesce(jsonb_agg(jsonb_build_object('jugador', jugador, 'n', n)), '[]') into vots
    from (select jugador, count(*) n from hoyo19_votos where ronda_code = a.o_code group by jugador) y;
  select jugador into mio from hoyo19_votos where ronda_code = a.o_code and user_id = auth.uid();
  select count(*) into fotos_usadas from hoyo19_mensajes where ronda_code = a.o_code and tipo = 'foto';
  return jsonb_build_object('yo', a.o_nombre, 'mensajes', msgs, 'reacciones', reac, 'votos', vots,
                            'mi_voto', mio, 'fotos_quedan', greatest(0, (hoyo19_limites()->>'fotos')::int - fotos_usadas));
end; $$;

-- Enviar un mensaje: frase con dibujo, texto corto, foto, chivito o confeti
create or replace function public.hoyo19_enviar(p_code text, p_tipo text, p_frase smallint default null, p_texto text default null, p_foto text default null)
 returns bigint language plpgsql security definer set search_path to 'public' as $$
declare a record; lim jsonb := hoyo19_limites(); ultimo timestamptz; cuantos int; nuevo bigint; t text := nullif(trim(coalesce(p_texto,'')), '');
begin
  select * into a from _hoyo19_acceso(p_code);
  if p_tipo not in ('frase','texto','foto','chivito','confeti') then raise exception 'Mensaje no válido'; end if;
  if p_tipo = 'frase' and (p_frase is null or p_frase < 0 or p_frase > 11) then raise exception 'Frase no válida'; end if;
  if p_tipo = 'chivito' then p_frase := 12; end if;
  if p_tipo = 'texto' then
    if t is null then raise exception 'Escribe algo'; end if;
    if char_length(t) > (lim->>'letras')::int then raise exception 'Máximo % letras', lim->>'letras'; end if;
    if t ~* '(https?:|www\.|[a-z0-9]\.(com|es|net|org|io|me)\b)' then raise exception 'No se pueden poner enlaces'; end if;
  else t := null; end if;
  if p_tipo = 'foto' then
    if p_foto is null or p_foto !~ '^data:image/jpeg;base64,' or length(p_foto) > (lim->>'foto_max_chars')::int then raise exception 'La foto no es válida'; end if;
    select count(*) into cuantos from hoyo19_mensajes where ronda_code = a.o_code and tipo = 'foto';
    if cuantos >= (lim->>'fotos')::int then raise exception 'Ya no quedan fotos'; end if;
  else p_foto := null; end if;
  select max(creado_en), count(*) into ultimo, cuantos from hoyo19_mensajes where ronda_code = a.o_code and user_id = auth.uid();
  if ultimo is not null and ultimo > now() - make_interval(secs => (lim->>'espera_seg')::int) then raise exception 'Espera unos segundos'; end if;
  if cuantos >= (lim->>'max_por_jugador')::int then raise exception 'Has llegado al máximo de mensajes de esta partida'; end if;
  insert into hoyo19_mensajes (ronda_code, grupo_id, user_id, jugador, tipo, frase_n, texto, foto)
  values (a.o_code, a.o_grupo, auth.uid(), a.o_nombre, p_tipo, p_frase, t, p_foto) returning id into nuevo;
  return nuevo;
end; $$;

-- Pedir UNA foto (la app la guarda en el móvil y no la vuelve a pedir)
create or replace function public.hoyo19_foto(p_mensaje bigint)
 returns text language plpgsql security definer set search_path to 'public' as $$
declare m record; f text;
begin
  select ronda_code into m from hoyo19_mensajes where id = p_mensaje and tipo = 'foto';
  if m is null then return null; end if;
  perform _hoyo19_acceso(m.ronda_code);
  select foto into f from hoyo19_mensajes where id = p_mensaje;
  return f;
end; $$;

-- Reaccionar con un toque (otro toque la quita)
create or replace function public.hoyo19_reaccionar(p_mensaje bigint, p_emoji text)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
declare m record;
begin
  select ronda_code into m from hoyo19_mensajes where id = p_mensaje;
  if m is null then raise exception 'Ese mensaje ya no existe'; end if;
  perform _hoyo19_acceso(m.ronda_code);
  if exists (select 1 from hoyo19_reacciones where mensaje_id = p_mensaje and user_id = auth.uid() and emoji = p_emoji) then
    delete from hoyo19_reacciones where mensaje_id = p_mensaje and user_id = auth.uid() and emoji = p_emoji;
    return false;
  end if;
  insert into hoyo19_reacciones (mensaje_id, user_id, emoji) values (p_mensaje, auth.uid(), p_emoji);
  return true;
end; $$;

-- Voto del día: un solo voto por jugador y partida
create or replace function public.hoyo19_votar(p_code text, p_jugador text)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
declare a record;
begin
  select * into a from _hoyo19_acceso(p_code);
  insert into hoyo19_votos (ronda_code, user_id, jugador) values (a.o_code, auth.uid(), left(trim(p_jugador), 60))
  on conflict do nothing;
  if not found then raise exception 'Ya has votado'; end if;
  return true;
end; $$;

-- Borrar un mensaje: el que lo escribió o el administrador del grupo
create or replace function public.hoyo19_borrar(p_mensaje bigint)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
declare m record; admin boolean;
begin
  select ronda_code, grupo_id, user_id into m from hoyo19_mensajes where id = p_mensaje;
  if m is null then return false; end if;
  perform _hoyo19_acceso(m.ronda_code);
  select coalesce(es_admin, false) into admin from miembros where user_id = auth.uid() and grupo_id = m.grupo_id;
  if m.user_id <> auth.uid() and not coalesce(admin, false) then raise exception 'Solo puede borrarlo quien lo escribió o el administrador'; end if;
  delete from hoyo19_mensajes where id = p_mensaje;
  return true;
end; $$;

revoke all on function public.hoyo19_leer(text, bigint), public.hoyo19_enviar(text, text, smallint, text, text),
  public.hoyo19_foto(bigint), public.hoyo19_reaccionar(bigint, text), public.hoyo19_votar(text, text), public.hoyo19_borrar(bigint)
  from public, anon;
grant execute on function public.hoyo19_leer(text, bigint), public.hoyo19_enviar(text, text, smallint, text, text),
  public.hoyo19_foto(bigint), public.hoyo19_reaccionar(bigint, text), public.hoyo19_votar(text, text), public.hoyo19_borrar(bigint)
  to authenticated;
