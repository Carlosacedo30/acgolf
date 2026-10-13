/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Emoción hasta el final: la clasificación en vivo se esconde en los 3 últimos hoyos ---
// Cuando alguien de la partida entra en los 3 últimos hoyos (le quedan 3 o menos), la clasificación deja de verse.
// Vuelve a verse cuando todos han cerrado su tarjeta (todos los hoyos apuntados).
(function(){
  const AVISO = '<div class="co-aviso"><b>Clasificación oculta</b><span>En los 3 últimos hoyos no se ve, para que haya emoción hasta el final. Saldrá cuando todos cierren su tarjeta.</span></div>';

  function hoyosPartida(){ return (typeof prHoyos !== 'undefined' && prHoyos === 9) ? 9 : 18; }
  // standings: todos los jugadores de la partida, con los hoyos que lleva cada uno
  function ocultar(standings){
    const lista = (standings || []).filter(s => s && s.name);
    if(!lista.length) return false;
    const n = hoyosPartida();
    const masAdelantado = Math.max(...lista.map(s => s.holesFilled || 0));
    const todosCerrados = lista.every(s => (s.holesFilled || 0) >= n);
    return masAdelantado >= n - 3 && !todosCerrados;
  }

  function aplicar(oculta){
    document.body.classList.toggle('co-oculta', oculta);
    ['marcadorVivo', 'leaderboardSection'].forEach(id => {
      const box = document.getElementById(id); if(!box) return;
      let av = box.querySelector(':scope > .co-aviso');
      if(oculta && !av){ box.insertAdjacentHTML('afterbegin', AVISO); }
      if(!oculta && av) av.remove();
    });
  }

  let ultima = [];
  const orig = window.renderMarcador;
  if(typeof orig === 'function'){
    window.renderMarcador = function(standings){
      ultima = standings || [];
      const r = orig.apply(this, arguments);
      aplicar(ocultar(ultima));
      return r;
    };
  }
  // La otra vista de la clasificación (botón «Clasificación») se repinta por su cuenta: se repasa al cambiar
  const obs = new MutationObserver(() => {
    const ls = document.getElementById('leaderboardSection');
    if(ls && document.body.classList.contains('co-oculta') && !ls.querySelector(':scope > .co-aviso')) aplicar(true);
  });
  const vigilar = () => { const ls = document.getElementById('leaderboardSection'); if(ls) obs.observe(ls, { childList: true }); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();
  // Al salir de la partida se quita
  window.acgolfClasifOculta = { comprobar: s => aplicar(ocultar(s || ultima)) };
})();
