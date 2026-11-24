/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «La emisión de acgolf TV»: el resumen de una partida terminada como un vídeo espectacular (24-nov-2026, pruebas) ---
// Une los trozos de vídeo hechos con Higgsfield (apertura, birdie, brindis) con carteles dibujados con los datos REALES
// de la partida (ganador con sus 18 hoyos, clasificación, cervezas), las voces de Lola y Curro y música de fondo.
// Va dentro de «El plató» (en-vivo.js → entradaResumen). Si algo falla, en-vivo.js sigue con el plató de siempre.
(function(){
  'use strict';
  const BASE = 'https://qjtsjcfalettgvrlwwnr.supabase.co/storage/v1/object/public/voces-directo/tv/';
  const CLIP = { apertura: BASE + 'apertura.mp4', birdie: BASE + 'birdie.mp4', brindis: BASE + 'brindis.mp4' };
  const MUSICA = BASE + 'musica.mp3';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);
  const esEquipo = n => String(n || '').includes(' / ');
  const largo = n => esEquipo(n) ? String(n).split(' / ').map(x => String(x).trim().split(/\s+/)[0]).join(' y ') : String(n || '').trim().split(/\s+/).slice(0, 2).join(' ');
  let tk = 0, pausa = false, ctx = null, G = {}, el = {};

  function sitioHtml(round){
    return '<div class="em">'
      + '<div class="em-fondo"></div>'
      + '<div class="em-cab"><span class="em-cab-t">ACGOLF TV · RESUMEN FINAL</span><b class="em-cab-n">' + esc(round.round_name || 'Partida') + '</b><span class="em-pill">RESUMEN</span></div>'
      + '<video class="em-v" playsinline webkit-playsinline preload="auto" crossorigin="anonymous"></video>'
      + '<div class="em-cartel"></div><div class="em-ult"></div><div class="em-rot" aria-live="polite"></div>'
      + '<button type="button" class="em-play">▶<span>Ver el resumen de la partida</span></button>'
      + '<div class="em-ctl" hidden><button type="button" class="em-pausa">Pausa</button><button type="button" class="em-otra">↺ Otra vez</button></div>'
      + '</div>';
  }
  function montar(sitio, round, empezarYa){
    try {
      const EV = window.acgolfEnVivo, TV = window.acgolfTele;
      if(!EV || !EV.tabla || !EV.paresDe || !TV || !TV.guionFinal || !TV.urlVoz) return false;
      if(!(window.AudioContext || window.webkitAudioContext)) return false;
      const t = EV.tabla(round); if(!t.length) return false;
      sitio.innerHTML = sitioHtml(round);
      const box = sitio.querySelector('.em');
      const play = box.querySelector('.em-play'), ctl = box.querySelector('.em-ctl');
      play.onclick = () => { play.hidden = true; ctl.hidden = false; empezar(box, round); };
      box.querySelector('.em-pausa').onclick = e => {
        pausa = !pausa; e.target.textContent = pausa ? 'Seguir' : 'Pausa';
        try { if(ctx){ if(pausa) ctx.suspend(); else ctx.resume(); } } catch(x){}
        try { if(pausa){ el.v.pause(); el.vo.pause(); el.mu.pause(); } else { if(el.v.dataset.on === '1') el.v.play().catch(() => {}); if(el.vo.src && !el.vo.ended) el.vo.play().catch(() => {}); el.mu.play().catch(() => {}); } } catch(x){}
      };
      box.querySelector('.em-otra').onclick = () => { pausa = false; box.querySelector('.em-pausa').textContent = 'Pausa'; empezar(box, round); };
      if(empezarYa && (!navigator.userActivation || navigator.userActivation.isActive)) play.click();   // sin un toque reciente el móvil no deja sonar: se espera al botón
      return true;
    } catch(e){ return false; }
  }
  function parar(){ tk++; try { ['v', 'vo', 'mu'].forEach(k => { if(el[k]){ el[k].pause(); } }); if(ctx) ctx.close(); } catch(e){} ctx = null; el = {}; G = {}; pausa = false; }

  // ---------- audio: todo pasa por un mando de volumen (en iPhone el volumen normal no se puede cambiar) ----------
  function prepararAudio(box){
    parar();
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    el.v = box.querySelector('.em-v'); el.v.dataset.on = '0';
    el.vo = new Audio(); el.vo.crossOrigin = 'anonymous'; el.vo.preload = 'auto';
    el.mu = new Audio(); el.mu.crossOrigin = 'anonymous'; el.mu.loop = true; el.mu.preload = 'auto'; el.mu.src = MUSICA;
    ['v', 'vo', 'mu'].forEach(k => { try { const s = ctx.createMediaElementSource(el[k]); const g = ctx.createGain(); g.gain.value = k === 'mu' ? 0.0001 : 1; s.connect(g); g.connect(ctx.destination); G[k] = g; } catch(e){ G[k] = null; } });
    ctx.resume().catch(() => {});
  }
  function vol(k, v, seg){ try { if(G[k]) G[k].gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, seg || 0.4); else if(el[k]) el[k].volume = Math.min(1, v); } catch(e){} }
  const vivo = (box, mi) => mi === tk && document.body.contains(box);
  async function esperar(box, mi, ms){
    let falta = ms;
    while(falta > 0){
      if(!vivo(box, mi)) throw new Error('fin');
      await new Promise(ok => setTimeout(ok, 100));
      if(!pausa) falta -= 100;
    }
  }
  function voz(box, mi, url){
    return new Promise(ok => {
      const v = el.vo; let hecho = false;
      const fin = () => { if(!hecho){ hecho = true; v.onended = v.onerror = null; ok(); } };
      v.onended = fin; v.onerror = fin; v.src = url;
      v.play().catch(fin);
      const guarda = setInterval(() => { if(!vivo(box, mi)){ clearInterval(guarda); fin(); } else if(hecho) clearInterval(guarda); }, 300);
      setTimeout(fin, 9000);
    });
  }
  async function hablar(box, mi, pasos, TV){
    const rot = box.querySelector('.em-rot');
    vol('mu', 0.14, 0.5);
    for(const p of pasos){
      if(!vivo(box, mi)) throw new Error('fin');
      rot.innerHTML = String(p.rot || '').replace(/<span class="uh">.*?<\/span>/, ''); rot.classList.add('ver');
      for(const c of p.clips){ while(pausa){ await esperar(box, mi, 100); } await voz(box, mi, TV.urlVoz(c)); await esperar(box, mi, 60); }
    }
    rot.classList.remove('ver');
  }
  async function clip(box, mi, nombre, volVideo, volMusica, durMax, antes){
    const v = el.v, cab = box.querySelector('.em-cab');
    box.classList.add('em-conclip'); box.querySelector('.em-cartel').innerHTML = '';
    v.src = CLIP[nombre]; v.dataset.on = '1'; vol('v', volVideo, 0.05); vol('mu', volMusica, 0.6);
    await new Promise(ok => { v.oncanplay = () => ok(); v.onerror = () => ok(); setTimeout(ok, 6000); try { v.load(); } catch(e){} });
    try { await v.play(); } catch(e){}
    if(antes) antes();
    await new Promise(ok => { const fin = () => ok(); v.onended = fin; v.onerror = fin; setTimeout(fin, (durMax || 10.5) * 1000 + 1500); });
    v.dataset.on = '0'; v.pause();
    box.classList.remove('em-conclip');
  }
  // ---------- carteles con los datos reales ----------
  function casilla(v, par){
    const d = v - par;
    const c = d <= -2 ? 'ag' : d === -1 ? 'bi' : d === 0 ? 'pa' : d === 1 ? 'bo' : 'db';
    return '<i class="em-h ' + c + '">' + v + '</i>';
  }
  function cartelGanador(box, EV, round, t){
    const w = t[0], g = w.g, pares = EV.paresDe(round), orden = EV.ordenDe(g), n = EV.nHoyos(g);
    const fila = (desde, hasta, titulo) => {
      let nums = '', cas = '';
      for(let k = desde; k < hasta; k++){ const h = orden[k]; nums += '<s>' + (window.etqV ? window.etqV(h) : h) + '</s>'; const v = +((w.sc || {})[h]) || 0; cas += v ? casilla(v, pares[h - 1] || 4) : '<i class="em-h vacia">·</i>'; }
      return '<div class="em-fila"><b>' + titulo + '</b><div class="em-nums" style="--n:' + (hasta - desde) + '">' + nums + '</div><div class="em-cas" style="--n:' + (hasta - desde) + '">' + cas + '</div></div>';
    };
    const filas = n > 9 ? fila(0, 9, 'IDA') + fila(9, n, 'VUELTA') : fila(0, n, g.nueve && orden[0] > 9 ? 'VUELTA' : 'IDA');
    const res = w.esPtos ? w.pts + ' puntos' : signo(w.neto) + ' neto';
    box.querySelector('.em-cartel').innerHTML = '<div class="em-gan"><span class="em-c">🏆</span><h2>' + esc(largo(w.n)) + '</h2><p>' + res + ' · ' + w.bruto + ' golpes</p><small>Ganador del día · hándicap ' + w.hc + '</small></div>'
      + '<div class="em-cris em-holes">' + filas + '<div class="em-nota">Casillas: golpes contra el par del hoyo, sin hándicap</div></div>';
    mostrar(box);
  }
  function cartelClasif(box, t){
    const esPtos = t[0].esPtos, max = Math.min(t.length, 8);
    const pagan = t.length >= 2 ? Math.floor(t.length / 2) : 0;
    box.querySelector('.em-cartel').innerHTML = '<div class="em-tit">Clasificación · ' + (esPtos ? 'puntos' : 'neto') + '</div><div class="em-lista' + (max > 5 ? ' apretada' : '') + '">'
      + t.slice(0, max).map((x, i) => '<div class="em-cris em-row' + (i === 0 ? ' lider' : '') + '" style="--d:' + (i * 0.28) + 's"><i>' + (i + 1) + '</i><span>' + (pagan > 0 && i >= t.length - pagan ? '🍺 ' : '') + esc(largo(x.n)) + '<small>' + x.bruto + ' golpes − ' + x.hc + ' de hándicap</small></span><b>' + (esPtos ? x.pts + ' pts' : signo(x.neto)) + '</b></div>').join('') + '</div>';
    mostrar(box);
  }
  function cartelCervezas(box, t){
    const pagan = Math.floor(t.length / 2);
    box.querySelector('.em-cartel').innerHTML = '<div class="em-cris em-cerv"><span class="em-jarra">🍺</span><h3>Hoy pagan las cervezas</h3><p>' + t.slice(t.length - pagan).map(x => esc(largo(x.n))).join(' · ') + '</p><small>Sin excusas, que hay testigos</small></div>';
    mostrar(box);
  }
  function cartelCierre(box){
    box.querySelector('.em-cartel').innerHTML = '<div class="em-cierre"><h1>acgolf TV</h1><hr><p>Hasta la próxima, golfistas</p></div>';
    mostrar(box);
  }
  function mostrar(box){ const c = box.querySelector('.em-cartel'); c.classList.remove('entra'); void c.offsetWidth; c.classList.add('entra'); }
  function ultimaHora(box, texto){
    const u = box.querySelector('.em-ult');
    u.innerHTML = '<span class="em-uh">ÚLTIMA HORA</span><div>' + texto + '</div>';
    setTimeout(() => u.classList.add('ver'), 2500); setTimeout(() => u.classList.remove('ver'), 7700);
  }
  // ---------- el guion de la emisión ----------
  async function empezar(box, round){
    const EV = window.acgolfEnVivo, TV = window.acgolfTele;
    prepararAudio(box); const mi = tk;
    el.mu.play().catch(() => {});
    try { el.vo.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='; el.vo.play().catch(() => {}); } catch(e){}
    try {
      const t = EV.tabla(round); if(!t.length) return;
      const pasos = TV.guionFinal(t);
      const grupo = marca => pasos.filter(p => String(p.rot || '').replace(/<[^>]+>/g, '').trim().indexOf(marca) === 0);
      const gPasos = grupo('🏆'), cPasos = grupo('2.º').concat(grupo('3.º')), bPasos = grupo('🍺'), aPasos = grupo('acgolf');
      const mom = EV.momentos ? EV.momentos(round) : [];
      const mejor = mom.slice().sort((a, b) => a.d - b.d || b.pos - a.pos)[0];
      const pagan = t.length >= 2 ? Math.floor(t.length / 2) : 0;
      // 1. apertura en el plató
      await clip(box, mi, 'apertura', 1, 0.16, 10);
      // 2. el mejor hoyo, si hubo birdie o águila
      if(mejor && mejor.d < 0){
        const nom = esc(largo(mejor.n)), tipo = mejor.d <= -2 ? 'Águila' : 'Birdie';
        await clip(box, mi, 'birdie', 0.4, 0.7, 10, () => ultimaHora(box, '¡' + tipo + ' de <b>' + nom + '</b>! · hoyo ' + (window.etqV ? window.etqV(mejor.h) : mejor.h)));
      }
      // 3. el brindis, si alguien paga cervezas
      if(pagan > 0) await clip(box, mi, 'brindis', 0.4, 0.7, 10);
      // 4. ganador (con sus hoyos) y clasificación
      vol('v', 1, 0.1); cartelGanador(box, EV, round, t); await hablar(box, mi, gPasos, TV); await esperar(box, mi, 1500);
      cartelClasif(box, t); await hablar(box, mi, cPasos, TV); await esperar(box, mi, 2200);
      // 5. cervezas
      if(pagan > 0){ cartelCervezas(box, t); await hablar(box, mi, bPasos, TV); await esperar(box, mi, 1200); }
      // 6. cierre
      cartelCierre(box); await hablar(box, mi, aPasos, TV); await esperar(box, mi, 1500);
      vol('mu', 0.0001, 2.2); await esperar(box, mi, 2500);
      box.querySelector('.em-play').hidden = false; box.querySelector('.em-play span').textContent = 'Ver otra vez el resumen'; box.querySelector('.em-ctl').hidden = true;
      box.querySelector('.em-play').onclick = () => { box.querySelector('.em-play').hidden = true; box.querySelector('.em-ctl').hidden = false; empezar(box, round); };
    } catch(e){ /* cancelado: otra emisión o se cerró la pantalla */ }
  }
  // Solo para probar el dibujo de un cartel sin sonido ni vídeo
  function _ver(box, round, cual){ const EV = window.acgolfEnVivo, t = EV.tabla(round); box.querySelector('.em-play').hidden = true;
    if(cual === 'gan') cartelGanador(box, EV, round, t); else if(cual === 'cla') cartelClasif(box, t); else if(cual === 'cer') cartelCervezas(box, t); else if(cual === 'cie') cartelCierre(box);
    else if(cual === 'ult'){ box.classList.add('em-conclip'); ultimaHora(box, '¡Birdie de <b>Javier Pérez</b>! · hoyo 5'); }
    box.querySelector('.em-rot').innerHTML = '🏆 <b>Gana Javier Pérez</b> · −5 neto'; box.querySelector('.em-rot').classList.add('ver'); }
  window.acgolfEmision = { montar, parar, _ver };
})();
