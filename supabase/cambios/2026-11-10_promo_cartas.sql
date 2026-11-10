-- 2026-11-10 · Promoción «Cartas · Para reírse» (BORRADOR: no se envía sola).
-- Solo añade la ficha. Se manda desde Promociones, a mano, cuando Carlos lo decida y Cartas ya esté publicado en acgolf.es.
insert into public.promociones (clave, nombre, asunto, titulo, intro, ventajas, tarjeta, boton_texto, boton_url)
values ('cartas-para-reirse', 'Cartas · Para reírse',
  '🃏 Nuevo en acgolf: juega a las cartas con tus amigos',
  'Llega Cartas: golf para reírse',
  'Un juego nuevo para pasar un buen rato con tus amigos. Cada uno recibe cartas al azar y las juega en secreto antes de salir de cada hoyo: protegerte, gastarle una travesura al rival o arriesgarte con un comodín. Se ven al terminar el hoyo y salen las risas.',
  '["Cada jugador usa su móvil y ve solo sus cartas.","Más de 20 cartas: Ventaja, Travesura y Comodín, con una Carta Oro rarísima.","Copa de las Cartas y premios graciosos como El Cangrejo y El Consuelo.","Solo para reírse: no cuenta para el hándicap ni para la liga.","Gratis, dentro de acgolf, en un botón nuevo del Inicio."]',
  '{"etiqueta":"Copa de las Cartas","titulo":"Los de siempre · martes","subtitulo":"Club Hato Verde · 18 hoyos · Solo para reírse","filas":[["1.º","Jugador 1","7 cartas sin usar","66 pts"],["2.º","Jugador 2","7 cartas sin usar","60 pts"],["3.º","Jugador 3","6 cartas sin usar","55 pts"]],"nota":"Los puntos de juego son aparte: tus golpes y tu hándicap no cambian."}',
  'Probar Cartas', 'https://acgolf.es')
on conflict (clave) do nothing;
