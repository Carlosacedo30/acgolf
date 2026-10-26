-- 2026-10-26 · Avisos en el móvil organizados (elegidos por Carlos):
--   · Nueva partida: al momento (ya existía), a los apuntados.
--   · Recordatorio del partido: la víspera a las 20:00, a los apuntados en la convocatoria.
--   · Ganador de la semana: el lunes a las 10:00, a todo el grupo.
--   · Hándicap actualizado: cuando cambia (unos 15 minutos después de cerrar la partida).
--   · Horas de silencio: de 22:00 a 8:00 (hora de España) no llega nada; lo de la noche sale a las 8:00.
-- Todo pasa por una cola (avisos_cola) que vacía la función «avisos-cola» cada minuto.
-- PENDIENTE de aplicar en svnkgmbfanwftncopqjg (acgolf.es / pruebas): falta la confirmación de Carlos.

-- ---------- Cola de avisos ----------
create table if not exists public.avisos_cola (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  texto      text not null,
  ruta       text not null default '',          -- lo que va detrás de https://acgolf.es/ (p. ej. ?partida=ABCD)
  etiqueta   text,
  enviar_en  timestamptz not null default now(),
  enviado_en timestamptz,
  creado_en  timestamptz not null default now()
);
create index if not exists avisos_cola_pend on public.avisos_cola(enviar_en) where enviado_en is null;
alter table public.avisos_cola enable row level security;

-- Para no repetir un aviso programado (recordatorio de tal partido, ganador de tal semana…)
create table if not exists public.avisos_hechos (
  clave text primary key,
  hecho_en timestamptz not null default now()
);
alter table public.avisos_hechos enable row level security;

-- Llave para que solo el propio servidor pueda vaciar la cola
create table if not exists public._avisos_clave (id int primary key, clave text not null);
alter table public._avisos_clave enable row level security;
insert into public._avisos_clave (id, clave) values (1, encode(gen_random_bytes(24), 'hex')) on conflict (id) do nothing;
revoke all on public.avisos_cola, public.avisos_hechos, public._avisos_clave from anon, authenticated;

-- Horas de silencio: de 22:00 a 8:00 en España → se pasa a las 8:00
create or replace function public._hora_permitida(p_ts timestamptz)
 returns timestamptz language sql stable set search_path to 'public' as $$
  select case
    when extract(hour from p_ts at time zone 'Europe/Madrid') >= 22
      then ((date_trunc('day', p_ts at time zone 'Europe/Madrid') + interval '1 day 8 hours') at time zone 'Europe/Madrid')
    when extract(hour from p_ts at time zone 'Europe/Madrid') < 8
      then ((date_trunc('day', p_ts at time zone 'Europe/Madrid') + interval '8 hours') at time zone 'Europe/Madrid')
    else p_ts end;
$$;

-- Meter un aviso en la cola (solo si esa cuenta tiene algún móvil con avisos)
create or replace function public._encolar(p_user uuid, p_titulo text, p_texto text, p_ruta text default '', p_etiqueta text default null, p_cuando timestamptz default now())
 returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if p_user is null or not exists (select 1 from avisos_movil where user_id = p_user) then return false; end if;
  insert into avisos_cola (user_id, titulo, texto, ruta, etiqueta, enviar_en)
  values (p_user, p_titulo, p_texto, coalesce(p_ruta, ''), p_etiqueta, _hora_permitida(p_cuando));
  return true;
end; $$;

-- Lanzar la función que vacía la cola (solo si hay algo pendiente)
create or replace function public._lanzar_avisos()
 returns bigint language sql security definer set search_path to 'public' as $$
  select net.http_post(
    url := 'https://svnkgmbfanwftncopqjg.supabase.co/functions/v1/avisos-cola',
    headers := jsonb_build_object('Content-Type','application/json','x-avisos',(select clave from public._avisos_clave where id = 1)),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
  where exists (select 1 from avisos_cola where enviado_en is null and enviar_en <= now());
$$;

-- La función de la cola recoge los avisos que tocan (y los marca para no mandarlos dos veces)
create or replace function public._cola_tomar(p_clave text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare lista jsonb;
begin
  if p_clave is null or p_clave <> (select clave from _avisos_clave where id = 1) then raise exception 'No autorizado'; end if;
  with t as (
    update avisos_cola c set enviado_en = now()
    where c.id in (select id from avisos_cola where enviado_en is null and enviar_en <= now() order by enviar_en limit 300 for update skip locked)
    returning c.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('titulo', t.titulo, 'texto', t.texto, 'ruta', t.ruta, 'etiqueta', t.etiqueta,
           'moviles', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]')
                       from avisos_movil a where a.user_id = t.user_id))), '[]')
    into lista from t;
  return lista;
