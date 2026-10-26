/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Presentación al abrir la app: Lola y Curro, 5 segundos ---
// · Una vez cada vez que se abre la app. Lola saluda («¡Hola! Esto es acgolf.») y Curro remata
//   («¡El golf entre amigos! ¡A jugar!»), en el plató de acgolf TV, con el nombre de la app encima.
// · Sin voz (decisión de Carlos: la boca no iba con la voz). Lo que dicen va escrito en el rótulo.
//   Las voces grabadas están en voces-directo/v1/intro-lola.wav e intro-curro.wav por si se hace con boca sincronizada.
// · Botón «Saltar» siempre a la vista. Si algo falla o se atasca, se quita solo: la app nunca espera.
// · Cuando termina, avisa (window.acgolfIntro) para que después salga la bienvenida del patrocinador.
(function(){
  const LOLA = 'plato-lola.mp4?v=1', CURRO = 'plato-curro.mp4?v=1';
  const TOTAL = 2500;   // solo Lola (Carlos quitó los 2,5 s de Curro)
  let avisar;
  window.acgolfIntro = new Promise(r => { avisar = r; });

  function mostrar(){
    let vista = false;
    try { vista = sessionStorage.getItem('acgolfIntro') === '1'; sessionStorage.setItem('acgolfIntro', '1'); } catch(e){}
    let sinMovimiento = false;
    try { sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
    if(vista || sinMovimiento) return avisar();

    const el = document.createElement('div');
    el.className = 'iv'; el.setAttribute('role', 'presentation');
    el.innerHTML = '<video class="iv-v iv-lola on" muted loop playsinline webkit-playsinline preload="auto" src="' + LOLA + '"></video>'
      + '<video class="iv-v iv-curro" muted loop playsinline webkit-playsinline preload="auto" src="' + CURRO + '"></video>'
      + '<div class="iv-titulo"><b>acgolf</b><span>Golf entre amigos</span></div>'
      + '<div class="iv-rotulo"><span class="iv-quien">Lola</span><span class="iv-dice">«¡Hola! Esto es acgolf.»</span></div>'
      + '<button type="button" class="iv-b iv-saltar">Saltar ›</button>';
    document.body.appendChild(el);
    const vL = el.querySelector('.iv-lola'), vC = el.querySelector('.iv-curro');
    const quien = el.querySelector('.iv-quien'), dice = el.querySelector('.iv-dice');
    let hecho = false, arrancado = false, tiempos = [];

    function quitar(){
      if(hecho) return;
      hecho = true;
      tiempos.forEach(clearTimeout);
      el.classList.add('fuera');
      try { vL.pause(); vC.pause(); } catch(e){}
      setTimeout(() => el.remove(), 450);
      avisar();
    }
    function poner(cual){
      const lola = cual === 'lola';
      vL.classList.toggle('on', lola); vC.classList.toggle('on', !lola);
      quien.textContent = lola ? 'Lola' : 'Curro';
      dice.textContent = lola ? '«¡Hola! Esto es acgolf.»' : '«¡El golf entre amigos! ¡A jugar!»';
      const v = lola ? vL : vC;
      try { v.currentTime = 0; } catch(e){}
      const p = v.play(); if(p && p.catch) p.catch(() => {});
    }
    // 2,5 s de Lola saludando
    function mudo(){
      tiempos.forEach(clearTimeout); tiempos = [];
      poner('lola');
      tiempos.push(setTimeout(quitar, TOTAL + 200));
    }
    vL.addEventListener('playing', () => { arrancado = true; });
    vL.addEventListener('error', quitar);
    setTimeout(() => { if(!arrancado) quitar(); }, 3000);   // no carga: fuera
    el.querySelector('.iv-saltar').addEventListener('click', quitar);
    mudo();
  }

  if(document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
})();
