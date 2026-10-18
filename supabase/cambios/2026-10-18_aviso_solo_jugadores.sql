-- 2026-10-18 · El correo de «nueva partida» solo a los jugadores apuntados en esa partida (no a todo el grupo).
-- Aplicado en svnkgmbfanwftncopqjg (acgolf.es).
CREATE OR REPLACE FUNCTION public._aviso_partida(p_user uuid, p_code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; quien text; lista jsonb; nombres text[];
begin
  select id, grupo_id, code, course_name, round_name, match_groups into r from rounds where code = upper(trim(p_code)) order by created_at desc limit 1;
  if r is null then raise exception 'No existe esa partida'; end if;
  select player_name into quien from miembros where user_id = p_user and grupo_id = r.grupo_id;
  if quien is null then raise exception 'No eres de ese grupo'; end if;
  insert into avisos_enviados (ronda_id, grupo_id, enviado_por) values (r.id, r.grupo_id, p_user) on conflict do nothing;
  if not found then return jsonb_build_object('repetido', true); end if;
  -- Jugadores de la partida (de todos sus grupos de salida; las parejas «A / B» cuentan por separado)
  select coalesce(array_agg(distinct sin_acentos(trim(n))), '{}') into nombres
    from jsonb_array_elements(coalesce(r.match_groups, '[]'::jsonb)) g,
         jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) p,
         regexp_split_to_table(p, '\s*/\s*') n
    where trim(n) <> '';
  select coalesce(jsonb_agg(jsonb_build_object('email', u.email, 'nombre', m.player_name)), '[]') into lista
    from miembros m join auth.users u on u.id = m.user_id
    where m.grupo_id = r.grupo_id and m.user_id <> p_user and not m.sin_correos and u.email is not null
      and sin_acentos(trim(m.player_name)) = any(nombres);
  update avisos_enviados set correos = jsonb_array_length(lista) where ronda_id = r.id;
  return jsonb_build_object('repetido', false, 'grupo', (select nombre from grupos where id = r.grupo_id),
    'quien', quien, 'code', r.code, 'campo', r.course_name, 'nombre', r.round_name, 'para', lista);
end; $function$;
