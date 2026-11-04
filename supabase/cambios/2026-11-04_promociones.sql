-- 2026-11-04 · acgolf.es · Promociones por correo (pantalla genérica del súper administrador)
-- · promociones: las fichas (asunto, título, texto, ventajas, tarjeta, botón). Se añaden sin tocar la app.
-- · promos_enviadas: registro de lo enviado (qué, cuándo, a cuántas personas).
-- · perfiles.sin_novedades: casilla «Novedades de acgolf» de cada jugador (Mi cuenta). Quien ya había
--   quitado los «Avisos por correo» en algún grupo empieza con las novedades apagadas (se respeta su decisión).
-- Todo es aditivo y se puede volver a ejecutar.

create table if not exists public.promociones (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,
  nombre text not null,
  asunto text not null,
  titulo text not null,
  intro text,
  ventajas jsonb not null default '[]',
  tarjeta jsonb,                -- {etiqueta, titulo, subtitulo, filas:[[pos,nombre,detalle,valor]], nota}
  boton_texto text,
  boton_url text,
  imagen_url text,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.promociones enable row level security;   -- sin reglas: solo el servidor y las funciones sa_*

create table if not exists public.promos_enviadas (
  id bigint generated always as identity primary key,
  promocion_id uuid references public.promociones(id) on delete set null,
  asunto text,
  alcance text,
  grupo_id uuid,
  correos int,
  enviado_por uuid,
  enviado_en timestamptz not null default now()
);
alter table public.promos_enviadas enable row level security;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='perfiles' and column_name='sin_novedades') then
    alter table public.perfiles add column sin_novedades boolean not null default false;
    update public.perfiles p set sin_novedades = true
      where exists (select 1 from public.miembros m where m.user_id = p.user_id and m.sin_correos);
  end if;
end $$;

-- A quién se manda (solo el servidor). Sin cuenta de acgolf.es, sin correo vacío, sin quien apagó las novedades.
create or replace function public._promo_para(p_alcance text, p_grupo uuid default null)
returns table(email text, nombre text)
language sql security definer set search_path to 'public' as $$
  select distinct on (lower(u.email)) lower(u.email), p.player_name
  from perfiles p join auth.users u on u.id = p.user_id
  where u.email is not null and lower(u.email) not like '%@acgolf.es' and not p.sin_novedades
    and (p_alcance = 'todos' or (p_alcance = 'grupo' and exists (select 1 from miembros m where m.user_id = p.user_id and m.grupo_id = p_grupo)))
  order by lower(u.email);
$$;
revoke execute on function public._promo_para(text, uuid) from public, anon, authenticated;
grant execute on function public._promo_para(text, uuid) to service_role;

-- Pantalla del súper administrador: lista de promociones y cuántas personas recibirían
create or replace function public.sa_promociones() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', x.id, 'clave', x.clave, 'nombre', x.nombre, 'asunto', x.asunto, 'titulo', x.titulo, 'intro', x.intro,
      'ventajas', x.ventajas, 'tarjeta', x.tarjeta, 'boton_texto', x.boton_texto, 'boton_url', x.boton_url, 'imagen_url', x.imagen_url,
      'ultimo', (select jsonb_build_object('cuando', e.enviado_en, 'correos', e.correos, 'alcance', e.alcance)
                 from promos_enviadas e where e.promocion_id = x.id order by e.enviado_en desc limit 1)
    ) order by x.creado_en) from promociones x where x.activa), '[]');
end; $$;
revoke execute on function public.sa_promociones() from public, anon;
grant execute on function public.sa_promociones() to authenticated;

create or replace function public.sa_promo_destinatarios(p_alcance text, p_grupo uuid default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare n int; total int;
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  select count(*) into n from _promo_para(p_alcance, p_grupo);
  select count(*) into total from perfiles p join auth.users u on u.id = p.user_id where u.email is not null;
  return jsonb_build_object('n', n, 'con_correo', total, 'fuera', total - n);
end; $$;
revoke execute on function public.sa_promo_destinatarios(text, uuid) from public, anon;
grant execute on function public.sa_promo_destinatarios(text, uuid) to authenticated;

-- Cada jugador: casilla «Novedades de acgolf» (Mi cuenta)
create or replace function public.mis_novedades(p_quiero boolean default null) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare v boolean;
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta'; end if;
  if p_quiero is not null then update perfiles set sin_novedades = not p_quiero where user_id = auth.uid(); end if;
  select not sin_novedades into v from perfiles where user_id = auth.uid();
  return coalesce(v, true);
end; $$;
revoke execute on function public.mis_novedades(boolean) from public, anon;
grant execute on function public.mis_novedades(boolean) to authenticated;

-- Primera promoción: partidas en directo y El plató
insert into public.promociones (clave, nombre, asunto, titulo, intro, ventajas, tarjeta, boton_texto, boton_url)
values ('partidas-en-directo', 'Partidas en directo (El plató)',
  '⛳ Tu partida de golf, resumida por Curro y Lola',
  'Termina la partida y tu resumen ya está hecho',
  'Anotas los golpes en el móvil y acgolf calcula todo solo. Al terminar, Curro y Lola te cuentan la partida en El plató de acgolf: los mejores golpes, el suspense y el ganador.',
  '["El resumen de cada partida, con el ganador por resultado neto.","Clasificación de la liga y ganador de la semana.","Tu hándicap siempre al día, un solo número para todas tus partidas.","Pantallas fáciles, con letra grande, pensadas para todos.","Gratis para el golfista. Cada grupo de amigos tiene su propio espacio, con su logo."]',
  '{"etiqueta":"Resumen de la partida","titulo":"Liga · sábado 24 de octubre","subtitulo":"Club Hato Verde · 18 hoyos · Stroke Play","filas":[["1.º","Jugador 1","91 − 25","66 neto"],["2.º","Jugador 2","77 − 10","67 neto"],["3.º","Jugador 3","107 − 35","72 neto"]],"nota":"Golpes − hándicap de juego = resultado neto. Así ganan todos con las mismas opciones."}',
  'Entrar en acgolf.es', 'https://acgolf.es')
on conflict (clave) do nothing;
