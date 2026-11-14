-- Mesa sin administrador: cada jugador toca a quién marca (el de su derecha) desde su móvil.
-- SOLO aplicada en PRUEBAS (qjtsjcfalettgvrlwwnr). NO aplicar en REAL sin permiso de Carlos.
-- Reglas: eres de ese grupo; no puedes marcarte a ti mismo; nadie tiene dos marcadores;
-- antes del primer golpe puedes cambiar tu elección; el círculo no puede cerrarse antes de que estén todos
-- (así nadie se queda sin marcador).
drop function if exists public.elegir_marcador(text, int, int);
create or replace function public.elegir_a_quien_marco(p_code text, p_grupo int, p_jugador int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  yo int := _mi_idx(p_code, p_grupo);
  n int;
  cur int; sig int;
  pasos int := 1;
  cerrado boolean := false;
begin
  if yo is null then raise exception 'Solo un jugador de este grupo puede elegir a quién marca'; end if;
  select jsonb_array_length(coalesce(match_groups->p_grupo->'players','[]'::jsonb)) into n
    from rounds where code = p_code and course_id is not null;
  if coalesce(n, 0) < 2 then raise exception 'Hace falta al menos otro jugador para marcar'; end if;
  if p_jugador is null or p_jugador < 0 or p_jugador >= n or p_jugador = yo then
    raise exception 'Ese jugador no se puede marcar';
  end if;
  if exists (select 1 from marcas where round_code = p_code and grupo = p_grupo and golpes is not null) then
    raise exception 'Ya se han apuntado golpes: el marcador ya no se puede cambiar';
  end if;
  -- si ya elegí antes, se cambia: quito mi elección anterior
  delete from marcadores where round_code = p_code and grupo = p_grupo and marcador_idx = yo;
  if exists (select 1 from marcadores where round_code = p_code and grupo = p_grupo and jugador_idx = p_jugador) then
    raise exception 'Ya lo marca otro';
  end if;
  -- el círculo no puede cerrarse antes de que estén todos
  cur := p_jugador;
  loop
    select m.jugador_idx into sig from marcadores m where m.round_code = p_code and m.grupo = p_grupo and m.marcador_idx = cur;
    exit when sig is null;
    if sig = yo then cerrado := true; exit; end if;
    cur := sig; pasos := pasos + 1;
    exit when pasos > n;
  end loop;
  if cerrado and pasos + 1 < n then
    raise exception 'Con esto alguien se quedaría sin marcador. Elige a otro';
  end if;
  insert into marcadores (round_code, grupo, jugador_idx, marcador_idx) values (p_code, p_grupo, p_jugador, yo);
  return jsonb_build_object('yo', yo, 'marco_a', p_jugador, 'circulo_cerrado', cerrado);
end; $function$;
