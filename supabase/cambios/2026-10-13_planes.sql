-- 2026-10-13 · Planes de pago por número de jugadores (solo Pruebas / acgolf.es)
-- Tras crear su grupo con el código de administrador, el administrador elige plan:
--   ACGolf Par     0-11 jugadores
--   ACGolf Birdie  12-30 jugadores
--   ACGolf Eagle   31-50 jugadores
--   ACGolf Club    51 o más (sin límite)
-- Después paga (de momento el pago es SIMULADO) y el grupo queda activo con su número de jugadores.
-- Los grupos que ya existían no tienen plan y siguen sin límite (grupos fundadores).

alter table public.grupos add column if not exists plan text;
alter table public.grupos add column if not exists plan_estado text;        -- null = fundador (sin límite) · 'elegir' · 'pendiente_pago' · 'activo'
alter table public.grupos add column if not exists max_jugadores int;      -- null = sin límite
alter table public.grupos add column if not exists plan_activado_en timestamptz;

-- Planes disponibles (el precio se pondrá cuando haya pasarela de pago)
create or replace function public.planes_acgolf()
returns jsonb language sql immutable set search_path = public as $$
  select '[
    {"id":"par",    "nombre":"ACGolf Par",    "desde":0,  "hasta":11,  "max":11},
    {"id":"birdie", "nombre":"ACGolf Birdie", "desde":12, "hasta":30,  "max":30},
    {"id":"eagle",  "nombre":"ACGolf Eagle",  "desde":31, "hasta":50,  "max":50},
    {"id":"club",   "nombre":"ACGolf Club",   "desde":51, "hasta":null,"max":null}
  ]'::jsonb
$$;

-- Un grupo nuevo creado con código de administrador empieza sin plan: el administrador tiene que elegirlo
create or replace function public.grupos_plan_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'liga' and new.plan_estado is null and not es_super_admin() then
    new.plan_estado := 'elegir';
  end if;
  return new;
end $$;
create or replace trigger grupos_plan_nuevo before insert on public.grupos for each row execute function grupos_plan_nuevo();

-- El plan de mi grupo activo
create or replace function public.mi_plan()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'grupo', g.nombre, 'tipo', g.tipo, 'plan', g.plan, 'estado', g.plan_estado, 'max', g.max_jugadores,
    'usados', (select count(*) from miembros m where m.grupo_id = g.id),
    'es_admin', coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g.id), false),
    'planes', planes_acgolf())
  from grupos g where g.id = mi_grupo();
$$;

-- El administrador elige plan (también sirve para cambiar a otro más grande)
create or replace function public.elegir_plan(p_plan text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g uuid := mi_grupo(); p jsonb; usados int;
begin
  if auth.uid() is null or g is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if not coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g), false) then
    raise exception 'Solo el administrador del grupo puede elegir el plan';
  end if;
  select x into p from jsonb_array_elements(planes_acgolf()) x where x->>'id' = p_plan;
  if p is null then raise exception 'Ese plan no existe'; end if;
  select count(*) into usados from miembros where grupo_id = g;
  if p->>'max' is not null and usados > (p->>'max')::int then
    raise exception 'Tu grupo ya tiene % jugadores: elige un plan más grande', usados;
  end if;
  update grupos set plan = p_plan,
    plan_estado = case when plan_estado = 'activo' and plan = p_plan then 'activo' else 'pendiente_pago' end
  where id = g;
  return mi_plan();
end $$;

-- PAGO SIMULADO: cuando haya pasarela de pago, esto lo hará la propia pasarela al confirmar el cobro
-- (y esta función dejará de poder llamarse desde la app).
create or replace function public.confirmar_pago_simulado()
returns jsonb language plpgsql security definer set search_path = public as $$
declare g uuid := mi_grupo(); pl text; p jsonb;
begin
  if auth.uid() is null or g is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if not coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g), false) then
    raise exception 'Solo el administrador del grupo puede pagar el plan';
  end if;
  select plan into pl from grupos where id = g and plan_estado = 'pendiente_pago';
  if pl is null then raise exception 'Primero elige un plan'; end if;
  select x into p from jsonb_array_elements(planes_acgolf()) x where x->>'id' = pl;
  update grupos set plan_estado = 'activo', max_jugadores = (p->>'max')::int, plan_activado_en = now() where id = g;
  return mi_plan();
end $$;

-- Comprobar si en un grupo cabe un jugador más (lo usan las funciones de entrar en un grupo)
create or replace function public._cabe_en_grupo(p_grupo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e text; mx int; n int; pl text;
begin
  select plan_estado, max_jugadores, plan into e, mx, pl from grupos where id = p_grupo;
  if e is null then return; end if;                      -- grupo fundador: sin límite
  if e <> 'activo' then
    raise exception 'Este grupo todavía no está activo: su administrador tiene que elegir y pagar el plan.';
  end if;
  if mx is null then return; end if;                     -- ACGolf Club: sin límite
  select count(*) into n from miembros where grupo_id = p_grupo;
  if n >= mx then
    raise exception 'El grupo está completo: su plan admite % jugadores. Pide al administrador que cambie a un plan más grande.', mx;
  end if;
end $$;

-- unirse_grupo: igual que antes, pero comprobando que cabe un jugador más
create or replace function public.unirse_grupo(p_codigo text, p_player text, p_hcp numeric, p_version text)
 returns jsonb language plpgsql security definer set search_path = public as $$
declare g uuid; nm text := initcap(regexp_replace(trim(coalesce(p_player,'')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if coalesce(p_version,'') = '' then raise exception 'Hay que aceptar la política de privacidad'; end if;
  select id into g from grupos where codigo_invitacion = upper(trim(p_codigo)) and tipo = 'liga';
  if g is null then raise exception 'Ese enlace de invitación no vale. Pide uno nuevo al administrador.'; end if;
  if exists (select 1 from miembros where user_id = auth.uid() and grupo_id = g) then
    perform cambiar_grupo(g); return (select to_jsonb(p) from perfiles p where user_id = auth.uid());
  end if;
  perform _cabe_en_grupo(g);
  if nm = '' then raise exception 'Escribe tu nombre'; end if;
  if exists (select 1 from miembros where grupo_id = g and lower(player_name) = lower(nm)) then raise exception 'Ese jugador ya tiene cuenta en el grupo. Habla con el administrador.'; end if;
  if exists (select 1 from league_players where grupo_id = g and lower(name) = lower(nm)) then
    select name into nm from league_players where grupo_id = g and lower(name) = lower(nm);
    update league_players set active = true where grupo_id = g and name = nm;
  else
    if p_hcp is null or p_hcp < -10 or p_hcp > 54 then raise exception 'Pon tu hándicap (entre -10 y 54)'; end if;
    insert into league_players (grupo_id, name, hcp, hcp_base, active) values (g, nm, round(p_hcp, 1), round(p_hcp, 1), true);
  end if;
  return _entrar_en_grupo(g, nm, false, p_version);
end; $$;

revoke execute on function public._cabe_en_grupo(uuid) from public, anon, authenticated;
revoke execute on function public.grupos_plan_nuevo() from public, anon, authenticated;
revoke execute on function public.mi_plan() from public, anon;
revoke execute on function public.elegir_plan(text) from public, anon;
revoke execute on function public.confirmar_pago_simulado() from public, anon;
grant execute on function public.mi_plan() to authenticated;
grant execute on function public.elegir_plan(text) to authenticated;
grant execute on function public.confirmar_pago_simulado() to authenticated;
grant execute on function public.planes_acgolf() to anon, authenticated;
