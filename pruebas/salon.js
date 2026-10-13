/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Salón de campeones (pantalla de la Liga) ---
// Una pared de club con 12 cuadros, uno por mes de la temporada.
// El campeón sale solo de la clasificación del mes (el primero en puntos).
// El administrador del grupo puede cambiar el nombre y poner una foto en cada cuadro.
// Sustituye a la antigua lista «Palmarés».
(function(){
  if(typeof initSupabase !== 'function' || typeof fetchLigaMes !== 'function') return;
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const may = t => t.charAt(0).toUpperCase() + t.slice(1);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' '); };
  const esAdmin = () => typeof window.getAdminKey === 'function' && window.getAdminKey() === 'cuenta';
  let primero = { y: 2026, m: 9 };
  try { if(typeof LIGA_FIRST_MONTH !== 'undefined') primero = LIGA_FIRST_MONTH; } catch(e){}

  const hoy = new Date();
  let anio = hoy.getFullYear();
  let cuadros = {};      // mes (0-11) -> { player_name, foto }
  let campeones = {};    // mes (0-11) -> { nombre, puntos } sacado de la clasificación
  let lideres = {};      // mes en curso -> líder
  let pintando = 0;

  const ICONO_PERSONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"></circle><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"></path></svg>';
  const ICONO_COPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 14v4M8.5 20h7"></path></svg>';

  // ---------- Sitio en la pantalla ----------
  function seccion(){
    let s = document.getElementById('salonSection');
    if(s) return s;
    const pant = document.querySelector('.screen[data-screen="6"] .screen-content');
    if(!pant) return null;
    s = document.createElement('section');
    s.id = 'salonSection';
    const antes = document.getElementById('ligaSemanasSection');
    if(antes && antes.parentNode === pant) pant.insertBefore(s, antes); else pant.appendChild(s);
    return s;
  }

  // ---------- Datos ----------
  async function cargar(){
    const client = initSupabase();
    const y = anio;
    cuadros = {}; campeones = {}; lideres = {};
    if(client){
      try {
        const { data, error } = await client.from('salon_cuadros').select('mes, player_name, foto').eq('anio', y);
        if(!error) (data || []).forEach(c => { cuadros[c.mes - 1] = { player_name: c.player_name, foto: c.foto }; });
      } catch(e){}
    }
    const meses = [];
    for(let m = 0; m < 12; m++){
      const k = y * 12 + m;
      if(k >= primero.y * 12 + primero.m && k <= hoy.getFullYear() * 12 + hoy.getMonth()) meses.push(m);
    }
    await Promise.all(meses.map(async m => {
      try {
        const d = await fetchLigaMes(y, m);
        const st = (d && d.clasificacion) || [];
        if(!st.length) return;
        const enCurso = y === hoy.getFullYear() && m === hoy.getMonth();
        if(enCurso) lideres[m] = { nombre: st[0].jugador, puntos: st[0].puntos };
        else campeones[m] = { nombre: st[0].jugador, puntos: st[0].puntos };
      } catch(e){}
    }));
    return y === anio;
  }

  function estado(m){
    const k = anio * 12 + m, kHoy = hoy.getFullYear() * 12 + hoy.getMonth();
    const c = cuadros[m] || {};
    const nombre = c.player_name || (campeones[m] && campeones[m].nombre) || '';
    if(k === kHoy && !c.player_name) return { tipo: 'juego', nombre: '', foto: c.foto || null, lider: lideres[m] && lideres[m].nombre };
    if(nombre || c.foto) return { tipo: 'campeon', nombre, foto: c.foto || null };
    if(k > kHoy) return { tipo: 'futuro', nombre: '', foto: null };
    return { tipo: 'vacio', nombre: '', foto: null };
  }

  function retrato(e, grande){
    if(e.foto) return '<img src="' + esc(e.foto) + '" alt="">';
    if(e.tipo === 'campeon' && e.nombre){
      const av = window.acgolfAvatares && window.acgolfAvatares.html ? window.acgolfAvatares.html(e.nombre, 'lg') : '';
      return '<div class="sl-sinfoto">' + (av || ICONO_PERSONA) + '</div>';
    }
    if(e.tipo === 'juego') return '<div class="sl-juego">' + ICONO_COPA + '<span>En juego</span></div>';
    return '<div class="sl-vacio">' + (e.tipo === 'futuro' ? 'Por jugar' : 'Sin campeón') + '</div>';
  }

  function placa(m, e){
    let txt = '—';
    if(e.tipo === 'campeon' && e.nombre) txt = corto(e.nombre);
    else if(e.tipo === 'juego') txt = e.lider ? 'Va: ' + corto(e.lider) : 'Se decide el ' + new Date(anio, m + 1, 0).getDate();
    return '<div class="sl-placa"><b>' + may(MESES[m]) + '</b><span>' + esc(txt) + '</span></div>';
  }

  // ---------- Dibujo ----------
  async function pintar(){
    const s = seccion(); if(!s) return;
    const palmares = document.getElementById('ligaChampionsSection');
    if(palmares) palmares.remove();   // el salón sustituye al palmarés
    const turno = ++pintando;
    dibujar(s, true);
    await cargar();
    if(turno !== pintando) return;
    dibujar(s, false);
  }

  function dibujar(s, cargando){
    const min = primero.y, max = hoy.getFullYear();
    const admin = esAdmin();
    let h = '<div class="sl-pared">'
      + '<div class="sl-moldura"></div>'
      + '<div class="sl-cab"><h2>Salón de campeones</h2>'
      + '<p>' + (admin ? 'Un cuadro por cada campeón del mes. Toca un cuadro para poner la foto o cambiar el nombre.' : 'Un cuadro por cada campeón del mes. Toca un cuadro para verlo en grande.') + '</p>'
      + '<div class="sl-anio"><button type="button" id="slAntes" aria-label="Temporada anterior"' + (anio > min ? '' : ' disabled') + '>‹</button>'
      + '<span>Temporada ' + anio + '</span>'
      + '<button type="button" id="slDespues" aria-label="Temporada siguiente"' + (anio < max ? '' : ' disabled') + '>›</button></div></div>'
      + '<div class="sl-lamparas" aria-hidden="true"><i></i><i></i></div>'
      + '<div class="sl-cuadros">';
    for(let m = 0; m < 12; m++){
      const e = cargando ? { tipo: 'vacio', nombre: '', foto: null } : estado(m);
      h += '<button type="button" class="sl-cuadro" data-mes="' + m + '" aria-label="Cuadro de ' + MESES[m] + '">'
        + '<div class="sl-marco"><div class="sl-paspartu"><div class="sl-foto">' + (cargando ? '' : retrato(e)) + '</div></div></div>'
        + placa(m, e) + '</button>';
    }
    h += '</div><div class="sl-zocalo" aria-hidden="true"><i></i><i></i><i></i></div></div>';
    s.innerHTML = h;
    const ir = d => { anio += d; pintar(); };
    const a = s.querySelector('#slAntes'), b = s.querySelector('#slDespues');
    if(a) a.onclick = () => ir(-1);
    if(b) b.onclick = () => ir(1);
    if(!cargando) s.querySelectorAll('.sl-cuadro').forEach(el => {
      el.onclick = () => { const m = Number(el.dataset.mes); esAdmin() ? editar(m) : ver(m); };
    });
  }

  // ---------- Ventana (ver o editar) ----------
  function ventana(html){
    cerrar();
    const v = document.createElement('div');
    v.className = 'sl-velo';
    v.innerHTML = '<div class="sl-hoja" role="dialog" aria-modal="true">' + html + '</div>';
    v.addEventListener('click', ev => { if(ev.target === v) cerrar(); });
    document.body.appendChild(v);
    return v;
  }
  function cerrar(){ const v = document.querySelector('.sl-velo'); if(v) v.remove(); }

  function marcoGrande(m, e){
    return '<div class="sl-grande"><div class="sl-marco"><div class="sl-paspartu"><div class="sl-foto">' + retrato(e) + '</div></div></div>'
      + '<div class="sl-placa"><b>' + may(MESES[m]) + ' ' + anio + '</b><span>' + esc(e.tipo === 'campeon' && e.nombre ? corto(e.nombre) : (e.tipo === 'juego' ? 'En juego' : '—')) + '</span></div></div>';
  }

  function ver(m){
    const e = estado(m);
    const v = ventana('<h3>' + may(MESES[m]) + ' ' + anio + '</h3>' + marcoGrande(m, e)
      + (campeones[m] ? '<p class="sl-nota">' + esc(corto(campeones[m].nombre)) + ' ganó el mes con ' + esc(campeones[m].puntos) + ' puntos.</p>' : '')
      + '<button type="button" class="sl-btn sl-prin" data-cerrar>Cerrar</button>');
    v.querySelector('[data-cerrar]').onclick = cerrar;
  }

  function nombresJugadores(m){
    const s = new Set();
    try { (typeof leaguePlayers !== 'undefined' ? leaguePlayers : []).forEach(p => p && p.name && s.add(p.name)); } catch(e){}
    if(campeones[m]) s.add(campeones[m].nombre);
    if(cuadros[m] && cuadros[m].player_name) s.add(cuadros[m].player_name);
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function editar(m){
    const c = cuadros[m] || {};
    let foto = c.foto || null;
    let jugador = c.player_name || '';
    const auto = campeones[m] ? campeones[m].nombre : '';
    const opciones = '<option value="">' + esc(auto ? 'Automático: ' + corto(auto) : 'Automático (el primero del mes)') + '</option>'
      + nombresJugadores(m).map(n => '<option value="' + esc(n) + '"' + (n === jugador ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    const v = ventana('<h3>Cuadro de ' + MESES[m] + ' ' + anio + '</h3>'
      + '<div class="sl-prev"></div>'
      + '<label class="sl-lab" for="slJug">Campeón del mes</label>'
      + '<select id="slJug" class="sl-sel">' + opciones + '</select>'
      + '<p class="sl-nota">«Automático» pone al primero de la clasificación del mes.</p>'
      + '<div class="sl-lab">Foto del cuadro</div>'
      + '<div class="sl-dos"><label class="sl-btn">Hacer foto<input type="file" accept="image/*" capture="environment" hidden></label>'
      + '<label class="sl-btn">Elegir de la galería<input type="file" accept="image/*" hidden></label></div>'
      + '<button type="button" class="sl-enlace" data-quitar' + (foto ? '' : ' hidden') + '>Quitar la foto</button>'
      + '<p class="sl-error" hidden></p>'
      + '<button type="button" class="sl-btn sl-prin" data-guardar>Guardar cuadro</button>'
      + '<button type="button" class="sl-enlace" data-cerrar>Cancelar</button>');
    const prev = v.querySelector('.sl-prev');
    const err = v.querySelector('.sl-error');
    const quitar = v.querySelector('[data-quitar]');
    const sel = v.querySelector('#slJug');
    const repintar = () => {
      const nombre = jugador || auto;
      prev.innerHTML = marcoGrande(m, { tipo: (nombre || foto) ? 'campeon' : 'vacio', nombre, foto });
      quitar.hidden = !foto;
    };
    repintar();
    sel.onchange = () => { jugador = sel.value; repintar(); };
    v.querySelectorAll('input[type=file]').forEach(inp => {
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; inp.value = '';
        if(!f) return;
        err.hidden = true;
        try { foto = await reducir(f); repintar(); }
        catch(e){ err.textContent = 'No se pudo leer esa foto. Prueba con otra.'; err.hidden = false; }
      };
    });
    quitar.onclick = () => { foto = null; repintar(); };
    v.querySelector('[data-cerrar]').onclick = cerrar;
    const guardar = v.querySelector('[data-guardar]');
    guardar.onclick = async () => {
      const client = initSupabase(); if(!client) return;
      guardar.disabled = true; guardar.textContent = 'Guardando…'; err.hidden = true;
      try {
        const { data, error } = await client.rpc('poner_cuadro', { p_anio: anio, p_mes: m + 1, p_player: jugador || null, p_foto: foto });
        if(error || data !== true) throw error || new Error('sin permiso');
        cerrar(); pintar();
      } catch(e){
        err.textContent = 'No se pudo guardar. Comprueba la conexión e inténtalo otra vez.';
        err.hidden = false; guardar.disabled = false; guardar.textContent = 'Guardar cuadro';
      }
    };
  }

  // La foto se guarda pequeña (como mucho 640 px) para que cargue rápido
  function reducir(file){
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const lado = 640, k = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = 0.82, d = c.toDataURL('image/jpeg', q);
        while(d.length > 380000 && q > 0.4){ q -= 0.12; d = c.toDataURL('image/jpeg', q); }
        d.length > 400000 ? mal(new Error('grande')) : ok(d);
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('imagen')); };
      img.src = url;
    });
  }

  // Se pinta cada vez que se entra en la Liga
  const original = window.renderLigaStandings;
  if(typeof original === 'function'){
    window.renderLigaStandings = function(){
      const r = original.apply(this, arguments);
      pintar();
      return r;
    };
  }
})();
