-- 2026-10-13 · Revisión de seguridad (Supabase → Advisors) en Pruebas / acgolf.es
-- Las funciones heredadas de la app antigua (clave de administrador) ya no se pueden llamar sin haber entrado.
-- Los administradores con cuenta las siguen usando igual. La de los greens, solo el super administrador.
revoke execute on function public.delete_round(text, text) from public, anon;
revoke execute on function public.remove_player(text, text) from public, anon;
revoke execute on function public.upsert_player(text, text, numeric) from public, anon;
revoke execute on function public.reset_stats(text) from public, anon;
revoke execute on function public.set_green(text, text, integer, double precision, double precision) from public, anon;
revoke execute on function public.is_admin(text) from public, anon;
revoke execute on function public.es_partida_liga(text) from public, anon;
revoke execute on function public._modo_sin_marcador_bloquea() from public, anon, authenticated;
grant execute on function public.delete_round(text, text) to authenticated;
grant execute on function public.remove_player(text, text) to authenticated;
grant execute on function public.upsert_player(text, text, numeric) to authenticated;
grant execute on function public.reset_stats(text) to authenticated;
grant execute on function public.set_green(text, text, integer, double precision, double precision) to authenticated;
grant execute on function public.is_admin(text) to authenticated;
grant execute on function public.es_partida_liga(text) to authenticated;

create or replace function public.set_green(p_key text, p_course text, p_hole integer, p_lat double precision, p_lng double precision)
 returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not es_super_admin() then return false; end if;
  insert into hole_greens (course_id, hole, lat, lng, updated_at) values (p_course, p_hole, p_lat, p_lng, now())
  on conflict (course_id, hole) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
  return true;
end; $$;
