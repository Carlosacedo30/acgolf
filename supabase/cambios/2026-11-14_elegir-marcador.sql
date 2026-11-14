-- Mesa sin administrador: cada jugador elige su marcador desde su móvil.
-- SOLO aplicada en PRUEBAS (qjtsjcfalettgvrlwwnr). NO aplicar en REAL sin permiso de Carlos.
create or replace function public.elegir_marcador(p_code text, p_grupo int, p_marcador int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  yo int := _mi_idx(p_code, p_grupo);
  n int;
  cur int;
  pasos int := 0;
begin
  if yo is null then raise exception 'Solo un jugador de este grupo puede elegir su marcador'; end if;
  select jsonb_array_length(coalesce(match_groups->p_grupo->'players','[]'::jsonb)) into n
    from rounds where code = p_code and course_id is not null;
  if coalesce(n, 0) < 2 then raise exception 'Hace falta al menos otro jugador para marcar'; end if;
  if p_marcador is null or p_marcador < 0 or p_marcador >= n or p_marcador = yo then
    raise exception 'Ese jugador no puede ser tu marcador';
  end if;
  if exists (select 1 from marcas where round_code = p_code and grupo = p_grupo and golpes is not null) then
    raise exception 'Ya se han apuntado golpes: el marcador ya no se puede cambiar';
  end if;
  if exists (select 1 from marcadores where round_code = p_code and grupo = p_grupo and marcador_idx = p_marcador and jugador_idx <> yo) then
    raise exception 'Ya lo marca otro';
  end if;
  cur := p_marcador;
  loop
    exit when cur = yo;
    select mk.marcador_idx into cur from marcadores mk
      where mk.round_code = p_code and mk.grupo = p_grupo and mk.jugador_idx = cur;
    exit when cur is null;
    pasos := pasos + 1;
    exit when pasos > n;
  end loop;
  if cur = yo and pasos + 1 < n then
    raise exception 'Con esto quedaría alguien sin marcador. Elige otro';
  end if;
  insert into marcadores (round_code, grupo, jugador_idx, marcador_idx)
    values (p_code, p_grupo, yo, p_marcador)
    on conflict (round_code, grupo, jugador_idx) do update set marcador_idx = excluded.marcador_idx;
  return jsonb_build_object('yo', yo, 'marcador', p_marcador, 'circulo_cerrado', (cur = yo));
end; $function$;
