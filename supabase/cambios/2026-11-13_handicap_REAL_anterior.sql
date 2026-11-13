-- 13-nov-2026 · Copia de la función de acgolf-REAL ANTES del cambio «hándicap como la Federación» (para volver atrás).
-- Para deshacer en REAL: pegar este archivo en el Editor SQL de acgolf-REAL (svnkgmbfanwftncopqjg). La función hcp_revision puede quedarse (no la usa nadie).
-- Y en acgolf-app volver al paquete anterior (app-4522b51b31.js, commit anterior al PR #20).
create or replace function public.recalcular_handicaps_liga() returns void
language plpgsql security definer set search_path to 'public' as $function$
-- Igual que antes, pero calcula las tarjetas una sola vez para todos los jugadores (antes una vez por jugador y tardaba demasiado)
declare p record; u uuid; g uuid := mi_grupo(); es_liga boolean;
begin
  es_liga := exists (select 1 from grupos where id = g and tipo = 'liga');
  for p in
    with t as materialized (select jugador, diferencial d, played_at from tarjetas_liga_whs),
     lp as (select name, hcp, hcp_base from league_players where hcp_base is not null and grupo_id = g),
     cnt as (select jugador, count(*) n from t group by jugador),
     ult as (select jugador, d, row_number() over (partition by jugador order by played_at desc) rn from t),
     todo as (
       select lp.name, u2.d from lp join ult u2 on u2.jugador = lp.name and u2.rn <= 20
       union all
       select lp.name, lp.hcp_base from lp left join cnt on cnt.jugador = lp.name
         cross join lateral generate_series(1, greatest(20 - coalesce(cnt.n, 0), 0))
     ),
     rk as (select name, d, row_number() over (partition by name order by d) k from todo),
     mej as (select name, round(avg(d), 1) nuevo from rk where k <= 8 group by name)
    select lp.name, lp.hcp, lp.hcp_base, coalesce(cnt.n, 0)::int n, least(greatest(mej.nuevo, -10), 54) nuevo
    from lp left join cnt on cnt.jugador = lp.name left join mej on mej.name = lp.name
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
