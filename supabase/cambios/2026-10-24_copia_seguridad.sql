-- Copia de seguridad semanal (lunes 04:00 UTC): función «copia» (supabase/functions/copia)
-- · copia_seguridad(): todas las tablas públicas con sus filas, usuarios (id y correo), funciones, reglas y columnas.
-- · Carpeta privada «copias» en Storage (se guardan las 12 últimas) + correo con el .zip a Carlos.
-- · La clave para llamar a la función está en public._copia_clave (sin acceso desde la app).
-- (Ver las migraciones copia_seguridad, copia_seguridad_arreglo, copias_bucket_clave, copia_sin_clave y copia_semanal_cron)
insert into storage.buckets (id, name, public) values ('copias','copias', false) on conflict (id) do nothing;
-- cron: select cron.schedule('copia-semanal-acgolf', '0 4 * * 1', 'select public._lanzar_copia()');
-- Para hacer una copia en el momento: select public._lanzar_copia();
