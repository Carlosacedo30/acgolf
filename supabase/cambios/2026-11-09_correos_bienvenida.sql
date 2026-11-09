-- 2026-11-09 · Correos de bienvenida (1A, 1B, 2 y 3) + elegir a mano quién los recibe
-- · promociones: textos de la lista, pie, «a quién va», «cuándo» y si respeta «Novedades de acgolf».
-- · promos_enviadas_a: a quién se mandó cada correo (para no repetir).
-- · sa_promo_candidatos / sa_promo_elegidos / _promo_para_ids: lista para elegir a mano y cuántos recibirán de verdad.
-- En los textos, [nombre] y [grupo] se cambian solos en cada correo.
-- Todo es aditivo y se puede volver a ejecutar.

alter table public.promociones add column if not exists lista_titulo text;
alter table public.promociones add column if not exists pie text;
alter table public.promociones add column if not exists quien text;
alter table public.promociones add column if not exists cuando text;
alter table public.promociones add column if not exists solo_novedades boolean not null default false;
alter table public.promociones add column if not exists para_tipo text;      -- filtro sugerido: 'A' creó grupo · 'B' por invitación · 'solo' grupo con un jugador
alter table public.promociones add column if not exists orden int not null default 100;

create table if not exists public.promos_enviadas_a (
  promocion_id uuid not null references public.promociones(id) on delete cascade,
  user_id uuid not null,
  email text,
  enviado_en timestamptz not null default now(),
  primary key (promocion_id, user_id)
);
alter table public.promos_enviadas_a enable row level security;   -- sin reglas: solo el servidor y las funciones sa_*

create or replace function public.sa_promociones() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', x.id, 'clave', x.clave, 'nombre', x.nombre, 'asunto', x.asunto, 'titulo', x.titulo, 'intro', x.intro,
      'ventajas', x.ventajas, 'tarjeta', x.tarjeta, 'boton_texto', x.boton_texto, 'boton_url', x.boton_url, 'imagen_url', x.imagen_url,
      'lista_titulo', x.lista_titulo, 'pie', x.pie, 'quien', x.quien, 'cuando', x.cuando,
      'solo_novedades', x.solo_novedades, 'para_tipo', x.para_tipo, 'orden', x.orden,
      'ultimo', (select jsonb_build_object('cuando', e.enviado_en, 'correos', e.correos, 'alcance', e.alcance)
                 from promos_enviadas e where e.promocion_id = x.id order by e.enviado_en desc limit 1)
    ) order by x.orden, x.creado_en) from promociones x where x.activa), '[]');
end; $$;
revoke execute on function public.sa_promociones() from public, anon;
grant execute on function public.sa_promociones() to authenticated;

-- Jugadores para elegir a mano: tipo A (creó su grupo) o B (entró por invitación), si su grupo tiene un solo jugador, si ya recibió este correo
create or replace function public.sa_promo_candidatos(p_promo uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', t.user_id, 'nombre', t.nombre, 'correo', t.correo, 'grupo', t.grupo, 'desde', t.desde,
      'tipo', t.tipo, 'solo', t.solo, 'ya', t.ya, 'sin_novedades', t.sin_novedades) order by t.desde desc)
    from (
      select p.user_id, p.player_name as nombre, lower(u.email) as correo, g.nombre as grupo, u.created_at as desde,
        case when coalesce(g.creado_por = p.user_id, m.es_admin, false) then 'A' else 'B' end as tipo,
        coalesce((select count(*) from miembros x where x.grupo_id = g.id) = 1, false) as solo,
        exists (select 1 from promos_enviadas_a e where e.promocion_id = p_promo and e.user_id = p.user_id) as ya,
        p.sin_novedades
      from perfiles p
      join auth.users u on u.id = p.user_id
      left join grupos g on g.id = p.grupo_id
      left join miembros m on m.user_id = p.user_id and m.grupo_id = p.grupo_id
      where u.email is not null and lower(u.email) not like '%@acgolf.es'
    ) t), '[]');
end; $$;
revoke execute on function public.sa_promo_candidatos(uuid) from public, anon;
grant execute on function public.sa_promo_candidatos(uuid) to authenticated;

-- A quién se manda de los elegidos (solo el servidor): sin correo de acgolf.es, sin quien ya lo recibió y, si la promoción lo pide, sin quien apagó «Novedades»
create or replace function public._promo_para_ids(p_ids uuid[], p_promo uuid)
returns table(user_id uuid, email text, nombre text, grupo text)
language sql security definer set search_path to 'public' as $$
  select p.user_id, lower(u.email), p.player_name, g.nombre
  from perfiles p
  join auth.users u on u.id = p.user_id
  left join grupos g on g.id = p.grupo_id
  where p.user_id = any(p_ids) and u.email is not null and lower(u.email) not like '%@acgolf.es'
    and (not coalesce((select r.solo_novedades from promociones r where r.id = p_promo), false) or not p.sin_novedades)
    and not exists (select 1 from promos_enviadas_a e where e.promocion_id = p_promo and e.user_id = p.user_id)
  order by lower(u.email);
$$;
revoke execute on function public._promo_para_ids(uuid[], uuid) from public, anon, authenticated;
grant execute on function public._promo_para_ids(uuid[], uuid) to service_role;

