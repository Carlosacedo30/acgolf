-- Avisos ordenados (24-nov-2026): «Mañana juegas» abre el Inicio (?ver=partido) y «Faltan tarjetas» nombra como mucho a 3.
CREATE OR REPLACE FUNCTION public._avisos_recordatorio()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; s record; manana date := ((now() at time zone 'Europe/Madrid')::date + 1); n int := 0; u uuid; meta jsonb; liga text; jornada text; titulo text; texto text;
begin
  if extract(hour from now() at time zone 'Europe/Madrid') <> 20 then return 0; end if;
  for r in select id, code, grupo_id, match_groups from rounds where course_id is null and round_name = 'Convocatoria' and created_at > now() - interval '60 days' loop
    select g->'meta' into meta from jsonb_array_elements(r.match_groups) g where g ? 'meta' limit 1;
    if meta is null or meta->>'date' is distinct from manana::text then continue; end if;
    if not (insert_aviso_hecho('recordatorio:' || r.id || ':' || manana)) then continue; end if;
    liga := _nombre_liga_conv(r.code, r.grupo_id); jornada := (regexp_match(r.code, 'J([0-9]+)$'))[1];
    for s in select g->>'time' hora, p jugador from jsonb_array_elements(r.match_groups) g, jsonb_array_elements_text(coalesce(g->'players','[]'::jsonb)) p
             where coalesce(g->>'time', '') <> '' and trim(p) <> '' loop
      titulo := '⛳ Mañana juegas' || coalesce(' · ' || liga, '');
      texto := 'Mañana juegas ' || case when liga is not null and jornada is not null then 'la jornada ' || jornada || ' de «' || liga || '» ' else '' end
               || 'en ' || _nombre_campo(meta->>'courseId') || ' a las ' || regexp_replace(s.hora, '^0', '') || '. Toca para ver tu partido. ¡Buen golf!';
      for u in select m.user_id from miembros m where m.grupo_id = r.grupo_id and sin_acentos(trim(m.player_name)) = sin_acentos(trim(s.jugador)) loop
        if _encolar(u, titulo, texto, '?ver=partido', 'recordatorio-' || r.id) then n := n + 1; end if;
      end loop;
    end loop;
  end loop;
  return n;
end; $function$;

-- «Faltan tarjetas»: en vez de listar a todos, nombra como mucho a 3 («… y 6 más»). Cambio dentro de _avisos_tarjetas():
--   select case when array_length(pend,1) <= 3 then array_to_string(pend, ', ') else array_to_string(pend[1:3], ', ') || ' y ' || (array_length(pend,1)-3) || ' más' end into otros;
