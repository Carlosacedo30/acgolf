-- © 2026 Carlos Acedo Domínguez. acgolf
-- 1) Contador de visitas: de qué red llega cada persona (?r=ig, tt, yt, fb…) y qué hace (visita, prueba, registro).
--    Solo se guarda un número al azar del móvil (no el nombre ni el correo). Cualquiera puede apuntar, nadie de fuera puede leer.
create table if not exists public.visitas (
  id bigserial primary key,
  creado timestamptz not null default now(),
  visitante text,
  origen text,
  evento text not null
);
alter table public.visitas enable row level security;
drop policy if exists visitas_apuntar on public.visitas;
create policy visitas_apuntar on public.visitas for insert to anon, authenticated
  with check (evento in ('visita','prueba','registro','instalada')
              and length(coalesce(origen,'')) <= 20 and length(coalesce(visitante,'')) <= 40);
grant insert on public.visitas to anon, authenticated;
grant usage, select on sequence public.visitas_id_seq to anon, authenticated;
create index if not exists visitas_creado on public.visitas (creado);

-- Resumen para el super administrador
create or replace function public.visitas_resumen(p_dias int default 30)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when exists (select 1 from super_admins s where s.user_id = auth.uid()) then
    coalesce((select jsonb_agg(x order by x->>'origen') from (
      select jsonb_build_object('origen', coalesce(origen,'directo'),
        'visitantes', count(distinct visitante) filter (where evento='visita'),
        'pruebas', count(distinct visitante) filter (where evento='prueba'),
        'registros', count(distinct visitante) filter (where evento='registro')) x
      from visitas where creado > now() - make_interval(days => p_dias) group by coalesce(origen,'directo')) t), '[]'::jsonb)
  else null end;
$$;
grant execute on function public.visitas_resumen(int) to authenticated;

-- 2) mi_perfil dice si la cuenta es de prueba (sin correo)
create or replace function public.mi_perfil()
 returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(x) from (
    select p.player_name, p.es_admin, p.privacidad_version, p.privacidad_aceptada_en, u.email, p.grupo_id,
           g.nombre as grupo, g.tipo as grupo_tipo, g.marca as grupo_marca,
           (select count(*) from miembros m where m.user_id = p.user_id) as num_grupos,
           exists (select 1 from super_admins s where s.user_id = p.user_id) as es_super,
           coalesce(u.is_anonymous, false) as es_prueba
    from perfiles p join auth.users u on u.id = p.user_id join grupos g on g.id = p.grupo_id where p.user_id = auth.uid()
  ) x;
$function$;
