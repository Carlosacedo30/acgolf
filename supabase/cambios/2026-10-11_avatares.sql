-- 2026-10-11 · Foto o avatar de golf de cada jugador (solo Pruebas / acgolf.es)
-- Cada jugador elige una foto suya (se guarda pequeña, 160x160) o un emoji/avatar de golf.
-- Se guarda por grupo y nombre de jugador (así sale en clasificaciones, medallas, partidas…).
-- Cada uno cambia el suyo; el administrador del grupo puede poner o quitar el de cualquiera de su grupo.

create table if not exists public.avatares (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  player_name text not null,
  tipo text not null check (tipo in ('foto', 'emoji')),
  valor text not null,
  actualizado_en timestamptz not null default now(),
  primary key (grupo_id, player_name)
);
alter table public.avatares enable row level security;

drop policy if exists "avatares: ver los de mi grupo" on public.avatares;
create policy "avatares: ver los de mi grupo" on public.avatares
  for select to authenticated using (grupo_id = mi_grupo());
-- Nadie escribe directamente: solo con poner_avatar()

create or replace function public.poner_avatar(p_tipo text, p_valor text, p_player text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  g uuid := mi_grupo();
  yo text := (select player_name from perfiles where user_id = auth.uid());
  soy_admin boolean := coalesce((select es_admin from miembros where user_id = auth.uid() and grupo_id = g), false)
                       or exists (select 1 from super_admins where user_id = auth.uid());
  r record;
begin
  if auth.uid() is null or yo is null then return false; end if;
  if p_tipo is not null and p_tipo not in ('foto', 'emoji') then raise exception 'Tipo de avatar no válido'; end if;
  if p_tipo = 'foto' and (p_valor is null or p_valor !~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$' or length(p_valor) > 80000) then
    raise exception 'La foto no es válida o es demasiado grande';
  end if;
  if p_tipo = 'emoji' and (p_valor is null or length(p_valor) > 16) then raise exception 'Avatar no válido'; end if;

  if p_player is null or p_player = yo then
    -- El mío: en todos mis grupos, con el nombre que tengo en cada uno
    for r in select grupo_id, player_name from miembros where user_id = auth.uid()
             union select g, yo loop
      if p_tipo is null then
        delete from avatares where grupo_id = r.grupo_id and player_name = r.player_name;
      else
        insert into avatares (grupo_id, player_name, tipo, valor) values (r.grupo_id, r.player_name, p_tipo, p_valor)
        on conflict (grupo_id, player_name) do update set tipo = excluded.tipo, valor = excluded.valor, actualizado_en = now();
      end if;
    end loop;
    return true;
  end if;

  -- El de otro jugador: solo el administrador, y solo de su grupo
  if not soy_admin then return false; end if;
  if not exists (select 1 from league_players where grupo_id = g and name = p_player)
     and not exists (select 1 from miembros where grupo_id = g and player_name = p_player) then
    return false;
  end if;
  if p_tipo is null then
    delete from avatares where grupo_id = g and player_name = p_player;
  else
    insert into avatares (grupo_id, player_name, tipo, valor) values (g, p_player, p_tipo, p_valor)
    on conflict (grupo_id, player_name) do update set tipo = excluded.tipo, valor = excluded.valor, actualizado_en = now();
  end if;
  return true;
end $$;

revoke execute on function public.poner_avatar(text, text, text) from public, anon;
grant execute on function public.poner_avatar(text, text, text) to authenticated;
