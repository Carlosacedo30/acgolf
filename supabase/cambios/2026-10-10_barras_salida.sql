-- © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
-- Golpes de regalo según la BARRA DE SALIDA de cada jugador (blancas, amarillas, azules, rojas).
-- Cada partida guarda en cada grupo la lista "barras" (una por jugador, en el mismo orden que "players").
-- Si no hay barra guardada se usa la de siempre: amarillas. Así las partidas antiguas no cambian.
-- Datos: Course Rating / Slope oficiales (masculino). Deben coincidir con "tees" de js/data.js.
-- Aplicado primero en PRUEBAS (svnkgmbfanwftncopqjg).

-- 1) Dificultad de cada campo y barra
create or replace function public.campo_rating(p_course text, p_barra text)
returns numeric language sql immutable set search_path to 'public' as $$
  select case p_course
    when 'hato-verde' then case coalesce(p_barra,'amarillas') when 'blancas' then 70.7 when 'azules' then 67.5 when 'rojas' then 66.0 else 68.3 end
    when 'zaudin'     then case coalesce(p_barra,'amarillas') when 'blancas' then 73.8 when 'azules' then 68.0 when 'rojas' then 65.8 else 70.5 end
  end
$$;
create or replace function public.campo_slope(p_course text, p_barra text)
returns integer language sql immutable set search_path to 'public' as $$
  select case p_course
    when 'hato-verde' then case coalesce(p_barra,'amarillas') when 'blancas' then 121 when 'azules' then 115 when 'rojas' then 113 else 122 end
    when 'zaudin'     then case coalesce(p_barra,'amarillas') when 'blancas' then 135 when 'azules' then 128 when 'rojas' then 120 else 133 end
  end
$$;

-- 2) Hándicap de campo con barra: hándicap × slope ÷ 113 + (rating − par)
create or replace function public.hcp_campo(p_idx numeric, p_course text, p_par integer, p_barra text)
returns integer language sql immutable set search_path to 'public' as $$
  select case when campo_slope(p_course, p_barra) is null then round(coalesce(p_idx,0))
              else round(coalesce(p_idx,0) * campo_slope(p_course, p_barra) / 113.0 + (campo_rating(p_course, p_barra) - p_par)) end::integer
$$;
create or replace function public.hcp_campo(p_idx numeric, p_course text, p_par integer[], p_barra text)
returns integer language sql immutable set search_path to 'public' as $$
  select public.hcp_campo(p_idx, p_course, (select sum(x)::integer from unnest(p_par) x), p_barra)
$$;
create or replace function public.hcp_campo(p_idx numeric, p_course text, p_par jsonb, p_barra text)
returns integer language sql immutable set search_path to 'public' as $$
  select public.hcp_campo(p_idx, p_course, (select sum(x::integer)::integer from jsonb_array_elements_text(p_par) x), p_barra)
$$;
-- Las de siempre (sin barra) = amarillas
create or replace function public.hcp_campo(p_idx numeric, p_course text, p_par integer)
returns integer language sql immutable set search_path to 'public' as $$
  select public.hcp_campo(p_idx, p_course, p_par, 'amarillas'::text)
$$;

