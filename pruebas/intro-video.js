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

  // Voz: se baja, se le quita el silencio de los bordes y se toca con un reproductor normal
  function decodificar(ab){
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if(!OAC) return Promise.resolve(null);
    const c = new OAC(1, 44100, 44100);
    return new Promise(ok => { try { const pr = c.decodeAudioData(ab, ok, () => ok(null)); if(pr && pr.catch) pr.catch(() => ok(null)); } catch(e){ ok(null); } });
  }
  async function cargar(nombre){
    const r = await fetch(VOCES + nombre + '.mp3');
    if(!r.ok) throw new Error('sin voz');
    const ab = await r.arrayBuffer();
    const url = URL.createObjectURL(new Blob([ab.slice(0)], { type: 'audio/wav' }));
    let ini = 0, dur = null;
    const buf = await decodificar(ab);
    if(buf){
      const d = buf.getChannelData(0), sr = buf.sampleRate, U = 0.015;
      let a = 0, z = d.length - 1;
      while(a < d.length && Math.abs(d[a]) < U) a++;
      while(z > a && Math.abs(d[z]) < U) z--;
      if(a < z){ ini = Math.max(0, a / sr - 0.05); dur = Math.min(buf.duration, z / sr + 0.12) - ini; }
    }
    return { url, ini, dur };
  }
  function tocar(audio, s){
    return new Promise(ok => {
      let hecho = false, t = null;
      const fin = () => { if(hecho) return; hecho = true; clearTimeout(t); audio.onended = null; try { audio.pause(); } catch(e){} ok(); };
      audio.onended = fin; audio.onerror = fin;
      audio.src = s.url;
      audio.onloadedmetadata = () => {
        audio.onloadedmetadata = null;
        try { if(s.ini) audio.currentTime = s.ini; } catch(e){}
        const p = audio.play();
        const corta = () => { t = setTimeout(fin, (s.dur || 4) * 1000 + 60); };
        if(p && p.then) p.then(corta, fin); else corta();
      };
      audio.load();
      setTimeout(fin, 7000);
    });
  }

  function mostrar(){
    let vista = false;
    try { vista = sessionStorage.getItem('acgolfIntro') === '1'; sessionStorage.setItem('acgolfIntro', '1'); } catch(e){}
    let sinMovimiento = false;
    try { sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
    if(vista || sinMovimiento) return avisar();
    const ingles = window.acgolfIdioma === 'en';   // las voces son en español: en inglés, sin botón de sonido

    const el = document.createElement('div');
    el.className = 'iv'; el.setAttribute('role', 'presentation');
    el.innerHTML = '<video class="iv-v iv-lola on" muted playsinline webkit-playsinline preload="auto" src="' + LOLA + '"></video>'
      + '<video class="iv-v iv-curro" muted playsinline webkit-playsinline preload="auto" src="' + CURRO + '"></video>'
      + '<div class="iv-titulo"><b>acgolf</b><span>Golf entre amigos</span></div>'
      + '<div class="iv-rotulo"><span class="iv-quien">Lola</span><span class="iv-dice">«¡Hola! Esto es acgolf.»</span></div>'
      + (ingles ? '' : '<button type="button" class="iv-b iv-son">🔊 Con sonido</button>')
      + '<button type="button" class="iv-b iv-saltar">Saltar ›</button>';
    document.body.appendChild(el);
    const vL = el.querySelector('.iv-lola'), vC = el.querySelector('.iv-curro');
    const quien = el.querySelector('.iv-quien'), dice = el.querySelector('.iv-dice');
    let hecho = false, arrancado = false, tiempos = [], audio = null;

    function quitar(){
      if(hecho) return;
      hecho = true;
      tiempos.forEach(clearTimeout);
      el.classList.add('fuera');
      try { vL.pause(); vC.pause(); if(audio) audio.pause(); } catch(e){}
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
    // Con sonido: cada uno habla con su voz y su imagen
    async function conVoz(){
      tiempos.forEach(clearTimeout); tiempos = [];
      if(!audio){ audio = new Audio(); audio.setAttribute('playsinline', ''); }
      // desbloquear el sonido dentro del toque (iPhone)
      try { audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; const p = audio.play(); if(p && p.catch) p.catch(() => {}); } catch(e){}
      tiempos.push(setTimeout(quitar, 12000));   // límite de seguridad
      let sL, sC;
      try { [sL, sC] = await Promise.all([cargar('intro-lola'), cargar('intro-curro')]); } catch(e){ return mudo(); }
      if(hecho) return;
      poner('lola'); await tocar(audio, sL);
      if(hecho) return;
      poner('curro'); await tocar(audio, sC);
      if(!hecho) setTimeout(quitar, 500);
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
