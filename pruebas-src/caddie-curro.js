/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Curro, el caddie andaluz: sale un momento al apuntar los golpes con un comentario con gracia ---
// Birdie: «¡Te como los huevos!». Par: «¡Qué bueno eres!». Bogey: «Aquí no se dan bolas».
// Doble bogey o peor: un chiste para quitar hierro. Sale encima de la pantalla de anotar, unos segundos.
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
  function frase(r){
    const n = esc(r.n), s = r.h * 7 + (r.semilla || 0);
    if(r.bruto <= -2) return { animo:'euforico', t: elige([
      '¡Mi arma, un ÁGUILA! ' + n + ', eso hay que enmarcarlo y colgarlo en el bar.',
      '¡Ozú, ' + n + '! ¡Águila! Hoy te llevo la bolsa gratis, quillo.' ], s) };
    if(r.bruto === -1) return { animo:'euforico', t: elige([
      '¡Te como los huevos, ' + n + '! Birdie de categoría.',
      '¡Ozú, ' + n + '! Un birdie como la Giralda de grande.',
      '¡Arsa, birdie! ' + n + ', hoy las cañas las pagas tú, que estás en racha.',
      '¡' + n + ', birdie! Eso no lo hace ni el Seve, mi arma.' ], s) };
    if(r.bruto === 0) return { animo:'feliz', t: elige([
      '¡Qué bueno eres, ' + n + '! Par como un reloj.',
      'Par, ' + n + '. Así da gusto llevarte la bolsa.',
      '¡Olé, ' + n + '! Par de libro, sin despeinarte.',
      n + ', par. Ni frío ni calor: ¡perfecto!' ], s) };
    if(r.neto <= 0) return { animo:'feliz', t: elige([
      'Bogey con tu golpe de regalo, ' + n + ': par para ti. ¡Bien jugao!',
      n + ', con el golpe que te dan, es tu par. ¡Eso es saber jugar!' ], s) };
    if(r.bruto === 1) return { animo:'animo', t: elige([
      'Bogey, ' + n + '. Un golpito na más… y aquí no se dan bolas, ¿eh?',
      n + ', bogey. Tranquilo, quillo, que el hoyo también tiene su orgullo.',
      'Bogey. ' + n + ', ni tan mal: el próximo lo bordamos.' ], s) };
    if(r.bruto === 2) return { animo:'guasa', t: elige([
      'Doble bogey… ' + n + ', ¿sabes por qué el golfista lleva dos pares de pantalones? ¡Por si hace un hoyo en uno! Venga, al siguiente.',
      n + ', doble. No se dan bolas, pero hoy te la daba yo de buena gana.',
      'Doble bogey. Tranquilo, ' + n + ', que el campo también tiene derecho a ganar alguna.',
      n + ', doble bogey. Esto en Sevilla lo llamamos «calentar motores».' ], s) };
    return { animo:'guasa', t: elige([
      n + ', ese hoyo lo apuntamos con tinta invisible. ¡Al siguiente!',
      'Uy, ' + n + '… mi abuela decía: «el golf es un paseo estropeado». Hoy te ha tocado el trozo estropeado.',
      n + ', ¿has visto la bola por algún sitio? Yo tampoco. ¡Venga, borrón y cuenta nueva!',
      'Tranquilo, ' + n + ': hasta el Seve hizo hoyos así. Bueno, el Seve no, pero su primo seguro.' ], s) };
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
    try { if('speechSynthesis' in window && vozActiva()){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch(e){}
  }
  document.addEventListener('pointerdown', despertar, true);

  // ---------- El aviso ----------
  let ocultar = null;
  function mostrar(r){
    const f = frase(r);
    let el = document.getElementById('cuFlash');
    if(!el){
      el = document.createElement('div'); el.id = 'cuFlash'; el.setAttribute('role', 'status');
      el.addEventListener('click', ev => {
        const b = ev.target.closest && ev.target.closest('.cu-voz');
        if(b){
          ev.stopPropagation();
          const on = !vozActiva();
          try { localStorage.setItem(CLAVE_VOZ, on ? '1' : '0'); } catch(e){}
          if(!on && 'speechSynthesis' in window) speechSynthesis.cancel();
          b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-label', on ? 'Silenciar a Curro' : 'Que hable Curro');
          return;
        }
        el.classList.remove('ver'); if('speechSynthesis' in window) speechSynthesis.cancel();
      });
      document.body.appendChild(el);
    }
    el.className = 'cu-flash cu-' + f.animo;
    el.innerHTML = cara(f.animo) + '<div class="cu-bocadillo"><b>Curro, tu caddie</b><button type="button" class="cu-voz" aria-label="' + (vozActiva() ? 'Silenciar a Curro' : 'Que hable Curro') + '">' + (vozActiva() ? '🔊' : '🔇') + '</button><p>' + f.t + '</p></div>';
    el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
    clearTimeout(ocultar);
    ocultar = setTimeout(() => el.classList.remove('ver'), Math.min(11000, 4000 + f.t.length * 55));
    hablar(f.t);
  }

  // ---------- Al apuntar golpes en la partida ----------
  const yaDicho = {};
  let pendiente = null, temporizador = null;
  function datos(p, h){
    const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + p + '"]');
    const g = inp ? parseInt(inp.value, 10) : NaN;
    const par = inp ? parseInt(inp.dataset.par, 10) : NaN, si = inp ? parseInt(inp.dataset.strokeIndex, 10) : NaN;
    if(isNaN(g) || g <= 0 || isNaN(par)) return null;
    const rec = (typeof strokesForHole === 'function' && typeof hcpJuego === 'function' && !isNaN(si)) ? Math.max(0, strokesForHole(hcpJuego(p), si)) : 0;
    return { g, bruto: g - par, neto: g - rec - par };
  }
  function alApuntar(e){
    const inp = e.target;
    if(!inp || !inp.classList || !inp.classList.contains('golpes-input')) return;
    const p = +inp.dataset.playerIndex, h = +inp.dataset.hole;
    if(isNaN(p) || isNaN(h)) return;
    pendiente = { p, h };
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      const x = pendiente; pendiente = null; if(!x) return;
      const d = datos(x.p, x.h); if(!d) return;
      const clave = x.h + '-' + x.p + '-' + d.g;
      if(yaDicho[clave]) return; yaDicho[clave] = 1;
      const nom = (typeof players !== 'undefined' && players) ? players[x.p] : '';
      mostrar({ n: nombreCorto(nom), bruto: d.bruto, neto: d.neto, h: x.h, semilla: x.p });
    }, 900);
  }
  document.addEventListener('change', alApuntar, true);
  document.addEventListener('input', alApuntar, true);

  window.acgolfCurro = { cara, dibujo, frase, mostrar, hablar };
})();