-- 3) Tarjetas de la liga: el neto usa la barra de cada jugador
create or replace view public.tarjetas_liga as
 WITH gd AS (
         SELECT g.player_name AS nombre, g.played_at, g.tournament_name AS partida,
                CASE WHEN (g.club ~~* '%HATO VERDE%') THEN 'hato-verde' WHEN (g.club ~~* '%ZAUD%') THEN 'zaudin' ELSE NULL::text END AS course_id,
            g.gross, g.par, (g.hcp_game)::integer AS hcp_juego, 'golfdirecto'::text AS fuente
           FROM gd_history g
          WHERE g.lap = 'lap18' AND g.grupo_id = mi_grupo()
        ), app AS (
         SELECT pl.name AS nombre, r.created_at AS played_at, r.round_name AS partida, r.course_id,
            ARRAY( SELECT (NULLIF(regexp_replace(COALESCE((((grp.value -> 'scores') -> ((pl.ord - 1))::text) ->> (i.i)::text), ''), '\D', '', 'g'), ''))::integer
                   FROM generate_series(1, 18) i(i) ORDER BY i.i) AS gross,
            ARRAY( SELECT ((r.course_par ->> (i.i - 1)))::integer FROM generate_series(1, 18) i(i) ORDER BY i.i) AS par,
            hcp_campo(COALESCE(((grp.value -> 'handicaps') ->> ((pl.ord - 1))::integer)::numeric, 0::numeric), r.course_id, r.course_par,
                      COALESCE((grp.value -> 'barras') ->> ((pl.ord - 1))::integer, 'amarillas')) AS hcp_juego,
            'app'::text AS fuente
           FROM rounds r
             CROSS JOIN LATERAL jsonb_array_elements(r.match_groups) WITH ORDINALITY grp(value, gord)
             CROSS JOIN LATERAL jsonb_array_elements_text(grp.value -> 'players') WITH ORDINALITY pl(name, ord)
          WHERE r.grupo_id = mi_grupo() AND COALESCE(grp.value ->> 'modo', 'individual') = 'individual'
            AND r.created_at >= '2026-10-02 22:00:00+00' AND COALESCE(r.round_name, '') !~* 'prueba'
            AND r.course_id = ANY (ARRAY['hato-verde', 'zaudin']) AND r.course_par IS NOT NULL
            AND EXISTS (SELECT 1 FROM tarjetas_validadas t WHERE t.round_code = r.code AND t.grupo = (grp.gord - 1)::integer AND t.jugador_idx = (pl.ord - 1)::integer)
        ), u AS (
         SELECT nombre, played_at, partida, course_id, gross, par, hcp_juego, fuente FROM gd
        UNION ALL
         SELECT nombre, played_at, partida, course_id, gross, par, hcp_juego, fuente FROM app
        )
 SELECT upper(translate(regexp_replace(u.nombre, '\s+', ' ', 'g'), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) AS player_key,
    COALESCE(lp.name, initcap(lower(regexp_replace(u.nombre, '\s+', ' ', 'g')))) AS jugador,
    u.played_at, u.partida, u.course_id, u.gross, u.par, u.hcp_juego,
    (SELECT sum(x.x) FROM unnest(u.gross) x(x)) AS bruto,
    (SELECT sum(x.x) FROM unnest(u.par) x(x)) AS par_total,
    u.fuente
   FROM u
     LEFT JOIN league_players lp ON lp.grupo_id = mi_grupo()
       AND upper(translate(regexp_replace(lp.name, '\s+', ' ', 'g'), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) = upper(translate(regexp_replace(u.nombre, '\s+', ' ', 'g'), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
  WHERE u.course_id IS NOT NULL AND array_length(u.gross, 1) = 18 AND array_position(u.gross, NULL::integer) IS NULL
    AND NOT EXISTS (SELECT 1 FROM generate_series(1, 18) i(i) WHERE u.gross[i.i] < u.par[i.i] - 2 OR u.gross[i.i] > u.par[i.i] + 8);

-- 4) Rondas para el hándicap: diferencial con el rating y slope de la barra jugada
create or replace view public.tarjetas_liga_whs as
 WITH base AS (
         SELECT r.code, r.created_at AS played_at, r.course_id, pl.name AS jugador,
            COALESCE(((grp.value -> 'handicaps') ->> ((pl.ord - 1))::integer)::numeric, 0::numeric) AS hcp_usado,
            COALESCE((grp.value -> 'barras') ->> ((pl.ord - 1))::integer, 'amarillas') AS barra,
            ARRAY( SELECT (NULLIF(regexp_replace(COALESCE((((grp.value -> 'scores') -> ((pl.ord - 1))::text) ->> (i.i)::text), ''), '\D', '', 'g'), ''))::integer
                   FROM generate_series(1, 18) i(i) ORDER BY i.i) AS gross,
            ARRAY( SELECT ((r.course_par ->> (i.i - 1)))::integer FROM generate_series(1, 18) i(i) ORDER BY i.i) AS par,
            ARRAY( SELECT ((r.course_hcp ->> (i.i - 1)))::integer FROM generate_series(1, 18) i(i) ORDER BY i.i) AS si
           FROM rounds r
             CROSS JOIN LATERAL jsonb_array_elements(r.match_groups) WITH ORDINALITY grp(value, gord)
             CROSS JOIN LATERAL jsonb_array_elements_text(grp.value -> 'players') WITH ORDINALITY pl(name, ord)
          WHERE r.grupo_id = mi_grupo() AND COALESCE(grp.value ->> 'modo', 'individual') = 'individual'
            AND r.created_at >= '2026-10-02 22:00:00+00' AND COALESCE(r.round_name, '') !~* 'prueba'
            AND r.course_id = ANY (ARRAY['hato-verde', 'zaudin']) AND r.course_par IS NOT NULL AND r.course_hcp IS NOT NULL
            AND EXISTS (SELECT 1 FROM tarjetas_validadas t WHERE t.round_code = r.code AND t.grupo = (grp.gord - 1)::integer AND t.jugador_idx = (pl.ord - 1)::integer)
        ), ok AS (
         SELECT b.code, b.played_at, b.course_id, b.jugador, b.hcp_usado, b.gross, b.par, b.si,
            campo_rating(b.course_id, b.barra) AS rating,
            campo_slope(b.course_id, b.barra) AS slope,
            GREATEST(hcp_campo(b.hcp_usado, b.course_id, b.par, b.barra), 0) AS ph
           FROM base b
          WHERE array_position(b.gross, NULL::integer) IS NULL
            AND NOT EXISTS (SELECT 1 FROM generate_series(1, 18) i(i) WHERE b.gross[i.i] < 1 OR b.gross[i.i] > b.par[i.i] + 10)
        )
 SELECT code, played_at, course_id, jugador, hcp_usado,
    (SELECT sum(LEAST(ok.gross[i.i], ok.par[i.i] + 2 + ok.ph / 18 + CASE WHEN ok.ph % 18 >= ok.si[i.i] THEN 1 ELSE 0 END)) FROM generate_series(1, 18) i(i)) AS ags,
    round((113.0 / slope::numeric) * ((SELECT sum(LEAST(ok.gross[i.i], ok.par[i.i] + 2 + ok.ph / 18 + CASE WHEN ok.ph % 18 >= ok.si[i.i] THEN 1 ELSE 0 END)) FROM generate_series(1, 18) i(i))::numeric - rating), 1) AS diferencial
   FROM ok;

-- 5) Listado de hándicap de las partidas recién terminadas: neto con la barra de cada uno
create or replace function public.listado_handicap_reciente(p_dias integer default 4)
returns jsonb language sql stable set search_path to 'public' as $function$
with r as (
  select code, round_name, course_id, created_at, updated_at, match_groups, course_par
  from rounds
  where course_id in ('hato-verde','zaudin')
    and created_at >= '2026-10-02 22:00:00+00'
    and coalesce(round_name,'') !~* 'prueba'
    and updated_at >= now() - interval '5 hours 15 minutes'
    and updated_at <= now() - interval '15 minutes'
    and course_par is not null
),
jug as (
  select r.code, r.round_name, r.course_id, r.created_at, r.updated_at, pl.name as jugador,
         coalesce((grp->'handicaps'->>((pl.ord-1)::int))::numeric, 0) as hcp_antes,
         coalesce(grp->'barras'->>((pl.ord-1)::int), 'amarillas') as barra,
         (select count(*) from jsonb_each_text(coalesce(grp->'scores'->((pl.ord-1)::text),'{}'::jsonb)) s
            where s.key ~ '^\d+$' and s.value ~ '^\d+$' and s.value::int > 0) as hoyos,
         (select coalesce(sum(s.value::int),0) from jsonb_each_text(coalesce(grp->'scores'->((pl.ord-1)::text),'{}'::jsonb)) s
            where s.key ~ '^\d+$' and s.value ~ '^\d+$') as golpes,
         (select sum(x::int) from jsonb_array_elements_text(r.course_par) x) as par_total
  from r
  cross join lateral jsonb_array_elements(r.match_groups) grp
  cross join lateral jsonb_array_elements_text(grp->'players') with ordinality pl(name, ord)
  where coalesce(pl.name,'') <> ''
),
terminadas as (
  select code from jug group by code having count(*) > 0 and bool_and(hoyos >= 18)
),
filas as (
  select j.*,
    (j.golpes - hcp_campo(j.hcp_antes, j.course_id, j.par_total::int, j.barra))::int as neto,
    exists (select 1 from league_players lp where lp.name = j.jugador) as es_liga,
    coalesce((select h.hcp_despues from handicap_historial h
               where h.player_name = j.jugador and h.cambiado_en >= j.created_at and h.cambiado_en <= j.updated_at + interval '1 minute'
               order by h.cambiado_en desc limit 1), j.hcp_antes) as hcp_despues
  from jug j where j.code in (select code from terminadas)
)
select coalesce(jsonb_agg(p order by p->>'terminada' desc), '[]'::jsonb) from (
  select jsonb_build_object(
    'code', code, 'nombre', max(round_name), 'course_id', max(course_id),
    'terminada', max(updated_at),
    'jugadores', jsonb_agg(jsonb_build_object(
        'jugador', jugador, 'golpes', golpes, 'neto', neto, 'par', par_total,
        'hcp_antes', hcp_antes, 'hcp_despues', hcp_despues, 'liga', es_liga, 'barra', barra)
      order by neto, hcp_antes, golpes)
  ) p
  from filas group by code
) z;
$function$;
