-- Cada móvil guarda SOLO los golpes de su grupo, sin pisar los de los otros grupos (aplicado en liga y pruebas)
create or replace function public.guardar_golpes_grupo(p_id uuid, p_grupo int, p_scores jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_grupo is null or p_grupo < 0 or p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'datos no válidos';
  end if;
  update rounds
     set match_groups = jsonb_set(match_groups, array[p_grupo::text, 'scores'], p_scores, true),
         updated_at = now()
   where id = p_id
     and jsonb_typeof(match_groups) = 'array'
     and jsonb_array_length(match_groups) > p_grupo;
end $$;
grant execute on function public.guardar_golpes_grupo(uuid, int, jsonb) to anon, authenticated;
