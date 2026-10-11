-- 2026-10-11 · PRUEBAS: los premios de la semana dicen de qué grupo son.
-- premios_semana() devuelve también 'grupo' (nombre del grupo de quien mira, p. ej. "Los Iscariotes", "Cajapollos").
-- La app lo pone en la cabecera de "Ganadores de la semana" y en el mensaje de WhatsApp.
-- (En la Liga no hay grupos: si no llega 'grupo', la app sigue como antes.)
do $d$
declare def text;
begin
  def := pg_get_functiondef('public.premios_semana(date)'::regprocedure);
  if position('''grupo''' in def) > 0 then return; end if;
  def := replace(def, $x$select jsonb_build_object(
  'desde'$x$, $x$select jsonb_build_object(
  'grupo', (select g.nombre from grupos g where g.id = mi_grupo() and g.tipo <> 'personal'),
  'desde'$x$);
  if position('''grupo''' in def) = 0 then raise exception 'No encontrado en premios_semana'; end if;
  execute def;
end $d$;
