-- 2026-10-06 · PRUEBAS: portada de cada grupo y borrar grupos
alter table public.grupos add column if not exists marca jsonb not null default '{}'::jsonb;
-- funciones nuevas: guardar_marca(jsonb) y borrar_grupo(uuid, text) (solo el administrador del grupo; copia previa en respaldo.grupos_borrados)
-- mi_perfil() devuelve también grupo_marca