-- Pantalla: cuántos recibirán de verdad entre los elegidos
create or replace function public.sa_promo_elegidos(p_promo uuid, p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare n int;
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  select count(*) into n from _promo_para_ids(p_ids, p_promo);
  return jsonb_build_object('n', n, 'elegidos', coalesce(array_length(p_ids, 1), 0), 'se_saltan', coalesce(array_length(p_ids, 1), 0) - n);
end; $$;
revoke execute on function public.sa_promo_elegidos(uuid, uuid[]) from public, anon;
grant execute on function public.sa_promo_elegidos(uuid, uuid[]) to authenticated;

-- Los cuatro correos (diseño de siempre de Promociones)
insert into public.promociones (clave, nombre, asunto, titulo, intro, ventajas, tarjeta, boton_texto, boton_url, lista_titulo, pie, quien, cuando, solo_novedades, para_tipo, orden)
values
('bienvenida-1a', '1A · Bienvenida (creó su grupo)', '¡Bienvenido a acgolf! Tu grupo ya está listo',
 '¡Enhorabuena, [nombre]! Tu grupo ya está listo',
 'Al registrarte has creado tu grupo. Es tu sitio de juego: aquí jugáis tú y tus amigos.',
 '["**Invita a tus amigos.** Entra en «Mi cuenta»: arriba verás «Invita a tus amigos». Manda el enlace por WhatsApp o enseña el código QR.","**Crea vuestra primera partida** y elige el campo.","**Anota los golpes** hoyo a hoyo, con letra grande.","**Consejo:** si a tu amigo la app le pide un código, que escriba solo las 8 letras y números del final. Si pega el enlace entero, también vale."]',
 '{"etiqueta":"Tu grupo","titulo":"«[grupo]»","subtitulo":"Tu sitio de juego con tus amigos"}',
 'Entrar en acgolf', 'https://acgolf.es', 'Para empezar:', 'Instálala en tu móvil y crea el grupo con tus amigos.',
 'Quien crea su grupo.', 'El mismo día del registro.', false, 'A', 1),
('bienvenida-1b', '1B · Bienvenida (entró por invitación)', '¡Bienvenido a acgolf! Ya estás en el grupo de tus amigos',
 '¡Enhorabuena, [nombre]! Ya estás en el grupo',
 'Tus amigos te han invitado y ya formas parte de su grupo. Es el sitio donde jugáis todos.',
 '["**Mira a tus compañeros** y las partidas del grupo.","**Apúntate a la próxima partida** o crea una nueva.","**Anota los golpes** hoyo a hoyo, con letra grande.","**¿Tienes otros amigos con los que juegas?** Crea tu propio grupo en «Mis grupos» › «Crear un grupo nuevo» e invítalos con un enlace."]',
 '{"etiqueta":"Tu grupo","titulo":"«[grupo]»","subtitulo":"Aquí jugáis tú y tus amigos"}',
 'Entrar en acgolf', 'https://acgolf.es', 'Para empezar:', 'Instala acgolf en tu móvil y juega con tus amigos.',
 'Quien entra por el enlace de un amigo.', 'El mismo día del registro.', false, 'B', 2),
('guia-sugerencias', '2 · Guía y sugerencias', 'Todo lo que puedes hacer con acgolf',
 '[nombre], mira todo lo que puedes hacer',
 'Ya llevas unos días con nosotros. Esto es lo que tienes en la app:',
 '["**Invitar a tus amigos** con el enlace o el QR que tienes en «Mi cuenta».","**Crear una partida** y elegir el campo.","**Anotar los golpes** con letra grande, hoyo a hoyo.","**Seguir en vivo** una partida aunque no juegues.","**Organizar un partido** y que cada uno diga qué horario le va bien.","**Montar una liga** con clasificación y puntos.","**Jugar una Ryder Cup** entre dos equipos.","**Tener el logo de tu grupo** y tu hándicap siempre al día.","**Escuchar a Curro y Lola**, que comentan la partida."]',
 '{"etiqueta":"Tu opinión","titulo":"¿Qué te gustaría que tuviera la app?","subtitulo":"Responde a este correo con tu idea o lo que te haya costado entender. Leemos todas."}',
 'Entrar en acgolf', 'https://acgolf.es', 'Con acgolf puedes:', 'Gracias por jugar con acgolf.',
 'Todos los nuevos que tienen marcada «Novedades de acgolf».', 'A los 3 días del registro.', true, null, 3),
('recordatorio-grupo-solo', '3 · Recordatorio (grupo solo)', 'Tu grupo te espera en acgolf',
 '[nombre], tu grupo te espera',
 'Vemos que en tu grupo todavía estás solo. Con tus amigos dentro, podéis jugar partidas, ver la clasificación y seguiros en vivo.',
 '["Entra en «Mi cuenta».","Mira arriba: **«Invita a tus amigos»**.","Manda el enlace por **WhatsApp** o enseña el **código QR**.","Si a tu amigo la app le pide un código, que escriba solo las 8 letras y números del final."]',
 '{"etiqueta":"Tu grupo","titulo":"«[grupo]»","subtitulo":"Está esperando a tus amigos"}',
 'Entrar en acgolf', 'https://acgolf.es', 'Es muy fácil:', 'Es cuestión de un minuto.',
 'Quien creó su grupo y sigue solo, con «Novedades» marcada.', 'A los 7 días del registro.', true, 'solo', 4)
on conflict (clave) do nothing;
