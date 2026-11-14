-- 2026-11-14 · Salón de campeones: un cuadro por LIGA (nombre de la liga + campeón, con foto opcional).
-- El campeón sale solo de la clasificación de la liga; el administrador puede cambiar el nombre y poner foto.
create table if not exists public.salon_ligas (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  liga_code text not null,
  player_name text,
  foto text,
  actualizado_en timestamptz not null default now(),
  primary key (grupo_id, liga_code)
);
alter table public.salon_ligas enable row level security;
drop policy if exists "salon_ligas: ver los de mi grupo" on public.salon_ligas;
create policy "salon_ligas: ver los de mi grupo" on public.salon_ligas
  for select to authenticated using (grupo_id = mi_grupo());

create or replace function public.poner_cuadro_liga(p_code text, p_player text, p_foto text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  g uuid := mi_grupo();
  soy_admin boolean := coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g), false)
                       or exists (select 1 from super_admins where user_id = auth.uid());
  nombre text := nullif(trim(coalesce(p_player, '')), '');
  cod text := upper(trim(coalesce(p_code, '')));
begin
  if auth.uid() is null or g is null or not soy_admin then return false; end if;
  if not exists (select 1 from rounds where code = cod and grupo_id = g and round_name = 'Liga de amigos' and course_id is null) then
    raise exception 'Liga no válida';
  end if;
  if nombre is not null and length(nombre) > 60 then raise exception 'Nombre demasiado largo'; end if;
  if p_foto is not null and (p_foto !~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$' or length(p_foto) > 400000) then
    raise exception 'La foto no es válida o es demasiado grande';
  end if;
  if nombre is null and p_foto is null then
    delete from salon_ligas where grupo_id = g and liga_code = cod;
  else
    insert into salon_ligas (grupo_id, liga_code, player_name, foto) values (g, cod, nombre, p_foto)
    on conflict (grupo_id, liga_code) do update set player_name = excluded.player_name, foto = excluded.foto, actualizado_en = now();
  end if;
  return true;
end $$;
revoke execute on function public.poner_cuadro_liga(text, text, text) from public, anon;
grant execute on function public.poner_cuadro_liga(text, text, text) to authenticated;
