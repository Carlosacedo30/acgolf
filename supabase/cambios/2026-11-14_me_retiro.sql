-- «Me retiro» (norma de Carlos, 14-nov-2026): el jugador sale de la partida, NO se guarda nada suyo,
-- se rehacen los marcadores y se mantienen los resultados de los demás.
-- SOLO para pruebas (qjtsjcfalettgvrlwwnr). NO aplicar en REAL sin permiso de Carlos.
-- Individual: sale el jugador. Fourball (mejor bola): sale él y su compañero sigue solo (pasa al final de la lista).
-- Foursome (parejas): sale la pareja entera. Si ya entregó su tarjeta, no se puede retirar.
create or replace function public.me_retiro(p_code text, p_grupo int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r rounds%rowtype;
  g jsonb; modo text; nombre text;
  n int; yo int := null; i int; k int;
  perm int[] := '{}';
  socio int := null;
  a int; b int;
  np jsonb := '[]'::jsonb; nh jsonb := '[]'::jsonb; nb jsonb := '[]'::jsonb; nsc jsonb := '{}'::jsonb; npar jsonb := '[]'::jsonb;
  nuevo_n int;
  gnew jsonb;
begin
  select * into r from rounds where code = p_code for update;
  if not found then raise exception 'No existe esta partida'; end if;
  if not es_partida_liga(p_code) then raise exception 'Solo en partidas con marcadores'; end if;
  g := r.match_groups -> p_grupo;
  n := jsonb_array_length(coalesce(g->'players','[]'::jsonb));
  modo := coalesce(g->>'modo','individual');
  select player_name into nombre from perfiles where user_id = auth.uid();
  if nombre is null then raise exception 'No te reconozco como jugador de esta partida'; end if;
  for i in 0..n-1 loop
    if (modo = 'foursome' and position(nombre in (g->'players'->>i)) > 0) or (modo <> 'foursome' and (g->'players'->>i) = nombre) then
      yo := i; exit;
    end if;
  end loop;
  if yo is null then raise exception 'No juegas en este grupo'; end if;
  if exists (select 1 from tarjetas_validadas where round_code = p_code and grupo = p_grupo and jugador_idx = yo)
     or exists (select 1 from entregas where round_code = p_code and grupo = p_grupo and jugador_idx = yo) then
    raise exception 'Ya entregaste tu tarjeta: ya no te puedes retirar';
  end if;
  if modo = 'fourball' and (yo # 1) < n then socio := yo # 1; end if;

  -- orden nuevo (índices viejos): sin el que se retira; en mejor bola el compañero va al final
  for i in 0..n-1 loop
    if i <> yo and i is distinct from socio then perm := perm || i; end if;
  end loop;
  if socio is not null then perm := perm || socio; end if;
  nuevo_n := coalesce(array_length(perm,1),0);

  -- listas del grupo en el orden nuevo
  for k in 1..nuevo_n loop
    np := np || jsonb_build_array(g->'players'->perm[k]);
    nh := nh || jsonb_build_array(coalesce(g->'handicaps'->perm[k], '0'::jsonb));
    if jsonb_typeof(g->'barras') = 'array' then nb := nb || jsonb_build_array(coalesce(g->'barras'->perm[k], 'null'::jsonb)); end if;
    if (g->'scores') ? (perm[k]::text) then nsc := nsc || jsonb_build_object((k-1)::text, g->'scores'->(perm[k]::text)); end if;
  end loop;
  gnew := g || jsonb_build_object('players', np, 'handicaps', nh, 'scores', nsc);
  if jsonb_typeof(g->'barras') = 'array' then gnew := gnew || jsonb_build_object('barras', nb); end if;
  if modo = 'foursome' and jsonb_typeof(g->'parejas') = 'array' then
    for i in 0..jsonb_array_length(g->'parejas')-1 loop
      if i <> yo then npar := npar || jsonb_build_array(g->'parejas'->i); end if;
    end loop;
    gnew := gnew || jsonb_build_object('parejas', npar);
  end if;

  -- marcadores: quien me marcaba pasa a marcar a quien yo marcaba (se cierra el hueco)
  select marcador_idx into a from marcadores where round_code = p_code and grupo = p_grupo and jugador_idx = yo;
  select jugador_idx into b from marcadores where round_code = p_code and grupo = p_grupo and marcador_idx = yo;
  delete from marcadores where round_code = p_code and grupo = p_grupo and (jugador_idx = yo or marcador_idx = yo);
  if a is not null and b is not null and a <> b then
    insert into marcadores (round_code, grupo, jugador_idx, marcador_idx) values (p_code, p_grupo, b, a);
  end if;
  if nuevo_n < 2 then delete from marcadores where round_code = p_code and grupo = p_grupo; end if;

  -- lo suyo se borra
  delete from marcas where round_code = p_code and grupo = p_grupo and jugador_idx = yo;
  delete from entregas where round_code = p_code and grupo = p_grupo and jugador_idx = yo;
  delete from tarjetas_validadas where round_code = p_code and grupo = p_grupo and jugador_idx = yo;

  -- los números de los demás se ajustan al orden nuevo (primero +1000 para que no choquen)
  update marcas set jugador_idx = jugador_idx + 1000 where round_code = p_code and grupo = p_grupo;
  update entregas set jugador_idx = jugador_idx + 1000 where round_code = p_code and grupo = p_grupo;
  update tarjetas_validadas set jugador_idx = jugador_idx + 1000 where round_code = p_code and grupo = p_grupo;
  update marcadores set jugador_idx = jugador_idx + 1000, marcador_idx = marcador_idx + 1000 where round_code = p_code and grupo = p_grupo;
  for k in 1..nuevo_n loop
    update marcas set jugador_idx = k-1 where round_code = p_code and grupo = p_grupo and jugador_idx = perm[k] + 1000;
    update entregas set jugador_idx = k-1 where round_code = p_code and grupo = p_grupo and jugador_idx = perm[k] + 1000;
    update tarjetas_validadas set jugador_idx = k-1 where round_code = p_code and grupo = p_grupo and jugador_idx = perm[k] + 1000;
    update marcadores set jugador_idx = k-1 where round_code = p_code and grupo = p_grupo and jugador_idx = perm[k] + 1000;
    update marcadores set marcador_idx = k-1 where round_code = p_code and grupo = p_grupo and marcador_idx = perm[k] + 1000;
  end loop;

  update rounds set match_groups = jsonb_set(match_groups, array[p_grupo::text], gnew), updated_at = now() where code = p_code;
  return jsonb_build_object('quedan', nuevo_n, 'cerrada', nuevo_n < 2);
end; $function$;
grant execute on function public.me_retiro(text, int) to authenticated;
