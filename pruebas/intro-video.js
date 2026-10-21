/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Presentación con video al abrir la app ---
// · Una vez cada vez que se abre la app: Curro, el caddie, da la bienvenida enseñando la app en su móvil → entra la app.
// · Empieza sin sonido (los móviles no dejan que un video suene solo); botón «Con sonido» para verlo otra vez con música.
// · Botón «Saltar» siempre a la vista.
// · Si el video no arranca en 3 s, da error o algo se atasca, se quita solo: la app nunca se queda esperando.
// · Cuando termina, avisa (window.acgolfIntro) para que después salga la bienvenida del patrocinador.
(function(){
  const VIDEO = 'intro-curro.mp4?v=1';
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
    el.innerHTML = '<video class="iv-v" muted playsinline webkit-playsinline preload="auto" src="' + VIDEO + '"></video>'
      + '<button type="button" class="iv-b iv-son">🔊 Con sonido</button>'
      + '<button type="button" class="iv-b iv-saltar">Saltar ›</button>';
    document.body.appendChild(el);
    const v = el.querySelector('video');
    let hecho = false, arrancado = false;

    function quitar(){
      if(hecho) return;
      hecho = true;
      el.classList.add('fuera');
      try { v.pause(); } catch(e){}
      setTimeout(() => el.remove(), 450);
      avisar();
    }

    v.addEventListener('playing', () => { arrancado = true; });
    v.addEventListener('ended', () => setTimeout(quitar, 300));
    v.addEventListener('error', quitar);
    setTimeout(() => { if(!arrancado) quitar(); }, 3000);   // no carga: fuera
    let limite = setTimeout(quitar, 9000);                 // por si se atasca

    el.querySelector('.iv-saltar').addEventListener('click', quitar);
    const son = el.querySelector('.iv-son');
    son.addEventListener('click', () => {
      v.muted = false;
      try { v.currentTime = 0; } catch(e){}
      const p = v.play(); if(p && p.catch) p.catch(() => {});
      son.hidden = true;
      clearTimeout(limite); limite = setTimeout(quitar, 9000);
    });

    const p = v.play();
    if(p && p.catch) p.catch(quitar);
  }

  if(document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
})();
