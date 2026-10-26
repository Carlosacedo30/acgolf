/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Presentación al abrir la app: Lola y Curro, 5 segundos ---
// · Una vez cada vez que se abre la app. Lola saluda («¡Hola! Esto es acgolf.») y Curro remata
//   («¡El golf entre amigos! ¡A jugar!»), en el plató de acgolf TV, con el nombre de la app encima.
// · Empieza sin sonido (los móviles no dejan que suene solo); «Con sonido» lo repite con sus voces.
// · Botón «Saltar» siempre a la vista. Si algo falla o se atasca, se quita solo: la app nunca espera.
// · Cuando termina, avisa (window.acgolfIntro) para que después salga la bienvenida del patrocinador.
(function(){
  const LOLA = 'plato-lola.mp4?v=1', CURRO = 'plato-curro.mp4?v=1';
  const VOCES = 'https://svnkgmbfanwftncopqjg.supabase.co/storage/v1/object/public/voces-directo/v1/';
  const MITAD = 2500, TOTAL = 5000;
  let avisar;
  window.acgolfIntro = new Promise(r => { avisar = r; });

  function mostrar(){
    let vista = false;
    try { vista = sessionStorage.getItem('acgolfIntro') === '1'; sessionStorage.setItem('acgolfIntro', '1'); } catch(e){}
    let sinMovimiento = false;
    try { sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
    if(vista || sinMovimiento) return avisar();
    const ingles = window.acgolfIdioma === 'en';   // las voces son en español: en inglés, sin botón de sonido

    const el = document.createElement('div');
    el.className = 'iv'; el.setAttribute('role', 'presentation');
    el.innerHTML = '<video class="iv-v iv-lola on" muted loop playsinline webkit-playsinline preload="auto" src="' + LOLA + '"></video>'
      + '<video class="iv-v iv-curro" muted loop playsinline webkit-playsinline preload="auto" src="' + CURRO + '"></video>'
      + '<div class="iv-titulo"><b>acgolf</b><span>Golf entre amigos</span></div>'
      + '<div class="iv-rotulo"><span class="iv-quien">Lola</span><span class="iv-dice">«¡Hola! Esto es acgolf.»</span></div>'
      + (ingles ? '' : '<button type="button" class="iv-b iv-son">🔊 Con sonido</button>')
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
      try { vL.pause(); vC.pause(); aL.pause(); aC.pause(); } catch(e){}
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
    // Sin sonido: 2,5 s Lola + 2,5 s Curro
    function mudo(){
      tiempos.forEach(clearTimeout); tiempos = [];
      poner('lola');
      tiempos.push(setTimeout(() => poner('curro'), MITAD));
      tiempos.push(setTimeout(quitar, TOTAL + 200));
    }
    // Con sonido: cada uno habla con su voz y su imagen. La voz de Lola arranca en el mismo toque
    // del dedo (si no, el iPhone no deja que suene); la de Curro empieza cuando ella termina.
    const aL = new Audio(VOCES + 'intro-lola.wav'), aC = new Audio(VOCES + 'intro-curro.wav');
    [aL, aC].forEach(a => { a.preload = 'auto'; a.setAttribute('playsinline', ''); });
    function conVoz(){
      tiempos.forEach(clearTimeout); tiempos = [];
      tiempos.push(setTimeout(quitar, 12000));   // límite de seguridad
      let curroYa = false;
      const curro = () => {
        if(curroYa || hecho) return; curroYa = true;
        poner('curro');
        try { aC.currentTime = 0; } catch(e){}
        const p = aC.play(); if(p && p.catch) p.catch(() => {});
        aC.onended = () => setTimeout(quitar, 400);
        tiempos.push(setTimeout(quitar, 7000));
      };
      poner('lola');
      aL.onended = curro;
      try { aL.currentTime = 0; } catch(e){}
      const p = aL.play(); if(p && p.catch) p.catch(() => tiempos.push(setTimeout(curro, MITAD)));
      tiempos.push(setTimeout(curro, 6000));   // por si la voz de Lola no avisa de que ha terminado
    }

    vL.addEventListener('playing', () => { arrancado = true; });
    vL.addEventListener('error', quitar);
    setTimeout(() => { if(!arrancado) quitar(); }, 3000);   // no carga: fuera
    el.querySelector('.iv-saltar').addEventListener('click', quitar);
    const son = el.querySelector('.iv-son');
    if(son) son.addEventListener('click', () => { son.hidden = true; conVoz(); });
    mudo();
  }

  if(document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
})();
