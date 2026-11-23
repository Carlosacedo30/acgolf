/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Pantalla de marcar tranquila: Curro/Lola pequeños y arriba, ritmo en una píldora, y botón «✕ Quitar avisos».
(function(){
  const raiz = document.documentElement;
  let calla = 0;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'mtQuitar'; btn.textContent = '✕ Quitar avisos';
  document.body.appendChild(btn);
  btn.addEventListener('click', () => {
    calla = Date.now() + 10 * 60 * 1000;
    document.querySelectorAll('.cu-flash.ver').forEach(e => e.classList.remove('ver'));
    const ov = document.getElementById('rjOv'); if(ov) ov.hidden = true;
    revisar();
  });
  const enMarcar = () => !!document.querySelector('.screen.active[data-screen="3"]');
  const timers = new WeakMap();
  function revisar(){
    const on = enMarcar();
    const callado = Date.now() < calla;
    raiz.classList.toggle('mt-on', on);
    raiz.classList.toggle('mt-calla', on && callado);
    const flash = document.querySelector('.cu-flash.ver');
        raiz.classList.toggle('mt-hay', on && !callado && !!flash);   // solo mientras Curro o Lola están a la vista
    if(on && flash && !timers.get(flash)){   // se quita solo a los 4 segundos
      timers.set(flash, setTimeout(() => { flash.classList.remove('ver'); timers.delete(flash); }, 4000));
    }
    if(!flash) timers.delete(document.querySelector('.cu-flash') || {});
    if(on && callado && flash) flash.classList.remove('ver');
  }
  // ---- Partida terminada: se dice claro y al salir no se pregunta nada ----
  const terminada = () => {
    try {
      if(typeof window.acgolfPartidaTerminada === 'function' && window.acgolfPartidaTerminada()) return true;
      if(typeof roundMarkedFinished !== 'undefined' && roundMarkedFinished) return true;
      return typeof isRoundFinished === 'function' && !!currentRoundCode && isRoundFinished(matchGroups);
    } catch(e){ return false; }
  };
  function cartel(){
    const sc = document.querySelector('.screen.active[data-screen="3"] .screen-content');
    let c = document.getElementById('mtTerminada');
    const quiere = !!sc && terminada();
    if(!quiere){ if(c) c.remove(); return; }
    if(c) return;
    c = document.createElement('div'); c.id = 'mtTerminada'; c.className = 'mk-cerrada';
    c.innerHTML = '✓ Tarjeta entregada. Así quedó la partida.';
    const ref = document.getElementById('holeViewSection') || document.getElementById('marcadorVivo');
    if(ref && ref.parentNode) ref.parentNode.insertBefore(c, ref); else sc.insertBefore(c, sc.firstChild);
  }
  // «Salir» de una partida terminada: directo a la pantalla principal, sin preguntar
  document.addEventListener('click', ev => {
    if(!ev.target || !ev.target.closest || !ev.target.closest('#s3Back')) return;
    if(!terminada()) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    if(typeof leaveCurrentRound === 'function') leaveCurrentRound(); else if(typeof goTo === 'function') goTo(0);
  }, true);
  // Partida terminada: se quita lo que ya no sirve y el botón rojo pasa a ser «IR AL INICIO»
  function limpiar(){
    const on = enMarcar() && terminada();
    raiz.classList.toggle('mt-fin', on);
    const sig = document.getElementById('holeNextBtn');
    if(on && sig && sig.textContent !== 'IR AL INICIO'){ sig.textContent = 'IR AL INICIO'; sig.classList.remove('disabled'); }
  }
  document.addEventListener('click', ev => {
    if(!raiz.classList.contains('mt-fin')) return;
    if(!ev.target || !ev.target.closest || !ev.target.closest('#holeNextBtn')) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    if(typeof leaveCurrentRound === 'function') leaveCurrentRound(); else if(typeof goTo === 'function') goTo(0);
  }, true);
  setInterval(limpiar, 300);
  setInterval(cartel, 600);
  setInterval(revisar, 500);
  revisar();
})();
