-- Ganadores de la semana y medallas nuevas: siempre la semana en curso (lunes 00:00 a domingo 23:59, hora de Madrid).
-- Sustituye al cambio del 11-oct (cambio el domingo a las 15:00). Aplicado en svnkgmbfanwftncopqjg y qjtsjcfalettgvrlwwnr.
CREATE OR REPLACE FUNCTION public.semana_premios_ini()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select date_trunc('week', now() at time zone 'Europe/Madrid')::date
$function$;
