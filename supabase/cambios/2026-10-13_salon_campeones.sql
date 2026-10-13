-- 2026-10-13 · Salón de campeones (solo Pruebas / acgolf.es)
-- Doce cuadros por temporada, uno por mes, en la pantalla de la Liga.
-- El campeón sale solo de la clasificación del mes; el administrador del grupo puede
-- poner otro nombre y una foto en cada cuadro. Cada grupo ve solo sus cuadros.

create table if not exists public.salon_cuadros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  anio int not null check (anio between 2020 and 2100),
  mes int not null check (mes between 1 and 12),
  player_name text,
  foto text,
  actualizado_en timestamptz not null default now(),
  primary key (grupo_id, anio, mes)
);
alter table public.salon_cuadros enable row level security;

drop policy if exists "salon: ver los de mi grupo" on public.salon_cuadros;
create policy "salon: ver los de mi grupo" on public.salon_cuadros
  for select to authenticated using (grupo_id = mi_grupo());
-- Nadie escribe directamente: solo con poner_cuadro()

create or replace function public.poner_cuadro(p_anio int, p_mes int, p_player text, p_foto text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  g uuid := mi_grupo();
  soy_admin boolean := coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g), false)
                       or exists (select 1 from super_admins where user_id = auth.uid());
  nombre text := nullif(trim(coalesce(p_player, '')), '');
begin
  if auth.uid() is null or g is null or not soy_admin then return false; end if;
  if p_mes not between 1 and 12 or p_anio not between 2020 and 2100 then raise exception 'Mes no válido'; end if;
  if nombre is not null and length(nombre) > 60 then raise exception 'Nombre demasiado largo'; end if;
  if p_foto is not null and (p_foto !~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$' or length(p_foto) > 400000) then
    raise exception 'La foto no es válida o es demasiado grande';
  end if;
  if nombre is null and p_foto is null then
    delete from salon_cuadros where grupo_id = g and anio = p_anio and mes = p_mes;
  else
    insert into salon_cuadros (grupo_id, anio, mes, player_name, foto) values (g, p_anio, p_mes, nombre, p_foto)
    on conflict (grupo_id, anio, mes) do update set player_name = excluded.player_name, foto = excluded.foto, actualizado_en = now();
  end if;
  return true;
end $$;

revoke execute on function public.poner_cuadro(int, int, text, text) from public, anon;
grant execute on function public.poner_cuadro(int, int, text, text) to authenticated;
