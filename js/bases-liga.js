/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Bases de la liga: se consultan desde «Ligas», al crear una liga y dentro de cada liga. */
const LIGA_BASES_TITULO = 'Bases de la Liga Los Iscariotes 2026/2027';
const LIGA_BASES = [
  { t: '', p: [
    'La Liga Los Iscariotes nace para fomentar la competición, el pique sano y la convivencia entre amigos, con un campeón cada semana y otro cada mes durante toda la temporada.',
    'Se juega en Club Hato Verde y Club Zaudín Golf (Sevilla), y todas las partidas se apuntan en la app de la liga.' ]},
  { t: '1. Quién juega y qué partidas cuentan', p: [
    'Juegan la liga los jugadores de la lista de la liga. Los invitados pueden jugar con nosotros, pero no puntúan.',
    'La semana va de lunes a domingo. Cuentan todas las partidas de 18 hoyos jugadas esa semana en Hato Verde o Zaudín y apuntadas en la app. Partida que no está en la app no cuenta, para nadie.' ]},
  { t: '2. Modalidad de juego', p: [
    'Las partidas se juegan a 18 hoyos, Stroke Play individual.',
    'Para la liga cuenta el resultado neto: golpes totales menos el hándicap del jugador.',
    'Las partidas por parejas (Mejor bola o Foursome) se pueden jugar en la app, pero no cuentan para la liga ni para el hándicap.' ]},
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
    p2: [ 'Doce horas después de jugar, la partida queda cerrada y ya no se puede cambiar.' ]},
  { t: '7. Campeón de la semana: el Iscariote de la semana', p: [
    'Gana el jugador con el mejor resultado neto de la semana (golpes totales menos hándicap). La app lo calcula sola y lo publica cada lunes.',
    'El ganador se lleva las bolas del patrocinador. Si no está, se le guarda el premio para la semana siguiente.' ]},
  { t: '8. Campeón del mes', p: [
    'Cada partida de la liga da puntos según el puesto conseguido, con la escala de la Fórmula 1. Quien no juega, suma 0 puntos. Al final del mes gana el jugador con más puntos.' ],
    puntos: true },
  { t: '9. Empates', l: [
    'En una partida o en la semana: si hay empate en neto, gana el jugador con el hándicap más bajo.',
    'En el campeón del mes: gana el que tenga más victorias en ese mes; si sigue el empate, el de hándicap más bajo.' ]},
  { t: '10. Regla local', p: [ 'Se puede mover la bola un palo (colocarla) sin penalidad.' ]},
  { t: '11. Reclamaciones y borrado de partidas', l: [
    'Se puede reclamar hasta el lunes a las 10:00. Después, los resultados son definitivos.',
    'Las reclamaciones se hablan en privado, no en el grupo.',
    'Solo el administrador puede borrar partidas en la app.' ]},
  { t: '12. Publicación de información', p: [
    'En la app de la liga se publican la lista de jugadores, las convocatorias y grupos, las partidas en directo, los ganadores de cada semana, la clasificación del mes y los hándicaps.',
    'La app solo guarda tu nombre, tus golpes y tu hándicap, y no se ceden a ningún patrocinador ni a nadie.' ]},
  { t: '13. Reglas de juego, ritmo y comportamiento', p: [
    'Se juega con las Reglas de Golf vigentes, las reglas locales del campo y estas bases. Cada jugador debe conocerlas y cumplirlas.',
    'Hay que mantener un buen ritmo de juego y respetar las indicaciones del campo. Si se demuestra una trampa, se anula esa tarjeta; si se repite, el comité puede dejar al jugador fuera de la liga.',
    'El espíritu de Los Iscariotes es deportivo y social: esto es para disfrutar.' ]},
  { t: '14. Comité de Competición', p: [
    'Un comité de 3 jugadores elegido por el grupo resuelve las reclamaciones y lo que no esté previsto en estas bases. Si un asunto afecta a uno de ellos, decide el resto. Su decisión es final.',
    'Si alguna norma cambia, se avisa con una semana de antelación. Jugar en la liga supone aceptar estas bases.' ]},
];

function ligaBasesHtml(){
  const e = typeof ligaEsc === 'function' ? ligaEsc : (x => String(x));
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
  body.innerHTML = '<div class="lg-sub">' + LIGA_BASES_TITULO + '</div>' + ligaBasesHtml()
    + '<div class="conv-actions"><button type="button" class="conv-btn primary" id="lgbVolver">‹ Volver</button></div>';
  const card = body.closest('.conv-card'); if(card) card.scrollTop = 0;
  document.getElementById('lgbVolver').addEventListener('click', ()=>{ volver(); const c = body.closest('.conv-card'); if(c) c.scrollTop = 0; });
}
function ligaBotonBases(id){
  return '<button type="button" class="conv-btn ghost lgb-btn" id="' + id + '">' + (typeof icono === 'function' ? icono('libro') : '') + ' Consultar las bases de la liga</button>';
}
