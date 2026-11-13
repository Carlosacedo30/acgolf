-- 13-nov-2026 · El hándicap se revisa exactamente como lo hace la Federación (norma de Carlos).
-- Solo con las partidas de la app. Ver CLAUDE.md (norma «Hándicap») y el documento del proyecto «norma-handicap-federacion».
--
--  1. Últimos 20 resultados; si hay menos, los que haya (YA NO se rellena con el hándicap de salida).
--     3 → la mejor −2 · 4 → la mejor −1 · 5 → la mejor · 6 → media de las 2 mejores −1 · 7-8 → 2 mejores · 9-11 → 3
--     12-14 → 4 · 15-16 → 5 · 17-18 → 6 · 19 → 7 · 20 → 8. Con menos de 3 no se revisa (se queda el de salida).
--  2. Limitación: si el resultado supera en más de 3 el hándicap más bajo de los últimos 12 meses, lo que pasa de 3 cuenta a la mitad.
--  3. Tope: nunca más de 5 sobre ese hándicap más bajo.
--  4. Un decimal. (Los diferenciales ya van con el hándicap de juego al 100 %: vista tarjetas_liga_whs, sin cambios.)
-- Hándicap más bajo = el menor entre el de salida, el actual y los de handicap_historial de los últimos 12 meses.
-- Para deshacer: volver a crear recalcular_handicaps_liga con la definición anterior (git: esta carpeta, 2026-10-xx) y borrar hcp_revision.

create or replace function public.hcp_revision(p_difs numeric[], p_bajo numeric, p_salida numeric) returns numeric
language plpgsql immutable set search_path to 'public' as $$
declare n int := coalesce(array_length(p_difs, 1), 0); k int; aj numeric; base numeric; r numeric;
begin
  if n < 3 then return p_salida; end if;
  k := case when n <= 5 then 1 when n <= 8 then 2 when n <= 11 then 3 when n <= 14 then 4 when n <= 16 then 5 when n <= 18 then 6 when n = 19 then 7 else 8 end;
  aj := case n when 3 then -2.0 when 4 then -1.0 when 6 then -1.0 else 0 end;
  select avg(x) + aj into base from (select x from unnest(p_difs) x order by x limit k) s;
  r := base;
  if p_bajo is not null and base > p_bajo + 3 then
    r := least(p_bajo + 3 + (base - (p_bajo + 3)) / 2, p_bajo + 5);
  end if;
  return least(greatest(round(r, 1), -10), 54);
end $$;

create or replace function public.recalcular_handicaps_liga() returns void
language plpgsql security definer set search_path to 'public' as $function$
declare p record; u uuid; g uuid := mi_grupo(); es_liga boolean;
begin
  es_liga := exists (select 1 from grupos where id = g and tipo = 'liga');
  for p in
    with t as materialized (select jugador, diferencial d, played_at from tarjetas_liga_whs),
     lp as (select name, hcp, hcp_base from league_players where hcp_base is not null and grupo_id = g),
     cnt as (select jugador, count(*) n from t group by jugador),
     ult as (select jugador, d, row_number() over (partition by jugador order by played_at desc) rn from t),
     u20 as (select jugador, array_agg(d) ds from ult where rn <= 20 group by jugador),
     bajo as (select lp.name, least(lp.hcp, lp.hcp_base, coalesce((select min(h.hcp_despues) from handicap_historial h
                where h.player_name = lp.name and h.cambiado_en >= now() - interval '12 months'), lp.hcp)) low from lp)
    select lp.name, lp.hcp, lp.hcp_base, coalesce(cnt.n, 0)::int n,
           hcp_revision(coalesce(u20.ds, '{}'::numeric[]), bajo.low, lp.hcp_base) nuevo
    from lp left join cnt on cnt.jugador = lp.name left join u20 on u20.jugador = lp.name left join bajo on bajo.name = lp.name
  loop
    if p.nuevo is distinct from p.hcp then
      update league_players set hcp = p.nuevo where name = p.name and grupo_id = g;
      insert into handicap_historial (player_name, hcp_antes, hcp_despues, tarjetas_liga) values (p.name, p.hcp, p.nuevo, p.n);
    end if;
    if es_liga then
      u := _usuario_de(g, p.name);
      if u is not null then
        perform _hcp_a_todos(u, p.nuevo, p.hcp_base, g);
      end if;
    end if;
  end loop;
end; $function$;
