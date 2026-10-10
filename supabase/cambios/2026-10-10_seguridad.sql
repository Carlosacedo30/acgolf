-- 2026-10-10 · Repaso de seguridad (aplicado en las dos bases de datos)

-- LIGA (qjtsjcfalettgvrlwwnr) y PRUEBAS (svnkgmbfanwftncopqjg):
-- funciones internas (disparadores y recálculo de hándicaps) ya no se pueden llamar desde fuera
revoke execute on function public.rounds_proteger(), public.rounds_recalcular_hcp(),
  public.recalcular_handicaps_liga(), public.tiene_golpes(jsonb) from public, anon, authenticated;
alter function public.tiene_golpes(jsonb) set search_path = public, pg_temp;

-- Solo PRUEBAS: más funciones internas
revoke execute on function public.firmas_recalcular_hcp(), public.validadas_recalcular_hcp(),
  public.sincronizar_desde_liga(), public._mi_idx(text,integer), public._tarjeta_ok(text,integer,integer),
  public._entrar_en_grupo(uuid,text,boolean,text) from public, anon, authenticated;
-- Solo PRUEBAS: las funciones de la cuenta solo para quien ha entrado con su cuenta
revoke execute on function public.cambiar_grupo(uuid), public.crear_mi_perfil(text,text), public.empezar_personal(text,numeric,text),
  public.mi_perfil(), public.mis_datos(), public.mis_grupos(), public.jugadores_libres() from public, anon;
grant execute on function public.cambiar_grupo(uuid), public.crear_mi_perfil(text,text), public.empezar_personal(text,numeric,text),
  public.mi_perfil(), public.mis_datos(), public.mis_grupos(), public.jugadores_libres() to authenticated;
