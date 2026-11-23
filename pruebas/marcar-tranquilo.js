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
    const rj = document.getElementById('rjAviso');
    raiz.classList.toggle('mt-hay', on && !callado && (!!flash || (!!rj && !rj.hidden)));
    if(on && flash && !timers.get(flash)){   // se quita solo a los 4 segundos
      timers.set(flash, setTimeout(() => { flash.classList.remove('ver'); timers.delete(flash); }, 4000));
    }
    if(!flash) timers.delete(document.querySelector('.cu-flash') || {});
    if(on && callado && flash) flash.classList.remove('ver');
  }
  setInterval(revisar, 500);
  revisar();
})();
