-- 12-nov-2026 · El hándicap también cuenta las rondas de 9 hoyos (Sistema Mundial de Hándicap, regla 5.1b, revisión 2024).
-- Carlos lo pidió el 12-nov-2026 (antes, 5-nov, las rondas de 9 hoyos no cambiaban el hándicap).
--
-- Método oficial:
--   1. Hándicap de campo de 9 hoyos = hándicap exacto ÷ 2 × slope9 ÷ 113 + (valor de campo 9 − par 9)   (sin porcentaje)
--   2. Golpes ajustados: máximo doble bogey neto por hoyo (par + 2 + golpes recibidos, repartidos por la dificultad 1-9)
--   3. Diferencial de 9 hoyos = 113 ÷ slope9 × (golpes ajustados − valor de campo 9)
--   4. Diferencial de 18 hoyos = diferencial de 9 hoyos + diferencial esperado de los otros 9 (0,52 × hándicap exacto + 1,2)
--      El hándicap exacto es el que tenía el jugador al jugar (el guardado en la partida). Se redondea UNA vez, a 1 decimal.
--   5. Esa tarjeta cuenta como una más entre las últimas 20 (se promedian las 8 mejores; recalcular_handicaps_liga no cambia).
-- Solo cuentan tarjetas validadas y de campos con datos OFICIALES de 9 hoyos: hoy, Hato Verde amarillas
-- (hato-verde-9 = Ida, valor de campo 32,8 y slope 120; hato-verde-9v = Vuelta, 35,6 y 124). Otras salidas/campos: no cuentan hasta tener el dato.
-- Las rondas de 18 hoyos salen exactamente igual que antes (esp = 0).
--
-- Para deshacer: volver a crear la vista con la definición anterior (guardada en git: 2026-10-xx) y borrar campo_rating9 / campo_slope9.

create or replace function public.campo_rating9(p_course text, p_barra text) returns numeric
language sql immutable set search_path to 'public' as $$
  select case when coalesce(p_barra,'amarillas') = 'amarillas'
              then case p_course when 'hato-verde-9' then 32.8 when 'hato-verde-9v' then 35.6 end end
$$;

create or replace function public.campo_slope9(p_course text, p_barra text) returns integer
language sql immutable set search_path to 'public' as $$
  select case when coalesce(p_barra,'amarillas') = 'amarillas'
              then case p_course when 'hato-verde-9' then 120 when 'hato-verde-9v' then 124 end end
$$;

