-- 2026-11-15 · Arreglo del hándicap: baja como mucho 1 punto POR TARJETA NUEVA (norma «entrada suave»).
-- Qué pasaba: la revisión se repetía cada vez que se guardaba cualquier cosa (tarjetas de otros, firmas, partidas…) y
-- cada repetición bajaba otro punto, partiendo del hándicap ya rebajado (Manuel: 22,5 → 15,0 en un solo día).
-- Arreglo: cada jugador guarda con cuántas tarjetas se revisó por última vez (hcp_n). Si no hay tarjeta nueva, no se revisa.
-- Además se devuelve a su sitio a los jugadores que ya habían bajado de más hoy (el valor de la PRIMERA revisión del día).

alter table public.league_players add column if not exists hcp_n int;

drop function if exists public._hcp_a_todos(uuid, numeric, numeric, uuid);
create or replace function public._hcp_a_todos(p_user uuid, p_hcp numeric, p_base numeric, p_menos uuid, p_n int default null)
 returns void language plpgsql security definer set search_path to 'public' as $$
declare x record;
begin
  insert into hcp_global (user_id, hcp, hcp_base, grupo_principal, actualizado_en)
    values (p_user, p_hcp, p_base, p_menos, now())
  on conflict (user_id) do update set hcp = excluded.hcp, hcp_base = excluded.hcp_base, actualizado_en = now();
  perform set_config('acgolf.sin_aviso', '1', true);
  for x in
    select lp.grupo_id, lp.name, lp.hcp from league_players lp
    join miembros m on m.grupo_id = lp.grupo_id and lower(m.player_name) = lower(lp.name)
    join grupos g on g.id = lp.grupo_id and g.tipo = 'liga'
    where m.user_id = p_user and lp.grupo_id is distinct from p_menos
      and (lp.hcp is distinct from p_hcp or lp.hcp_base is distinct from p_base or (p_n is not null and lp.hcp_n is distinct from p_n))
  loop
    update league_players set hcp = p_hcp, hcp_base = p_base, hcp_n = coalesce(p_n, hcp_n) where grupo_id = x.grupo_id and name = x.name;
    if x.hcp is distinct from p_hcp then
      insert into handicap_historial (player_name, hcp_antes, hcp_despues, tarjetas_liga, grupo_id)
        values (x.name, x.hcp, p_hcp, null, x.grupo_id);
    end if;
  end loop;
  perform set_config('acgolf.sin_aviso', '', true);
end; $$;

create or replace function public.recalcular_handicaps_liga()
 returns void language plpgsql security definer set search_path to 'public' as $$
declare p record; u uuid; g uuid := mi_grupo(); es_liga boolean;
        corte timestamptz := '2026-11-13 17:00:00+00'; -- 13-nov-2026 18:00 hora de Madrid
begin
  es_liga := exists (select 1 from grupos where id = g and tipo = 'liga');
  for p in
    with t as materialized (select jugador, diferencial d, played_at from tarjetas_liga_whs),
     lp as (select name, hcp, hcp_base, hcp_n from league_players where hcp_base is not null and grupo_id = g
            and exists (select 1 from t where t.jugador = league_players.name and t.played_at >= corte)),
     cnt as (select jugador, count(*) n from t group by jugador),
     ult as (select jugador, d, row_number() over (partition by jugador order by played_at desc) rn from t),
     u20 as (select jugador, array_agg(d) ds from ult where rn <= 20 group by jugador),
     bajo as (select lp.name, least(lp.hcp, lp.hcp_base, coalesce((select min(h.hcp_despues) from handicap_historial h
                where h.player_name = lp.name and h.cambiado_en >= now() - interval '12 months'), lp.hcp)) low from lp)
    select lp.name, lp.hcp, lp.hcp_base, lp.hcp_n, coalesce(cnt.n, 0)::int n,
           hcp_revision(coalesce(u20.ds, '{}'::numeric[]), bajo.low, lp.hcp, 1) nuevo
    from lp left join cnt on cnt.jugador = lp.name left join u20 on u20.jugador = lp.name left join bajo on bajo.name = lp.name
  loop
    -- Solo se revisa cuando hay una tarjeta nueva desde la última revisión (así nunca baja más de 1 por tarjeta)
    if p.hcp_n is not null and p.hcp_n >= p.n then continue; end if;
    if p.nuevo is distinct from p.hcp then
      update league_players set hcp = p.nuevo where name = p.name and grupo_id = g;
      insert into handicap_historial (player_name, hcp_antes, hcp_despues, tarjetas_liga) values (p.name, p.hcp, p.nuevo, p.n);
    end if;
    update league_players set hcp_n = p.n where name = p.name and grupo_id = g;
    if es_liga then
      u := _usuario_de(g, p.name);
      if u is not null then
        perform _hcp_a_todos(u, p.nuevo, p.hcp_base, g, p.n);
      end if;
    end if;
  end loop;
end; $$;

-- Reparación 1: devolver a los jugadores que hoy bajaron de más al valor de su PRIMERA revisión del día (la buena),
-- sin avisos al móvil.
do $$
declare x record; u uuid;
begin
  perform set_config('acgolf.sin_aviso', '1', true);
  for x in
    select h.player_name, h.grupo_id, (array_agg(h.hcp_antes order by h.id))[1] ini, (array_agg(h.hcp_despues order by h.id))[1] primero,
           (array_agg(h.hcp_despues order by h.id desc))[1] ahora, count(*) n
    from handicap_historial h
    where h.cambiado_en >= '2026-11-15 00:00:00+00' and h.grupo_id is not null
    group by h.player_name, h.grupo_id having count(*) > 1
  loop
    update league_players set hcp = x.primero where name = x.player_name and grupo_id = x.grupo_id and hcp = x.ahora;
    if found then
      insert into handicap_historial (player_name, hcp_antes, hcp_despues, tarjetas_liga, grupo_id) values (x.player_name, x.ahora, x.primero, null, x.grupo_id);
      u := _usuario_de(x.grupo_id, x.player_name);
      if u is not null then update hcp_global set hcp = x.primero, actualizado_en = now() where user_id = u and hcp = x.ahora; end if;
    end if;
  end loop;
  perform set_config('acgolf.sin_aviso', '', true);
end $$;

-- Reparación 2: anotar con cuántas tarjetas está revisado cada jugador ahora mismo (para que no se vuelva a revisar sin tarjeta nueva).
do $$
declare g record;
begin
  for g in select id from grupos where tipo = 'liga' loop
    perform set_config('acgolf.grupo', g.id::text, true);
    update league_players lp set hcp_n = (select count(*) from tarjetas_liga_whs t where t.jugador = lp.name)::int where lp.grupo_id = g.id;
  end loop;
  perform set_config('acgolf.grupo', '', true);
end $$;
