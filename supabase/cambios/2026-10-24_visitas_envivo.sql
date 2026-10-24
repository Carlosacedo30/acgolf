-- Contar quién mira la partida en vivo y el resumen (sin nombres) y los toques al patrocinador
alter policy visitas_apuntar on public.visitas with check (
  evento = any (array['visita','prueba','registro','instalada','envivo','envivo_min','patrocinio'])
  and length(coalesce(origen,'')) <= 20 and length(coalesce(visitante,'')) <= 40);