create or replace view public.tarjetas_liga_whs as
 WITH base AS (
         SELECT r.code,
            r.grupo_id AS gid,
            r.created_at AS played_at,
            r.course_id,
            pl.name AS jugador,
            COALESCE((((grp.value -> 'handicaps'::text) ->> ((pl.ord - 1))::integer))::numeric, (0)::numeric) AS hcp_usado,
            COALESCE(((grp.value -> 'barras'::text) ->> ((pl.ord - 1))::integer), 'amarillas'::text) AS barra,
            ARRAY( SELECT (NULLIF(regexp_replace(COALESCE((((grp.value -> 'scores'::text) -> ((pl.ord - 1))::text) ->> (i.i)::text), ''::text), '\D'::text, ''::text, 'g'::text), ''::text))::integer AS "nullif"
                   FROM generate_series(1, 18) i(i)
                  ORDER BY i.i) AS gross,
            ARRAY( SELECT ((r.course_par ->> (i.i - 1)))::integer AS int4
                   FROM generate_series(1, 18) i(i)
                  ORDER BY i.i) AS par,
            ARRAY( SELECT ((r.course_hcp ->> (i.i - 1)))::integer AS int4
                   FROM generate_series(1, 18) i(i)
                  ORDER BY i.i) AS si
           FROM ((rounds r
             CROSS JOIN LATERAL jsonb_array_elements(r.match_groups) WITH ORDINALITY grp(value, gord))
             CROSS JOIN LATERAL jsonb_array_elements_text((grp.value -> 'players'::text)) WITH ORDINALITY pl(name, ord))
          WHERE ((r.grupo_id IN ( SELECT g.id
                   FROM grupos g
                  WHERE (g.tipo = 'liga'::text))) AND (COALESCE((grp.value ->> 'modo'::text), 'individual'::text) = 'individual'::text) AND (r.created_at >= '2026-10-02 22:00:00+00'::timestamp with time zone) AND (COALESCE(r.round_name, ''::text) !~* 'prueba'::text) AND (r.course_id = ANY (ARRAY['hato-verde'::text, 'zaudin'::text])) AND (r.course_par IS NOT NULL) AND (r.course_hcp IS NOT NULL) AND (EXISTS ( SELECT 1
                   FROM tarjetas_validadas t
                  WHERE ((t.round_code = r.code) AND (t.grupo = ((grp.gord - 1))::integer) AND (t.jugador_idx = ((pl.ord - 1))::integer)))))
        ), ok AS (
         SELECT b.code,
            b.gid,
            b.played_at,
            b.course_id,
            b.jugador,
            b.hcp_usado,
            b.gross,
            b.par,
            b.si,
            campo_rating(b.course_id, b.barra) AS rating,
            campo_slope(b.course_id, b.barra) AS slope,
            GREATEST(hcp_campo(b.hcp_usado, b.course_id, b.par, b.barra), 0) AS ph
           FROM base b
          WHERE ((array_position(b.gross, NULL::integer) IS NULL) AND (NOT (EXISTS ( SELECT 1
                   FROM generate_series(1, 18) i(i)
                  WHERE ((b.gross[i.i] < 1) OR (b.gross[i.i] > (b.par[i.i] + 10)))))))
        ), calc18 AS (
         SELECT ok.code,
            ok.gid,
            ok.played_at,
            ok.course_id,
            ok.jugador,
            ok.hcp_usado,
            ( SELECT sum(LEAST(ok.gross[i.i], (((ok.par[i.i] + 2) + (ok.ph / 18)) +
                        CASE
                            WHEN ((ok.ph % 18) >= ok.si[i.i]) THEN 1
                            ELSE 0
                        END))) AS sum
                   FROM generate_series(1, 18) i(i)) AS ags,
            ok.slope,
            ok.rating,
            (0)::numeric AS esp
           FROM ok
        ), base9 AS (
         SELECT r.code,
            r.grupo_id AS gid,
            r.created_at AS played_at,
            r.course_id,
            pl.name AS jugador,
            COALESCE((((grp.value -> 'handicaps'::text) ->> ((pl.ord - 1))::integer))::numeric, (0)::numeric) AS hcp_usado,
            COALESCE(((grp.value -> 'barras'::text) ->> ((pl.ord - 1))::integer), 'amarillas'::text) AS barra,
            ARRAY( SELECT (NULLIF(regexp_replace(COALESCE((((grp.value -> 'scores'::text) -> ((pl.ord - 1))::text) ->> (i.i)::text), ''::text), '\D'::text, ''::text, 'g'::text), ''::text))::integer AS "nullif"
                   FROM generate_series(1, 9) i(i)
                  ORDER BY i.i) AS gross,
            ARRAY( SELECT ((r.course_par ->> (i.i - 1)))::integer AS int4
                   FROM generate_series(1, 9) i(i)
                  ORDER BY i.i) AS par,
            ARRAY( SELECT ((r.course_hcp ->> (i.i - 1)))::integer AS int4
                   FROM generate_series(1, 9) i(i)
                  ORDER BY i.i) AS si
           FROM ((rounds r
             CROSS JOIN LATERAL jsonb_array_elements(r.match_groups) WITH ORDINALITY grp(value, gord))
             CROSS JOIN LATERAL jsonb_array_elements_text((grp.value -> 'players'::text)) WITH ORDINALITY pl(name, ord))
          WHERE ((r.grupo_id IN ( SELECT g.id
                   FROM grupos g
                  WHERE (g.tipo = 'liga'::text))) AND (COALESCE((grp.value ->> 'modo'::text), 'individual'::text) = 'individual'::text) AND (r.created_at >= '2026-10-02 22:00:00+00'::timestamp with time zone) AND (COALESCE(r.round_name, ''::text) !~* 'prueba'::text) AND (r.course_id = ANY (ARRAY['hato-verde-9'::text, 'hato-verde-9v'::text])) AND (jsonb_array_length(r.course_par) = 9) AND (jsonb_array_length(r.course_hcp) = 9) AND (EXISTS ( SELECT 1
                   FROM tarjetas_validadas t
                  WHERE ((t.round_code = r.code) AND (t.grupo = ((grp.gord - 1))::integer) AND (t.jugador_idx = ((pl.ord - 1))::integer)))))
        ), ok9 AS (
         SELECT b.code,
            b.gid,
            b.played_at,
            b.course_id,
            b.jugador,
            b.hcp_usado,
            b.gross,
            b.par,
            b.si,
            campo_rating9(b.course_id, b.barra) AS rating,
            campo_slope9(b.course_id, b.barra) AS slope
           FROM base9 b
          WHERE ((campo_slope9(b.course_id, b.barra) IS NOT NULL) AND (array_position(b.gross, NULL::integer) IS NULL) AND (NOT (EXISTS ( SELECT 1
                   FROM generate_series(1, 9) i(i)
                  WHERE ((b.gross[i.i] < 1) OR (b.gross[i.i] > (b.par[i.i] + 10)))))))
        ), calc9 AS (
         SELECT o.code,
            o.gid,
            o.played_at,
            o.course_id,
            o.jugador,
            o.hcp_usado,
            ( SELECT sum(LEAST(o.gross[i.i], (((o.par[i.i] + 2) + (o.ph / 9)) +
                        CASE
                            WHEN ((o.ph % 9) >= o.si[i.i]) THEN 1
                            ELSE 0
                        END))) AS sum
                   FROM generate_series(1, 9) i(i)) AS ags,
            o.slope,
            o.rating,
            ((0.52 * o.hcp_usado) + 1.2) AS esp
           FROM ( SELECT ok9.*,
                    GREATEST(round(((ok9.hcp_usado * 0.5 * (ok9.slope)::numeric / 113.0) + (ok9.rating - (( SELECT sum(x.x) AS sum
                           FROM unnest(ok9.par) x(x)))::numeric)))::integer, 0) AS ph
                   FROM ok9) o
        ), calc AS (
         SELECT calc18.code, calc18.gid, calc18.played_at, calc18.course_id, calc18.jugador, calc18.hcp_usado, calc18.ags, calc18.slope, calc18.rating, calc18.esp FROM calc18
        UNION ALL
         SELECT calc9.code, calc9.gid, calc9.played_at, calc9.course_id, calc9.jugador, calc9.hcp_usado, calc9.ags, calc9.slope, calc9.rating, calc9.esp FROM calc9
        ), mio AS (
         SELECT mi_grupo() AS g
        )
 SELECT c.code,
    c.played_at,
    c.course_id,
    c.jugador,
    c.hcp_usado,
    c.ags,
    round((((113.0 / (c.slope)::numeric) * ((c.ags)::numeric - c.rating)) + c.esp), 1) AS diferencial
   FROM calc c,
    mio
  WHERE (c.gid = mio.g)
UNION ALL
 SELECT c.code,
    c.played_at,
    c.course_id,
    m2.player_name AS jugador,
    c.hcp_usado,
    c.ags,
    round((((113.0 / (c.slope)::numeric) * ((c.ags)::numeric - c.rating)) + c.esp), 1) AS diferencial
   FROM (((calc c
     CROSS JOIN mio)
     JOIN miembros m1 ON (((m1.grupo_id = c.gid) AND (sin_acentos(TRIM(BOTH FROM m1.player_name)) = sin_acentos(TRIM(BOTH FROM c.jugador))))))
     JOIN miembros m2 ON (((m2.user_id = m1.user_id) AND (m2.grupo_id = mio.g))))
  WHERE (c.gid <> mio.g);
