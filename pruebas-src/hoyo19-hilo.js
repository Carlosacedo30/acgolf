// © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
// El hoyo 19 · el hilo de la partida (paso 3). Solo se pregunta a la base de datos con el hilo ABIERTO; nunca mientras se anota.
(function(){
  'use strict';
  if(window.acgolfHilo19) return;
  const REFRESCO = 4000;                // cada cuántos ms se mira si hay mensajes nuevos (solo con el hilo abierto)
  const DEFS = "<svg width=\"0\" height=\"0\" style=\"position:absolute\" id=\"h19Defs\" aria-hidden=\"true\"><defs>\n<clipPath id=\"c\"><circle cx=\"50\" cy=\"50\" r=\"46\"/></clipPath>\n<g id=\"jarra\">\n <rect x=\"28\" y=\"36\" width=\"34\" height=\"40\" rx=\"5\" fill=\"#FFC107\"/>\n <circle cx=\"34\" cy=\"35\" r=\"8\" fill=\"#fff\"/><circle cx=\"46\" cy=\"30\" r=\"9\" fill=\"#fff\"/><circle cx=\"57\" cy=\"35\" r=\"8\" fill=\"#fff\"/>\n <path d=\"M62 44h8a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-8\" stroke=\"#fff\" stroke-width=\"5\" fill=\"none\"/>\n <path d=\"M36 46v24\" stroke=\"#FFE082\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n</g>\n<symbol id=\"s0\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#2E7D32\" stroke=\"#fff\" stroke-width=\"5\"/>\n<g stroke=\"#FFD54F\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M32 32h-8c0 10 4 14 10 15\"/><path d=\"M68 32h8c0 10-4 14-10 15\"/></g>\n<path d=\"M32 26h36v16c0 10-8 18-18 18s-18-8-18-18z\" fill=\"#FFD54F\"/><rect x=\"46\" y=\"58\" width=\"8\" height=\"10\" fill=\"#FFD54F\"/><rect x=\"36\" y=\"68\" width=\"28\" height=\"7\" rx=\"2\" fill=\"#FFB300\"/>\n<path d=\"M50 32l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z\" fill=\"#FFF8E1\"/></symbol>\n<symbol id=\"s1\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#2E7D32\" stroke=\"#fff\" stroke-width=\"5\"/>\n<g clip-path=\"url(#c)\"><ellipse cx=\"50\" cy=\"90\" rx=\"52\" ry=\"26\" fill=\"#81C784\"/></g>\n<path d=\"M60 26V68\" stroke=\"#fff\" stroke-width=\"3.500\" stroke-linecap=\"round\"/><path d=\"M60 26l20 8-20 8z\" fill=\"#FF5252\"/>\n<circle cx=\"40\" cy=\"68\" r=\"7\" fill=\"#fff\" stroke=\"#B0BEC5\" stroke-width=\"1.500\"/>\n<g stroke=\"#FFF59D\" stroke-width=\"3\" stroke-linecap=\"round\"><path d=\"M26 30v10M21 35h10\"/><path d=\"M78 56v8M74 60h8\"/></g></symbol>\n<symbol id=\"s2\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#2E7D32\" stroke=\"#fff\" stroke-width=\"5\"/>\n<path d=\"M46 66v10M54 66v10\" stroke=\"#FF9800\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n<polygon points=\"32,50 16,40 20,58\" fill=\"#FBC02D\"/><ellipse cx=\"50\" cy=\"52\" rx=\"20\" ry=\"16\" fill=\"#FFEB3B\"/><circle cx=\"66\" cy=\"40\" r=\"11\" fill=\"#FFEB3B\"/>\n<polygon points=\"76,38 88,43 76,46\" fill=\"#FF9800\"/><circle cx=\"69\" cy=\"38\" r=\"2.500\" fill=\"#333\"/><ellipse cx=\"46\" cy=\"54\" rx=\"11\" ry=\"6\" transform=\"rotate(-20 46 54)\" fill=\"#FBC02D\"/></symbol>\n<symbol id=\"s3\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#2E7D32\" stroke=\"#fff\" stroke-width=\"5\"/>\n<g clip-path=\"url(#c)\"><path d=\"M32 64a18 18 0 0 1 36 0z\" fill=\"#FFD54F\"/><rect x=\"0\" y=\"64\" width=\"100\" height=\"40\" fill=\"#1B5E20\"/></g>\n<g stroke=\"#FFD54F\" stroke-width=\"4\" stroke-linecap=\"round\"><path d=\"M50 30v8M28 38l6 6M72 38l-6 6M17 56l8 2M83 56l-8 2\"/></g></symbol>\n<symbol id=\"s4\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#F28C28\" stroke=\"#fff\" stroke-width=\"5\"/>\n<rect x=\"27\" y=\"30\" width=\"14\" height=\"12\" rx=\"3\" fill=\"#546E7A\"/><rect x=\"59\" y=\"30\" width=\"14\" height=\"12\" rx=\"3\" fill=\"#546E7A\"/>\n<rect x=\"24\" y=\"40\" width=\"20\" height=\"28\" rx=\"6\" fill=\"#37474F\"/><rect x=\"56\" y=\"40\" width=\"20\" height=\"28\" rx=\"6\" fill=\"#37474F\"/><rect x=\"42\" y=\"48\" width=\"16\" height=\"10\" fill=\"#546E7A\"/>\n<circle cx=\"34\" cy=\"68\" r=\"8\" fill=\"#81D4FA\" stroke=\"#fff\" stroke-width=\"2\"/><circle cx=\"66\" cy=\"68\" r=\"8\" fill=\"#81D4FA\" stroke=\"#fff\" stroke-width=\"2\"/></symbol>\n<symbol id=\"s5\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#F28C28\" stroke=\"#fff\" stroke-width=\"5\"/>\n<path d=\"M30 20L52 54L64 56\" stroke=\"#ECEFF1\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M58 52h20v9H58z\" fill=\"#B0BEC5\"/><circle cx=\"34\" cy=\"78\" r=\"5\" fill=\"#fff\"/>\n<path d=\"M44 38l-8 2M46 44l-9 4M56 44l6-6\" stroke=\"#FFF59D\" stroke-width=\"2.500\" stroke-linecap=\"round\"/></symbol>\n<symbol id=\"s6\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#F28C28\" stroke=\"#fff\" stroke-width=\"5\"/>\n<g stroke=\"#fff\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M20 38h42a9 9 0 1 0-9-9\"/><path d=\"M20 54h54a9 9 0 1 1-9 9\"/><path d=\"M20 70h26a7 7 0 1 1-7 7\"/></g></symbol>\n<symbol id=\"s7\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#F28C28\" stroke=\"#fff\" stroke-width=\"5\"/>\n<use href=\"#jarra\"/><circle cx=\"41\" cy=\"56\" r=\"2.500\" fill=\"#6D4C41\"/><circle cx=\"53\" cy=\"56\" r=\"2.500\" fill=\"#6D4C41\"/><path d=\"M40 64q7 6 14 0\" stroke=\"#6D4C41\" stroke-width=\"2.500\" fill=\"none\" stroke-linecap=\"round\"/></symbol>\n<symbol id=\"s8\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#1E88E5\" stroke=\"#fff\" stroke-width=\"5\"/>\n<circle cx=\"50\" cy=\"50\" r=\"26\" fill=\"#FFD54F\" stroke=\"#F9A825\" stroke-width=\"4\"/><circle cx=\"50\" cy=\"50\" r=\"19\" fill=\"none\" stroke=\"#F9A825\" stroke-width=\"2\"/>\n<text x=\"50\" y=\"61\" text-anchor=\"middle\" font-size=\"30\" font-weight=\"800\" fill=\"#E65100\" font-family=\"Arial\">€</text></symbol>\n<symbol id=\"s9\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#1E88E5\" stroke=\"#fff\" stroke-width=\"5\"/>\n<rect x=\"30\" y=\"24\" width=\"38\" height=\"24\" rx=\"2\" fill=\"#A5D6A7\" stroke=\"#66BB6A\" stroke-width=\"2\"/><text x=\"49\" y=\"42\" text-anchor=\"middle\" font-size=\"15\" font-weight=\"800\" fill=\"#2E7D32\" font-family=\"Arial\">€</text>\n<rect x=\"22\" y=\"40\" width=\"56\" height=\"38\" rx=\"6\" fill=\"#6D4C41\"/><rect x=\"22\" y=\"40\" width=\"56\" height=\"14\" rx=\"5\" fill=\"#8D6E63\"/><circle cx=\"68\" cy=\"62\" r=\"5\" fill=\"#FFD54F\"/></symbol>\n<symbol id=\"s10\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#1E88E5\" stroke=\"#fff\" stroke-width=\"5\"/>\n<rect x=\"14\" y=\"52\" width=\"22\" height=\"28\" fill=\"#ECEFF1\"/><rect x=\"39\" y=\"40\" width=\"22\" height=\"40\" fill=\"#FFD54F\"/><rect x=\"64\" y=\"62\" width=\"22\" height=\"18\" fill=\"#ECEFF1\"/>\n<g font-size=\"15\" font-weight=\"800\" fill=\"#455A64\" font-family=\"Arial\" text-anchor=\"middle\"><text x=\"25\" y=\"72\">2</text><text x=\"50\" y=\"68\">1</text><text x=\"75\" y=\"76\">3</text></g>\n<path d=\"M75 26v18\" stroke=\"#FF5252\" stroke-width=\"5\" stroke-linecap=\"round\"/><polygon points=\"66,42 84,42 75,54\" fill=\"#FF5252\"/></symbol>\n<symbol id=\"s11\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#1E88E5\" stroke=\"#fff\" stroke-width=\"5\"/>\n<g clip-path=\"url(#c)\"><use href=\"#jarra\" transform=\"translate(-12 14) rotate(-14 45 56) scale(.82)\"/><use href=\"#jarra\" transform=\"translate(110 14) scale(-.82 .82) rotate(-14 45 56)\"/></g>\n<g stroke=\"#FFF59D\" stroke-width=\"3\" stroke-linecap=\"round\"><path d=\"M50 18v8M40 22l3 6M60 22l-3 6\"/></g></symbol>\n<symbol id=\"s12\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#7B1FA2\" stroke=\"#fff\" stroke-width=\"5\"/>\n<ellipse cx=\"20\" cy=\"46\" rx=\"14\" ry=\"5.500\" transform=\"rotate(26 20 46)\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"1.500\"/><ellipse cx=\"80\" cy=\"46\" rx=\"14\" ry=\"5.500\" transform=\"rotate(-14 80 46)\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"1.500\"/>\n<path d=\"M38 28C34 16 26 11 17 13C26 16 30 22 33 31Z\" fill=\"#D7C39A\" stroke=\"#B89F70\" stroke-width=\"1.500\"/><path d=\"M62 28C66 16 74 11 83 13C74 16 70 22 67 31Z\" fill=\"#D7C39A\" stroke=\"#B89F70\" stroke-width=\"1.500\"/>\n<path d=\"M44 76Q50 94 56 76Z\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"1.500\"/>\n<ellipse cx=\"50\" cy=\"52\" rx=\"25\" ry=\"28\" fill=\"#F3E6CC\" stroke=\"#B89F70\" stroke-width=\"2\"/>\n<ellipse cx=\"50\" cy=\"67\" rx=\"14\" ry=\"10.500\" fill=\"#FFF6E4\" stroke=\"#B89F70\" stroke-width=\"1.500\"/>\n<ellipse cx=\"45.500\" cy=\"63\" rx=\"1.600\" ry=\"2\" fill=\"#6B4A3A\"/><ellipse cx=\"54.500\" cy=\"63\" rx=\"1.600\" ry=\"2\" fill=\"#6B4A3A\"/>\n<circle cx=\"37\" cy=\"46\" r=\"7\" fill=\"#F2D55C\" stroke=\"#4A3328\" stroke-width=\"1.800\"/><ellipse cx=\"40\" cy=\"47.500\" rx=\"4.200\" ry=\"1.700\" fill=\"#2B1A12\"/>\n<path d=\"M30 46a7 7 0 0 1 14 0z\" fill=\"#E4D2AE\" stroke=\"#4A3328\" stroke-width=\"1.800\" stroke-linejoin=\"round\"/>\n<path d=\"M57 48Q64 41 71 48\" stroke=\"#4A3328\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M28 36L45 41\" stroke=\"#4A3328\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M57 35Q65 28 73 35\" stroke=\"#4A3328\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M40 73Q50 79 62 70\" stroke=\"#5A3A2A\" stroke-width=\"2.200\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M62 70l3.500-2.500\" stroke=\"#5A3A2A\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n<g><path d=\"M54 74Q52 91 58 92Q64 90 62 74Z\" fill=\"#F0658A\" stroke=\"#C23F67\" stroke-width=\"1.300\"/><path d=\"M58 77V86\" stroke=\"#C23F67\" stroke-width=\"1.200\" stroke-linecap=\"round\"/>\n<animateTransform attributeName=\"transform\" type=\"rotate\" values=\"-6 57 74;16 57 74;-6 57 74\" dur=\"0.6s\" repeatCount=\"indefinite\"/></g></symbol>\n<filter id=\"pegatina\" x=\"-15%\" y=\"-15%\" width=\"130%\" height=\"130%\"><feMorphology in=\"SourceAlpha\" operator=\"dilate\" radius=\"5\" result=\"d\"/><feFlood flood-color=\"#fff\"/><feComposite in2=\"d\" operator=\"in\" result=\"w\"/><feMerge><feMergeNode in=\"w\"/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter>\n<symbol id=\"chivito\" viewBox=\"-10 -10 220 220\">\n<g filter=\"url(#pegatina)\">\n  <ellipse cx=\"30\" cy=\"100\" rx=\"27\" ry=\"10\" transform=\"rotate(18 30 100)\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"2\"/><ellipse cx=\"34\" cy=\"101\" rx=\"15\" ry=\"5\" transform=\"rotate(18 34 101)\" fill=\"#F4B6B0\"/>\n  <ellipse cx=\"170\" cy=\"100\" rx=\"27\" ry=\"10\" transform=\"rotate(-18 170 100)\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"2\"/><ellipse cx=\"166\" cy=\"101\" rx=\"15\" ry=\"5\" transform=\"rotate(-18 166 101)\" fill=\"#F4B6B0\"/>\n  <path d=\"M76 56C68 32 52 20 34 24C50 30 58 42 64 60Z\" fill=\"#D7C39A\" stroke=\"#B89F70\" stroke-width=\"2.200\"/>\n  <path d=\"M124 56C132 32 148 20 166 24C150 30 142 42 136 60Z\" fill=\"#D7C39A\" stroke=\"#B89F70\" stroke-width=\"2.200\"/>\n  <path d=\"M60 36L66 40M52 32L58 37M44 28L50 33\" stroke=\"#B89F70\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\".7\"/>\n  <path d=\"M140 36L134 40M148 32L142 37M156 28L150 33\" stroke=\"#B89F70\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\".7\"/>\n  <path d=\"M88 150Q100 198 112 150Z\" fill=\"#E9D9B6\" stroke=\"#B89F70\" stroke-width=\"2\"/>\n  <ellipse cx=\"100\" cy=\"104\" rx=\"50\" ry=\"56\" fill=\"#F3E6CC\" stroke=\"#B89F70\" stroke-width=\"2.500\"/>\n  <path d=\"M91 52Q100 34 109 52Q105 46 100 56Q95 46 91 52Z\" fill=\"#D7C39A\"/>\n  <circle cx=\"64\" cy=\"118\" r=\"8\" fill=\"#F4A6A0\" opacity=\".55\"/><circle cx=\"136\" cy=\"118\" r=\"8\" fill=\"#F4A6A0\" opacity=\".55\"/>\n  <ellipse cx=\"100\" cy=\"134\" rx=\"28\" ry=\"21\" fill=\"#FFF6E4\" stroke=\"#B89F70\" stroke-width=\"2\"/>\n  <ellipse cx=\"91\" cy=\"128\" rx=\"2.800\" ry=\"3.400\" fill=\"#6B4A3A\"/><ellipse cx=\"109\" cy=\"128\" rx=\"2.800\" ry=\"3.400\" fill=\"#6B4A3A\"/>\n  <circle cx=\"72\" cy=\"92\" r=\"14\" fill=\"#F2D55C\" stroke=\"#4A3328\" stroke-width=\"2.500\"/><circle cx=\"128\" cy=\"92\" r=\"14\" fill=\"#F2D55C\" stroke=\"#4A3328\" stroke-width=\"2.500\"/>\n  <ellipse cx=\"72\" cy=\"93\" rx=\"9\" ry=\"3.600\" fill=\"#2B1A12\"/><ellipse cx=\"128\" cy=\"93\" rx=\"9\" ry=\"3.600\" fill=\"#2B1A12\"/>\n  <circle cx=\"68\" cy=\"88.500\" r=\"2.200\" fill=\"#fff\"/><circle cx=\"124\" cy=\"88.500\" r=\"2.200\" fill=\"#fff\"/>\n  <path d=\"M56 74L87 80\" stroke=\"#4A3328\" stroke-width=\"4.500\" stroke-linecap=\"round\"/><path d=\"M144 74L113 80\" stroke=\"#4A3328\" stroke-width=\"4.500\" stroke-linecap=\"round\"/>\n  <path d=\"M84 143Q100 155 116 143\" stroke=\"#5A3A2A\" stroke-width=\"3.500\" fill=\"none\" stroke-linecap=\"round\"/>\n  <g>\n    <path d=\"M91 148Q90 184 100 186Q110 184 109 148Z\" fill=\"#F0658A\" stroke=\"#C23F67\" stroke-width=\"2\"/>\n    <path d=\"M100 152V174\" stroke=\"#C23F67\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n    <animateTransform attributeName=\"transform\" type=\"rotate\" values=\"-9 100 148;9 100 148;-9 100 148\" dur=\"0.6s\" repeatCount=\"indefinite\"/>\n  </g>\n</g></symbol></defs></svg>";
  const FRASES = {
    enh: [['¡Enhorabuena, campeón!',0],['¡Qué partidazo!',1],['¡Buen birdie!',2],['¡Ánimo, la próxima sale!',3]],
    bro: [['Hoy te veo fino… de lejos',4],['El palo no tiene la culpa',5],['Eso fue el viento, seguro',6],['Lo mío es la cerveza, no el golf',7]],
    pag: [['Hoy paga la ronda',8],['Hoy pago yo',9],['Paga el último',10],['Invito a la primera',11]]
  };
  const TEXTO = {}; Object.keys(FRASES).forEach(k => FRASES[k].forEach(f => TEXTO[f[1]] = f[0])); TEXTO[12] = 'Hoy me hacen el chivito';
  const EMOJIS = ['★','😂','🔥','👏','🍺'];
  const COLORES = ['#3FA34D','#E04646','#3B82F6','#E8A317','#8E5BD6','#14A8A8','#D9558F'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hora = iso => { try { return new Date(iso).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); } catch(e){ return ''; } };
  const color = n => { let h = 0; for(const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORES[h % COLORES.length]; };
  const cliente = () => (typeof initSupabase === 'function') ? initSupabase() : null;

  let el = null, code = '', timer = null, ultimo = 0, yo = '', tab = 'enh', reacc = {}, pintados = {}, quedanFotos = 0, ocupado = false, tostada = null;

  function raiz(){
    if(!document.getElementById('h19Defs')) document.body.insertAdjacentHTML('beforeend', DEFS);
    el = document.createElement('div'); el.id = 'h19Hilo'; el.className = 'h19h'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="h19h-cab"><button type="button" class="h19h-volver" id="h19Volver">‹ Volver al inicio</button>'
      + '<h1 class="h19h-titulo">El hoyo 19</h1><p class="h19h-sub" id="h19Sub"></p></div>'
      + '<div class="h19h-borra" id="h19Borra"></div>'
      + '<div class="h19h-hilo" id="h19Lista" aria-live="polite"></div>'
      + '<div class="h19h-barra"><div class="h19h-tabs" id="h19Tabs">'
      + '<button type="button" class="on" data-t="enh">Enhorabuena</button><button type="button" data-t="bro">Bromas</button><button type="button" data-t="pag">Quién paga</button></div>'
      + '<div class="h19h-frases" id="h19Frases"></div>'
      + '<div class="h19h-esc"><input id="h19Txt" maxlength="80" placeholder="Escribe una frase…" autocomplete="off" enterkeyhint="send"><button type="button" id="h19Env">Enviar</button></div>'
      + '<div class="h19h-cont" id="h19Cont">0 de 80 letras</div>'
      + '<div class="h19h-acc"><button type="button" id="h19Foto"><span id="h19FotoN">Foto</span></button><button type="button" id="h19Conf">Confeti</button><button type="button" id="h19Chiv" class="bloq"><svg viewBox="0 0 100 100"><use href="#s12"/></svg>Chivito</button></div></div>'
      + '<div class="h19h-toast" id="h19Toast"></div>';
    document.body.appendChild(el);
    el.querySelector('#h19Volver').onclick = cerrar;
    el.querySelector('#h19Tabs').onclick = e => { const t = e.target.dataset && e.target.dataset.t; if(!t) return; tab = t; el.querySelectorAll('#h19Tabs button').forEach(b => b.classList.toggle('on', b === e.target)); frases(); };
    const txt = el.querySelector('#h19Txt');
    txt.oninput = () => { const n = txt.value.length, c = el.querySelector('#h19Cont'); c.textContent = n + ' de 80 letras'; c.classList.toggle('max', n >= 80); };
    txt.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); enviarTexto(); } };
    el.querySelector('#h19Env').onclick = enviarTexto;
    el.querySelector('#h19Conf').onclick = () => enviar('confeti');
    el.querySelector('#h19Foto').onclick = () => aviso('La foto con marco llega en el siguiente paso');
    el.querySelector('#h19Chiv').onclick = () => aviso('El chivito lo manda solo el ganador (muy pronto)');
    el.querySelector('#h19Lista').onclick = clicLista;
    frases();
  }

  function aviso(t){
    const e = el && el.querySelector('#h19Toast'); if(!e) return;
    e.textContent = t; e.classList.add('on'); clearTimeout(tostada); tostada = setTimeout(() => e.classList.remove('on'), 2400);
  }
  function frases(){
    const c = el.querySelector('#h19Frases'); c.innerHTML = '';
    FRASES[tab].forEach(f => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'h19h-frase';
      b.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#s' + f[1] + '"/></svg>' + esc(f[0]);
      b.onclick = () => enviar('frase', f[1]); c.appendChild(b);
    });
  }
  function av(n){ return '<span class="h19h-av" style="--c:' + color(n) + '">' + esc(String(n || '?').trim().charAt(0).toUpperCase()) + '</span>'; }

  function reacciones(id){
    const r = reacc[id] || {};
    let h = '<div class="h19h-reac">';
    EMOJIS.forEach(e => { const x = r[e]; if(x && x.n) h += '<button type="button" class="' + (x.mia ? 'mia' : '') + '" data-r="' + id + '" data-e="' + e + '">' + e + ' ' + x.n + '</button>'; });
    return h + '<button type="button" class="mas" data-mas="' + id + '" aria-label="Reaccionar">☺+</button></div>';
  }
  function burbuja(m){
    const d = document.createElement('div'); d.dataset.id = m.id;
    const nombre = esc(m.jugador) + ' · ' + hora(m.creado_en);
    if(m.tipo === 'confeti'){ d.className = 'h19h-sis'; d.textContent = m.jugador + ' lanzó confeti'; return d; }
    if(m.tipo === 'frase' || m.tipo === 'chivito'){
      const s = m.tipo === 'chivito' ? 12 : m.frase_n;
      d.className = 'h19h-peg' + (m.mio ? ' yo' : '');
      d.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#s' + s + '"/></svg><div class="h19h-cuerpo"><span class="h19h-quien">' + nombre + '</span>' + esc(TEXTO[s] || '') + '<div data-reac="' + m.id + '"></div></div>';
      return d;
    }
    d.className = 'h19h-b' + (m.mio ? ' yo' : '');
    d.innerHTML = (m.mio ? '' : av(m.jugador)) + '<div class="h19h-cuerpo"><span class="h19h-quien">' + nombre + '</span>' + (m.tipo === 'texto' ? esc(m.texto) : 'Foto') + '<div data-reac="' + m.id + '"></div></div>';
    return d;
  }
  function pintarReac(){
    el.querySelectorAll('[data-reac]').forEach(c => { c.innerHTML = reacciones(c.dataset.reac); });
  }

  async function leer(desdeCero){
    const cl = cliente(); if(!cl || !code || ocupado) return;
    ocupado = true;
    try {
      const r = await cl.rpc('hoyo19_leer', { p_code: code, p_desde: desdeCero ? 0 : ultimo });
      if(r.error) throw r.error;
      const d = r.data || {}; yo = d.yo || yo;
      reacc = {}; (d.reacciones || []).forEach(x => { (reacc[x.mensaje_id] = reacc[x.mensaje_id] || {})[x.emoji] = { n: x.n, mia: x.mia }; });
      const lista = el.querySelector('#h19Lista'), pegado = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
      (d.mensajes || []).forEach(m => {
        if(pintados[m.id]) return; pintados[m.id] = 1; ultimo = Math.max(ultimo, m.id);
        lista.appendChild(burbuja(m));
        if(m.tipo === 'confeti' && Date.now() - Date.parse(m.creado_en) < 15000) confeti();
      });
      pintarReac();
      quedanFotos = d.fotos_quedan || 0; el.querySelector('#h19FotoN').textContent = 'Foto (' + quedanFotos + ')';
      el.querySelector('#h19Vacio') && (lista.children.length > 1 ? el.querySelector('#h19Vacio').remove() : 0);
      if(pegado || desdeCero) lista.scrollTop = lista.scrollHeight;
    } catch(e){
      aviso(String(e && e.message || 'No se pudo cargar el hilo'));
      if(/borrado|No eres|No existe/.test(String(e && e.message))) { clearInterval(timer); }
    }
    ocupado = false;
  }

  async function enviar(tipo, frase, texto){
    const cl = cliente(); if(!cl) return false;
    try {
      const r = await cl.rpc('hoyo19_enviar', { p_code: code, p_tipo: tipo, p_frase: frase == null ? null : frase, p_texto: texto || null, p_foto: null });
      if(r.error) throw r.error;
      await leer(false); return true;
    } catch(e){ aviso(String(e && e.message || 'No se pudo enviar')); return false; }
  }
  async function enviarTexto(){
    const t = el.querySelector('#h19Txt'), v = t.value.trim(); if(!v) return;
    if(await enviar('texto', null, v)){ t.value = ''; t.oninput(); }
  }
  async function clicLista(e){
    const b = e.target.closest('button'); if(!b) return;
    const cl = cliente();
    if(b.dataset.mas){
      const c = b.parentNode, ya = c.querySelector('.pick'); if(ya){ ya.remove(); return; }
      const p = document.createElement('span'); p.className = 'pick';
      EMOJIS.forEach(x => { const q = document.createElement('button'); q.type = 'button'; q.dataset.r = b.dataset.mas; q.dataset.e = x; q.textContent = x; p.appendChild(q); });
      c.appendChild(p); return;
    }
    if(b.dataset.r && cl){
      try { const r = await cl.rpc('hoyo19_reaccionar', { p_mensaje: Number(b.dataset.r), p_emoji: b.dataset.e }); if(r.error) throw r.error; await leer(false); }
      catch(err){ aviso(String(err && err.message || 'No se pudo')); }
    }
  }

  function confeti(){
    const c = document.createElement('div'); c.className = 'h19h-confeti'; const cols = ['#C6F24E','#F7C948','#F2F4F5','#E04646','#3B82F6'];
    for(let i = 0; i < 40; i++){ const s = document.createElement('i'); s.style.cssText = 'left:' + (Math.random() * 100) + '%;background:' + cols[i % 5] + ';animation-delay:' + (Math.random() * .6) + 's;animation-duration:' + (1.6 + Math.random()) + 's'; c.appendChild(s); }
    el.appendChild(c); setTimeout(() => c.remove(), 3200);
  }

  function abrir(codigo, partida){
    if(el) return;
    code = codigo; ultimo = 0; pintados = {}; reacc = {};
    raiz();
    const donde = [partida && partida.round_name, partida && partida.course_name].filter(Boolean).join(' · ');
    el.querySelector('#h19Sub').textContent = donde;
    const borra = new Date((partida && partida.updated_at ? Date.parse(partida.updated_at) : Date.now()) + 5 * 864e5);
    el.querySelector('#h19Borra').textContent = 'Se borra el ' + borra.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    el.querySelector('#h19Lista').innerHTML = '<div class="h19h-sep" id="h19Vacio">Aquí empieza el hoyo 19. ¡Brinda con tu grupo!</div>';
    document.documentElement.classList.add('h19h-abierto');
    leer(true);
    timer = setInterval(() => { if(document.visibilityState === 'visible') leer(false); }, REFRESCO);
  }
  function cerrar(){
    clearInterval(timer); timer = null;
    if(el){ el.remove(); el = null; }
    document.documentElement.classList.remove('h19h-abierto');
  }
  window.acgolfHilo19 = { abrir, cerrar };
})();
