-- 12-nov-2026 · Carlos (administrador) pidió cerrar las tarjetas de la liga NP3HEW (Hato Verde, Ida) que faltaban por entregar.
-- Las 6 tarjetas coincidían hoyo a hoyo (_tarjeta_ok = true); solo faltaba la entrega. Aplicado en la base REAL (acgolf.es) con permiso expreso de Carlos.
alter table public.tarjetas_validadas add column if not exists origen text not null default 'jugadores';
alter table public.tarjetas_validadas add column if not exists nota text;
insert into tarjetas_validadas (round_code, grupo, jugador_idx, player_name, origen, nota) values
('NP3HEW',0,0,'Manuel Francisco Felipe Perez','administrador','Cerrada por Carlos (administrador) el 12-nov-2026: faltaba entregar'),
('NP3HEW',0,1,'Jose Dominguez Ballestero','administrador','Cerrada por Carlos (administrador) el 12-nov-2026: faltaba entregar'),
('NP3HEW',0,2,'Juan Ramon Burgos Cantos','administrador','Cerrada por Carlos (administrador) el 12-nov-2026: faltaba entregar'),
('NP3HEW',1,1,'Carlos Acedo','administrador','Cerrada por Carlos (administrador) el 12-nov-2026: faltaba entregar'),
('NP3HEW',1,2,'Lorenzo Castaño Zulueta','administrador','Cerrada por Carlos (administrador) el 12-nov-2026: faltaba entregar')
on conflict do nothing;
