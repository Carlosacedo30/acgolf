-- «¿Cómo jugué?»: últimas tarjetas completas de 18 hoyos de un jugador (app + historial de golfdirecto),
-- solo de los grupos del que pregunta. Ya aplicado en la base de datos.
CREATE OR REPLACE FUNCTION public.ultimas_tarjetas(p_jugador text, p_limite integer DEFAULT 18)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k text := sin_acentos(trim(coalesce(p_jugador, '')));
begin
  if auth.uid() is null or k = '' then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(s.t order by s.cuando) from (
    select x.t, x.cuando from (
      -- Partidas de la app
      select jsonb_build_object('fecha', r.created_at, 'campo', r.course_name, 'par', r.course_par,
               'golpes', (select jsonb_agg(((g->'scores'->(jp.idx::text))->>(h::text))::int order by h) from generate_series(1, 18) h),
               'hcp', g->'handicaps'->jp.idx, 'fuente', 'acgolf') as t, r.created_at as cuando
      from rounds r
      cross join lateral jsonb_array_elements(r.match_groups) g
      cross join lateral (select (o - 1)::int as idx, p from jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) with ordinality as e(p, o)) jp
      where r.grupo_id in (select grupo_id from miembros where user_id = auth.uid())
        and sin_acentos(trim(jp.p)) = k
        and jsonb_array_length(coalesce(r.course_par, '[]'::jsonb)) = 18
        and (select count(*) from generate_series(1, 18) h where ((g->'scores'->(jp.idx::text))->>(h::text)) ~ '^[1-9][0-9]?$') = 18
      union all
      -- Historial importado de golfdirecto
      select jsonb_build_object('fecha', d.played_at, 'campo', initcap(lower(d.club)), 'par', to_jsonb(d.par), 'golpes', to_jsonb(d.gross),
               'hcp', d.hcp_exact, 'fuente', 'golfdirecto'), d.played_at
      from gd_history d
      where (d.grupo_id is null or d.grupo_id in (select grupo_id from miembros where user_id = auth.uid()))
        and sin_acentos(trim(d.player_name)) = k
        and cardinality(d.gross) = 18 and cardinality(d.par) = 18
        and 0 < all(d.gross)
    ) x order by x.cuando desc limit greatest(1, least(coalesce(p_limite, 18), 60))
  ) s), '[]'::jsonb);
end $function$;
revoke all on function public.ultimas_tarjetas(text, integer) from public, anon;
grant execute on function public.ultimas_tarjetas(text, integer) to authenticated;
