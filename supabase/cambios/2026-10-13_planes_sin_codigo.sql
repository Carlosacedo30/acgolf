-- 2026-10-13 · Crear grupo sin código de administrador: se elige plan, se activa y se crea el grupo
-- Grupos que ya existían: Los Iscariotes y Cajapollos sin límite (ACGolf Club); el resto de grupos con liga, ACGolf Par.

create or replace function public.crear_grupo_con_plan(p_plan text, p_nombre text, p_player text, p_hcp numeric, p_version text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g uuid; p jsonb; nm text := initcap(regexp_replace(trim(coalesce(p_player,'')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  select x into p from jsonb_array_elements(planes_acgolf()) x where x->>'id' = p_plan;
  if p is null then raise exception 'Elige un plan'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Ponle un nombre al grupo'; end if;
  if length(trim(p_nombre)) > 40 then raise exception 'El nombre del grupo es demasiado largo'; end if;
  if nm = '' then raise exception 'Escribe tu nombre'; end if;
  if p_hcp is null or p_hcp < -10 or p_hcp > 54 then raise exception 'Pon tu hándicap (entre -10 y 54)'; end if;
  if not exists (select 1 from perfiles where user_id = auth.uid()) and coalesce(p_version,'') = '' then
    raise exception 'Hay que aceptar la política de privacidad';
  end if;
  if (select count(*) from grupos where creado_por = auth.uid() and creado_en > now() - interval '1 day') >= 3 then
    raise exception 'Ya has creado varios grupos hoy. Inténtalo mañana.';
  end if;
  insert into grupos (nombre, tipo, creado_por, plan, plan_estado, max_jugadores, plan_activado_en)
    values (trim(p_nombre), 'liga', auth.uid(), p_plan, 'activo', (p->>'max')::int, now()) returning id into g;
  insert into league_players (grupo_id, name, hcp, hcp_base, active) values (g, nm, round(p_hcp, 1), round(p_hcp, 1), true);
  return _entrar_en_grupo(g, nm, true, coalesce(nullif(p_version,''), (select privacidad_version from perfiles where user_id = auth.uid())));
end $$;
revoke execute on function public.crear_grupo_con_plan(text, text, text, numeric, text) from public, anon;
grant execute on function public.crear_grupo_con_plan(text, text, text, numeric, text) to authenticated;

update grupos set plan = 'club', plan_estado = 'activo', max_jugadores = null, plan_activado_en = now()
  where tipo = 'liga' and plan_estado is null and nombre in ('Los Iscariotes', 'Cajapollos');
update grupos set plan = 'par', plan_estado = 'activo', max_jugadores = 11, plan_activado_en = now()
  where tipo = 'liga' and plan_estado is null;
