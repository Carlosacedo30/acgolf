-- 2026-11-16 · Inscripción a la Ryder por equipos (Sevilla–Betis…) abierta a jugadores de CUALQUIER grupo.
-- La inscripción es una fila de «rounds» (round_name = 'Inscripción Ryder', sin campo), pero «rounds» solo deja ver y cambiar
-- las filas del propio grupo. Como el mismo WhatsApp se pone en varios grupos, estas dos funciones dejan a cualquier jugador
-- con cuenta (con perfil): ver la inscripción por su código y apuntarse / cambiarse / quitarse. Su nombre sale de su perfil
-- (no de lo que mande el móvil), así nadie apunta a otro. El administrador del grupo que la creó sigue cambiándola con la tabla.

-- 16-nov (tarde): la Ryder Sevilla–Betis es SOLO para quien está en Los Iscariotes, Cajapollos o Los Domingueros.
-- (En la base de PRUEBAS la lista incluye además los grupos de prueba «pruebas» y «Golf».)
create or replace function public.ryder_ins_permitido() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from miembros m join grupos g on g.id = m.grupo_id
                 where m.user_id = auth.uid() and g.nombre in ('Los Iscariotes', 'Cajapollos', 'Los Domingueros'));
$$;
grant execute on function public.ryder_ins_permitido() to authenticated;
revoke all on function public.ryder_ins_permitido() from public, anon;

create or replace function public.ryder_ins_leer(p_code text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare r record;
begin
  if not exists (select 1 from perfiles where user_id = auth.uid()) or not ryder_ins_permitido() then return null; end if;
  select id, code, match_groups, updated_at into r from rounds
   where round_name = 'Inscripción Ryder' and course_id is null
     and ((p_code is not null and code = upper(p_code)) or (p_code is null and grupo_id = mi_grupo()))
   order by created_at desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'code', r.code, 'match_groups', r.match_groups, 'updated_at', r.updated_at);
end; $$;

-- p_equipo: 1 o 2 = apuntarme (o cambiarme) a ese equipo; 0 = quitarme de la lista
create or replace function public.ryder_ins_apuntar(p_code text, p_equipo int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; nombre text; g jsonb; nuevo jsonb := '[]'::jsonb; pl jsonb; n text; cap text; cerrada boolean := false;
begin
  if not ryder_ins_permitido() then raise exception 'Esta Ryder es solo para los grupos Los Iscariotes, Cajapollos y Los Domingueros.'; end if;
  select player_name into nombre from perfiles where user_id = auth.uid();
  if nombre is null or btrim(nombre) = '' then raise exception 'Primero completa tu nombre en «Mi cuenta».'; end if;
  if p_equipo not in (0, 1, 2) then raise exception 'Equipo no válido'; end if;
  select * into r from rounds where code = upper(p_code) and round_name = 'Inscripción Ryder' and course_id is null for update;
  if not found then raise exception 'No se ha encontrado la inscripción.'; end if;
  for g in select * from jsonb_array_elements(r.match_groups) loop
    if g ? 'meta' then cerrada := coalesce((g->'meta'->>'cerrada')::boolean, false); end if;
  end loop;
  if cerrada then raise exception 'La lista está cerrada.'; end if;
  -- un capitán no puede irse ni cambiar de equipo
  for g in select * from jsonb_array_elements(r.match_groups) loop
    cap := g->>'capitan';
    if g ? 'equipo' and cap is not null and cap <> ''
       and lower(translate(cap, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = lower(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))
       and (g->>'equipo')::int <> p_equipo then
      raise exception 'Eres capitán de tu equipo y no puedes cambiar. Habla con el organizador.';
    end if;
  end loop;
  for g in select * from jsonb_array_elements(r.match_groups) loop
    if g ? 'equipo' then
      pl := '[]'::jsonb;
      for n in select jsonb_array_elements_text(coalesce(g->'players', '[]'::jsonb)) loop
        if lower(translate(n, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) <> lower(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) then pl := pl || to_jsonb(n); end if;
      end loop;
      if (g->>'equipo')::int = p_equipo then pl := pl || to_jsonb(nombre); end if;
      g := jsonb_set(g, '{players}', pl);
    end if;
    nuevo := nuevo || jsonb_build_array(g);
  end loop;
  update rounds set match_groups = nuevo, updated_at = now() where id = r.id;
  return (select jsonb_build_object('id', id, 'code', code, 'match_groups', match_groups, 'updated_at', updated_at) from rounds where id = r.id);
end; $$;

revoke all on function public.ryder_ins_leer(text) from public, anon;
revoke all on function public.ryder_ins_apuntar(text, int) from public, anon;
grant execute on function public.ryder_ins_leer(text) to authenticated;
grant execute on function public.ryder_ins_apuntar(text, int) to authenticated;
