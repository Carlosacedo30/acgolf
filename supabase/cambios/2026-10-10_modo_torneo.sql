-- 2026-10-10 · PRUEBAS / acgolf.es · Modo torneo: partida con marcador o sin marcador
-- Al crear la partida se elige. Si no se elige nada, es «con marcador» (como hasta ahora).
-- Sin marcador: cada uno apunta sus golpes como siempre, sin validación cruzada (la tarjeta no es oficial).

create table if not exists public.modo_partida (
  round_code text primary key,
  con_marcador boolean not null default true,
  puesto_por uuid default auth.uid(),
  puesto_en timestamptz not null default now()
);
alter table public.modo_partida enable row level security;
drop policy if exists "modo_partida: ver" on public.modo_partida;
create policy "modo_partida: ver" on public.modo_partida for select to authenticated
  using (exists (select 1 from rounds r where r.code = modo_partida.round_code));  -- si ves la partida, ves su modo

-- Quien es del grupo de la partida pone el modo (antes de que nadie elija marcadores)
create or replace function public.fijar_modo_partida(p_code text, p_con_marcador boolean) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare g uuid; c text := upper(trim(p_code));
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  select grupo_id into g from rounds where code = c order by created_at desc limit 1;
  if g is null then raise exception 'No existe esa partida'; end if;
  if not exists (select 1 from miembros where user_id = auth.uid() and grupo_id = g) then raise exception 'No eres de ese grupo'; end if;
  if exists (select 1 from marcadores where round_code = c) then raise exception 'Ya hay marcadores elegidos en esta partida'; end if;
  insert into modo_partida (round_code, con_marcador) values (c, coalesce(p_con_marcador, true))
    on conflict (round_code) do update set con_marcador = excluded.con_marcador, puesto_por = auth.uid(), puesto_en = now();
  return coalesce(p_con_marcador, true);
end; $$;
revoke execute on function public.fijar_modo_partida(text, boolean) from public, anon;
grant execute on function public.fijar_modo_partida(text, boolean) to authenticated;

-- Sin marcador no se pueden elegir marcadores
create or replace function public._modo_sin_marcador_bloquea() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if exists (select 1 from modo_partida where round_code = new.round_code and not con_marcador) then
    raise exception 'Esta partida es sin marcador';
  end if;
  return new;
end; $$;
drop trigger if exists marcadores_modo on public.marcadores;
create trigger marcadores_modo before insert on public.marcadores for each row execute function public._modo_sin_marcador_bloquea();
