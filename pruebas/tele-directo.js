/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «acgolf TV»: la partida en directo como una emisión de tele, con Lola y Curro en su mesa ---
// Va encima de «Seguir en vivo» (en-vivo.js), solo mientras la partida está en juego.
//  · Pantalla 16:9: logo del canal, «● EN DIRECTO», el líder grande, marcador abajo y reloj de la partida.
//  · Abajo a la derecha, la mesa de Lola y Curro (vídeo): el que habla se mueve; entre frase y frase, quietos.
//  · Al entrar: saludo con el nombre del que mira y unos 40 segundos contando cómo va la partida.
//    Son frases grabadas una vez con sus voces de siempre (carpeta «voces-directo» del servidor) que se juntan
//    según la partida. Nombres grabados: los del grupo; si no está el nombre, «¡Hola, campeón!».
(function(){
  'use strict';
  const VOCES = 'https://svnkgmbfanwftncopqjg.supabase.co/storage/v1/object/public/voces-directo/v1/';
  // Nombres con voz (de Lola). Clave: primer nombre sin acentos. Otras formas → el grabado.
  const NOMBRES = ['alvaro','carlos','fernando','francisco','jesus','jose','juan','lorenzo','manuel','rafael','camilo','emilio','jorge','maria','segundo','antonio','ivan'];
  const APODOS = { fco:'francisco', paco:'francisco', pepe:'jose', manu:'manuel', manolo:'manuel', rafa:'rafael', chema:'jose', toni:'antonio', antoñito:'antonio' };
  const VIDEOS = { lola: ['tele-lola-a.mp4?v=1', 'tele-lola-b.mp4?v=1'], curro: ['tele-curro-a.mp4?v=1', 'tele-curro-b.mp4?v=1'] };

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const corto = n => String(n || '').trim().split(/\s+/)[0] || String(n || '');
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || (() => { try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } })();
  function claveNombre(n){
    const k = norm(corto(n)).replace(/[^a-zñ]/g, '');
    const k2 = APODOS[k] || k;
    return NOMBRES.includes(k2) ? 'n-' + k2 : null;
  }

  // ---------- Sonido ----------
  // Se oye con un reproductor normal (<audio>), como el resto de la app: así suena aunque el iPhone tenga
  // el interruptor de silencio puesto. Cada frase se baja una vez, se mira dónde empieza y acaba la voz
  // (para quitar el silencio de los bordes) y se guarda en el móvil mientras dura la pantalla.
  let voz = null, cola = [], turno = 0, cache = {}, cortaT = null, suena = false, hablando = false;
  const reproductor = () => { if(!voz){ voz = new Audio(); voz.preload = 'auto'; voz.setAttribute('playsinline', ''); } return voz; };
  function decodificar(ab){
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if(!OAC) return Promise.resolve(null);
    const c = new OAC(1, 44100, 44100);
    return new Promise(ok => { try { const pr = c.decodeAudioData(ab, ok, () => ok(null)); if(pr && pr.catch) pr.catch(() => ok(null)); } catch(e){ ok(null); } });
  }
  async function cargar(clave){
    if(cache[clave]) return cache[clave];
    cache[clave] = (async () => {
      const r = await fetch(VOCES + clave + '.mp3');
      if(!r.ok) throw new Error('no está ' + clave);
      const ab = await r.arrayBuffer();
      const url = URL.createObjectURL(new Blob([ab.slice(0)], { type: 'audio/mpeg' }));
      let ini = 0, dur = null;
      const buf = await decodificar(ab);
      if(buf){
        const d = buf.getChannelData(0), sr = buf.sampleRate, U = 0.015;
        let a = 0, z = d.length - 1;
        while(a < d.length && Math.abs(d[a]) < U) a++;
        while(z > a && Math.abs(d[z]) < U) z--;
        if(a < z){ ini = Math.max(0, a / sr - 0.05); dur = Math.min(buf.duration, z / sr + 0.15) - ini; }
      }
      return { url, ini, dur };
    })();
    cache[clave].catch(() => { delete cache[clave]; });
    return cache[clave];
  }
  // Toca una frase; si el móvil no deja sonar (nadie ha tocado la pantalla), devuelve 'bloqueado'
  function tocar(s){
    const el = reproductor();
    return new Promise(ok => {
      let hecho = false;
      const fin = r => { if(hecho) return; hecho = true; clearTimeout(cortaT); el.onended = null; el.onerror = null; try { el.pause(); } catch(e){} ok(r); };
      el.onended = () => fin('ok'); el.onerror = () => fin('error');
      const empezar = () => {
        try { if(s.ini) el.currentTime = s.ini; } catch(e){}
        const pr = el.play();
        const corta = () => { if(s.dur) cortaT = setTimeout(() => fin('ok'), s.dur * 1000 + 80); };
        if(pr && pr.then) pr.then(corta, err => fin(err && err.name === 'NotAllowedError' ? 'bloqueado' : 'error'));
        else corta();
      };
      el.muted = false;
      if(el.src !== s.url){ el.src = s.url; el.onloadedmetadata = () => { el.onloadedmetadata = null; empezar(); }; el.load(); }
      else empezar();
      setTimeout(() => fin('error'), 15000);
    });
  }
  // Desbloquear el sonido dentro del toque del dedo (iPhone): se arranca el reproductor en silencio
  function desbloquear(){
    const el = reproductor();
    try { el.muted = true; el.src = VOCES + 'l-hola-campeon.mp3'; const pr = el.play(); if(pr && pr.then) pr.then(() => { el.pause(); }, () => {}); } catch(e){}
  }

  // ---------- La mesa de Lola y Curro ----------
  function mesa(quien){
    const box = document.querySelector('#vvOverlay .vt-mesa'); if(!box) return;
    const v = box.querySelector('video');
    box.dataset.habla = quien || '';
    if(!quien){ if(v){ v.pause(); } return; }
    const lista = VIDEOS[quien]; const src = lista[(turno++) % lista.length];
    if(v && !v.src.endsWith(src)){ v.src = src; }
    if(v){ v.currentTime = 0; v.play().catch(() => {}); }
  }
  function rotulo(html){
    const r = document.querySelector('#vvOverlay .vt-rot'); if(!r) return;
    if(!html){ r.classList.remove('ver'); return; }
    r.innerHTML = html; r.classList.remove('ver'); void r.offsetWidth; r.classList.add('ver');
  }
  function parar(){
    cola = []; clearTimeout(cortaT);
    try { if(voz){ voz.pause(); } } catch(e){}
    mesa(null); rotulo('');
  }
  function botonOir(ver, texto){
    const b = document.querySelector('#vvOverlay .vt-oir'); if(!b) return;
    b.hidden = !ver; if(texto) b.querySelector('span').textContent = texto;
  }
  async function reproducir(pasos){
    parar();
    hablando = true;
    botonOir(false);
    cola = pasos.slice();
    const mia = cola;
    pasos.forEach(p => p.clips.forEach(k => cargar(k).catch(() => {})));   // se van bajando todas
    for(const p of pasos){
      if(cola !== mia) return;
      rotulo(p.rot || '');
      for(const k of p.clips){
        if(cola !== mia) return;
        let s; try { s = await cargar(k); } catch(e){ continue; }
        if(cola !== mia) return;
        mesa(p.q);
        const r = await tocar(s);
        if(r === 'ok') suena = true;
        if(r === 'bloqueado'){ hablando = false; mesa(null); rotulo(''); cola = []; botonOir(true, 'Escuchar a Lola y Curro'); return false; }
      }
      mesa(null);
      await new Promise(ok => setTimeout(ok, 220));
    }
    if(cola === mia){ rotulo(''); botonOir(true, 'Volver a escuchar a Lola y Curro'); hablando = false; setTimeout(siguienteAviso, 1500); }
    return true;
  }

  // ---------- El guion: se monta con las frases grabadas según cómo va la partida ----------
  let visitas = 0;
  try { visitas = (+localStorage.getItem('acgolfTeleVisitas') || 0) + 1; localStorage.setItem('acgolfTeleVisitas', String(visitas)); } catch(e){ visitas = 1 + Math.floor(Math.random() * 2); }
  function guion(round){
    const EV = window.acgolfEnVivo || {};
    const t = EV.tabla ? EV.tabla(round) : [];
    const m = EV.momentos ? EV.momentos(round) : [];
    const pasos = [];
    const L = (clips, rot) => pasos.push({ q: 'lola', clips: [].concat(clips).filter(Boolean), rot });
    const C = (clips, rot) => pasos.push({ q: 'curro', clips: [].concat(clips).filter(Boolean), rot });
    // 1. Saludo (unas veces empieza Lola y otras Curro)
    const quienMira = yo(), kn = claveNombre(quienMira);
    const saludo = '<b>¡Hola' + (quienMira ? ', ' + esc(corto(quienMira)) : '') + '!</b> Bienvenido a la mesa de Lola y Curro';
    if(visitas % 2 === 1){ L([kn || 'l-hola-campeon', 'l-bienvenida'], saludo); C('c-hola', saludo); }
    else { C('c-hola', saludo); L([kn || 'l-hola-campeon', 'l-bienvenida'], saludo); }
    if(!t.length){ L('l-empieza', 'Aún no hay golpes: <b>la partida está a punto de empezar</b>'); L('l-cierre', 'acgolf <b>TV</b> · seguimos en directo'); return pasos; }
    // 2. En qué momento está
    const hoyo = t.reduce((a, x) => Math.max(a, x.ultimo), 0);
    if(hoyo <= 4) L('l-empieza', 'Hoyo ' + hoyo + ' · <b>está todo por decidir</b>');
    else if(hoyo >= 15) L('l-final', 'Hoyo ' + hoyo + ' · <b>¡se decide en el 18!</b>');
    else if(hoyo >= 9) L('l-mitad', 'Hoyo ' + hoyo + ' · <b>segunda mitad de la partida</b>');
    // 3. El líder
    const l = t[0], k1 = claveNombre(l.n);
    const rotLider = 'Líder · <b>' + esc(corto(l.n)) + '</b> ' + signo(l.neto) + ' neto';
    if(k1) L(['l-manda', k1], rotLider);
    C(visitas % 2 ? 'c-como-un-tiro' : 'c-eso-es-golf', rotLider);
    // 4. El segundo
    if(t[1]){
      const dif = t[1].neto - l.neto, k2 = claveNombre(t[1].n);
      const rot2 = '2.º · <b>' + esc(corto(t[1].n)) + '</b> ' + signo(t[1].neto) + (dif === 0 ? ' · ¡empatados!' : ' · a ' + dif + (dif === 1 ? ' golpe' : ' golpes'));
      if(dif === 0) C('c-empate', rot2);
      else { if(k2) L(['l-sigue', k2], rot2); if(dif >= 3) C('c-diferencia', rot2); }
    }
    // 5. Birdies y hoyos para olvidar
    const bir = m.filter(x => x.d < 0).sort((a, b) => a.d - b.d || b.h - a.h)[0];
    if(bir) { const r = (bir.d <= -2 ? 'Águila' : 'Birdie') + ' de <b>' + esc(corto(bir.n)) + '</b> en el hoyo ' + bir.h; L('l-birdie', r); C('c-birdie', r); }
    const malo = m.filter(x => x.d >= 2).sort((a, b) => b.d - a.d || b.h - a.h)[0];
    if(malo) { const r = 'Hoyo ' + malo.h + ' · ' + malo.v + ' golpes en un par ' + malo.par; L('l-olvidar', r); C('c-atragantado', r); }
    // 6. Predicción y broma
    C(visitas % 2 ? 'c-prediccion-greens' : 'c-prediccion-putts', 'La predicción de <b>Curro</b>');
    if(t.length >= 3) C('c-ultimo', 'Último · <b>' + esc(corto(t[t.length - 1].n)) + '</b> · el hoyo 19 lo gana cualquiera');
    L('l-cierre', 'acgolf <b>TV</b> · seguimos en directo');
    return pasos;
  }

  // ---------- La pantalla ----------
  let ronda = null, codigo = null, reloj = null, empezado = false;

  // ---------- Lola y Curro vuelven a hablar solos cuando pasa algo importante ----------
  // Cambio de líder, empate arriba, birdie o águila, un hoyo desastroso y la recta final (hoyo 15).
  // Como mucho uno cada minuto; si están hablando, espera. Solo si el sonido ya ha funcionado antes.
  let antes = null, avisos = [], ultimoAviso = 0, avisoT = null;
  const MIN_ENTRE_AVISOS = 60000;
  function foto(round){
    const EV = window.acgolfEnVivo || {};
    const t = EV.tabla ? EV.tabla(round) : [], m = EV.momentos ? EV.momentos(round) : [];
    const jugadas = {}; m.forEach(x => { jugadas[x.gi + ':' + x.p + ':' + x.h] = x; });
    return { t, jugadas, hoyo: t.reduce((a, x) => Math.max(a, x.ultimo), 0), lider: t[0] ? t[0].n : null, empate: !!(t[1] && t[1].neto === t[0].neto) };
  }
  function vigilar(round){
    const ahora = foto(round);
    if(!antes){ antes = ahora; return; }          // la primera vez solo se apunta cómo está
    const nuevas = Object.keys(ahora.jugadas).filter(k => !antes.jugadas[k]).map(k => ahora.jugadas[k]);
    const L = (clips, rot) => ({ q: 'lola', clips: [].concat(clips).filter(Boolean), rot });
    const C = (clips, rot) => ({ q: 'curro', clips: [].concat(clips).filter(Boolean), rot });
    const t = ahora.t;
    if(ahora.lider && antes.lider && norm(ahora.lider) !== norm(antes.lider) && !ahora.empate){
      const k = claveNombre(ahora.lider), rot = '¡Nuevo líder! · <b>' + esc(corto(ahora.lider)) + '</b> ' + signo(t[0].neto) + ' neto';
      avisos.push({ prio: 1, pasos: [k ? L(['l-manda', k], rot) : null, C(turno % 2 ? 'c-eso-es-golf' : 'c-como-un-tiro', rot)].filter(Boolean) });
    } else if(ahora.empate && !antes.empate){
      avisos.push({ prio: 2, pasos: [C('c-empate', '¡Empate arriba! · <b>' + esc(corto(t[0].n)) + '</b> y <b>' + esc(corto(t[1].n)) + '</b> ' + signo(t[0].neto))] });
    }
    const bir = nuevas.filter(x => x.d < 0).sort((a, b) => a.d - b.d)[0];
    if(bir) avisos.push({ prio: 3, pasos: [C('c-birdie', (bir.d <= -2 ? '¡Águila' : '¡Birdie') + ' de <b>' + esc(corto(bir.n)) + '</b>! · hoyo ' + bir.h)] });
    const malo = nuevas.filter(x => x.d >= 3).sort((a, b) => b.d - a.d)[0];
    if(malo && !bir) avisos.push({ prio: 5, pasos: [C('c-atragantado', 'Hoyo ' + malo.h + ' · <b>' + esc(corto(malo.n)) + '</b> ' + malo.v + ' golpes en un par ' + malo.par)] });
    if(ahora.hoyo >= 15 && antes.hoyo < 15) avisos.push({ prio: 4, pasos: [L('l-final', 'Hoyo ' + ahora.hoyo + ' · <b>¡recta final!</b>')] });
    antes = ahora;
    if(avisos.length > 3) avisos = avisos.sort((a, b) => a.prio - b.prio).slice(0, 3);
    siguienteAviso();
  }
  function siguienteAviso(){
    clearTimeout(avisoT);
    if(!avisos.length || !suena || !ronda) return;
    const falta = MIN_ENTRE_AVISOS - (Date.now() - ultimoAviso);
    if(hablando || falta > 0){ avisoT = setTimeout(siguienteAviso, Math.max(falta, 5000)); return; }
    avisos.sort((a, b) => a.prio - b.prio);
    const a = avisos.shift();
    // Un aviso viejo de líder ya no vale si el líder ha vuelto a cambiar
    if(a.prio === 1 && ronda){ const f = foto(ronda); if(!f.lider || a.pasos[a.pasos.length - 1].rot.indexOf(esc(corto(f.lider))) < 0) return siguienteAviso(); }
    ultimoAviso = Date.now();
    reproducir(a.pasos);
  }
  function montar(code, round){
    const sitio = document.querySelector('#vvOverlay .vt-sitio'); if(!sitio) return;
    codigo = code; ronda = round; empezado = false; antes = null; avisos = []; ultimoAviso = Date.now();
    sitio.innerHTML = '<div class="vt" role="region" aria-label="acgolf TV, partida en directo">'
      + '<div class="vt-fondo"></div>'
      + '<div class="vt-logo">acgolf <b>TV</b></div>'
      + '<div class="vt-live"><i></i>EN DIRECTO</div>'
      + '<div class="vt-centro"></div>'
      + '<div class="vt-rot" aria-live="polite"></div>'
      + '<div class="vt-mesa"><video muted playsinline loop preload="auto" poster="tele-quieto.jpg?v=1"></video><span>Lola y Curro</span>'
      + '<button type="button" class="vt-grande" aria-label="Ver a pantalla completa">⤢</button></div>'
      + '<div class="vt-bajo"><div class="vt-reloj"></div><div class="vt-marcador"><div class="vt-cinta"></div></div></div>'
      + '<button type="button" class="vt-oir">🔊 <span>Escuchar a Lola y Curro</span></button>'
      + '</div>';
    sitio.querySelector('.vt-oir').onclick = () => { desbloquear(); reproducir(guion(ronda)); };
    sitio.querySelector('.vt-grande').onclick = () => {
      const el = sitio.querySelector('.vt');
      try { if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch(e){} }).catch(() => el.classList.toggle('vt-full')); else el.classList.toggle('vt-full'); } catch(e){ el.classList.toggle('vt-full'); }
    };
    actualizar(round);
    clearInterval(reloj); reloj = setInterval(pintarReloj, 30000);
    // Al entrar, se intenta empezar solos (vienen de tocar «Seguir en vivo»); si el móvil no deja, sale el botón
    setTimeout(() => { if(!empezado){ empezado = true; reproducir(guion(ronda)); } }, 600);
  }
  function pintarReloj(){
    const r = document.querySelector('#vvOverlay .vt-reloj'); if(!r || !ronda) return;
    const EV = window.acgolfEnVivo || {}; const t = EV.tabla ? EV.tabla(ronda) : [];
    const hoyo = t.reduce((a, x) => Math.max(a, x.ultimo), 0);
    const ini = new Date(ronda.created_at).getTime();
    let min = Math.max(0, Math.round((Date.now() - ini) / 60000));
    const txt = min > 600 ? '' : (min >= 60 ? Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0') + ' min' : min + ' min');
    r.innerHTML = (txt ? '⏱ <b>' + txt + '</b>' : '') + '<span>' + (hoyo ? (hoyo >= 18 ? 'Último hoyo' : 'Faltan <b>' + (18 - hoyo) + '</b> hoyos') : 'Sin golpes aún') + '</span>';
  }
  function actualizar(round){
    ronda = round;
    try { vigilar(round); } catch(e){}
    const caja = document.querySelector('#vvOverlay .vt'); if(!caja) return;
    const EV = window.acgolfEnVivo || {}; const t = EV.tabla ? EV.tabla(round) : [];
    const centro = caja.querySelector('.vt-centro');
    if(!t.length) centro.innerHTML = '<small>' + esc(round.course_name || 'Partida') + '</small><h3>Empieza enseguida</h3>';
    else {
      const l = t[0];
      centro.innerHTML = '<small>' + esc(round.round_name || 'Partida') + ' · ' + esc(round.course_name || '') + '</small>'
        + '<div class="vt-lider"><span>Líder</span><h3>' + esc(corto(l.n)) + '</h3><b>' + signo(l.neto) + '</b><em>' + (l.ultimo >= 18 ? 'terminado' : 'hoyo ' + l.ultimo) + '</em></div>';
    }
    const cinta = caja.querySelector('.vt-cinta');
    const items = t.map((x, i) => '<span class="' + (i === 0 ? 'uno' : '') + '"><i>' + (i + 1) + '</i>' + esc(corto(x.n)) + ' <b>' + signo(x.neto) + '</b> <small>' + (x.ultimo >= 18 ? 'F' : 'h' + x.ultimo) + '</small></span>').join('');
    cinta.innerHTML = items || '<span>Esperando los primeros golpes…</span>';
    cinta.classList.toggle('anda', t.length > 3);
    if(t.length > 3) cinta.innerHTML += items;   // dos veces, para que la cinta corra sin saltos
    pintarReloj();
  }
  function quitar(){ parar(); hablando = false; avisos = []; antes = null; clearTimeout(avisoT); clearInterval(reloj); reloj = null; ronda = null; codigo = null; }

  // Para verlo como espectador aunque juegues o seas administrador: acgolf.es/#vivo=CÓDIGO
  async function porEnlace(){
    const m = String(location.hash || '').match(/vivo=([A-Za-z0-9]{4,12})/); if(!m) return;
    const EV = window.acgolfEnVivo; if(!EV || !EV.leerRonda) return;
    const code = m[1].toUpperCase(), r = await EV.leerRonda(code);
    if(r){ window.__teleForzada = true; EV.pantalla(code, r); }
  }
  window.addEventListener('load', () => setTimeout(porEnlace, 2500));
  window.addEventListener('hashchange', porEnlace);

  window.acgolfTele = { montar, actualizar, quitar, guion, claveNombre, _reproducir: reproducir, _avisos: () => avisos.map(a => a.pasos.map(p => p.q + ':' + p.clips.join('+')).join(' / ')) };
})();
