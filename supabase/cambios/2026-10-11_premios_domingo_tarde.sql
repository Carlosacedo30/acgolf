-- Ganadores de la semana y medallas nuevas: se actualizan solos cada semana.
-- Antes cambiaban el lunes a las 00:00 (hasta entonces se veía la semana anterior).
-- Ahora, desde el domingo a las 15:00 (hora de Sevilla) ya se ve la semana que acaba,
-- con las partidas del sábado y del domingo incluidas. El resto de días, la semana pasada.
create or replace function public.semana_premios_ini()
returns date language sql stable set search_path to 'public' as $f$
  select case when extract(isodow from n) = 7 and n::time >= time '15:00'
              then date_trunc('week', n)::date
              else date_trunc('week', n)::date - 7 end
  from (select now() at time zone 'Europe/Madrid' as n) x
$f$;
grant execute on function public.semana_premios_ini() to anon, authenticated;

do $d$
declare f text; def text;
begin
  foreach f in array array['public.premios_semana(date)', 'public.medallas_liga()'] loop
    def := pg_get_functiondef(f::regprocedure);
    def := replace(def, $x$date_trunc('week', (now() at time zone 'Europe/Madrid'))::date - 7$x$, 'semana_premios_ini()');
    if position('semana_premios_ini()' in def) = 0 then raise exception 'No encontrado en %', f; end if;
    execute def;
  end loop;
end $d$;
