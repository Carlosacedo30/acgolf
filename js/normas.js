/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Normas de la liga: reglamento + aceptación de cada jugador (también cubre el uso de sus datos) ---
  // Si se cambian las normas, sube NORMAS_VERSION para que todos las vuelvan a aceptar.
  const NORMAS_VERSION = '2026-10-03';
  const NORMAS_ACTIVAS = false; // de momento ocultas; poner a true para enseñarlas en Inicio
  const NORMAS = [
    { t:'1. Quién juega', d:[
      'Juegan la liga los jugadores de la lista de la liga. Los invitados pueden jugar con nosotros, pero no puntúan.' ]},
    { t:'2. Cuándo cuenta una partida', d:[
      'La semana va de lunes a domingo.',
      'Cuenta cualquier partida de 18 hoyos en Hato Verde o Zaudín apuntada en la app.',
      'Partida que no está en la app, no cuenta. Para nadie, tampoco para el organizador.' ]},
    { t:'3. Modalidad', d:[
      'Stroke Play, 18 hoyos, barras amarillas.',
      'Para la liga cuenta el resultado neto: golpes totales menos hándicap.',
      'Las partidas por parejas (Mejor bola o Foursome) se pueden jugar en la app, pero no cuentan para la liga ni para el hándicap.' ]},
    { t:'4. Hándicap', d:[
      'Cada uno empieza con su hándicap actual de la liga.',
      'Se recalcula solo después de cada partida con la regla de la Federación: media de las 8 mejores de las últimas 20 tarjetas. Mientras no haya 20, las que faltan cuentan como tu hándicap de salida.',
      'Nadie lo puede cambiar a mano, tampoco el administrador. Cada cambio queda registrado.' ]},
    { t:'5. La tarjeta', d:[
      'Los golpes se apuntan en la app durante la partida.',
      'Otro jugador del grupo revisa la tarjeta antes de terminar, como un marcador.',
      'Doce horas después de jugar, la partida queda cerrada y ya no se puede cambiar.' ]},
    { t:'6. Reclamaciones', d:[
      'Se puede reclamar hasta el lunes a las 10:00. Después, los resultados son definitivos.',
      'Las reclamaciones se hablan en privado, no en el grupo.',
      'Decide un comité de 3 jugadores elegido por el grupo. Si la reclamación afecta a uno de ellos, decide el resto. Su decisión es final.' ]},
    { t:'7. Premios', d:[
      'Salen solos en la app cada lunes.',
      'El Iscariote de la semana (mejor neto) se lleva las bolas del patrocinador. Si hay empate, gana el de menos golpes brutos.',
      'Si el ganador no está, se le guarda el premio para la semana siguiente.' ]},
    { t:'8. Juego limpio', d:[
      'Si se demuestra una trampa, se anula esa tarjeta. Si se repite, el comité puede dejar al jugador fuera de la liga.',
      'Buen ambiente ante todo: esto es para disfrutar.' ]},
    { t:'9. Tus datos', d:[
      'La app guarda solo tu nombre, tus golpes y tu hándicap, y solo para la liga.',
      'Los ve el grupo a través del enlace de la app. No se ceden a ningún patrocinador ni a nadie.',
      'Las fotos de ganadores solo se publican si el jugador quiere.',
      'Puedes darte de baja cuando quieras y pedir que se quite tu nombre: díselo al administrador.' ]},
    { t:'10. Cambios', d:[
      'Si alguna norma cambia, se avisa con una semana de antelación y se vuelven a aceptar.' ]},
  ];

  const normasEsc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let normasAceptadas = null; // Set con los nombres que ya han aceptado esta versión

  function normasYo(){
    try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; }
  }
  function normasSetYo(n){
    try { localStorage.setItem('golfAppConvMe', n); } catch(e){}
  }

  async function cargarNormasAceptadas(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return;
    try {
      const { data, error } = await client.from('normas_aceptacion').select('player_name').eq('version', NORMAS_VERSION);
      if(error) throw error;
      normasAceptadas = new Set((data || []).map(r => r.player_name));
    } catch(e){ normasAceptadas = null; }
    renderNormasHome();
  }

  function renderNormasHome(){
    const el = document.getElementById('normasHome');
    if(!el) return;
    if(!NORMAS_ACTIVAS){ el.style.display = 'none'; el.innerHTML = ''; return; }
    const yo = normasYo();
    const ok = yo && normasAceptadas && normasAceptadas.has(yo);
    // Ya aceptadas: no ocupa sitio en Inicio (siguen a mano en el pie: "Normas de la liga")
    if(ok){ el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = ok
      ? '<button type="button" class="normas-link" id="normasAbrir">📜 Normas de la liga <span>· aceptadas</span></button>'
      : '<div class="normas-aviso"><div class="normas-aviso-t">📜 Normas de la liga</div>'
        + '<div class="normas-aviso-d">Antes de jugar, léelas y dale a "Acepto". Son una página.</div>'
        + '<button type="button" class="btn primary full" id="normasAbrir">Leer y aceptar</button></div>';
    const b = document.getElementById('normasAbrir');
    if(b) b.addEventListener('click', abrirNormas);
  }

  function abrirNormas(){
    const ov = document.getElementById('normasOverlay');
    if(!ov) return;
    const lista = (typeof leaguePlayers !== 'undefined' ? leaguePlayers : []).map(p => p.name);
    const yo = normasYo();
    const ya = yo && normasAceptadas && normasAceptadas.has(yo);
    const total = lista.length, aceptadas = normasAceptadas ? lista.filter(n => normasAceptadas.has(n)).length : null;
    document.getElementById('normasBody').innerHTML =
      '<div class="section-sub">Liga de Los Iscariotes · versión del ' + NORMAS_VERSION.split('-').reverse().join('/') + '</div>'
      + NORMAS.map(s => '<h3 class="normas-h">' + normasEsc(s.t) + '</h3><ul class="normas-ul">' + s.d.map(x => '<li>' + normasEsc(x) + '</li>').join('') + '</ul>').join('')
      + '<div class="normas-firma">'
      + (ya
          ? '<div class="normas-ok">✅ ' + normasEsc(yo) + ', ya las has aceptado.</div>'
          : '<label class="lp-lbl" for="normasYo">¿Quién eres?</label>'
            + '<select id="normasYo"><option value="">Elige tu nombre</option>'
            + lista.map(n => '<option' + (n === yo ? ' selected' : '') + '>' + normasEsc(n) + '</option>').join('')
            + '</select>'
            + '<button type="button" class="btn primary full" id="normasAceptar">He leído las normas y las acepto</button>')
      + (aceptadas !== null ? '<div class="section-sub" style="margin-top:8px;">Las han aceptado ' + aceptadas + ' de ' + total + ' jugadores.</div>' : '')
      + '</div>';
    ov.hidden = false;
    const acc = document.getElementById('normasAceptar');
    if(acc) acc.addEventListener('click', ()=> aceptarNormas(acc));
  }

  async function aceptarNormas(btn){
    const sel = document.getElementById('normasYo');
    const nombre = sel ? sel.value : '';
    if(!nombre){ alert('Elige tu nombre de la lista.'); return; }
    const client = initSupabase();
    if(!client){ alert('Sin conexión. Inténtalo de nuevo.'); return; }
    btn.textContent = 'Guardando…';
    try {
      const { error } = await client.from('normas_aceptacion').insert({ player_name: nombre, version: NORMAS_VERSION });
      if(error && !String(error.code || '').startsWith('23505')) throw error; // 23505 = ya estaba aceptado
      normasSetYo(nombre);
      if(!normasAceptadas) normasAceptadas = new Set();
      normasAceptadas.add(nombre);
      renderNormasHome();
      abrirNormas();
    } catch(e){
      alert('No se pudo guardar. Revisa la conexión.');
      btn.textContent = 'He leído las normas y las acepto';
    }
  }

  (function setupNormas(){
    const close = document.getElementById('normasCerrar');
    const ov = document.getElementById('normasOverlay');
    if(close && ov) close.addEventListener('click', ()=>{ ov.hidden = true; });
    renderNormasHome();
    if(NORMAS_ACTIVAS) cargarNormasAceptadas();
  })();
