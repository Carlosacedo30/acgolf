-- El hoyo 19 dura SOLO EL DÍA de la partida: se cierra y se borra a las 12 de la noche (hora de Madrid).
-- Antes duraba 5 días. Cambia: hoyo19_limites (se quita 'dias'), _hoyo19_acceso y hoyo19_leer.
-- Estado: aplicada en PRUEBAS el 2026-11-12. En REAL: pendiente (con permiso de Carlos).

create or replace function public.hoyo19_limites()
 returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'fotos', 4,             -- fotos por partida (en total)
    'letras', 80,           -- letras de la frase escrita
    'espera_seg', 3,        -- segundos mínimos entre dos mensajes del mismo jugador
    'max_por_jugador', 60,  -- mensajes por jugador y partida
    'foto_max_chars', 70000 -- tamaño máximo de la foto (≈ 50 KB)
  );
$$;

alter function public.hoyo19_limites() set search_path to 'public';

create or replace function public._hoyo19_acceso(p_code text, out o_grupo uuid, out o_nombre text, out o_code text)
 language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  select code, grupo_id, updated_at into r from rounds where code = upper(trim(p_code));
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into o_nombre from miembros where user_id = auth.uid() and grupo_id = r.grupo_id;
  if o_nombre is null then raise exception 'No eres de ese grupo'; end if;
  if (r.updated_at at time zone 'Europe/Madrid')::date < (now() at time zone 'Europe/Madrid')::date then
    raise exception 'El hilo de esta partida ya se ha borrado';
  end if;
  o_grupo := r.grupo_id; o_code := r.code;
end; $$;
revoke all on function public._hoyo19_acceso(text) from public, anon, authenticated;

create or replace function public.hoyo19_leer(p_code text, p_desde bigint default 0)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a record; msgs jsonb; reac jsonb; vots jsonb; mio text; fotos_usadas int;
begin
  select * into a from _hoyo19_acceso(p_code);
  -- limpieza: se borran los mensajes de días anteriores (el hilo dura solo el día de la partida)
  delete from hoyo19_mensajes where (creado_en at time zone 'Europe/Madrid')::date < (now() at time zone 'Europe/Madrid')::date;
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
