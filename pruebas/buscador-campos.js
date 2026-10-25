/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Buscador de campos de golf + Campos favoritos ---
// Buscar por nombre o ciudad (GolfCourseAPI, a través de la función «campos» del servidor)
// o cerca de un punto (mi ubicación o coordenadas escritas) con un radio a elegir.
// Cada campo enseña ubicación, distancia, Course Rating y Slope (55-155; 113 es lo normal),
// con filtro por slope y por barras de caballeros o damas.
// Favoritos: como mucho 5, guardados en el propio móvil (se ven sin conexión).
(function(){
  'use strict';

  // ---------- Ajustes ----------
  const CLAVE_FAV = 'acgolf.camposFavoritos.v1';
  const MAX_FAV = 5;
  const SLOPE_MIN = 55, SLOPE_MAX = 155, SLOPE_NORMAL = 113;
  const RADIOS = [5, 10, 25, 50, 100, 200];
  const ATAJOS = [
    { id:'todos',   txt:'Todos',             min:SLOPE_MIN, max:SLOPE_MAX },
    { id:'faciles', txt:'Fáciles (<110)',    min:SLOPE_MIN, max:109 },
    { id:'medios',  txt:'Normales (110-125)', min:110,      max:125 },
    { id:'dificil', txt:'Difíciles (>125)',  min:126,       max:SLOPE_MAX },
  ];
  const PARES = [70, 71, 72, 73];
  const HOYOS = [9, 18];
  // Campos de la provincia de Cádiz (campos-cadiz.js): van en la app, sin gastar consultas
  const camposCadiz = () => (Array.isArray(window.CAMPOS_CADIZ) ? window.CAMPOS_CADIZ : []);
  const municipiosCadiz = () => [...new Set(camposCadiz().map(c => c.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  // Coordenadas de los campos propios de acgolf (las mismas que usa el tiempo de la app)
  const COORDS_ACGOLF = { 'hato-verde':[37.565, -6.035], 'zaudin':[37.378, -6.045], 'la-penaza':[41.701, -1.056] };

  // ---------- Utilidades ----------
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sinAcentos = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const coma = (n, dec) => n == null || !isFinite(n) ? '—' : Number(n).toFixed(dec).replace('.', ',');
  const $ = id => document.getElementById(id);
  const numero = v => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v); return isFinite(n) ? n : null; };

  function distanciaKm(a, b){
    if(!a || !b || a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null;
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const textoDistancia = km => km == null ? null : km < 1 ? 'a menos de 1 km' : 'a ' + (km < 10 ? coma(km, 1) : Math.round(km)) + ' km';

  const esOrientativo = c => !!(c && (c.orientativo || (Array.isArray(c.barras) && c.barras.some(b => b && b.orientativo))));
  function barrasDe(campo, genero){
    return (Array.isArray(campo && campo.barras) ? campo.barras : []).filter(b => b && b.genero === genero);
  }
  // Pasa el filtro si alguna barra del género elegido tiene el slope dentro del rango.
  // Sin filtro («Todos») pasan también los campos que no tienen slope.
  function pasaFiltro(campo, genero, min, max){
    if(min <= SLOPE_MIN && max >= SLOPE_MAX) return true;
    return barrasDe(campo, genero).some(b => b.slope != null && b.slope >= min && b.slope <= max);
  }
  // Hoyos del campo (Vista Hermosa es de 9 aunque su tarjeta sea de dos vueltas)
  function hoyosDe(campo){
    if(campo && campo.hoyos) return Number(campo.hoyos);
    const hs = (Array.isArray(campo && campo.barras) ? campo.barras : []).map(b => Number(b.hoyos)).filter(n => n > 0);
    return hs.length ? Math.max(...hs) : null;
  }
  function paresDe(campo){
    if(campo && campo.par) return [Number(campo.par)];   // el par del campo (no el de una barra suelta)
    const ps = (Array.isArray(campo && campo.barras) ? campo.barras : []).map(b => Number(b.par)).filter(n => n > 0);
    if(campo && campo.par) ps.push(Number(campo.par));
    return ps;
  }
  function pasaTodo(campo){
    if(!pasaFiltro(campo, st.genero, st.min, st.max)) return false;
    if(st.par && !paresDe(campo).includes(st.par)) return false;
    if(st.hoyos && hoyosDe(campo) !== st.hoyos) return false;
    if(st.modo === 'cadiz' && st.municipio && campo.municipio !== st.municipio) return false;
    return true;
  }
  // Los filtros se quedan abiertos mientras se usan (aunque se vuelva a «Todos»)
  const hayFiltros = () => st.detAbierto || st.min !== SLOPE_MIN || st.max !== SLOPE_MAX || st.genero !== 'm' || st.par || st.hoyos;
  // Rango de rating y slope de las barras que cuentan (las del filtro, o todas las del género)
  function resumen(campo, genero, min, max){
    let bs = barrasDe(campo, genero).filter(b => b.slope != null || b.rating != null);
    const conFiltro = !(min <= SLOPE_MIN && max >= SLOPE_MAX);
    if(conFiltro) bs = bs.filter(b => b.slope != null && b.slope >= min && b.slope <= max);
    const s = bs.map(b => b.slope).filter(v => v != null), r = bs.map(b => b.rating).filter(v => v != null);
    const rango = (arr, dec) => !arr.length ? null : Math.min(...arr) === Math.max(...arr) ? coma(arr[0], dec) : coma(Math.min(...arr), dec) + ' – ' + coma(Math.max(...arr), dec);
    return { slope: rango(s, 0), rating: rango(r, 1), slopeMedio: s.length ? s.reduce((a, b) => a + b, 0) / s.length : null, barras: bs.length };
  }
  function nivel(slope){
    if(slope == null) return null;
    if(slope < 110) return { txt:'Más fácil que la media', cls:'facil' };
    if(slope <= 125) return { txt:'Dificultad normal', cls:'normal' };
    return { txt:'Más difícil que la media', cls:'dificil' };
  }
  const ubicacion = c => [c.ciudad, c.region, c.pais].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

  // ---------- Favoritos (en el móvil) ----------
  let favMemoria = [];   // por si el navegador no deja guardar (modo privado)
  const valido = f => f && typeof f.id === 'string' && f.id && typeof f.nombre === 'string';
  const copiaCampo = c => ({
    id: c.id, fuente: c.fuente || null, nombre: c.nombre, club: c.club || null,
    ciudad: c.ciudad || null, region: c.region || null, pais: c.pais || null,
    lat: c.lat == null ? null : Number(c.lat), lon: c.lon == null ? null : Number(c.lon),
    barras: Array.isArray(c.barras) ? c.barras.slice(0, 40) : [],
    guardado_en: new Date().toISOString(),
  });
  const Favoritos = {
    MAX: MAX_FAV,
    leer(){
      try {
        const raw = localStorage.getItem(CLAVE_FAV);
        if(raw == null) return favMemoria.slice();
        const lista = JSON.parse(raw);
        return Array.isArray(lista) ? lista.filter(valido).slice(0, MAX_FAV) : [];
      } catch(e){ return favMemoria.slice(); }
    },
    guardar(lista){
      favMemoria = lista.slice(0, MAX_FAV);
      try { localStorage.setItem(CLAVE_FAV, JSON.stringify(favMemoria)); return true; } catch(e){ return false; }
    },
    es(id){ return this.leer().some(f => f.id === id); },
    // Devuelve { ok:true } o { ok:false, motivo:'limite' } si ya hay 5
    anadir(campo){
      if(!valido(campo)) return { ok:false, motivo:'datos' };
      const lista = this.leer();
      if(lista.some(f => f.id === campo.id)) return { ok:true, ya:true };
      if(lista.length >= MAX_FAV) return { ok:false, motivo:'limite' };
      lista.push(copiaCampo(campo));
      return { ok:true, guardado: this.guardar(lista) };
    },
    reemplazar(idViejo, campo){
      if(!valido(campo)) return { ok:false, motivo:'datos' };
      const lista = this.leer();
      const i = lista.findIndex(f => f.id === idViejo);
      if(i < 0) return { ok:false, motivo:'no-esta' };
      if(lista.some(f => f.id === campo.id)) return { ok:true, ya:true };
      lista[i] = copiaCampo(campo);
      return { ok:true, guardado: this.guardar(lista) };
    },
    quitar(id){
      const lista = this.leer();
      const i = lista.findIndex(f => f.id === id);
      if(i < 0) return null;
      const [quitado] = lista.splice(i, 1);
      this.guardar(lista);
      return { campo: quitado, pos: i };
    },
    devolver(quitado){   // «Deshacer» después de quitar
      if(!quitado) return false;
      const lista = this.leer();
      if(lista.length >= MAX_FAV || lista.some(f => f.id === quitado.campo.id)) return false;
      lista.splice(Math.min(quitado.pos, lista.length), 0, quitado.campo);
      return this.guardar(lista);
    },
  };

  // ---------- Campos propios de acgolf (datos oficiales de la app) ----------
  function camposAcgolf(){
    let lista = [];
    try { if(typeof COURSES !== 'undefined' && Array.isArray(COURSES)) lista = COURSES; } catch(e){}
    return lista.filter(c => !c.externo && !c.nueve).map(c => {
      const barras = c.tees ? Object.keys(c.tees).map(k => ({
        genero:'m', nombre: k.charAt(0).toUpperCase() + k.slice(1),
        rating: numero(c.tees[k].rating), slope: numero(c.tees[k].slope),
        par: Array.isArray(c.par) ? c.par.reduce((a, b) => a + b, 0) : null,
        hoyos: Array.isArray(c.par) ? c.par.length : null, metros: null,
      })) : [];
      const co = COORDS_ACGOLF[c.id];
      return { id: 'acgolf:' + c.id, fuente:'acgolf', nombre: c.name, club: null, ciudad: c.location || null,
               region: null, pais: 'España', lat: co ? co[0] : null, lon: co ? co[1] : null, barras };
    });
  }

  // ---------- Pasar un campo del buscador a la lista de campos de la app (para poder jugarlo) ----------
  // Hace falta el par y la dificultad de cada hoyo. Las barras se reconocen por su color.
  const COLORES = { blancas:['blanca','blancas','white'], amarillas:['amarilla','amarillas','yellow'], azules:['azul','azules','blue'], rojas:['roja','rojas','red'] };
  const colorDe = nombre => { const t = sinAcentos(nombre); return Object.keys(COLORES).find(k => COLORES[k].some(w => t.split(/[^a-z]+/).includes(w))) || null; };
  const parValido = a => Array.isArray(a) && (a.length === 9 || a.length === 18) && a.every(p => Number.isInteger(+p) && +p >= 3 && +p <= 6);
  const hcpValido = (a, n) => Array.isArray(a) && a.length === n && new Set(a.map(Number)).size === n && a.every(x => Number.isInteger(+x) && +x >= 1 && +x <= 18);
  function listaCursos(){ try { if(typeof COURSES !== 'undefined' && Array.isArray(COURSES)) return COURSES; } catch(e){} return null; }
  function aCursoApp(c){
    const lista = listaCursos(); if(!lista || !c) return null;
    if(c.fuente === 'acgolf') return lista.find(x => 'acgolf:' + x.id === c.id) || null;
    const id = 'gca-' + String(c.id).replace(/^gca:/, '').replace(/[^0-9a-z-]/gi, '');
    const ya = lista.find(x => x.id === id); if(ya) return ya;
    const bs = Array.isArray(c.barras) ? c.barras : [];
    const base = bs.find(b => b.genero === 'm' && parValido(b.par_hoyos) && hcpValido(b.hcp_hoyos, b.par_hoyos.length))
              || bs.find(b => parValido(b.par_hoyos) && hcpValido(b.hcp_hoyos, b.par_hoyos.length));
    if(!base) return null;
    const tees = {};
    // Como en el resto de la app: blancas y amarillas con valores de caballeros; azules y rojas, de damas (si el campo los tiene)
    const DAMAS = ['azules', 'rojas'];
    ['f', 'm'].forEach(g => barrasDe(c, g).forEach(b => {
      const k = colorDe(b.nombre);
      if(!k || b.rating == null || b.slope == null) return;
      if(g === 'f' && !DAMAS.includes(k)) return;   // 1.ª pasada: solo azules y rojas de damas
      if(!tees[k]) tees[k] = { rating: Number(b.rating), slope: Number(b.slope) };
    }));
    const curso = { id, name: c.nombre, location: ubicacion(c) || '', par: base.par_hoyos.map(Number), hcp: base.hcp_hoyos.map(Number), externo: true };
    if(curso.par.length === 9){ curso.holes9 = true; if(typeof hcpNueveA18 === 'function') curso.hcp = hcpNueveA18(curso.hcp); } // 9 hoyos: se juegan dos vueltas
    if(Object.keys(tees).length) curso.tees = tees;
    lista.push(curso);
    return curso;
  }
  function jugarAqui(id){
    const c = buscarCampo(id); if(!c || !st.alElegir) return;
    const curso = aCursoApp(c);
    if(!curso){ aviso('Este campo no trae el par y la dificultad de cada hoyo. Mándame su tarjeta y lo añado a acgolf.'); return; }
    const avisar = st.alElegir;
    cerrar();
    avisar(curso);
  }

  // ---------- Servidor ----------
  async function mensajeDeError(error){
    try { if(error && error.context && typeof error.context.json === 'function'){ const j = await error.context.json(); if(j && j.error) return j.error; } } catch(e){}
    if(!navigator.onLine) return 'No hay conexión a internet.';
    return 'No se pudo buscar. Revisa la conexión e inténtalo otra vez.';
  }
  async function buscarTexto(texto){
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) throw new Error('No se puede conectar con la base de datos.');
    const { data, error } = await client.functions.invoke('campos', { body: { texto } });
    if(error) throw new Error(await mensajeDeError(error));
    if(!data || !Array.isArray(data.campos)) throw new Error('La respuesta del servidor no es válida.');
    return { campos: data.campos, aviso: data.aviso || null };
  }
  async function buscarCerca(punto, radio){
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) throw new Error('No se puede conectar con la base de datos.');
    const { data, error } = await client.rpc('campos_cerca', { p_lat: punto.lat, p_lon: punto.lon, p_radio_km: radio, p_limite: 40 });
    if(error) throw new Error(await mensajeDeError(error));
    return Array.isArray(data) ? data : [];
  }

  // ---------- Estado de la pantalla ----------
  const st = {
    pestana: 'buscar', modo: 'texto', texto: '', lat: '', lon: '', radio: 25,
    genero: 'm', min: SLOPE_MIN, max: SLOPE_MAX,
    par: 0, hoyos: 0,       // 0 = todos
    municipio: '',          // solo en «Provincia de Cádiz»
    punto: null,            // { lat, lon, origen:'gps'|'manual' } para calcular distancias
    fase: 'inicio',         // inicio · cargando · error · listo
    error: '', aviso: '', resultados: [], ficha: null, pidiendo: 0, ultimoQuitado: null,
    alElegir: null,         // si viene de «Crear partida»: a quién avisar del campo elegido
  };

  function ov(){
    let o = $('bcOv');
    if(o) return o;
    o = document.createElement('div');
    o.id = 'bcOv'; o.className = 'bc-ov'; o.hidden = true;
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Campos de golf');
    o.innerHTML = '<button type="button" class="home-volver pantalla-volver" id="bcCerrar">‹ Volver al inicio</button>'
      + '<div class="bc-caja"><div id="bcBody"></div></div><div id="bcCapa"></div>';
    document.body.appendChild(o);
    o.addEventListener('click', alPulsar);
    o.addEventListener('change', alCambiar);
    o.addEventListener('submit', e => { e.preventDefault(); if(e.target.id === 'bcForm') buscar(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && !o.hidden){ if(st.ficha || $('bcCapa').innerHTML) cerrarCapa(); else cerrar(); } });
    return o;
  }

  function abrir(pestana, alElegir){
    const o = ov();
    st.alElegir = typeof alElegir === 'function' ? alElegir : null;
    st.pestana = pestana || (Favoritos.leer().length ? 'favoritos' : 'buscar');
    o.hidden = false;
    document.documentElement.classList.add('bc-abierto');
    pintar();
    o.scrollTop = 0;
  }
  function cerrar(){
    const o = $('bcOv'); if(!o) return;
    cerrarCapa();
    o.hidden = true;
    st.alElegir = null;
    document.documentElement.classList.remove('bc-abierto');
    ponerBoton();
  }
  // Abre el buscador para elegir dónde jugar (desde «Crear partida»)
  function elegir(alElegir, pestana){ abrir(pestana || (Favoritos.leer().length ? 'favoritos' : 'buscar'), alElegir); }

  // ---------- Pintar ----------
  function pintar(){
    const body = $('bcBody'); if(!body) return;
    const nFav = Favoritos.leer().length;
    const cerrarBtn = $('bcCerrar'); if(cerrarBtn) cerrarBtn.textContent = st.alElegir ? '‹ Volver a crear partida' : '‹ Volver al inicio';
    let h = '<h2 class="bc-titulo">' + (st.alElegir ? 'Elige dónde jugáis' : 'Campos de golf') + '</h2>'
      + '<div class="bc-pestanas" role="tablist">'
      + '<button type="button" role="tab" class="bc-pest' + (st.pestana === 'buscar' ? ' on' : '') + '" aria-selected="' + (st.pestana === 'buscar') + '" data-pest="buscar">Buscar</button>'
      + '<button type="button" role="tab" class="bc-pest' + (st.pestana === 'favoritos' ? ' on' : '') + '" aria-selected="' + (st.pestana === 'favoritos') + '" data-pest="favoritos">Favoritos <b>' + nFav + '/' + MAX_FAV + '</b></button>'
      + '</div>';
    if(st.pestana === 'foto'){ body.innerHTML = pintarFoto(); return; }
    h += st.pestana === 'buscar' ? pintarBuscar() : pintarFavoritos();
    body.innerHTML = h;
  }

  function pintarFiltros(){
    const atajo = ATAJOS.find(a => a.min === st.min && a.max === st.max);
    let h = '<div class="bc-filtros"><div class="bc-fila-lbl">Barras de salida</div>'
      + '<div class="bc-seg">'
      + '<button type="button" class="' + (st.genero === 'm' ? 'on' : '') + '" data-genero="m" aria-pressed="' + (st.genero === 'm') + '">Caballeros</button>'
      + '<button type="button" class="' + (st.genero === 'f' ? 'on' : '') + '" data-genero="f" aria-pressed="' + (st.genero === 'f') + '">Damas</button></div>'
      + '<div class="bc-fila-lbl">Dificultad (slope)</div><div class="bc-chips">';
    ATAJOS.forEach(a => { h += '<button type="button" class="bc-chip' + (atajo && atajo.id === a.id ? ' on' : '') + '" data-atajo="' + a.id + '">' + esc(a.txt) + '</button>'; });
    h += '</div><div class="bc-rango"><label>Desde <select id="bcMin">' + opcionesSlope(st.min) + '</select></label>'
      + '<label>Hasta <select id="bcMax">' + opcionesSlope(st.max) + '</select></label></div>'
      + '<p class="bc-nota">El slope va de 55 a 155. Un campo normal tiene 113: cuanto más alto, más difícil para el jugador aficionado.</p>'
      + '<div class="bc-fila-lbl">Par</div><div class="bc-chips">'
      + [0].concat(PARES).map(p => '<button type="button" class="bc-chip' + (st.par === p ? ' on' : '') + '" data-par="' + p + '">' + (p ? 'Par ' + p : 'Todos') + '</button>').join('') + '</div>'
      + '<div class="bc-fila-lbl">Hoyos</div><div class="bc-chips">'
      + [0].concat(HOYOS).map(n => '<button type="button" class="bc-chip' + (st.hoyos === n ? ' on' : '') + '" data-hoyos="' + n + '">' + (n ? n + ' hoyos' : 'Todos') + '</button>').join('') + '</div></div>';
    return h;
  }
  function opcionesSlope(sel){
    let o = '';
    for(let v = SLOPE_MIN; v <= SLOPE_MAX; v += (v < 105 || v >= 135 ? 5 : 1)){
      o += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + v + '</option>';
    }
    return o;
  }

  function pintarBuscar(){
    let h = '<button type="button" class="bc-foto-btn" data-accion="foto">' + ICO.camara + '<span><b>' + (st.alElegir ? 'Pega tu foto de la tarjeta y a jugar' : 'Añade un campo con la foto de su tarjeta') + '</b><small>¿No encuentras el campo? Haz una foto a su tarjeta y la app la lee.</small></span></button>'
      + '<div class="bc-seg bc-modo">'
      + '<button type="button" class="' + (st.modo === 'texto' ? 'on' : '') + '" data-modo="texto" aria-pressed="' + (st.modo === 'texto') + '">Nombre o ciudad</button>'
      + '<button type="button" class="' + (st.modo === 'cerca' ? 'on' : '') + '" data-modo="cerca" aria-pressed="' + (st.modo === 'cerca') + '">Cerca de un sitio</button></div>';
    // (Los campos de Cádiz salen al buscar por nombre o ciudad y en «Cerca de un sitio»; ya no hay botón propio)
    if(st.modo === 'cadiz'){
      h += '<label class="bc-lbl" for="bcMun">Municipio</label><select id="bcMun" class="bc-input"><option value="">Todos los municipios</option>'
        + municipiosCadiz().map(m => '<option' + (m === st.municipio ? ' selected' : '') + '>' + esc(m) + '</option>').join('') + '</select>';
      h += '<details class="bc-det"' + (hayFiltros() ? ' open' : '') + '><summary>Filtros' + resumenFiltro() + '</summary>' + pintarFiltros() + '</details>';
      h += '<div id="bcResultados" aria-live="polite">' + pintarResultados() + '</div>';
      return h;
    }
    h += '<form id="bcForm" class="bc-form" novalidate>';
    if(st.modo === 'texto'){
      h += '<label class="bc-lbl" for="bcTexto">Escribe el nombre del campo</label>'
        + '<input id="bcTexto" class="bc-input" type="search" inputmode="search" autocomplete="off" maxlength="60" placeholder="Ej.: Valderrama, Guadalmina, Zaudín" value="' + esc(st.texto) + '">';
    } else {
      const p = st.punto;
      h += '<button type="button" class="bc-btn sec" data-accion="gps">' + ICO.diana + '<span>' + (p && p.origen === 'gps' ? 'Ubicación lista · volver a localizar' : 'Usar mi ubicación') + '</span></button>'
        + '<p class="bc-o">o escribe las coordenadas</p>'
        + '<div class="bc-coords"><label>Latitud<input id="bcLat" class="bc-input" inputmode="decimal" placeholder="37,378" value="' + esc(st.lat) + '"></label>'
        + '<label>Longitud<input id="bcLon" class="bc-input" inputmode="decimal" placeholder="-6,045" value="' + esc(st.lon) + '"></label></div>'
        + '<label class="bc-lbl" for="bcRadio">Hasta qué distancia</label><select id="bcRadio" class="bc-input">'
        + RADIOS.map(r => '<option value="' + r + '"' + (r === st.radio ? ' selected' : '') + '>' + r + ' km</option>').join('') + '</select>';
    }
    h += '<button type="submit" class="bc-btn" ' + (st.fase === 'cargando' ? 'disabled' : '') + '>' + ICO.lupa + '<span>' + (st.fase === 'cargando' ? 'Buscando…' : 'Buscar campos') + '</span></button></form>';
    h += '<details class="bc-det"' + (hayFiltros() ? ' open' : '') + '><summary>Filtros' + resumenFiltro() + '</summary>' + pintarFiltros() + '</details>';
    h += '<div id="bcResultados" aria-live="polite">' + pintarResultados() + '</div>';
    return h;
  }
  function resumenFiltro(){
    const partes = [st.genero === 'f' ? 'Damas' : 'Caballeros'];
    if(st.min !== SLOPE_MIN || st.max !== SLOPE_MAX) partes.push('slope ' + st.min + '–' + st.max);
    if(st.par) partes.push('par ' + st.par);
    if(st.hoyos) partes.push(st.hoyos + ' hoyos');
    return ' <span>· ' + esc(partes.join(' · ')) + '</span>';
  }

  function pintarResultados(){
    if(st.fase === 'inicio') return '<p class="bc-vacio">' + (st.modo === 'texto'
      ? 'Escribe al menos 3 letras y toca «Buscar campos».'
      : 'Toca «Usar mi ubicación» o escribe unas coordenadas, elige la distancia y busca.') + '</p>';
    if(st.fase === 'cargando') return '<div class="bc-cargando"><span class="bc-rueda" aria-hidden="true"></span>Buscando campos…</div>';
    if(st.fase === 'error') return '<div class="bc-error"><p>' + esc(st.error) + '</p><button type="button" class="bc-btn sec" data-accion="reintentar">Intentar otra vez</button></div>';
    const lista = st.resultados.filter(pasaTodo);
    let h = st.aviso ? '<p class="bc-aviso-fijo">' + esc(st.aviso) + '</p>' : '';
    if(!st.resultados.length){
      h += '<p class="bc-vacio">No se ha encontrado ningún campo.' + (st.modo === 'cerca'
        ? ' En «Cerca de un sitio» salen los campos que ya se han buscado alguna vez por nombre o ciudad: prueba a buscar antes la ciudad o la provincia.'
        : ' La búsqueda va por el <b>nombre del campo</b>, no por la ciudad: prueba con una palabra del nombre, por ejemplo «Guadalmina», «Valderrama» o «Montecastillo».') + '</p>';
      return h;
    }
    if(!lista.length) return h + '<p class="bc-vacio">Hay ' + st.resultados.length + ' campos, pero ninguno cumple los filtros. Cambia el municipio, el slope, el par o los hoyos.</p>';
    h += '<p class="bc-cuenta">' + lista.length + (lista.length === 1 ? ' campo' : ' campos') + (lista.length < st.resultados.length ? ' (de ' + st.resultados.length + ')' : '') + '</p>';
    return h + '<div class="bc-lista">' + lista.map(c => tarjeta(c, 'resultado')).join('') + '</div>';
  }

  function pintarFavoritos(){
    const favs = Favoritos.leer();
    if(!favs.length) return '<p class="bc-vacio">Aún no tienes campos favoritos. Busca un campo y toca la estrella <b>«Favorito»</b> para tenerlo siempre aquí, también sin conexión.</p>'
      + '<button type="button" class="bc-btn" data-pest="buscar">' + ICO.lupa + '<span>Buscar campos</span></button>';
    return '<p class="bc-cuenta">Tienes ' + favs.length + ' de ' + MAX_FAV + ' campos favoritos.</p>'
      + '<div class="bc-lista">' + favs.map(c => tarjeta(c, 'favorito')).join('') + '</div>'
      + (favs.length >= MAX_FAV ? '<p class="bc-nota">Has llegado al máximo de ' + MAX_FAV + '. Para añadir otro, quita uno o cámbialo al marcar el nuevo.</p>' : '');
  }

  function tarjeta(c, donde){
    const r = resumen(c, st.genero, donde === 'favorito' ? SLOPE_MIN : st.min, donde === 'favorito' ? SLOPE_MAX : st.max);
    const dist = textoDistancia(c.distancia_km != null ? Number(c.distancia_km) : distanciaKm(st.punto, c));
    const nv = nivel(r.slopeMedio);
    const fav = Favoritos.es(c.id);
    const ub = ubicacion(c);
    let h = '<article class="bc-tarjeta" data-id="' + esc(c.id) + '">'
      + '<button type="button" class="bc-tarjeta-cuerpo" data-ficha="' + esc(c.id) + '" aria-label="Ver ficha de ' + esc(c.nombre) + '">'
      + '<span class="bc-nombre">' + esc(c.nombre) + '</span>'
      + (ub || dist ? '<span class="bc-ubic">' + ICO.pin + esc([ub, dist].filter(Boolean).join(' · ')) + '</span>' : '')
      + '<span class="bc-datos">'
      + '<span class="bc-dato"><small>Rating</small><b>' + esc(r.rating || '—') + '</b></span>'
      + '<span class="bc-dato"><small>Slope</small><b>' + esc(r.slope || '—') + '</b></span>'
      + (c.par ? '<span class="bc-dato"><small>Par</small><b>' + esc(c.par) + '</b></span>' : '')
      + (hoyosDe(c) === 9 ? '<span class="bc-dato"><small>Hoyos</small><b>9</b></span>' : '')
      + (nv ? '<span class="bc-nivel ' + nv.cls + '">' + esc(nv.txt) + '</span>' : '<span class="bc-nivel sin">Sin datos de ' + (st.genero === 'f' ? 'damas' : 'caballeros') + '</span>')
      + '</span>'
      + (c.fuente === 'acgolf' ? '<span class="bc-fuente">Datos oficiales de acgolf</span>' : '')
      + (esOrientativo(c) ? '<span class="bc-fuente bc-orient">Datos orientativos: confírmalos con la tarjeta del club</span>' : '')
      + '</button>'
      + (st.alElegir ? '<div class="bc-acciones"><button type="button" class="bc-btn lima" data-jugar="' + esc(c.id) + '">' + ICO.bandera + '<span>Jugar aquí</span></button></div>' : '')
      + '<div class="bc-acciones">';
    if(donde === 'favorito'){
      h += '<button type="button" class="bc-btn sec" data-ficha="' + esc(c.id) + '">Ver ficha</button>'
        + '<button type="button" class="bc-btn quitar" data-quitar="' + esc(c.id) + '">' + ICO.papelera + '<span>Quitar</span></button>';
    } else {
      h += '<button type="button" class="bc-btn fav' + (fav ? ' on' : '') + '" data-fav="' + esc(c.id) + '" aria-pressed="' + fav + '">'
        + (fav ? ICO.estrellaLlena : ICO.estrella) + '<span>' + (fav ? 'En favoritos' : 'Favorito') + '</span></button>';
    }
    return h + '</div></article>';
  }

  // ---------- Ficha de un campo ----------
  function buscarCampo(id){
    return st.resultados.find(c => c.id === id) || Favoritos.leer().find(c => c.id === id) || null;
  }
  function abrirFicha(id){
    const c = buscarCampo(id); if(!c) return;
    st.ficha = id; quitarAviso();
    const dist = textoDistancia(c.distancia_km != null ? Number(c.distancia_km) : distanciaKm(st.punto, c));
    const fav = Favoritos.es(c.id);
    const filas = g => {
      const bs = barrasDe(c, g);
      if(!bs.length) return '<tr><td colspan="5" class="bc-sin">Sin datos</td></tr>';
      return bs.map(b => '<tr><td>' + esc(b.nombre) + '</td><td>' + coma(b.rating, 1) + '</td><td><b>' + (b.slope == null ? '—' : b.slope) + '</b></td><td>' + (b.par == null ? '—' : b.par) + '</td><td>' + (b.metros == null ? '—' : Math.round(b.metros)) + '</td></tr>').join('');
    };
    const tabla = (g, t) => '<h4>' + t + '</h4><div class="bc-tabla-caja"><table class="bc-tabla"><thead><tr><th>Barra</th><th>Rating</th><th>Slope</th><th>Par</th><th>Metros</th></tr></thead><tbody>' + filas(g) + '</tbody></table></div>';
    const mapa = c.lat != null && c.lon != null ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.lat + ',' + c.lon) : null;
    $('bcCapa').innerHTML = '<div class="bc-velo" data-accion="cerrar-capa"></div><div class="bc-ficha" role="dialog" aria-modal="true" aria-labelledby="bcFichaT">'
      + '<h3 id="bcFichaT">' + esc(c.nombre) + '</h3>'
      + '<p class="bc-ubic">' + ICO.pin + esc([ubicacion(c) || 'Ubicación sin datos', dist].filter(Boolean).join(' · ')) + '</p>'
      + tabla('m', 'Barras de caballeros') + tabla('f', 'Barras de damas')
      + (c.nota || esOrientativo(c) ? '<p class="bc-aviso-fijo">' + esc([c.nota, esOrientativo(c) ? 'Algún dato es orientativo: confírmalo con la tarjeta del club.' : ''].filter(Boolean).join('. ')) + '</p>' : '')
      + '<p class="bc-nota">Rating: golpes que haría un jugador de hándicap 0. Slope: lo difícil que es para el aficionado (113 = normal).'
      + (c.fuente === 'acgolf' ? ' Datos de la tarjeta oficial guardada en acgolf.'
        : c.fuente === 'cadiz' ? ' Datos de guías de golf (' + esc(c.fuente_datos && /1golf/.test(c.fuente_datos) ? '1golf.eu' : c.fuente_datos && /18birdies/.test(c.fuente_datos) ? '18birdies' : 'GolfCourseAPI') + '): si cambian, manda la tabla oficial del club.'
        : c.fuente === 'tarjeta' ? ' Datos sacados de la foto de la tarjeta que subió un jugador: si ves algo mal, sube otra foto.'
        : c.fuente === '1golf' ? ' Datos de guías de golf: pueden no estar al día; si cambian, sube la foto de la tarjeta del club.'
        : ' Datos de GolfCourseAPI: pueden no estar al día; si cambian, sube la foto de la tarjeta del club.') + '</p>'
      + '<div class="bc-ficha-acc">'
      + (st.alElegir ? '<button type="button" class="bc-btn lima" data-jugar="' + esc(c.id) + '">' + ICO.bandera + '<span>Jugar aquí</span></button>' : '')
      + '<button type="button" class="bc-btn fav' + (fav ? ' on' : '') + '" data-fav="' + esc(c.id) + '" aria-pressed="' + fav + '">' + (fav ? ICO.estrellaLlena : ICO.estrella) + '<span>' + (fav ? 'Quitar de favoritos' : 'Añadir a favoritos') + '</span></button>'
      + (mapa ? '<a class="bc-btn sec" href="' + esc(mapa) + '" target="_blank" rel="noopener">' + ICO.pin + '<span>Cómo llegar</span></a>' : '')
      + '<button type="button" class="bc-btn sec" data-accion="cerrar-capa">Cerrar</button></div></div>';
  }
  function cerrarCapa(){ st.ficha = null; const c = $('bcCapa'); if(c) c.innerHTML = ''; }

  // Aviso del límite de 5: elegir cuál cambiar
  function pedirCambio(campo){
    const favs = Favoritos.leer(); quitarAviso();
    $('bcCapa').innerHTML = '<div class="bc-velo" data-accion="cerrar-capa"></div><div class="bc-ficha" role="alertdialog" aria-modal="true" aria-labelledby="bcLimT">'
      + '<h3 id="bcLimT">Ya tienes ' + MAX_FAV + ' favoritos</h3>'
      + '<p>Es el máximo. Si quieres guardar <b>' + esc(campo.nombre) + '</b>, elige cuál de estos quitas:</p>'
      + '<div class="bc-cambios">' + favs.map(f => '<button type="button" class="bc-btn sec bc-cambio" data-cambiar="' + esc(f.id) + '" data-por="' + esc(campo.id) + '"><span>Cambiar <b>' + esc(f.nombre) + '</b></span></button>').join('') + '</div>'
      + '<button type="button" class="bc-btn" data-accion="cerrar-capa">No cambiar nada</button></div>';
  }

  function quitarAviso(){ const t = $('bcToast'); if(t) t.classList.remove('on'); clearTimeout(aviso._t); }
  // El aviso va fuera de la pantalla del buscador: así también se ve desde «Crear partida»
  function cajaAviso(){
    let t = $('bcToast');
    if(!t){
      t = document.createElement('div');
      t.id = 'bcToast'; t.className = 'bc-aviso'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      t.addEventListener('click', alPulsar);
      document.body.appendChild(t);
    }
    return t;
  }
  function aviso(texto, deshacer){
    const t = cajaAviso();
    t.innerHTML = '<span>' + esc(texto) + '</span>' + (deshacer ? '<button type="button" data-accion="deshacer">Deshacer</button>' : '');
    t.classList.add('on');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => { t.classList.remove('on'); st.ultimoQuitado = null; }, deshacer ? 6000 : 3000);
  }

  function alternarFavorito(id){
    const c = buscarCampo(id); if(!c) return;
    if(Favoritos.es(id)){
      st.ultimoQuitado = Favoritos.quitar(id);
      aviso('Quitado de favoritos', true);
    } else {
      const r = Favoritos.anadir(c);
      if(!r.ok && r.motivo === 'limite'){ pedirCambio(c); return; }
      if(!r.ok){ aviso('No se pudo guardar este campo.'); return; }
      aviso(r.guardado === false ? 'Guardado solo mientras la app esté abierta (este navegador no deja guardar).' : 'Añadido a favoritos');
    }
    repintarTodo();
  }
  function repintarTodo(){
    const abierta = st.ficha;
    pintar();
    if(abierta && buscarCampo(abierta)) abrirFicha(abierta); else cerrarCapa();
  }

  // ---------- Buscar ----------
  function leerFormulario(){
    if($('bcTexto')) st.texto = $('bcTexto').value;
    if($('bcLat')) st.lat = $('bcLat').value;
    if($('bcLon')) st.lon = $('bcLon').value;
    if($('bcRadio')) st.radio = Number($('bcRadio').value) || 25;
  }
  async function buscar(){
    leerFormulario();
    const yo = ++st.pidiendo;
    st.aviso = '';
    try {
      if(st.modo === 'texto'){
        const texto = st.texto.trim();
        if(texto.length < 3) throw new Error('Escribe al menos 3 letras.');
        st.fase = 'cargando'; pintar();
        const q = sinAcentos(texto);
        const propios = camposAcgolf().concat(camposCadiz()).filter(c => sinAcentos(c.nombre + ' ' + (c.club || '') + ' ' + (c.ciudad || '') + ' ' + (c.region || '')).includes(q));
        let remotos = [], avisoServidor = null;
        if(navigator.onLine === false){
          avisoServidor = 'Sin conexión: solo se ven los campos guardados en la app.';
        } else {
          try { const r = await buscarTexto(texto); remotos = r.campos; avisoServidor = r.aviso; }
          catch(e){ if(!propios.length) throw e; avisoServidor = e.message; }
        }
        if(yo !== st.pidiendo) return;
        st.resultados = juntar(propios, remotos);
        st.aviso = avisoServidor || '';
      } else {
        let punto = st.punto && st.punto.origen === 'gps' && st.lat === '' && st.lon === '' ? st.punto : null;
        if(!punto){
          const lat = numero(st.lat), lon = numero(st.lon);
          if(lat == null || lon == null) throw new Error('Toca «Usar mi ubicación» o escribe latitud y longitud.');
          if(lat < -90 || lat > 90) throw new Error('La latitud tiene que estar entre -90 y 90.');
          if(lon < -180 || lon > 180) throw new Error('La longitud tiene que estar entre -180 y 180.');
          punto = { lat, lon, origen:'manual' };
        }
        st.punto = punto;
        st.fase = 'cargando'; pintar();
        const propios = camposAcgolf().concat(camposCadiz()).map(c => ({ ...c, distancia_km: distanciaKm(punto, c) }))
          .filter(c => c.distancia_km != null && c.distancia_km <= st.radio);
        let remotos = [];
        if(navigator.onLine === false) st.aviso = 'Sin conexión: solo se ven los campos guardados en la app.';
        else {
          try { remotos = await buscarCerca(punto, st.radio); }
          catch(e){ if(!propios.length) throw e; st.aviso = e.message; }
        }
        if(yo !== st.pidiendo) return;
        st.resultados = juntar(propios, remotos).sort((a, b) => (a.distancia_km ?? 1e9) - (b.distancia_km ?? 1e9));
      }
      st.fase = 'listo';
    } catch(e){
      if(yo !== st.pidiendo) return;
      st.fase = 'error'; st.error = e.message || 'No se pudo buscar.';
    }
    pintar();
    const r = $('bcResultados'); if(r && st.fase === 'listo') r.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  // Los campos propios de acgolf van primero; si GolfCourseAPI trae el mismo nombre, no se repite
  function juntar(propios, remotos){
    const vistos = new Set(propios.map(c => sinAcentos(c.nombre)));
    const clubes = new Set(propios.filter(c => c.fuente === 'cadiz' && c.club).map(c => sinAcentos(c.club)));
    return propios.concat((remotos || []).filter(c => c && c.id && c.nombre && !vistos.has(sinAcentos(c.nombre)) && !(c.club && clubes.has(sinAcentos(c.club)))));
  }

  function localizar(){
    if(!('geolocation' in navigator)){ aviso('Este móvil no deja saber la ubicación. Escribe las coordenadas.'); return; }
    leerFormulario();
    aviso('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(p => {
      st.punto = { lat: p.coords.latitude, lon: p.coords.longitude, origen:'gps' };
      st.lat = ''; st.lon = '';
      aviso('Ubicación lista');
      buscar();
    }, err => {
      aviso(err && err.code === 1 ? 'No has dado permiso para la ubicación. Puedes escribir las coordenadas.' : 'No se pudo saber tu ubicación. Escribe las coordenadas.');
    }, { enableHighAccuracy:false, timeout:12000, maximumAge:300000 });
  }

  // ---------- «Pega tu foto de la tarjeta y a jugar» ----------
  // El jugador hace una foto a la tarjeta del club; la función «leer-tarjeta» la lee (Gemini de Google),
  // el jugador revisa los números y el campo se guarda para todos en acgolf.
  const MAX_FOTOS = 3;
  const COLORES_FOTO = ['Blancas', 'Amarillas', 'Azules', 'Rojas'];
  const barraVacia = (g, nombre) => ({ nombre: nombre || '', genero: g || 'm', rating: '', slope: '', metros: '' });
  function datosVacios(){
    return { nombre: st.texto.trim().length >= 3 && st.modo === 'texto' ? st.texto.trim() : '', ciudad: '', n: 18,
             par: Array(18).fill(''), hcp: Array(18).fill(''),
             barras: [barraVacia('m', 'Blancas'), barraVacia('m', 'Amarillas'), barraVacia('f', 'Rojas')] };
  }
  function empezarFoto(){
    st.pestana = 'foto';
    st.foto = { paso: 'elegir', fotos: [], d: datosVacios(), aviso: '', error: '', malos: [], leido: null, notaColor: {} };
  }
  function cambiarHoyos(n){
    const d = st.foto.d; if(n !== 9 && n !== 18) return;
    d.n = n;
    d.par = d.par.slice(0, n).concat(Array(Math.max(0, n - d.par.length)).fill(''));
    d.hcp = d.hcp.slice(0, n).concat(Array(Math.max(0, n - d.hcp.length)).fill(''));
  }
  // Las fotos se achican en el móvil (más rápido y no gasta datos)
  function achicar(archivo){
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const MAX = 1800, k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const dataUrl = cv.toDataURL('image/jpeg', 0.85);
        ok({ tipo: 'image/jpeg', datos: dataUrl.split(',')[1], url: dataUrl });
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se ha podido abrir esa foto.')); };
      img.src = url;
    });
  }
  async function anadirFotos(lista){
    if(!st.foto || !lista || !lista.length) return;
    leerFoto();
    for(const f of [...lista]){
      if(st.foto.fotos.length >= MAX_FOTOS){ aviso('Como mucho ' + MAX_FOTOS + ' fotos.'); break; }
      if(!/^image\//.test(f.type || '') && !/\.(jpe?g|png|webp|heic)$/i.test(f.name || '')){ aviso('Eso no es una foto.'); continue; }
      try { st.foto.fotos.push(await achicar(f)); } catch(e){ aviso(e.message); }
    }
    pintar();
  }
  const cliente = () => { const c = typeof initSupabase === 'function' ? initSupabase() : null; if(!c) throw new Error('No se puede conectar con la base de datos.'); return c; };
  async function errorDe(error, porDefecto){
    try { if(error && error.context && typeof error.context.json === 'function'){ const j = await error.context.json(); if(j && j.error) return j.error; } } catch(e){}
    if(!navigator.onLine) return 'No hay conexión a internet.';
    return porDefecto;
  }
  async function leerTarjeta(){
    const F = st.foto; if(!F || !F.fotos.length) return;
    F.paso = 'leyendo'; F.error = ''; pintar();
    try {
      const { data, error } = await cliente().functions.invoke('leer-tarjeta', { body: { accion: 'leer', fotos: F.fotos.map(f => ({ tipo: f.tipo, datos: f.datos })) } });
      if(error) throw new Error(await errorDe(error, 'No se ha podido leer la foto.'));
      if(st.foto !== F) return;
      if(data && data.lectura) ponerLectura(data.lectura);
      else F.aviso = (data && data.aviso) || 'No se ha podido leer la foto: escribe tú los datos mirando la tarjeta.';
    } catch(e){
      if(st.foto !== F) return;
      F.aviso = e.message + ' Puedes escribir tú los datos mirando la tarjeta.';
    }
    F.paso = 'revisar'; pintar();
    const o = $('bcOv'); if(o) o.scrollTop = 0;
  }
  function ponerLectura(l){
    const F = st.foto, d = F.d; F.leido = l;
    if(l.es_tarjeta === false){ F.aviso = 'Esa foto no parece una tarjeta de golf. Revisa los datos o prueba con otra foto.'; }
    if(l.nombre) d.nombre = l.nombre;
    if(l.ciudad) d.ciudad = l.ciudad;
    cambiarHoyos(l.hoyos === 9 ? 9 : 18);
    for(let i = 0; i < d.n; i++){ d.par[i] = l.par_hoyos && l.par_hoyos[i] != null ? String(l.par_hoyos[i]) : ''; d.hcp[i] = l.hcp_hoyos && l.hcp_hoyos[i] != null ? String(l.hcp_hoyos[i]) : ''; }
    F.notaColor = {};
    const bs = (l.barras || []).filter(b => b && (b.rating != null || b.slope != null));
    if(bs.length) d.barras = bs.map((b, i) => {
      const k = colorDe(b.nombre || '');
      const nombre = k ? k.charAt(0).toUpperCase() + k.slice(1) : '';
      if(!k && b.nombre) F.notaColor[i] = b.nombre;
      return { nombre, genero: b.genero === 'f' ? 'f' : 'm', rating: b.rating == null ? '' : String(b.rating).replace('.', ','), slope: b.slope == null ? '' : String(b.slope), metros: b.metros == null ? '' : String(b.metros) };
    });
    const faltan = [];
    if(d.par.some(x => x === '')) faltan.push('el par de algún hoyo');
    if(d.hcp.some(x => x === '')) faltan.push('el hándicap de algún hoyo');
    if(!bs.length) faltan.push('el rating y el slope de las barras');
    F.aviso = [F.aviso, 'Ya está leída. Repasa los números con la tarjeta antes de guardar.', faltan.length ? 'No se ha podido leer ' + faltan.join(', ') + ': escríbelo tú.' : '', l.notas || ''].filter(Boolean).join(' ');
  }
  // Recoge lo escrito en el formulario
  function leerFoto(){
    const F = st.foto; if(!F || F.paso !== 'revisar') return;
    const d = F.d, v = id => { const el = $(id); return el ? el.value : null; };
    if(v('bcFNombre') != null) d.nombre = v('bcFNombre');
    if(v('bcFCiudad') != null) d.ciudad = v('bcFCiudad');
    document.querySelectorAll('#bcBody [data-fpar]').forEach(el => { d.par[Number(el.dataset.fpar)] = el.value.trim(); });
    document.querySelectorAll('#bcBody [data-fhcp]').forEach(el => { d.hcp[Number(el.dataset.fhcp)] = el.value.trim(); });
    document.querySelectorAll('#bcBody [data-fb]').forEach(el => { const b = d.barras[Number(el.dataset.fb)]; if(b) b[el.dataset.k] = el.value.trim(); });
  }
  // Comprueba los datos; devuelve el campo listo para guardar o el primer fallo
  function validarFoto(){
    const d = st.foto.d, malos = [];
    const ent = x => /^\d+$/.test(String(x).trim()) ? parseInt(x, 10) : null;
    const nombre = d.nombre.trim();
    if(nombre.length < 3) malos.push(['bcFNombre', 'Escribe el nombre del campo.']);
    const par = d.par.map(ent), hcp = d.hcp.map(ent);
    par.forEach((p, i) => { if(p == null || p < 3 || p > 6) malos.push(['fpar' + i, 'El par del hoyo ' + (i + 1) + ' tiene que ser 3, 4, 5 o 6.']); });
    hcp.forEach((h, i) => { if(h == null || h < 1 || h > 18) malos.push(['fhcp' + i, 'El hándicap del hoyo ' + (i + 1) + ' tiene que ir del 1 al 18.']); });
    if(!malos.some(m => /^fhcp/.test(m[0]))){
      const vistos = {};
      hcp.forEach((h, i) => { if(vistos[h] != null) malos.push(['fhcp' + i, 'El hándicap ' + h + ' está repetido (hoyos ' + (vistos[h] + 1) + ' y ' + (i + 1) + ').']); else vistos[h] = i; });
    }
    const barras = [];
    d.barras.forEach((b, i) => {
      const vacia = !b.rating && !b.slope && !b.metros;
      if(vacia) return;
      const rating = numero(b.rating), slope = ent(b.slope), metros = b.metros ? ent(b.metros) : null;
      if(!b.nombre) malos.push(['fb' + i + 'nombre', 'Elige el color de la barra ' + (i + 1) + '.']);
      if(rating == null || rating < 20 || rating > 90) malos.push(['fb' + i + 'rating', 'El rating de la barra ' + (b.nombre || (i + 1)) + ' no está bien (por ejemplo 71,4).']);
      if(slope == null || slope < 55 || slope > 155) malos.push(['fb' + i + 'slope', 'El slope de la barra ' + (b.nombre || (i + 1)) + ' tiene que estar entre 55 y 155.']);
      if(b.metros && (metros == null || metros < 300 || metros > 8000)) malos.push(['fb' + i + 'metros', 'Los metros de la barra ' + (b.nombre || (i + 1)) + ' no están bien.']);
      barras.push({ nombre: b.nombre, genero: b.genero === 'f' ? 'f' : 'm', rating, slope, metros });
    });
    if(!barras.length) malos.push(['fb0rating', 'Pon al menos una barra con su rating y su slope.']);
    return { malos, campo: { nombre, ciudad: d.ciudad.trim(), par_hoyos: par, hcp_hoyos: hcp, barras } };
  }
  async function guardarTarjeta(){
    const F = st.foto; if(!F) return;
    leerFoto();
    const r = validarFoto();
    F.malos = r.malos.map(m => m[0]);
    if(r.malos.length){
      F.error = r.malos[0][1] + (r.malos.length > 1 ? ' (y ' + (r.malos.length - 1) + ' cosa' + (r.malos.length > 2 ? 's' : '') + ' más en rojo)' : '');
      pintar();
      const el = document.querySelector('#bcBody .bc-mal'); if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus && el.focus(); }
      return;
    }
    F.error = ''; F.paso = 'guardando'; pintar();
    try {
      const campo = Object.assign({}, r.campo);
      if(st.punto && st.punto.origen === 'gps'){ campo.lat = st.punto.lat; campo.lon = st.punto.lon; }
      const { data, error } = await cliente().functions.invoke('leer-tarjeta', { body: { accion: 'guardar', campo, leido: F.leido, fotos: F.fotos.map(f => ({ tipo: f.tipo, datos: f.datos })) } });
      if(error) throw new Error(await errorDe(error, 'No se ha podido guardar el campo.'));
      if(!data || !data.campo) throw new Error('La respuesta del servidor no es válida.');
      const nuevo = data.campo;
      st.resultados = [nuevo].concat(st.resultados.filter(c => c.id !== nuevo.id));
      st.fase = 'listo'; st.foto = null; st.pestana = 'buscar';
      if(st.alElegir){ jugarAqui(nuevo.id); aviso('Campo guardado. ¡A jugar!'); return; }
      pintar(); abrirFicha(nuevo.id); aviso('Campo guardado: ya lo puede usar todo el mundo.');
    } catch(e){
      if(st.foto !== F) return;
      F.paso = 'revisar'; F.error = e.message; pintar();
    }
  }
  function pintarFoto(){
    const F = st.foto; if(!F){ st.pestana = 'buscar'; return pintarBuscar(); }
    let h = '<button type="button" class="bc-btn sec bc-foto-volver" data-accion="foto-volver">‹ Volver a buscar</button>'
      + '<h2 class="bc-titulo">Foto de la tarjeta</h2>';
    const miniaturas = F.fotos.length ? '<div class="bc-fotos">' + F.fotos.map((f, i) => '<div class="bc-foto"><a href="' + esc(f.url) + '" target="_blank" rel="noopener" aria-label="Ver la foto ' + (i + 1) + ' en grande"><img src="' + esc(f.url) + '" alt="Foto ' + (i + 1) + ' de la tarjeta"></a>'
      + (F.paso === 'elegir' ? '<button type="button" class="bc-foto-x" data-fquitar="' + i + '" aria-label="Quitar la foto ' + (i + 1) + '">✕</button>' : '') + '</div>').join('') + '</div>' : '';
    if(F.paso === 'elegir'){
      h += '<p class="bc-paso">Haz una foto a la <b>tarjeta del campo</b>, bien plana y con buena luz. Si el rating y el slope vienen por detrás, haz otra foto del otro lado (hasta ' + MAX_FOTOS + ' fotos).</p>'
        + miniaturas
        + (F.fotos.length < MAX_FOTOS ? '<div class="bc-foto-acc">'
          + '<label class="bc-btn">' + ICO.camara + '<span>' + (F.fotos.length ? 'Hacer otra foto' : 'Hacer foto') + '</span><input id="bcFotoCam" type="file" accept="image/*" capture="environment" hidden></label>'
          + '<label class="bc-btn sec"><span>Elegir de la galería</span><input id="bcFotoGal" type="file" accept="image/*" multiple hidden></label></div>' : '')
        + (F.fotos.length ? '<button type="button" class="bc-btn lima bc-foto-leer" data-accion="foto-leer">Leer la tarjeta</button>' : '')
        + '<button type="button" class="bc-enlace" data-accion="foto-amano">Prefiero escribir yo los datos</button>';
      return h;
    }
    if(F.paso === 'leyendo') return h + miniaturas + '<div class="bc-cargando"><span class="bc-rueda" aria-hidden="true"></span>Leyendo la tarjeta… tarda unos segundos.</div>';
    if(F.paso === 'guardando') return h + '<div class="bc-cargando"><span class="bc-rueda" aria-hidden="true"></span>Guardando el campo…</div>';
    // Revisar
    const d = F.d, mal = k => F.malos.includes(k) ? ' bc-mal' : '';
    h += (F.aviso ? '<p class="bc-aviso-fijo">' + esc(F.aviso) + '</p>' : '')
      + (F.fotos.length ? miniaturas + '<p class="bc-nota bc-foto-nota">Toca una foto para verla en grande.</p>' : '')
      + '<button type="button" class="bc-btn sec" data-accion="foto-otra">' + ICO.camara + '<span>' + (F.fotos.length ? 'Cambiar o añadir fotos' : 'Añadir foto de la tarjeta') + '</span></button>'
      + '<label class="bc-lbl" for="bcFNombre">Nombre del campo</label><input id="bcFNombre" class="bc-input' + mal('bcFNombre') + '" maxlength="80" autocomplete="off" value="' + esc(d.nombre) + '">'
      + '<label class="bc-lbl" for="bcFCiudad">Pueblo o ciudad</label><input id="bcFCiudad" class="bc-input" maxlength="80" autocomplete="off" value="' + esc(d.ciudad) + '">'
      + '<div class="bc-fila-lbl">Hoyos</div><div class="bc-seg">'
      + [18, 9].map(n => '<button type="button" class="' + (d.n === n ? 'on' : '') + '" data-fhoyos="' + n + '" aria-pressed="' + (d.n === n) + '">' + n + ' hoyos</button>').join('') + '</div>'
      + '<h3 class="bc-foto-t">Par y hándicap de cada hoyo</h3>';
    const bloque = (desde, hasta, titulo) => {
      let t = '<div class="bc-hoyos"><div class="bc-hoyos-t">' + titulo + '</div><div class="bc-hoyo bc-hoyo-cab"><span>Hoyo</span><span>Par</span><span>Hcp</span></div>';
      for(let i = desde; i < hasta; i++){
        t += '<div class="bc-hoyo"><span class="bc-hoyo-n">' + (i + 1) + '</span>'
          + '<input class="bc-input bc-mini' + mal('fpar' + i) + '" data-fpar="' + i + '" inputmode="numeric" maxlength="1" aria-label="Par del hoyo ' + (i + 1) + '" value="' + esc(d.par[i]) + '">'
          + '<input class="bc-input bc-mini' + mal('fhcp' + i) + '" data-fhcp="' + i + '" inputmode="numeric" maxlength="2" aria-label="Hándicap del hoyo ' + (i + 1) + '" value="' + esc(d.hcp[i]) + '"></div>';
      }
      return t + '</div>';
    };
    h += '<div class="bc-hoyos-caja">' + bloque(0, 9, d.n === 18 ? 'Ida' : 'Hoyos') + (d.n === 18 ? bloque(9, 18, 'Vuelta') : '') + '</div>'
      + '<h3 class="bc-foto-t">Barras de salida</h3><p class="bc-nota">El rating y el slope vienen en la tarjeta o en la tabla del club. Las que no uséis, quítalas.</p>';
    d.barras.forEach((b, i) => {
      const opciones = '<option value="">Elige color</option>' + COLORES_FOTO.map(c => '<option' + (b.nombre === c ? ' selected' : '') + '>' + c + '</option>').join('');
      h += '<div class="bc-barra-f">'
        + '<div class="bc-barra-cab"><select class="bc-input' + mal('fb' + i + 'nombre') + '" data-fb="' + i + '" data-k="nombre" aria-label="Color de la barra">' + opciones + '</select>'
        + '<select class="bc-input" data-fb="' + i + '" data-k="genero" aria-label="Caballeros o damas"><option value="m"' + (b.genero !== 'f' ? ' selected' : '') + '>Caballeros</option><option value="f"' + (b.genero === 'f' ? ' selected' : '') + '>Damas</option></select>'
        + '<button type="button" class="bc-foto-x bc-barra-x" data-bquitar="' + i + '" aria-label="Quitar esta barra">✕</button></div>'
        + (F.notaColor && F.notaColor[i] ? '<p class="bc-nota">En la tarjeta pone «' + esc(F.notaColor[i]) + '». La app usa blancas, amarillas, azules y rojas: elige la que salgáis o quita esta barra.</p>' : '')
        + '<div class="bc-barra-datos">'
        + '<label>Rating<input class="bc-input' + mal('fb' + i + 'rating') + '" data-fb="' + i + '" data-k="rating" inputmode="decimal" maxlength="5" placeholder="71,4" value="' + esc(b.rating) + '"></label>'
        + '<label>Slope<input class="bc-input' + mal('fb' + i + 'slope') + '" data-fb="' + i + '" data-k="slope" inputmode="numeric" maxlength="3" placeholder="128" value="' + esc(b.slope) + '"></label>'
        + '<label>Metros<input class="bc-input' + mal('fb' + i + 'metros') + '" data-fb="' + i + '" data-k="metros" inputmode="numeric" maxlength="4" placeholder="5900" value="' + esc(b.metros) + '"></label>'
        + '</div></div>';
    });
    h += (d.barras.length < 8 ? '<button type="button" class="bc-btn sec" data-accion="foto-barra">+ Añadir barra</button>' : '')
      + (F.error ? '<p class="bc-error bc-foto-error" role="alert">' + esc(F.error) + '</p>' : '')
      + '<button type="button" class="bc-btn lima bc-foto-guardar" data-accion="foto-guardar">' + ICO.bandera + '<span>' + (st.alElegir ? 'Guardar y jugar' : 'Guardar campo') + '</span></button>'
      + '<p class="bc-nota">El campo se guarda en acgolf para todos los jugadores. Revisa bien los números antes de guardar.</p>';
    return h;
  }

  // ---------- Toques ----------
  function alPulsar(e){
    const b = e.target.closest('button, [data-accion]');
    if(!b) return;
    if(b.id === 'bcCerrar') return cerrar();
    const d = b.dataset;
    if(d.pest){ leerFormulario(); st.pestana = d.pest; cerrarCapa(); return pintar(); }
    if(d.modo){
      leerFormulario();
      if(st.modo !== d.modo){ st.modo = d.modo; st.fase = 'inicio'; st.resultados = []; st.aviso = ''; }
      if(st.modo === 'cadiz'){   // la lista sale enseguida: los datos van en la app
        st.resultados = camposCadiz().map(c => ({ ...c, distancia_km: st.punto ? distanciaKm(st.punto, c) : null }));
        st.fase = 'listo';
      }
      return pintar();
    }
    if(d.par != null){ leerFormulario(); st.detAbierto = true; st.par = Number(d.par) || 0; return pintar(); }
    if(d.hoyos != null){ leerFormulario(); st.detAbierto = true; st.hoyos = Number(d.hoyos) || 0; return pintar(); }
    if(d.genero){ leerFormulario(); st.detAbierto = true; st.genero = d.genero; return pintar(); }
    if(d.atajo){ leerFormulario(); st.detAbierto = true; const a = ATAJOS.find(x => x.id === d.atajo); if(a){ st.min = a.min; st.max = a.max; } return pintar(); }
    if(d.jugar) return jugarAqui(d.jugar);
    if(d.fav) return alternarFavorito(d.fav);
    if(d.ficha) return abrirFicha(d.ficha);
    if(d.quitar){ st.ultimoQuitado = Favoritos.quitar(d.quitar); aviso('Quitado de favoritos', true); return repintarTodo(); }
    if(d.cambiar){
      const nuevo = buscarCampo(d.por); if(!nuevo) return cerrarCapa();
      const viejo = Favoritos.leer().find(f => f.id === d.cambiar);
      const r = Favoritos.reemplazar(d.cambiar, nuevo);
      cerrarCapa();
      aviso(r.ok ? 'Cambiado: ' + (viejo ? viejo.nombre : '') + ' por ' + nuevo.nombre : 'No se pudo cambiar.');
      return repintarTodo();
    }
    if(d.fquitar != null){ leerFoto(); st.foto.fotos.splice(Number(d.fquitar), 1); return pintar(); }
    if(d.fhoyos){ leerFoto(); cambiarHoyos(Number(d.fhoyos)); return pintar(); }
    if(d.bquitar != null){ leerFoto(); st.foto.d.barras.splice(Number(d.bquitar), 1); return pintar(); }
    switch(d.accion){
      case 'foto': leerFormulario(); empezarFoto(); return pintar();
      case 'foto-volver': st.foto = null; st.pestana = 'buscar'; return pintar();
      case 'foto-leer': return leerTarjeta();
      case 'foto-amano': leerFoto(); st.foto.paso = 'revisar'; st.foto.aviso = 'Escribe los datos mirando la tarjeta.'; return pintar();
      case 'foto-otra': leerFoto(); st.foto.paso = 'elegir'; return pintar();
      case 'foto-barra': leerFoto(); st.foto.d.barras.push(barraVacia()); return pintar();
      case 'foto-guardar': return guardarTarjeta();
      case 'cerrar-capa': return cerrarCapa();
      case 'gps': return localizar();
      case 'reintentar': return buscar();
      case 'deshacer':
        if(Favoritos.devolver(st.ultimoQuitado)){ st.ultimoQuitado = null; $('bcToast').classList.remove('on'); repintarTodo(); }
        return;
    }
  }
  function alCambiar(e){
    const t = e.target;
    if(t.id === 'bcFotoCam' || t.id === 'bcFotoGal'){ anadirFotos(t.files); t.value = ''; return; }
    if(t.id === 'bcMun'){ st.municipio = t.value; return pintar(); }
    if(t.id === 'bcMin' || t.id === 'bcMax'){
      leerFormulario(); st.detAbierto = true;
      let min = Number($('bcMin').value), max = Number($('bcMax').value);
      if(min > max){ if(t.id === 'bcMin') max = min; else min = max; }
      st.min = min; st.max = max;
      pintar();
    }
  }

  // ---------- Botón en el Inicio ----------
  function ponerBoton(){
    const n = Favoritos.leer().length;
    let b = $('hmCampos');
    if(!b){
      const ref = $('hmRyder') || $('hmDerbi') || document.querySelector('.home-menu-btn:last-of-type');
      if(!ref) return;
      b = document.createElement('button');
      b.type = 'button'; b.className = 'home-menu-btn hm-campos'; b.id = 'hmCampos';
      b.onclick = () => abrir();
      ref.parentNode.insertBefore(b, ref.nextSibling);
    }
    b.innerHTML = ICO.bandera + '<span>Campos de golf' + (n ? ' <em class="bc-insignia">★ ' + n + '</em>' : '') + '</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
  }

  // ---------- Iconos ----------
  const svg = (d, cls) => '<svg class="' + (cls || 'bc-ico') + '" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICO = {
    lupa: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    pin: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    diana: svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>'),
    estrella: svg('<path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z"/>'),
    estrellaLlena: svg('<path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z" fill="currentColor"/>'),
    papelera: svg('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>'),
    camara: svg('<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.3" r="3.6"/>', 'ico bc-ico'),
    bandera: svg('<path d="M6 21V3.5"/><path d="M6 4h11l-2.5 3.5L17 11H6"/><path d="M3.5 21h7"/>', 'ico bc-ico'),
  };

  // ---------- En «Crear partida» (paso 1: ¿Dónde jugáis?) ----------
  // Debajo de los campos de siempre salen los favoritos y «Buscar otro campo».
  function elegirEnCrearPartida(curso){
    try {
      // Variables de partida-rapida.js (están a la vista de los demás archivos de la app)
      prCampo = curso.id; prPaso = 2;   // eslint-disable-line no-undef
      prHoyos = curso.id === 'la-cartuja' ? 9 : 18; // La Cartuja se juega normalmente a 9 hoyos
      if(typeof prPintar === 'function') prPintar();
      const ov = $('prOverlay'); if(ov) ov.hidden = false;
    } catch(e){ console.error(e); aviso('No se pudo elegir el campo.'); }
  }
  function ponerEnCrearPartida(){
    const body = $('prBody'); if(!body || $('bcPr')) return;
    const campos = body.querySelectorAll(':scope > .pr-campo'); if(!campos.length) return;
    const ultimo = campos[campos.length - 1];
    const propios = new Set([...campos].map(b => 'acgolf:' + b.dataset.campo));
    const favs = Favoritos.leer().filter(f => !propios.has(f.id));
    const caja = document.createElement('div');
    caja.id = 'bcPr'; caja.className = 'bc-pr';
    caja.innerHTML = (favs.length ? '<div class="bc-pr-t">' + ICO.estrellaLlena + '<span>Tus campos favoritos</span></div>'
        + favs.map(f => '<button type="button" class="pr-campo bc-pr-fav" data-bcfav="' + esc(f.id) + '">' + esc(f.nombre) + '</button>').join('') : '')
      + '<button type="button" class="pr-campo bc-pr-buscar">' + ICO.lupa + '<span>Buscar otro campo</span></button>';
    ultimo.insertAdjacentElement('afterend', caja);
    caja.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.bcfav){
        const f = Favoritos.leer().find(x => x.id === b.dataset.bcfav);
        const curso = aCursoApp(f);
        if(curso) return elegirEnCrearPartida(curso);
        aviso('Este campo no trae el par y la dificultad de cada hoyo. Mándame su tarjeta y lo añado a acgolf.');
        return;
      }
      elegir(elegirEnCrearPartida, 'buscar');
    });
  }
  // La pantalla de «Crear partida» se repinta en cada paso: se vuelve a poner cuando hace falta
  function vigilarCrearPartida(){
    const body = $('prBody');
    if(!body){ setTimeout(vigilarCrearPartida, 800); return; }
    new MutationObserver(() => ponerEnCrearPartida()).observe(body, { childList: true });
    ponerEnCrearPartida();
  }

  // Otra pestaña o ventana cambió los favoritos: se repinta
  window.addEventListener('storage', e => { if(e.key === CLAVE_FAV){ ponerBoton(); const o = $('bcOv'); if(o && !o.hidden) repintarTodo(); } });

  function arrancar(){ ponerBoton(); vigilarCrearPartida(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  window.acgolfCampos = { abrir, cerrar, elegir, Favoritos, _util: { aCursoApp, distanciaKm, pasaFiltro, resumen, nivel, juntar, camposAcgolf, sinAcentos } };
})();