end; $$;

-- Nombre del premio de cada grupo (igual que en la app: Los Iscariotes → Iscariote, Cajapollos → Cajapollo)
create or replace function public._nombre_campeon(p_grupo text)
 returns text language sql immutable as $$
  with n as (select trim(regexp_replace(coalesce(nullif(trim(p_grupo), ''), 'Los Iscariotes'), '^(los|las|el|la)\s+', '', 'i')) v)
  select case when v = '' or v ~ '\s' then 'Campeón'
              else upper(left(regexp_replace(v, 's$', '', 'i'), 1)) || substr(regexp_replace(v, 's$', '', 'i'), 2) end from n;
$$;

-- Nombre bonito del campo
create or replace function public._nombre_campo(p_id text)
 returns text language sql stable set search_path to 'public' as $$
  select case p_id when 'hato-verde' then 'Hato Verde' when 'zaudin' then 'Zaudín'
    else coalesce((select nombre from campos_golf where id::text = p_id limit 1), initcap(replace(coalesce(p_id, ''), '-', ' '))) end;
$$;

-- ---------- Nueva partida: en horas de silencio se deja en la cola para las 8:00 ----------
create or replace function public._aviso_movil(p_user uuid, p_code text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare r record; quien text; nombres text[]; lista jsonb; grupo text; titulo text; texto text; n int := 0; u uuid;
begin
  select id, grupo_id, code, course_name, round_name, match_groups into r from rounds where code = upper(trim(p_code)) order by created_at desc limit 1;
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into quien from miembros where user_id = p_user and grupo_id = r.grupo_id;
  if quien is null then raise exception 'No eres de ese grupo'; end if;
  insert into avisos_movil_enviados (ronda_id, enviado_por) values (r.id, p_user) on conflict do nothing;
  if not found then return jsonb_build_object('repetido', true); end if;
  select coalesce(array_agg(distinct sin_acentos(trim(x))), '{}') into nombres
    from jsonb_array_elements(coalesce(r.match_groups, '[]'::jsonb)) g,
         jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) p,
         regexp_split_to_table(p, '\s*/\s*') x
    where trim(x) <> '';
  grupo := (select nombre from grupos where id = r.grupo_id);
  -- De noche: a la cola (sale a las 8:00)
  if _hora_permitida(now()) > now() then
    titulo := '⛳ Nueva partida · ' || grupo;
    texto := quien || ' te ha apuntado en ' || coalesce('«' || nullif(r.round_name, '') || '»', 'una partida') || coalesce(' en ' || nullif(r.course_name, ''), '') || '. Toca para abrirla.';
    for u in select distinct m.user_id from miembros m where m.grupo_id = r.grupo_id and m.user_id <> p_user and sin_acentos(trim(m.player_name)) = any(nombres) loop
      if _encolar(u, titulo, texto, '?partida=' || r.code, 'partida-' || r.code) then n := n + 1; end if;
    end loop;
    update avisos_movil_enviados set moviles = n where ronda_id = r.id;
    return jsonb_build_object('repetido', false, 'aplazados', n, 'para', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]') into lista
    from miembros m join avisos_movil a on a.user_id = m.user_id
    where m.grupo_id = r.grupo_id and m.user_id <> p_user and sin_acentos(trim(m.player_name)) = any(nombres);
  update avisos_movil_enviados set moviles = jsonb_array_length(lista) where ronda_id = r.id;
  return jsonb_build_object('repetido', false, 'grupo', grupo,
    'quien', quien, 'code', r.code, 'campo', r.course_name, 'nombre', r.round_name, 'para', lista);
end; $$;

-- ---------- Recordatorio del partido: la víspera a las 20:00 ----------
create or replace function public._avisos_recordatorio()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare r record; s record; manana date := ((now() at time zone 'Europe/Madrid')::date + 1); n int := 0; u uuid; meta jsonb;
begin
  if extract(hour from now() at time zone 'Europe/Madrid') <> 20 then return 0; end if;
  for r in select id, grupo_id, match_groups from rounds where course_id is null and round_name = 'Convocatoria' and created_at > now() - interval '60 days' loop
    select g->'meta' into meta from jsonb_array_elements(r.match_groups) g where g ? 'meta' limit 1;
    if meta is null or meta->>'date' is distinct from manana::text then continue; end if;
    if not (insert_aviso_hecho('recordatorio:' || r.id || ':' || manana)) then continue; end if;
    for s in select g->>'time' hora, p jugador from jsonb_array_elements(r.match_groups) g, jsonb_array_elements_text(coalesce(g->'players','[]'::jsonb)) p
             where coalesce(g->>'time', '') <> '' and trim(p) <> '' loop
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(s.jugador)) loop
        if _encolar(u, '⛳ Mañana juegas', 'Mañana juegas en ' || _nombre_campo(meta->>'courseId') || ' a las ' || regexp_replace(s.hora, '^0', '') || '. ¡Buen golf!', '', 'recordatorio-' || r.id) then n := n + 1; end if;
      end loop;
    end loop;
  end loop;
  return n;
