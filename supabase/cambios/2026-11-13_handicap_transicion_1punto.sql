-- 13-nov-2026 · Carlos pide que la entrada suave sea de 1 punto (antes 2): con menos de 20 tarjetas el hándicap no baja más de 1 punto por revisión.
-- Se conservan todas las tarjetas antiguas (medias y número de partidas). Hoy no cambia nadie: el primer cambio llega con la próxima tarjeta de cada jugador.
-- Solo cambia la última cifra de la llamada a hcp_revision en recalcular_handicaps_liga (2 → 1). Para deshacer: poner 2.
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
           hcp_revision(coalesce(u20.ds, '{}'::numeric[]), bajo.low, lp.hcp, 1) nuevo
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
