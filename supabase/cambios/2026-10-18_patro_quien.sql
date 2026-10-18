-- 2026-10-18 · Patrocinadores: quién ha tocado (o visto) el logo, con filtro por periodo
-- Solo el super administrador. Periodo: 'hoy', 'semana' (desde el lunes), 'mes' o 'todo' (hora de Madrid).
create or replace function public.contador_patro_quien(p_periodo text default 'mes') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ahora timestamp := now() at time zone 'Europe/Madrid';
  desde timestamptz;
begin
  if not es_super_admin() then return null; end if;
  desde := case p_periodo
    when 'hoy'    then date_trunc('day', ahora) at time zone 'Europe/Madrid'
    when 'semana' then date_trunc('week', ahora) at time zone 'Europe/Madrid'
    when 'mes'    then date_trunc('month', ahora) at time zone 'Europe/Madrid'
    else '-infinity'::timestamptz end;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'patrocinador', x.patrocinador,
      'jugador', coalesce(x.player_name, '(sin nombre)'),
      'grupo', x.grupo,
      'yo', x.yo,
      'toques', x.toques,
      'vistas', x.vistas,
      'ultimo_toque', to_char(x.ultimo_toque at time zone 'Europe/Madrid', 'DD/MM HH24:MI'),
      'ultima_vista', to_char(x.ultima_vista at time zone 'Europe/Madrid', 'DD/MM HH24:MI'))
      order by x.toques desc, x.ultimo_toque desc nulls last, x.vistas desc) from (
    select e.patrocinador, e.user_id, p.player_name,
      (select g.nombre from grupos g where g.id = p.grupo_id) as grupo,
      (e.user_id = auth.uid()) as yo,
      count(*) filter (where e.tipo = 'toque') as toques,
      count(*) filter (where e.tipo = 'vista') as vistas,
      max(e.en) filter (where e.tipo = 'toque') as ultimo_toque,
      max(e.en) filter (where e.tipo = 'vista') as ultima_vista
    from patro_eventos e left join perfiles p on p.user_id = e.user_id
    where e.en >= desde
    group by e.patrocinador, e.user_id, p.player_name, p.grupo_id) x), '[]'::jsonb);
end $$;
revoke execute on function public.contador_patro_quien(text) from public, anon;
grant execute on function public.contador_patro_quien(text) to authenticated;
