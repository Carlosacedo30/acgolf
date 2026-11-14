/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Salón de campeones (pantalla de la Liga) ---
// Una pared de club con un cuadro por cada LIGA del grupo (norma de Carlos, 14-nov-2026).
// Debajo de cada cuadro: el nombre de la liga (el que se puso al crearla) y el campeón.
// El campeón sale de la clasificación de la liga (primero en puntos) cuando está terminada;
// mientras se juega pone «En juego» y el líder. El administrador puede cambiar el nombre y poner foto.
// Los datos de las ligas los pasa clasif-liga.js (window.acgolfSalon.pintar).
(function(){
  const may = t => t.charAt(0).toUpperCase() + t.slice(1);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' '); };
  const esAdmin = () => typeof window.getAdminKey === 'function' && window.getAdminKey() === 'cuenta';

  let anio = new Date().getFullYear();
  let lista = [];        // resúmenes de ligas (los pasa clasif-liga.js)
  let guardados = {};    // code de liga -> { player_name, foto }

  const ICONO_PERSONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"></circle><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"></path></svg>';
  const ICONO_COPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 14v4M8.5 20h7"></path></svg>';

  function seccion(){
    let s = document.getElementById('salonSection');
    if(s) return s;
    const pant = document.querySelector('.screen[data-screen="6"] .screen-content');
    if(!pant) return null;
    s = document.createElement('section');
    s.id = 'salonSection';
    pant.appendChild(s);
    return s;
  }

  async function cargarGuardados(){
    guardados = {};
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) return;
    try {
      const { data, error } = await client.from('salon_ligas').select('liga_code, player_name, foto');
      if(!error) (data || []).forEach(c => { guardados[c.liga_code] = { player_name: c.player_name, foto: c.foto }; });
    } catch(e){}
  }

  const delAnio = () => lista.filter(r => r.anio === anio).sort((a, b) => String(a.ultima).localeCompare(String(b.ultima)));

  // Estado de un cuadro: campeón / en juego / por jugar
  function estado(r){
    const g = guardados[r.l.code] || {};
    const primero = r.tabla && r.tabla[0] ? r.tabla[0] : null;
    const nombre = g.player_name || (r.terminada && primero ? primero.jugador : '');
    if(nombre || g.foto) return { tipo: 'campeon', nombre, foto: g.foto || null };
    if(r.jugadasJ > 0) return { tipo: 'juego', nombre: '', foto: null, lider: primero && primero.jugador };
    return { tipo: 'futuro', nombre: '', foto: null };
  }

  function retrato(e){
    if(e.foto) return '<img src="' + esc(e.foto) + '" alt="">';
    if(e.tipo === 'campeon' && e.nombre){
      const av = window.acgolfAvatares && window.acgolfAvatares.html ? window.acgolfAvatares.html(e.nombre, 'lg') : '';
      return '<div class="sl-sinfoto">' + (av || ICONO_PERSONA) + '</div>';
    }
    if(e.tipo === 'juego') return '<div class="sl-juego">' + ICONO_COPA + '<span>En juego</span></div>';
    return '<div class="sl-vacio">Por jugar</div>';
  }

  function placa(r, e){
    let txt = '—';
    if(e.tipo === 'campeon' && e.nombre) txt = corto(e.nombre);
    else if(e.tipo === 'juego') txt = e.lider ? 'Va: ' + corto(e.lider) : 'En juego';
    else txt = 'Por jugar';
    return '<div class="sl-placa"><b>' + esc(r.l.nombre) + '</b><span>' + esc(txt) + '</span></div>';
  }

  function dibujar(){
    const s = seccion(); if(!s) return;
    const anios = [...new Set(lista.map(r => r.anio))].sort();
    const min = anios.length ? anios[0] : anio, max = anios.length ? anios[anios.length - 1] : anio;
    const admin = esAdmin();
    const rs = delAnio();
    let h = '<div class="sl-pared">'
      + '<div class="sl-moldura"></div>'
      + '<div class="sl-cab"><h2>Salón de campeones</h2>'
      + '<p>' + (admin ? 'Un cuadro por cada liga. Toca un cuadro para poner la foto o cambiar el nombre del campeón.' : 'Un cuadro por cada liga. Debajo, el nombre de la liga y el del campeón. Toca un cuadro para verlo en grande.') + '</p>'
      + '<div class="sl-anio"><button type="button" id="slAntes" aria-label="Temporada anterior"' + (anio > min ? '' : ' disabled') + '>‹</button>'
      + '<span>Temporada ' + anio + '</span>'
      + '<button type="button" id="slDespues" aria-label="Temporada siguiente"' + (anio < max ? '' : ' disabled') + '>›</button></div></div>'
      + '<div class="sl-lamparas" aria-hidden="true"><i></i><i></i></div>';
    if(!rs.length){
      h += '<div class="sl-cuadros"><p class="sl-nota" style="grid-column:1/-1;color:#D3DCD5;text-align:center">Todavía no hay ligas en esta temporada. Cuando se cree una, aparece aquí su cuadro.</p></div>';
    } else {
      h += '<div class="sl-cuadros">' + rs.map((r, i) => {
        const e = estado(r);
        return '<button type="button" class="sl-cuadro" data-i="' + i + '" aria-label="Cuadro de ' + esc(r.l.nombre) + '">'
          + '<div class="sl-marco"><div class="sl-paspartu"><div class="sl-foto">' + retrato(e) + '</div></div></div>' + placa(r, e) + '</button>';
      }).join('') + '</div>';
    }
    h += '<div class="sl-zocalo" aria-hidden="true"><i></i><i></i><i></i></div></div>';
    s.innerHTML = h;
    const ir = d => { anio += d; dibujar(); };
    const a = s.querySelector('#slAntes'), b = s.querySelector('#slDespues');
    if(a) a.onclick = () => ir(-1);
    if(b) b.onclick = () => ir(1);
    s.querySelectorAll('.sl-cuadro').forEach(el => {
      el.onclick = () => { const r = rs[Number(el.dataset.i)]; esAdmin() ? editar(r) : ver(r); };
    });
  }

  async function pintar(resumenes){
    lista = (resumenes || []).slice();
    if(!lista.some(r => r.anio === anio) && lista.length) anio = Math.max.apply(null, lista.map(r => r.anio));
    dibujar();
    await cargarGuardados();
    dibujar();
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

  function marcoGrande(r, e){
    return '<div class="sl-grande"><div class="sl-marco"><div class="sl-paspartu"><div class="sl-foto">' + retrato(e) + '</div></div></div>'
      + '<div class="sl-placa"><b>' + esc(r.l.nombre) + '</b><span>' + esc(e.tipo === 'campeon' && e.nombre ? corto(e.nombre) : (e.tipo === 'juego' ? 'En juego' : '—')) + '</span></div></div>';
  }

  function ver(r){
    const e = estado(r);
    const p = r.tabla && r.tabla[0];
    const v = ventana('<h3>' + esc(r.l.nombre) + '</h3>' + marcoGrande(r, e)
      + (r.terminada && p ? '<p class="sl-nota">' + esc(p.jugador) + ' ganó la liga con ' + esc(p.puntos) + ' puntos.</p>' : '')
      + '<button type="button" class="sl-btn sl-prin" data-cerrar>Cerrar</button>');
    v.querySelector('[data-cerrar]').onclick = cerrar;
  }

  function nombresJugadores(r){
    const s = new Set();
    (r.tabla || []).forEach(f => f && f.jugador && s.add(f.jugador));
    const g = guardados[r.l.code];
    if(g && g.player_name) s.add(g.player_name);
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function editar(r){
    const c = guardados[r.l.code] || {};
    let foto = c.foto || null;
    let jugador = c.player_name || '';
    const auto = r.terminada && r.tabla && r.tabla[0] ? r.tabla[0].jugador : '';
    const opciones = '<option value="">' + esc(auto ? 'Automático: ' + corto(auto) : 'Automático (el primero de la liga)') + '</option>'
      + nombresJugadores(r).map(n => '<option value="' + esc(n) + '"' + (n === jugador ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    const v = ventana('<h3>Cuadro de ' + esc(r.l.nombre) + '</h3>'
      + '<div class="sl-prev"></div>'
      + '<label class="sl-lab" for="slJug">Campeón de la liga</label>'
      + '<select id="slJug" class="sl-sel">' + opciones + '</select>'
      + '<p class="sl-nota">«Automático» pone al primero de la clasificación cuando la liga está terminada.</p>'
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
      prev.innerHTML = marcoGrande(r, { tipo: (nombre || foto) ? 'campeon' : (r.jugadasJ > 0 ? 'juego' : 'futuro'), nombre, foto });
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
        const { data, error } = await client.rpc('poner_cuadro_liga', { p_code: r.l.code, p_player: jugador || null, p_foto: foto });
        if(error || data !== true) throw error || new Error('sin permiso');
        cerrar(); pintar(lista);
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

  window.acgolfSalon = { pintar };
})();
