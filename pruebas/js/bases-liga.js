/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Bases de la liga: se consultan desde «Ligas», al crear una liga y dentro de cada liga. */
const LIGA_BASES_TITULO = 'Bases de la Liga Los Iscariotes 2026/2027';
// En cada grupo las bases llevan su propio nombre (y el premio de la semana, el suyo)
function ligaBasesGrupo(){ try { return (window.miPerfil && window.miPerfil.grupo_tipo !== 'personal' && window.miPerfil.grupo) || 'Los Iscariotes'; } catch(e){ return 'Los Iscariotes'; } }
function ligaBasesTexto(t){
  const g = ligaBasesGrupo(); if(g === 'Los Iscariotes') return t;
  return String(t).replace(/el Iscariote de la semana/g, 'el ganador de la semana').replace(/Los Iscariotes/g, g);
}
const LIGA_BASES = [
  { t: '', p: [
    'La Liga Los Iscariotes nace para fomentar la competición, el pique sano y la convivencia entre amigos, con un campeón cada semana y otro cada mes durante toda la temporada.',
    'La liga semanal y mensual se juega en Club Hato Verde y Club Zaudín Golf (Sevilla); las ligas de amigos, en el campo que se elija al crearlas. Todas las partidas se apuntan en la app de la liga.' ]},
  { t: '1. Quién juega y qué partidas cuentan', p: [
    'Juegan la liga los jugadores de la lista de la liga. Los invitados pueden jugar con nosotros, pero no puntúan.',
    'Solo puntúan los jugadores inscritos en la app con su correo. Un jugador apuntado a mano, sin cuenta, puede jugar y se le apuntan los golpes, pero no sale en la clasificación de la semana, ni en la del mes, ni en las medallas, ni en los puntos de las ligas, hasta que se inscriba. Al inscribirse con su mismo nombre recupera sus partidas.',
    'La semana va de lunes a domingo. Cuentan todas las partidas de 18 hoyos jugadas esa semana en Hato Verde o Zaudín y apuntadas en la app. Partida que no está en la app no cuenta, para nadie.' ]},
  { t: '2. Modalidad de juego', p: [
    'Las partidas se juegan a 18 hoyos, Stroke Play individual.',
    'Para la liga cuenta el resultado neto: golpes totales menos el hándicap del jugador.',
    'Las partidas por parejas (Mejor bola, Foursome o Scramble) se pueden jugar en la app, pero no cuentan para la liga ni para el hándicap.' ]},
  { t: '3. Hándicap', l: [
    'Cada jugador juega con su hándicap de la liga, guardado en la app.',
    'Se recalcula solo después de cada partida de la liga, con la regla de la Federación: media de las 8 mejores de las últimas 20 tarjetas.',
    'Nadie lo puede cambiar a mano, tampoco el administrador. Cada cambio queda registrado.',
    'El hándicap máximo para la liga es 36,0. Quien tenga más juega con 36,0.' ]},
  { t: '4. Barras de salida', l: [ 'Hombres: barras amarillas.', 'Mujeres: barras rojas.' ],
    p: [ 'El administrador puede fijar otras barras para una partida concreta, avisando antes.' ]},
  { t: '5. Tope de golpes por hoyo', p: [
    'Para no atascar el ritmo de juego, el máximo es de 11 golpes por hoyo. Al llegar a 11, el jugador levanta la bola y apunta 11.' ]},
  { t: '6. Partidas y tarjetas', p: [
    'Las partidas son de un máximo de 4 jugadores por grupo. La tarjeta se lleva en la app de la liga, en el móvil.' ],
    l: [ 'Cada jugador apunta sus golpes durante la partida.', 'Hace de marcador de otro jugador de su grupo.', 'Revisa su tarjeta antes de terminar.' ],
    p2: [ 'Doce horas después de jugar, la partida queda cerrada y ya no se puede cambiar.',
      'Cualquier jugador puede organizar un partido con amigos y elegir los horarios de salida. Quien lo organiza, o el administrador, puede quitar un horario mientras la partida no esté creada; los apuntados en esa hora tienen que apuntarse en otra.' ]},
  { t: '7. Campeón de la semana: el Iscariote de la semana', p: [
    'Gana el jugador con el mejor resultado neto de la semana (golpes totales menos hándicap). La app lo calcula sola y lo publica cada lunes.',
    'El ganador se lleva las bolas del patrocinador. Si no está, se le guarda el premio para la semana siguiente.' ]},
  { t: '8. Campeón del mes', p: [
    'Cada partida de la liga da puntos según el puesto conseguido, con la escala de la Fórmula 1. Quien no juega, suma 0 puntos. Al final del mes gana el jugador con más puntos.' ],
    puntos: true },
  { t: '9. Empates', l: [
    'En una partida o en la semana: si hay empate en neto, gana el jugador con el hándicap más bajo.',
    'En el campeón del mes: gana el que tenga más victorias en ese mes; si sigue el empate, el de hándicap más bajo.' ]},
  { t: '10. Ligas de amigos (Crear liga)', p: [
    'Además de la liga semanal y mensual, el administrador puede crear ligas de varias rondas. Al crear cada liga se fijan sus normas, que se ven dentro de la propia liga:' ],
    l: [ 'Campo: uno de los de Sevilla (Hato Verde, Zaudín, Real Club de Golf Sevilla, Real Club Pineda o La Cartuja), alternar Hato Verde y Zaudín, uno de tus campos favoritos o cualquiera del buscador de campos.',
      'Rondas al mes (1, 2 o 4) y total de rondas de la liga. Cada ronda es una partida con todos los jugadores de la liga.',
      'Formato: Stroke Play, con puntos por puesto en cada ronda (escala de la Fórmula 1, por neto), o Stableford, sumando los puntos Stableford de cada ronda.',
      'Rondas que cuentan: todas, las mejores de cada jugador, todas menos la peor, las primeras que juegue o unas rondas elegidas. Las demás se descartan y se ven tachadas en la tabla con su resultado.',
      'Mínimo de rondas para clasificar: quien no llegue sale en la tabla en gris y sin puesto.',
      'Grupos de salida por sorteo: rotando, para que todos coincidan con todos y se repita lo menos posible, o al azar. El administrador puede cambiarlos a mano en cada jornada.',
      'Empates: a igual puntuación gana el jugador con el hándicap más bajo.' ]},
  { t: '11. Regla local', p: [ 'Se puede mover la bola un palo (colocarla) sin penalidad.' ]},
  { t: '12. Reclamaciones y borrado de partidas', l: [
    'Se puede reclamar hasta el lunes a las 10:00. Después, los resultados son definitivos.',
    'Las reclamaciones se hablan en privado, no en el grupo.',
    'Solo el administrador puede borrar partidas en la app.' ]},
  { t: '13. Publicación de información', p: [
    'En la app de la liga se publican la lista de jugadores, las ligas con su tabla y calendario, las convocatorias y grupos, las partidas en directo, los ganadores de cada semana, la clasificación del mes y los hándicaps.',
    'La app solo guarda tu nombre, tus golpes y tu hándicap, y no se ceden a ningún patrocinador ni a nadie.' ]},
  { t: '14. Reglas de juego, ritmo y comportamiento', p: [
    'Se juega con las Reglas de Golf vigentes, las reglas locales del campo y estas bases. Cada jugador debe conocerlas y cumplirlas.',
    'Hay que mantener un buen ritmo de juego y respetar las indicaciones del campo. Si se demuestra una trampa, se anula esa tarjeta; si se repite, el comité puede dejar al jugador fuera de la liga.',
    'El espíritu de Los Iscariotes es deportivo y social: esto es para disfrutar.' ]},
  { t: '15. Comité de Competición', p: [
    'Un comité de 3 jugadores elegido por el grupo resuelve las reclamaciones y lo que no esté previsto en estas bases. Si un asunto afecta a uno de ellos, decide el resto. Su decisión es final.',
    'Si alguna norma cambia, se avisa con una semana de antelación. Jugar en la liga supone aceptar estas bases.' ]},
];

