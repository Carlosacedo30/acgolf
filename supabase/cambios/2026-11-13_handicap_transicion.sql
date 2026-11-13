-- 13-nov-2026 · Entrada suave de la norma de la Federación (acordado con Carlos):
--   · Con menos de 20 tarjetas, el hándicap no puede BAJAR más de 2 puntos en cada revisión (freno nuestro, de transición).
--     Con 20 tarjetas se quita y queda el método puro de la Federación. Es por jugador.
--   · Con menos de 3 tarjetas el hándicap se queda COMO ESTÁ (antes de este cambio volvía al de salida).
-- Para deshacer: volver a la definición de 2026-11-13_handicap_federacion.sql.
drop function if exists public.hcp_revision(numeric[], numeric, numeric);

create or replace function public.hcp_revision(p_difs numeric[], p_bajo numeric, p_actual numeric, p_max_baja numeric default 2) returns numeric
language plpgsql immutable set search_path to 'public' as $$
declare n int := coalesce(array_length(p_difs, 1), 0); k int; aj numeric; base numeric; r numeric;
begin
  if n < 3 then return p_actual; end if;
  k := case when n <= 5 then 1 when n <= 8 then 2 when n <= 11 then 3 when n <= 14 then 4 when n <= 16 then 5 when n <= 18 then 6 when n = 19 then 7 else 8 end;
  aj := case n when 3 then -2.0 when 4 then -1.0 when 6 then -1.0 else 0 end;
  select avg(x) + aj into base from (select x from unnest(p_difs) x order by x limit k) s;
  r := base;
  if p_bajo is not null and base > p_bajo + 3 then
    r := least(p_bajo + 3 + (base - (p_bajo + 3)) / 2, p_bajo + 5);
  end if;
  r := least(greatest(round(r, 1), -10), 54);
  if n < 20 and p_max_baja is not null and p_actual is not null and r < p_actual - p_max_baja then r := p_actual - p_max_baja; end if;
  return r;
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
           hcp_revision(coalesce(u20.ds, '{}'::numeric[]), bajo.low, lp.hcp, 2) nuevo
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
