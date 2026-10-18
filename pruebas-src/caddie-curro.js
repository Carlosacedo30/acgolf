/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Curro, el caddie andaluz: sale un momento al apuntar los golpes con un comentario con gracia ---
// Birdie: «¡Te como los huevos!». Par: «¡Qué bueno eres!». Bogey: «Aquí no se dan bolas».
// Doble bogey o peor: un chiste para quitar hierro. Sale cuando están los golpes de todos en el hoyo:
// con 3 jugadores o menos, un comentario (el mejor o el peor); con 4 o más, dos (el mejor y el peor).
// Imágenes hechas con Higgsfield: curro.webp (sonrisa) y curro-risa.webp (carcajada, para birdies y chistes). Habla con la voz del móvil (en español); se puede silenciar.
// Todo en el móvil: sin internet y sin coste.
(function(){
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const elige = (ops, semilla) => ops[Math.abs(semilla | 0) % ops.length];
  const nombreCorto = n => { const s = String(n || ''); if(s.includes(' / ')) return s.split(' / ').map(x => x.trim().split(/\s+/)[0]).join(' y '); return s.trim().split(/\s+/)[0] || s; };

  // ---------- Dibujo de Curro (ánimo: euforico, feliz, animo, guasa) ----------
  function cara(animo){
    return '<span class="cu-foto">' + (animo === 'euforico' ? '<i class="cu-brillo b1">✦</i><i class="cu-brillo b2">✦</i><i class="cu-brillo b3">✦</i>' : '') + '<img src="' + (animo === 'euforico' || animo === 'guasa' ? 'curro-risa.webp?v=1' : 'curro.webp?v=1') + '" alt="Curro, el caddie" onerror="this.parentNode.outerHTML=window.acgolfCurro.dibujo(\'' + animo + '\')"></span>';
  }
  function dibujo(animo){
    const ojos = animo === 'euforico' || animo === 'feliz'
      ? '<path d="M44 55 Q49 49.5 54 55" stroke="#2B2118" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M66 55 Q71 49.5 76 55" stroke="#2B2118" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : animo === 'guasa'
      ? '<path d="M44 54.5 Q49 51 54 54.5" stroke="#2B2118" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="71" cy="54" rx="3.4" ry="4" fill="#2B2118"/><circle cx="72.3" cy="52.6" r="1.2" fill="#fff"/>'
      : '<ellipse cx="49" cy="54" rx="3.4" ry="4" fill="#2B2118"/><ellipse cx="71" cy="54" rx="3.4" ry="4" fill="#2B2118"/><circle cx="50.3" cy="52.6" r="1.2" fill="#fff"/><circle cx="72.3" cy="52.6" r="1.2" fill="#fff"/>';
    const cejas = animo === 'guasa'
      ? '<path d="M41 47 Q48 44.5 55 47.5" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M65 44 Q72 40.5 79 44.5" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/>'
      : animo === 'animo'
      ? '<path d="M41 46 Q48 44 55 47" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M65 47 Q72 44 79 46" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/>'
      : '<path d="M41 46.5 Q48 41.5 55 45.5" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M65 45.5 Q72 41.5 79 46.5" stroke="#9A9A9A" stroke-width="4.2" fill="none" stroke-linecap="round"/>';
    const boca = animo === 'euforico'
      ? '<path d="M47 72 Q60 90 73 72 Z" fill="#7A2420"/><path d="M49 72.5 Q60 77 71 72.5 L70 75 Q60 78.5 50 75 Z" fill="#fff"/><path d="M53 82 Q60 86 67 82 Q60 79 53 82 Z" fill="#E56B6B"/>'
      : animo === 'feliz'
      ? '<path d="M49 73 Q60 85 71 73 Z" fill="#7A2420"/><path d="M51 73.5 Q60 77 69 73.5 L68 75.5 Q60 78 52 75.5 Z" fill="#fff"/>'
      : animo === 'guasa'
      ? '<path d="M51 76 Q61 81 71 72" stroke="#6B3A22" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
      : '<path d="M51 75 Q60 80.5 69 75" stroke="#6B3A22" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    const brillos = animo === 'euforico'
      ? '<g fill="#F5C518"><path d="M10 30 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5Z"/><path d="M108 22 l2 4.8 4.8 2 -4.8 2 -2 4.8 -2 -4.8 -4.8 -2 4.8 -2Z"/><path d="M104 64 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6Z"/></g>' : '';
    return '<svg class="cu-cara" viewBox="0 0 120 132" aria-hidden="true">' + brillos
      // cuerpo: polo blanco con cuello verde, toalla de caddie al hombro
      + '<path d="M14 132 C14 108 32 98 60 98 C88 98 106 108 106 132 Z" fill="#FFFFFF" stroke="#D5DBD8" stroke-width="1.5"/>'
      + '<path d="M46 98 L60 112 L74 98 L69 95.5 L60 105 L51 95.5 Z" fill="#2E7D32"/>'
      + '<circle cx="60" cy="116" r="1.6" fill="#2E7D32"/><circle cx="60" cy="122" r="1.6" fill="#2E7D32"/>'
      + '<path d="M77 99 C88 100 97 106 100 120 L90 123 C88 113 83 107 74 104 Z" fill="#F4EFE2" stroke="#D8CFB8" stroke-width="1"/><path d="M80 101.5 L91 121.5" stroke="#C6A43F" stroke-width="2"/><path d="M85 100.5 L96 120" stroke="#C6A43F" stroke-width="2"/>'
      + '<rect x="52" y="86" width="16" height="14" rx="6" fill="#D49C72"/>'
      // cabeza, orejas y patillas canosas
      + '<ellipse cx="27" cy="60" rx="6.5" ry="9" fill="#D9A178"/><ellipse cx="93" cy="60" rx="6.5" ry="9" fill="#D9A178"/>'
      + '<ellipse cx="60" cy="60" rx="32" ry="31" fill="#E8B48A"/>'
      + '<path d="M28.5 46 C27.5 56 29 63 32 68 L35 55 Z M91.5 46 C92.5 56 91 63 88 68 L85 55 Z" fill="#B8B8B8"/>'
      + '<ellipse cx="40" cy="67" rx="6.5" ry="4.5" fill="#F08F78" opacity=".45"/><ellipse cx="80" cy="67" rx="6.5" ry="4.5" fill="#F08F78" opacity=".45"/>'
      + cejas + ojos
      // nariz redonda y bigotazo canoso
      + '<ellipse cx="60" cy="64" rx="6.5" ry="5.5" fill="#DE9A72"/><ellipse cx="58" cy="62.5" rx="2" ry="1.4" fill="#F2C3A0"/>'
      + boca
      + '<path d="M60 68.5 C54 66 44 66.5 39.5 73.5 C45 72.5 50 73 54 74.5 C56.5 75 58.5 74 60 72.5 C61.5 74 63.5 75 66 74.5 C70 73 75 72.5 80.5 73.5 C76 66.5 66 66 60 68.5 Z" fill="#A7A7A7"/>'
      // gorra campera de paño verde
      + '<path d="M26 44 C24 22 44 13 63 14 C82 15 96 24 94 41 C90 37 78 34.5 60 34.5 C44 34.5 32 38 26 44 Z" fill="#4F6B3A"/>'
      + '<path d="M30 36 C40 30 54 28 66 28.5 M34 30 C44 24 58 22.5 70 23.5 M42 22 C50 19 60 18.5 70 19.5" stroke="#3E5630" stroke-width="1.6" fill="none" opacity=".8"/>'
      + '<path d="M26 44 C34 37.5 46 35 62 35 C78 35 90 37.5 95 41 C103 43 108 46.5 107 49 C98 46.5 84 44.5 62 44.5 C46 44.5 34 45.5 26 47 Z" fill="#3B5229"/>'
      + '<circle cx="62" cy="15.5" r="2.6" fill="#3B5229"/>'
      + '</svg>';
  }

  // ---------- Frases ----------
  // r = { n: nombre corto, bruto: golpes − par, neto: golpes − golpes de hándicap − par, h: hoyo }
  // ---------- Frases por resultado ({n} = nombre del jugador) ----------
  // El orden importa: la frase número X usa la grabación voz/curro-<grupo>-X.mp3.
  // Las frases sin grabar todavía (más allá de GRABADAS) no se usan, para que Curro tenga siempre la misma voz.
  const FRASES = {
    aguila: ['¡Mi arma, un ÁGUILA! {n}, eso hay que enmarcarlo y colgarlo en el bar.',
      '¡Ozú, {n}! ¡Águila! Hoy te llevo la bolsa gratis, quillo.',
      '¡{n}, águila! Ni en la Ryder se ve esto, mi arma.',
      '¡Que alguien llame a la tele! {n} ha hecho un águila.',
      '¡Arsa, arsa y arsa! Águila, {n}. Hoy no te tose nadie.'],
    birdie: ['¡Te como los huevos, {n}! Birdie de categoría.',
      '¡Ozú, {n}! Un birdie como la Giralda de grande.',
      '¡Arsa, birdie! {n}, hoy las cañas las pagas tú, que estás en racha.',
      '¡{n}, birdie! Eso no lo hace ni el Seve, mi arma.',
      '¡{n}, birdie! Eso es de primera división, quillo.',
      '¡Ole, ole y ole! Birdie, {n}. Así me gusta a mí.',
      '¡Pero qué me estás contando, {n}! ¡Birdie!',
      'Birdie, {n}. Tú hoy has desayunado bien, ¿eh?'],
    par: ['¡Qué bueno eres, {n}! Par como un reloj.',
      'Par, {n}. Así da gusto llevarte la bolsa.',
      '¡Olé, {n}! Par de libro, sin despeinarte.',
      '{n}, par. Ni frío ni calor: ¡perfecto!',
      'Par, {n}. Sin aspavientos, como los buenos.',
      '¡Eso es, {n}! Par, y a otra cosa, mariposa.',
      '{n}, par. El campo ni se ha enterado de que has pasado.',
      'Par, {n}. Más fiable que el reloj de la catedral.',
      '¡Bien, {n}! Par. Así se juega, con la cabeza.'],
    parneto: ['Bogey con tu golpe de regalo, {n}: par para ti. ¡Bien jugao!',
      '{n}, con el golpe que te dan, es tu par. ¡Eso es saber jugar!',
      '{n}, bogey con golpe: par neto. ¡Eso cuenta igual, mi arma!',
      'Con tu golpe de ventaja, {n}, eso es un par. ¡Pa la saca!',
      '{n}, el hándicap está pa usarlo: par neto. ¡Olé!'],
    bogey: ['Bogey, {n}. Un golpito na más… y aquí no se dan bolas, ¿eh?',
      '{n}, bogey. Tranquilo, quillo, que el hoyo también tiene su orgullo.',
      'Bogey. {n}, ni tan mal: el próximo lo bordamos.',
      'Bogey, {n}. No pasa na, que esto es muy largo.',
      '{n}, bogey. El hoyo se ha llevado un golpito, nada más.',
      'Bogey, {n}. Respira, que el siguiente es tuyo.',
      '{n}, bogey. Con un putt menos era par: ¡que se lo digan al green!',
      'Bogey. Tranquilo, {n}, que esto no es la tele: aquí se juega por las cañas.'],
    doble: ['Doble bogey… {n}, ¿sabes por qué el golfista lleva dos pares de pantalones? ¡Por si hace un hoyo en uno! Venga, al siguiente.',
      '{n}, doble. No se dan bolas, pero hoy te la daba yo de buena gana.',
      'Doble bogey. Tranquilo, {n}, que el campo también tiene derecho a ganar alguna.',
      '{n}, doble bogey. Esto en Sevilla lo llamamos «calentar motores».',
      'Doble bogey, {n}. Dicen que el golf es de caballeros… y de mucha paciencia.',
      '{n}, doble. Esa bola ha dado más vueltas que la noria de la feria.',
      'Doble bogey. {n}, ¿te cuento un secreto? En el hoyo siguiente nadie se acuerda.',
      '{n}, doble. Si quieres te paso la toalla pa secarte las lágrimas.'],
    triple: ['{n}, ese hoyo lo apuntamos con tinta invisible. ¡Al siguiente!',
      'Uy, {n}… mi abuela decía: «el golf es un paseo estropeado». Hoy te ha tocado el trozo estropeado.',
      '{n}, ¿has visto la bola por algún sitio? Yo tampoco. ¡Venga, borrón y cuenta nueva!',
      'Tranquilo, {n}: hasta el Seve hizo hoyos así. Bueno, el Seve no, pero su primo seguro.',
      '{n}, ese hoyo se lo dejamos a los conejos. ¡Vámonos!',
      'Uy, {n}… ¿cuántos han sido? Mejor no me lo digas, que me pongo malo.',
      '{n}, tranquilo: el golf es como la vida, unos hoyos se ganan y otros se pagan.',
      '¡Venga, {n}! Que hasta los profesionales tienen días así. Bueno, días no: hoyos.']
  };
  const ANIMO = { aguila:'euforico', birdie:'euforico', par:'feliz', parneto:'feliz', bogey:'animo', doble:'guasa', triple:'guasa' };

  // Rotación: va sacando las frases de una «bolsa» barajada y no repite hasta haberlas dicho todas
  // (y nunca la misma dos veces seguidas). Se acuerda entre partidas en este móvil.
  const CLAVE_BOLSA = 'acgolfCurroBolsa';
  let bolsas = {};
  try { bolsas = JSON.parse(localStorage.getItem(CLAVE_BOLSA) || '{}') || {}; } catch(e){ bolsas = {}; }
  // Nunca la misma frase en 4 hoyos seguidos: se apunta qué dijo en cada hoyo
  let dichas = [];   // [{ h, k: 'grupo-i' }]
  const usadaCerca = (k, h) => dichas.some(d => d.k === k && Math.abs(d.h - h) <= 3);
  function siguienteFrase(grupo, h){
    const total = Math.min(FRASES[grupo].length, (typeof GRABADAS !== 'undefined' && GRABADAS[grupo]) || FRASES[grupo].length);
    let b = bolsas[grupo];
    if(!b || !Array.isArray(b.quedan) || b.total !== total || !b.quedan.length){
      const ult = b && typeof b.ultima === 'number' ? b.ultima : -1;
      const q = Array.from({ length: total }, (_, k) => k);
      for(let k = q.length - 1; k > 0; k--){ const r = Math.floor(Math.random() * (k + 1)); [q[k], q[r]] = [q[r], q[k]]; }
      if(q.length > 1 && q[0] === ult) q.push(q.shift());
      b = { total, quedan: q, ultima: ult };
    }
    // La primera de la bolsa que no se haya dicho en los últimos 4 hoyos; si no hay ninguna, nada
    let pos = b.quedan.findIndex(k => !usadaCerca(grupo + '-' + k, h));
    if(pos < 0 && b.quedan.length < total){
      // Lo que queda en la bolsa está «quemado»: se baraja una bolsa nueva con todas y se busca otra vez
      const q = Array.from({ length: total }, (_, k) => k).sort(() => Math.random() - 0.5);
      b.quedan = q; pos = q.findIndex(k => !usadaCerca(grupo + '-' + k, h));
    }
    if(pos < 0){ bolsas[grupo] = b; return -1; }
    const i = b.quedan.splice(pos, 1)[0]; b.ultima = i; bolsas[grupo] = b;
    try { localStorage.setItem(CLAVE_BOLSA, JSON.stringify(bolsas)); } catch(e){}
    return i;
  }
  function frase(r){
    let grupo = r.bruto <= -2 ? 'aguila' : r.bruto === -1 ? 'birdie' : r.bruto === 0 ? 'par'
      : r.neto <= 0 ? 'parneto' : r.bruto === 1 ? 'bogey' : r.bruto === 2 ? 'doble' : 'triple';
    // Par con golpe de hándicap: se mezclan sus frases con las del par de campo (sorteo según cuántas tiene cada una)
    let i = -1;
    if(grupo === 'parneto'){
      const nG = k => Math.min(FRASES[k].length, GRABADAS[k] || 0);
      const orden = Math.random() < nG('parneto') / (nG('parneto') + nG('par')) ? ['parneto', 'par'] : ['par', 'parneto'];
      for(const k of orden){ i = siguienteFrase(k, r.h); if(i >= 0){ grupo = k; break; } }
    } else i = siguienteFrase(grupo, r.h);
    if(i < 0) return null;
    dichas.push({ h: r.h, k: grupo + '-' + i }); if(dichas.length > 30) dichas = dichas.slice(-30);
    return { animo: ANIMO[grupo], t: FRASES[grupo][i].split('{n}').join(esc(r.n)), grupo, i };
  }

  // ---------- La voz (la del propio móvil, en español) ----------
  const CLAVE_VOZ = 'acgolfCurroVoz';
  const vozActiva = () => { try { return localStorage.getItem(CLAVE_VOZ) !== '0'; } catch(e){ return true; } };
  let vozElegida = null;
  function buscarVoz(){
    if(!('speechSynthesis' in window)) return null;
    const v = speechSynthesis.getVoices().filter(x => /^es/i.test(x.lang));
    // Mejor una voz de hombre de España; si no, cualquiera de España; si no, cualquiera en español
    const hombre = x => /jorge|pablo|alvaro|álvaro|diego|enrique|juan|carlos|miguel|male|hombre/i.test(x.name);
    return v.find(x => /es-ES/i.test(x.lang) && hombre(x)) || v.find(x => /es-ES/i.test(x.lang)) || v[0] || null;
  }
  if('speechSynthesis' in window){ vozElegida = buscarVoz(); speechSynthesis.onvoiceschanged = () => { vozElegida = buscarVoz(); }; }
  // Frases grabadas con la voz de Curro (Higgsfield): voz/curro-<grupo>-<n>.mp3. Si no hay, habla el móvil.
  const GRABADAS = { aguila: 2, birdie: 4, par: 9, parneto: 2, bogey: 3, doble: 4, triple: 4 };
  let audio = null;
  function hablarFrase(f){
    if(!vozActiva()) return;
    const n = GRABADAS[f.grupo];
    if(n && f.i < n){
      try {
        if('speechSynthesis' in window) speechSynthesis.cancel();
        if(!audio) audio = new Audio();
        audio.pause(); audio.src = 'voz/curro-' + f.grupo + '-' + (f.i + 1) + '.mp3?v=1';
        const p = audio.play(); if(p && p.catch) p.catch(() => hablar(f.t));
        return;
      } catch(e){}
    }
    hablarFrase(f);
  }
  function callar(){ try { if(audio) audio.pause(); if('speechSynthesis' in window) speechSynthesis.cancel(); } catch(e){} }
  function hablar(texto){
    if(!vozActiva() || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(texto).replace(/<[^>]+>/g, '').replace(/[«»]/g, '').replace(/\bna\b/g, 'nada'));
      u.lang = 'es-ES'; if(vozElegida) u.voice = vozElegida;
      u.rate = 1.02; u.pitch = 0.9;
      speechSynthesis.speak(u);
    } catch(e){}
  }
  // iPhone solo deja hablar después de un toque: el primer toque en la app «despierta» la voz
  function despertar(){
    document.removeEventListener('pointerdown', despertar, true);
    // El mismo reproductor sirve luego para las grabaciones (en iPhone tiene que estrenarse con un toque)
    try { if(!audio){ audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='); const p = audio.play(); if(p && p.catch) p.catch(() => {}); } } catch(e){}
    try { if('speechSynthesis' in window && vozActiva()){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch(e){}
  }
  document.addEventListener('pointerdown', despertar, true);

  // ---------- El aviso (uno detrás de otro si hay dos comentarios) ----------
  let ocultar = null, siguiente = null, cola = [];
  function quitar(){
    const el = document.getElementById('cuFlash'); if(el) el.classList.remove('ver');
    callar(); clearTimeout(ocultar); clearTimeout(siguiente);
    if(cola.length) siguiente = setTimeout(() => pintar(cola.shift()), 700);
  }
  function pintar(f){
    let el = document.getElementById('cuFlash');
    if(!el){
      el = document.createElement('div'); el.id = 'cuFlash'; el.setAttribute('role', 'status');
      el.addEventListener('click', ev => {
        const b = ev.target.closest && ev.target.closest('.cu-voz');
        if(b){
          ev.stopPropagation();
          const on = !vozActiva();
          try { localStorage.setItem(CLAVE_VOZ, on ? '1' : '0'); } catch(e){}
          if(!on) callar();
          b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-label', on ? 'Silenciar a Curro' : 'Que hable Curro');
          return;
        }
        quitar();
      });
      document.body.appendChild(el);
    }
    el.className = 'cu-flash cu-' + f.animo;
    el.innerHTML = cara(f.animo) + '<div class="cu-bocadillo"><b>Curro, tu caddie</b><button type="button" class="cu-voz" aria-label="' + (vozActiva() ? 'Silenciar a Curro' : 'Que hable Curro') + '">' + (vozActiva() ? '🔊' : '🔇') + '</button><p>' + f.t + '</p></div>';
    el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
    clearTimeout(ocultar);
    ocultar = setTimeout(quitar, Math.min(11000, 4000 + f.t.length * 55));
    hablarFrase(f);
  }
  function mostrar(lista){
    lista = (Array.isArray(lista) ? lista : [lista]).map(x => x && x.t ? x : frase(x)).filter(Boolean);
    if(!lista.length) return;
    clearTimeout(siguiente); clearTimeout(ocultar); callar();
    cola = lista.slice(1);
    if(lista.length) pintar(lista[0]);
  }

  // ---------- Cuando están los golpes de TODOS en el hoyo ----------
  // 3 jugadores o menos: un comentario (el mejor o el peor, el que más «chicha» tenga).
  // 4 o más: dos comentarios, primero el mejor y luego el peor.
  const yaDicho = {};
  let hoyoPendiente = null, temporizador = null;
  function datos(p, h){
    const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + p + '"]');
    const g = inp ? parseInt(inp.value, 10) : NaN;
    const par = inp ? parseInt(inp.dataset.par, 10) : NaN, si = inp ? parseInt(inp.dataset.strokeIndex, 10) : NaN;
    if(isNaN(g) || g <= 0 || isNaN(par)) return null;
    const rec = (typeof strokesForHole === 'function' && typeof hcpJuego === 'function' && !isNaN(si)) ? Math.max(0, strokesForHole(hcpJuego(p), si)) : 0;
    return { g, bruto: g - par, neto: g - rec - par };
  }
  function jugadoresDelHoyo(h){
    const idx = [...new Set([...document.querySelectorAll('.golpes-input[data-hole="' + h + '"]')].map(x => +x.dataset.playerIndex).filter(n => !isNaN(n)))];
    const nombres = (typeof players !== 'undefined' && players) ? players : [];
    return idx.filter(p => !nombres.length || nombres[p]);
  }
  function comentarHoyo(h){
    const js = jugadoresDelHoyo(h); if(!js.length) return;
    const res = [];
    for(const p of js){ const d = datos(p, h); if(!d) return; res.push(Object.assign({ p }, d)); }   // falta alguien: aún no
    const clave = h + ':' + res.map(x => x.p + '=' + x.g).join(',');
    if(yaDicho[clave]) return; yaDicho[clave] = 1;
    // Mejor: menos golpes sobre el par (a igualdad, mejor neto). Peor: al revés.
    const orden = res.slice().sort((a, b) => a.bruto - b.bruto || a.neto - b.neto);
    const mejor = orden[0], peor = orden[orden.length - 1];
    const nombres = (typeof players !== 'undefined' && players) ? players : [];
    const r = x => ({ n: nombreCorto(nombres[x.p] || 'Jugador'), bruto: x.bruto, neto: x.neto, h, semilla: x.p });
    let lista;
    if(res.length >= 4 && peor.bruto > mejor.bruto) lista = [frase(r(mejor)), frase(r(peor))].filter(Boolean);
    else {
      // Uno solo: el que más chicha tenga; si a ese no le queda frase sin repetir, se prueba con otro; si no, nada
      const primero = (mejor.bruto <= -1 || peor.bruto < 2 || mejor.bruto === peor.bruto) ? mejor : peor;
      const otros = orden.filter(x => x !== primero && (x.bruto !== primero.bruto || x.neto !== primero.neto));
      let f = frase(r(primero));
      for(const x of otros){ if(f) break; f = frase(r(x)); }
      lista = f ? [f] : [];
    }
    mostrar(lista);
  }
  function alApuntar(e){
    const inp = e.target;
    if(!inp || !inp.classList || !inp.classList.contains('golpes-input')) return;
    const h = +inp.dataset.hole; if(isNaN(h)) return;
    hoyoPendiente = h;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { const x = hoyoPendiente; hoyoPendiente = null; if(x != null) comentarHoyo(x); }, 900);
  }
  document.addEventListener('change', alApuntar, true);
  document.addEventListener('input', alApuntar, true);

  window.acgolfCurro = { cara, dibujo, frase, mostrar, hablar };
})();