function ligaBasesHtml(){
  const e0 = typeof ligaEsc === 'function' ? ligaEsc : (x => String(x));
  const e = x => e0(ligaBasesTexto(x));
  const ps = a => (a || []).map(x => '<p class="lgb-p">' + e(x) + '</p>').join('');
  const ls = a => a && a.length ? '<ul class="lgb-ul">' + a.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>' : '';
  const puntos = () => {
    const pts = typeof LIGA_PUNTOS !== 'undefined' ? LIGA_PUNTOS : [];
    return '<div class="lgb-pts">' + pts.map((v, i) => '<div><small>' + (i + 1) + '.º</small><b>' + v + '</b></div>').join('')
      + '<div><small>' + (pts.length + 1) + '.º y más</small><b>0</b></div></div>';
  };
  return '<div class="lgb">' + LIGA_BASES.map(s => (s.t ? '<h3 class="lgb-h">' + e(s.t) + '</h3>' : '')
    + ps(s.p) + ls(s.l) + ps(s.p2) + (s.puntos ? puntos() : '')).join('') + '</div>';
}

// Muestra las bases dentro de la ventana de Ligas; «volver» repinta la pantalla de antes
function ligaVerBases(volver){
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  if(typeof ligaTitulo === 'function') ligaTitulo('Bases de la liga');
  body.innerHTML = '<div class="lg-sub">' + ligaEsc(ligaBasesTexto(LIGA_BASES_TITULO)) + '</div>' + ligaBasesHtml()
    + '<div class="conv-actions"><button type="button" class="conv-btn primary" id="lgbVolver">‹ Volver</button></div>';
  const card = body.closest('.conv-card'); if(card) card.scrollTop = 0;
  document.getElementById('lgbVolver').addEventListener('click', ()=>{ volver(); const c = body.closest('.conv-card'); if(c) c.scrollTop = 0; });
}
function ligaBotonBases(id){
  return '<button type="button" class="conv-btn ghost lgb-btn" id="' + id + '">' + (typeof icono === 'function' ? icono('libro') : '') + ' Consultar las bases de la liga</button>';
}
