-- 2026-11-15 · Arreglo: tarjetas entregadas que se quedaban sin validar.
-- Qué pasaba: si varios jugadores del grupo pulsaban «Entregar» casi a la vez (el mismo segundo), cada uno
-- comprobaba la validación sin ver lo que acababan de entregar los otros, y dos tarjetas (la de Carlos y la de Jesús
-- en la partida del 15-nov) se quedaban «sin cerrar» aunque estaban entregadas y coincidían.
-- Arreglo: las entregas de una misma partida se hacen una detrás de otra (cerrojo), y además se repara la partida afectada.

create or replace function public.entregar_tarjeta(p_code text, p_grupo integer)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare yo int := _mi_idx(p_code, p_grupo); v_marcados int[]; i int; v_nombre text;
begin
  if yo is null then raise exception 'Solo un jugador de este grupo puede entregar'; end if;
  -- una entrega cada vez en la misma partida (evita que dos entregas simultáneas no se vean entre sí)
  perform pg_advisory_xact_lock(hashtext('entregar:' || p_code));
  if not exists (select 1 from marcadores where round_code = p_code and grupo = p_grupo and jugador_idx = yo) then
    raise exception 'Juegas sin marcador: esta tarjeta no cuenta para la liga';
  end if;
  if not _tarjeta_ok(p_code, p_grupo, yo) then raise exception 'Tu tarjeta aún no coincide hoyo a hoyo con la de tu marcador'; end if;
  select array_agg(jugador_idx) into v_marcados from marcadores where round_code = p_code and grupo = p_grupo and marcador_idx = yo;
  if v_marcados is not null then
    foreach i in array v_marcados loop
      if not _tarjeta_ok(p_code, p_grupo, i) then raise exception 'La tarjeta del jugador que marcas aún no coincide hoyo a hoyo'; end if;
    end loop;
  end if;
  insert into entregas (round_code, grupo, jugador_idx, tipo, user_id) values (p_code, p_grupo, yo, 'propia', auth.uid()) on conflict do nothing;
  if v_marcados is not null then
    foreach i in array v_marcados loop
      insert into entregas (round_code, grupo, jugador_idx, tipo, user_id) values (p_code, p_grupo, i, 'marcador', auth.uid()) on conflict do nothing;
    end loop;
  end if;
  -- Oficial: entregada por el jugador y confirmada por su marcador
  for i, v_nombre in
    select pl.ord - 1, pl.name from rounds r cross join lateral jsonb_array_elements_text(r.match_groups->p_grupo->'players') with ordinality pl(name, ord) where r.code = p_code
  loop
    if exists (select 1 from entregas where round_code = p_code and grupo = p_grupo and jugador_idx = i and tipo = 'propia')
       and exists (select 1 from entregas where round_code = p_code and grupo = p_grupo and jugador_idx = i and tipo = 'marcador')
       and _tarjeta_ok(p_code, p_grupo, i) then
      insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name) values (p_code, p_grupo, i, v_nombre) on conflict do nothing;
    end if;
  end loop;
  return estado_marcas(p_code);
end; $$;

-- Reparación: valida las tarjetas de los últimos 3 días que ya están entregadas por el jugador y por su marcador y coinciden.
insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name)
select r.code, (g.ord - 1)::int, (p.ord - 1)::int, p.name
from rounds r
cross join lateral jsonb_array_elements(r.match_groups) with ordinality g(v, ord)
cross join lateral jsonb_array_elements_text(coalesce(g.v->'players', '[]'::jsonb)) with ordinality p(name, ord)
where r.created_at > now() - interval '3 days' and r.code is not null and jsonb_typeof(r.match_groups) = 'array' and trim(p.name) <> ''
  and exists (select 1 from entregas e where e.round_code = r.code and e.grupo = g.ord - 1 and e.jugador_idx = p.ord - 1 and e.tipo = 'propia')
  and exists (select 1 from entregas e where e.round_code = r.code and e.grupo = g.ord - 1 and e.jugador_idx = p.ord - 1 and e.tipo = 'marcador')
  and _tarjeta_ok(r.code, (g.ord - 1)::int, (p.ord - 1)::int)
on conflict do nothing;
