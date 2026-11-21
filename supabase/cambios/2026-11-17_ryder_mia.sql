-- 2026-11-17 · Inicio: aviso «Juegas la Ryder» (pedido de Carlos).
-- Devuelve las inscripciones a la Ryder donde YO estoy apuntado (mi nombre del perfil sale en la lista de un equipo).
-- Solo si puedo verlas (ryder_ins_puede). En modo incógnito (super administrador sin nombre de jugador) no devuelve nada.
create or replace function public.ryder_mia() returns jsonb
language sql stable security definer set search_path to 'public' as $$
  with yo as (select lower(translate(btrim(player_name), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) n from perfiles where user_id = auth.uid() and coalesce(btrim(player_name), '') <> '')
  select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'grupo_id', r.grupo_id, 'match_groups', r.match_groups, 'updated_at', r.updated_at) order by r.created_at desc), '[]'::jsonb)
  from rounds r, yo
  where r.round_name = 'Inscripción Ryder' and r.course_id is null and r.created_at > now() - interval '8 months'
    and ryder_ins_puede(r.grupo_id, r.match_groups)
    and exists (select 1 from jsonb_array_elements(r.match_groups) e
                where e ? 'equipo' and exists (select 1 from jsonb_array_elements_text(coalesce(e->'players', '[]'::jsonb)) p
                                               where lower(translate(btrim(p), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = yo.n));
$$;
revoke all on function public.ryder_mia() from public, anon;
grant execute on function public.ryder_mia() to authenticated;
