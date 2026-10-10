# Base de datos (Supabase) · seguridad

Hay dos proyectos:
- **Liga** `qjtsjcfalettgvrlwwnr`: app de Los Iscariotes (sin cuentas, se entra con el enlace).
- **Pruebas / acgolf.es** `svnkgmbfanwftncopqjg`: app con cuentas y grupos.

## Reglas
1. **Claves.** En la app solo van las claves *publicables* (`sb_publishable_…`), que son públicas a propósito.
   La clave secreta (*service_role*) y la de Brevo **nunca** van en el código; solo en el panel de Supabase.
   `.env`, `*.pem`, `*.key` y `secretos/` están en `.gitignore`.
2. **RLS activada en todas las tablas.**
   - Pruebas: cada grupo solo ve lo suyo (`grupo_id = mi_grupo()`, y `mi_grupo()` sale de `auth.uid()`).
   - Liga: la lectura es pública y las partidas se pueden crear y apuntar sin cuenta (así funciona la app de la liga);
     las partidas cerradas o entregadas las protege el disparador `rounds_proteger`, y borrar o cambiar jugadores
     exige la clave de administrador. La solución de fondo es pasar la liga a cuentas (acgolf.es).
   - Las funciones internas no se pueden llamar desde fuera (ver `cambios/2026-10-10_seguridad.sql`).
3. **Secretos y dependencias.** En cada subida, GitHub pasa *gitleaks* (`.github/workflows/secretos.yml`).
   La librería de Supabase va con versión fija y sello de integridad (`integrity="sha384-…"`) en `index.html`.
   Para actualizarla: cambiar la versión y recalcular el sello (si el sello no coincide, la app no carga).
4. **Cambios en orden.** Cada cambio de la base de datos se apunta en `cambios/AAAA-MM-DD_nombre.sql`.
   Se prueban primero en **Pruebas** y después, si van bien, en la **Liga**.

## Revisión periódica
En Supabase → Advisors → Security de cada proyecto. Avisos que se aceptan:
- Funciones `SECURITY DEFINER` llamables: son la forma en que la app hace cosas protegidas (comprueban la clave o la cuenta dentro).
- Vistas `SECURITY DEFINER` (`tarjetas_liga`, `tarjetas_liga_whs`, `caddie_hoyo`): ya filtran por grupo con `mi_grupo()`.
