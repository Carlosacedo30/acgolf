-- 2026-10-11 · Contar vistas y toques en el logo de los patrocinadores (Bolarecuperada…)
-- La app apunta cuándo un jugador ve el logo (una vez al día como mucho) y cada vez que lo toca.
-- Solo el super administrador ve los totales, dentro de contador_app().
create table if not exists public.patro_eventos (
  id bigserial primary key,
  patrocinador text not null,
  tipo text not null check (tipo in ('vista', 'toque')),
  user_id uuid not null default auth.uid(),
  grupo_id uuid,
  en timestamptz not null default now()
);
create index if not exists patro_eventos_patro_en on public.patro_eventos (patrocinador, en);
alter table public.patro_eventos enable row level security;
-- Nadie lee ni escribe directamente: solo con registrar_patro() y contador_app()

create or replace function public.registrar_patro(p_patro text, p_tipo text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_tipo not in ('vista', 'toque') or length(coalesce(p_patro, '')) not between 1 and 60 then return false; end if;
  -- una vista por jugador, patrocinador y día; los toques cuentan todos (con un freno de 10 segundos)
  if p_tipo = 'vista' and exists (select 1 from patro_eventos where user_id = auth.uid() and patrocinador = p_patro and tipo = 'vista'
                                  and en > date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid') then return true; end if;
  if p_tipo = 'toque' and exists (select 1 from patro_eventos where user_id = auth.uid() and patrocinador = p_patro and tipo = 'toque'
                                  and en > now() - interval '10 seconds') then return true; end if;
  insert into patro_eventos (patrocinador, tipo, user_id, grupo_id) values (p_patro, p_tipo, auth.uid(), mi_grupo());
  return true;
end $$;
revoke execute on function public.registrar_patro(text, text) from public, anon;
grant execute on function public.registrar_patro(text, text) to authenticated;

create or replace function public.contador_patro() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare mes timestamptz := date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
begin
  if not es_super_admin() then return null; end if;
  return coalesce((select jsonb_agg(x order by x->>'patrocinador') from (
    select jsonb_build_object('patrocinador', patrocinador,
      'vistas_mes', count(*) filter (where tipo = 'vista' and en >= mes),
      'toques_mes', count(*) filter (where tipo = 'toque' and en >= mes),
      'jugadores_toque_mes', count(distinct user_id) filter (where tipo = 'toque' and en >= mes),
      'vistas', count(*) filter (where tipo = 'vista'),
      'toques', count(*) filter (where tipo = 'toque'),
      'desde', min(en)) as x
    from patro_eventos group by patrocinador) t), '[]'::jsonb);
end $$;
revoke execute on function public.contador_patro() from public, anon;
grant execute on function public.contador_patro() to authenticated;
