-- 2026-10-26 · La tabla de copia «_copias_rondas» estaba sin protección (se podía leer y cambiar desde fuera).
-- Ahora solo la toca el servidor. No se borra nada (los datos siguen ahí).
-- Aplicado en svnkgmbfanwftncopqjg (acgolf.es / pruebas).
alter table public._copias_rondas enable row level security;
revoke all on table public._copias_rondas from anon, authenticated;