end; $$;

-- Apunta que un aviso programado ya se hizo (devuelve false si ya estaba)
create or replace function public.insert_aviso_hecho(p_clave text)
 returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  insert into avisos_hechos (clave) values (p_clave) on conflict do nothing;
  return found;
end; $$;

-- ---------- Ganador de la semana: el lunes a las 10:00, a todo el grupo ----------
create or replace function public._avisos_ganador()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare g record; p jsonb; lunes date := (date_trunc('week', now() at time zone 'Europe/Madrid')::date - 7); n int := 0; u uuid; texto text;
begin
  if extract(isodow from now() at time zone 'Europe/Madrid') <> 1 or extract(hour from now() at time zone 'Europe/Madrid') <> 10 then return 0; end if;
  for g in select id, nombre from grupos where tipo = 'liga' loop
    perform set_config('acgolf.grupo', g.id::text, true);
    p := premios_semana(lunes);
    if p is null or p->'iscariote' is null or jsonb_typeof(p->'iscariote') = 'null' then continue; end if;
    if not insert_aviso_hecho('ganador:' || g.id || ':' || lunes) then continue; end if;
    texto := (p->'iscariote'->>'jugador') || ' es el ' || _nombre_campeon(g.nombre) || ' de la semana con ' || (p->'iscariote'->>'neto') || ' netos. Toca para ver todos los premios.';
    for u in select distinct user_id from miembros where grupo_id = g.id loop
      if _encolar(u, '🏆 ' || _nombre_campeon(g.nombre) || ' de la semana', texto, '', 'ganador-' || lunes) then n := n + 1; end if;
    end loop;
  end loop;
  perform set_config('acgolf.grupo', '', true);
  return n;
end; $$;

-- ---------- Hándicap actualizado: cuando cambia ----------
create or replace function public._aviso_handicap()
 returns trigger language plpgsql security definer set search_path to 'public' as $$
declare u uuid;
begin
  if new.hcp_antes is not distinct from new.hcp_despues or new.grupo_id is null then return new; end if;
  for u in select m.user_id from miembros m where m.grupo_id = new.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(new.player_name)) loop
    perform _encolar(u, '⛳ Hándicap actualizado',
      'Tu hándicap ha ' || case when new.hcp_despues < new.hcp_antes then 'bajado' else 'subido' end || ' de ' || replace(to_char(new.hcp_antes, 'FM990.0'), '.', ',')
      || ' a ' || replace(to_char(new.hcp_despues, 'FM990.0'), '.', ',') || case when new.hcp_despues < new.hcp_antes then '. ¡Enhorabuena!' else '.' end,
      '', 'hcp');
  end loop;
  return new;
exception when others then return new;  -- un fallo en el aviso nunca debe frenar el cálculo del hándicap
end; $$;
drop trigger if exists aviso_handicap on public.handicap_historial;
create trigger aviso_handicap after insert on public.handicap_historial for each row execute function public._aviso_handicap();

-- Funciones internas: solo el servidor
revoke all on function public._hora_permitida(timestamptz), public._encolar(uuid, text, text, text, text, timestamptz), public._lanzar_avisos(),
  public._cola_tomar(text), public._aviso_movil(uuid, text), public._avisos_recordatorio(), public._avisos_ganador(),
  public.insert_aviso_hecho(text), public._aviso_handicap(), public._nombre_campo(text), public._nombre_campeon(text) from public, anon, authenticated;
grant execute on function public._cola_tomar(text), public._aviso_movil(uuid, text) to service_role;

-- ---------- Relojes ----------
select cron.unschedule(jobname) from cron.job where jobname in ('avisos-cola', 'avisos-recordatorio', 'avisos-ganador');
select cron.schedule('avisos-cola', '* * * * *', 'select public._lanzar_avisos()');
select cron.schedule('avisos-recordatorio', '0 18,19 * * *', 'select public._avisos_recordatorio(); select public._lanzar_avisos()');   -- 20:00 en España (invierno y verano)
select cron.schedule('avisos-ganador', '0 8,9 * * 1', 'select public._avisos_ganador(); select public._lanzar_avisos()');            -- lunes 10:00 en España
