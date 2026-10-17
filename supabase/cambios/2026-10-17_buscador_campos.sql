-- 2026-10-17 · Buscador de campos de golf (solo Pruebas / acgolf.es)
-- Guarda una copia (caché) de los campos que llegan de GolfCourseAPI para:
--   1) no gastar consultas de la API (el plan gratis da 35 al día),
--   2) poder buscar «cerca de mí» por coordenadas (la API solo busca por texto).
-- Los favoritos NO van aquí: se guardan en el propio móvil (funcionan sin conexión).
-- Nadie escribe en estas tablas desde la app: solo la función del servidor «campos» (clave de servicio).

-- Quitar acentos para buscar «zaudin» y encontrar «Zaudín» (translate es inmutable; unaccent no)
create or replace function public.sin_acentos(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select lower(translate(coalesce(t, ''), 'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñÇç', 'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc'))
$$;

create table if not exists public.campos_golf (
  id text primary key,                         -- 'gca:<id de GolfCourseAPI>'
  fuente text not null default 'golfcourseapi',
  externo_id bigint,
  club text,
  nombre text not null,
  direccion text,
  ciudad text,
  region text,
  pais text,
  lat double precision check (lat is null or lat between -90 and 90),
  lon double precision check (lon is null or lon between -180 and 180),
  -- Una entrada por barra de salida: {genero:'m'|'f', nombre, rating, slope, par, hoyos, metros}
  barras jsonb not null default '[]'::jsonb,
  slope_min int,
  slope_max int,
  texto_busqueda text generated always as (public.sin_acentos(coalesce(club,'') || ' ' || nombre || ' ' || coalesce(ciudad,'') || ' ' || coalesce(region,''))) stored,
  actualizado_en timestamptz not null default now()
);
create index if not exists campos_golf_latlon on public.campos_golf (lat, lon);
alter table public.campos_golf enable row level security;

drop policy if exists "campos: ver con cuenta" on public.campos_golf;
create policy "campos: ver con cuenta" on public.campos_golf for select to authenticated using (true);

-- Qué textos ya se han preguntado a la API (para no repetir en 30 días)
create table if not exists public.campos_busquedas (
  termino text primary key,
  resultados int not null default 0,
  hecha_en timestamptz not null default now()
);
alter table public.campos_busquedas enable row level security;   -- sin políticas: solo el servidor

-- Contador de consultas a la API por día (para no pasarse del plan)
create table if not exists public.campos_api_uso (
  dia date primary key,
  llamadas int not null default 0
);
alter table public.campos_api_uso enable row level security;     -- sin políticas: solo el servidor

-- Suma una consulta si queda cupo hoy. Devuelve false si ya se llegó al límite.
create or replace function public.campos_api_sumar(p_limite int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into campos_api_uso (dia, llamadas) values (current_date, 1)
  on conflict (dia) do update set llamadas = campos_api_uso.llamadas + 1
  returning llamadas into n;
  if n > p_limite then
    update campos_api_uso set llamadas = llamadas - 1 where dia = current_date;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.campos_api_sumar(int) from public, anon, authenticated;

-- Campos guardados a menos de p_radio_km de un punto, del más cercano al más lejano.
-- Fórmula de Haversine (sin PostGIS). Primero se recorta por un «cuadrado» para ir rápido.
create or replace function public.campos_cerca(p_lat double precision, p_lon double precision, p_radio_km double precision default 25, p_limite int default 40)
returns table (
  id text, fuente text, club text, nombre text, direccion text, ciudad text, region text, pais text,
  lat double precision, lon double precision, barras jsonb, slope_min int, slope_max int, distancia_km double precision
) language sql stable security invoker set search_path = public as $$
  with p as (
    select greatest(-90, least(90, p_lat)) as la,
           greatest(-180, least(180, p_lon)) as lo,
           greatest(1, least(300, coalesce(p_radio_km, 25))) as r,
           greatest(1, least(100, coalesce(p_limite, 40))) as n
  ), c as (
    select g.*, 6371 * 2 * asin(sqrt(
             power(sin(radians(g.lat - p.la) / 2), 2) +
             cos(radians(p.la)) * cos(radians(g.lat)) * power(sin(radians(g.lon - p.lo) / 2), 2)
           )) as d, p.r, p.n
      from campos_golf g, p
     where g.lat is not null and g.lon is not null
       and g.lat between p.la - p.r / 111.0 and p.la + p.r / 111.0
       and g.lon between p.lo - p.r / (111.0 * greatest(cos(radians(p.la)), 0.01))
                     and p.lo + p.r / (111.0 * greatest(cos(radians(p.la)), 0.01))
  )
  select c.id, c.fuente, c.club, c.nombre, c.direccion, c.ciudad, c.region, c.pais,
         c.lat, c.lon, c.barras, c.slope_min, c.slope_max, round(c.d::numeric, 1)::double precision
    from c
   where c.d <= c.r
   order by c.d
   limit (select n from p)
$$;
revoke all on function public.campos_cerca(double precision, double precision, double precision, int) from public, anon;
grant execute on function public.campos_cerca(double precision, double precision, double precision, int) to authenticated;
