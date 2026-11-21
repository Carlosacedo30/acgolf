/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* «Crear liga» en 4 pasos (diseño nuevo, 21-nov-2026). No rehace el formulario: reparte los bloques de ligas.js en 4 pasos
   y deja los mismos botones y manejadores. Solo con el diseño nuevo (html.in-on). */
(function(){
  var paso = 1;
  var TIT = ['¿Quién juega?', '¿Cuándo se juega?', '¿Dónde y cómo?', '¿Cómo se puntúa?'];
  var AYU = ['Ponle nombre y elige a los jugadores.', 'Cuántas rondas y qué días.', 'El campo, los hoyos y la salida.', 'Elige cómo se cuentan los puntos y crea la liga.'];
  // sección → paso (por el número del título de cada bloque)
  var MAPA = { '1': 1, '2': 2, '3': 2, '4': 2, 'C': 2, '5': 3, '6': 3, '7': 3, '11': 3, '8': 4, '9': 4, '10': 4 };
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function activo(){ return document.documentElement.classList.contains('in-on'); }

  function resumen(){
    var f = window.ligaForm || (typeof ligaForm !== 'undefined' ? ligaForm : null); if(!f) return '';
    var nG = Math.ceil((f.jugadores || []).length / 4);
    var dia = f.dia === 0 ? 'Domingos' : 'Sábados';
    var campo = typeof ligaCampoCorto === 'function' ? ligaCampoCorto(f.campo) : '';
    var fecha = ''; try { fecha = ligaFechaLarga(f.inicio); } catch(e){}
    var filas = [
      ['Jugadores', (f.jugadores || []).length + (nG ? ' · ' + nG + (nG === 1 ? ' grupo' : ' grupos') : '')],
      ['Rondas', f.jornadas + ' · ' + dia.toLowerCase() + (fecha ? ' desde el ' + fecha : '')],
      ['Campo', campo + ' · ' + (f.hoyos === 9 ? '9 hoyos' : '18 hoyos')],
      ['Salida', (f.salida === 'tiro' ? 'Al tiro' : 'Por el hoyo ' + (f.hoyoInicio || 1)) + ' · ' + (f.hora || '')],
      ['Formato', f.formato === 'stableford' ? 'Stableford' : 'Stroke Play (puntos F1)']
    ];
    return '<div class="lgp-res"><div class="lgp-res-t"><b>' + esc(f.nombre || 'Tu liga') + '</b></div>'
      + filas.map(function(r){ return '<div class="lgp-res-f"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>';
  }

  function montar(){
    var body = document.getElementById('ligaCuerpo'); if(!body || !activo()) return;
    var card = body.closest('.conv-card'); if(!card || !document.getElementById('lgCrear')) return;
    card.classList.add('lgp');
    var kids = Array.prototype.slice.call(body.children);
    var sec = '1', pasos = [null, [], [], [], []], acciones = null;
    kids.forEach(function(k){
      if(k.classList.contains('conv-actions')){ acciones = k; return; }
      if(k.classList.contains('conv-eyebrow')){
        var t = k.textContent.trim(), m = t.match(/^(\d+)\s*·/);
        sec = m ? m[1] : (/^Calendario/.test(t) ? 'C' : sec);
        k.innerHTML = k.innerHTML.replace(/^\s*\d+\s*·\s*/, '');
      }
      pasos[MAPA[sec] || 2].push(k);
    });
    if(paso > 4) paso = 4;
    // campo: solo el del grupo + «Buscar otro campo»
    var f = typeof ligaForm !== 'undefined' ? ligaForm : null;
    var wrapCampo = document.createElement('div'); wrapCampo.className = 'lgp-campo';
    wrapCampo.innerHTML = '<div class="lgp-campo-on"><b>' + esc(typeof ligaCampoCorto === 'function' && f ? ligaCampoCorto(f.campo) : 'Hato Verde') + '</b><span>Campo de la liga</span></div>';
    pasos[3] = pasos[3].filter(function(k){
      if(k.classList.contains('lg-campos') || k.classList.contains('lg-campos-t')){ k.hidden = true; return true; }
      if(k.classList.contains('lg-buscar-campo')){ k.textContent = '🔍 Buscar otro campo'; wrapCampo.appendChild(k); return false; }
      return true;
    });
    var ix = pasos[3].findIndex(function(k){ return k.classList && k.classList.contains('lg-campos'); });
    var cab = '<div class="lgp-prog"><div class="lgp-t"><b>Paso ' + paso + ' de 4</b><span>' + TIT[paso - 1] + '</span></div><div class="lgp-barra">'
      + [1, 2, 3, 4].map(function(i){ return '<i class="' + (i < paso ? 'ok' : (i === paso ? 'ya' : '')) + '"></i>'; }).join('') + '</div></div>'
      + '<h3 class="lgp-preg">' + TIT[paso - 1] + '</h3><p class="lgp-ayu">' + AYU[paso - 1] + '</p>';
    body.innerHTML = '';
    body.insertAdjacentHTML('beforeend', cab);
    for(var p = 1; p <= 4; p++){
      var d = document.createElement('div'); d.className = 'lgp-p'; d.hidden = (p !== paso); d.dataset.p = p;
      pasos[p].forEach(function(k){ d.appendChild(k); });
      if(p === 3){ var ref = d.querySelector('.lg-campos'); if(ref) ref.insertAdjacentElement('afterend', wrapCampo); else d.insertBefore(wrapCampo, d.firstChild); }
      if(p === 4) d.insertAdjacentHTML('beforeend', '<div class="lgp-sub">Así queda tu liga</div>' + resumen());
      body.appendChild(d);
    }
    // insignias «Recomendado»
    var bs = body.querySelector('[data-formato="stroke"]'); if(bs) bs.insertAdjacentHTML('beforeend', '<i class="lgp-rec">Recomendado</i>');
    var bt = body.querySelector('[data-regla="todas"]'); if(bt) bt.insertAdjacentHTML('beforeend', '<i class="lgp-rec">Recomendado</i>');
    if(acciones){ acciones.classList.add('lgp-oculto'); body.appendChild(acciones); }
    var pie = document.createElement('div'); pie.className = 'lgp-pie';
    pie.innerHTML = '<button type="button" class="lgp-atras" id="lgpAtras">‹ ' + (paso === 1 ? 'Cancelar' : 'Atrás') + '</button>'
      + (paso < 4 ? '<button type="button" class="lgp-sig" id="lgpSig">Siguiente ›</button>' : '<button type="button" class="lgp-crear" id="lgpCrear">Crear la liga</button>');
    body.appendChild(pie);
    document.getElementById('lgpAtras').addEventListener('click', function(){
      if(paso === 1){ var c = document.getElementById('lgCancelar'); if(c) c.click(); return; }
      paso--; irA();
    });
    var s = document.getElementById('lgpSig');
    if(s) s.addEventListener('click', function(){
      if(paso === 1){
        var n = document.getElementById('lgNombre');
        if(!n || !n.value.trim()){ alert('Ponle un nombre a la liga.'); if(n) n.focus(); return; }
        if(f && !f.jugadores.length){ alert('Elige al menos un jugador.'); return; }
      }
      paso++; irA();
    });
    var cr = document.getElementById('lgpCrear');
    if(cr) cr.addEventListener('click', function(){ document.getElementById('lgCrear').click(); });
    var tit = document.getElementById('ligaTitulo'); if(tit) tit.textContent = 'Crear liga';
  }
  function irA(){
    var n = document.getElementById('lgNombre'); if(n && typeof ligaForm !== 'undefined' && ligaForm) ligaForm.nombre = n.value;
    window.ligaPintarForm(); var card = document.querySelector('#ligaCuerpo'); card = card && card.closest('.conv-card'); if(card) card.scrollTop = 0;
  }

  // ---------- «Mis ligas» (lista) ----------
  function listaNueva(){
    var body = document.getElementById('ligaCuerpo'); if(!body || !activo() || typeof ligasTodas === 'undefined') return;
    var card = body.closest('.conv-card'); if(card) card.classList.add('lgl');
    var hoy = ligaHoy(), grupos = { juego: [], pronto: [], fin: [] };
    ligasTodas.forEach(function(l){
      var prox = ligaProxima(l), jug = l.jornadas.filter(function(j){ return j.date < hoy; }).length;
      var k = !prox ? 'fin' : (jug ? 'juego' : 'pronto');
      var nh = l.hoyos === 9 ? '9 hoyos' + (l.mitad === 'vuelta' ? ' (Vuelta)' : ' (Ida)') : '18 hoyos';
      var cada = l.cada === 14 ? 'cada 15 días' : (l.cada === 28 ? '1 al mes' : (l.dia === 0 ? 'cada domingo' : 'cada sábado'));
      var etq = { juego: '<i class="lgl-tag on">En juego</i><span class="lgl-jor">Jornada ' + (jug + 1 > l.jornadas.length ? l.jornadas.length : jug + 1) + ' de ' + l.jornadas.length + '</span>',
                  pronto: '<i class="lgl-tag">Empieza pronto</i>', fin: '<i class="lgl-tag">Terminada</i>' }[k];
      var pie = prox ? '<div class="lgl-pie"><span>' + (k === 'pronto' ? 'Empieza' : 'Próxima') + ': <em>' + ligaEsc(ligaFechaCortaJ(prox.date)) + '</em>' + (prox.hora || l.hora ? ' · ' + ligaEsc(String(prox.hora || l.hora).replace(/^0/, '')) : '') + '</span><b>›</b></div>' : '<div class="lgl-pie"><span>Ver la clasificación final</span><b>›</b></div>';
      grupos[k].push('<button type="button" class="lgl-liga lg-liga ' + k + '" data-code="' + ligaEsc(l.code) + '"><div class="lgl-cab">' + etq + '</div>'
        + '<h3>' + ligaEsc(l.nombre) + '</h3><p>' + l.jugadores.length + ' jugadores · ' + nh + ' · ' + cada + '</p>' + pie + '</button>');
    });
    var sec = function(t, a){ return a.length ? '<div class="lgl-sec"><span>' + t + '</span></div>' + a.join('') : ''; };
    var nueva = body.querySelector('#ligaNueva'), bases = body.querySelector('#lgBasesLista');
    body.innerHTML = '<h2 class="lgl-t">LIGAS</h2>' + (ligasTodas.length ? '' : '<div class="lg-aviso">Todavía no hay ninguna liga.</div>');
    if(nueva){ nueva.className = 'lgl-crear'; nueva.textContent = '＋ CREAR LIGA'; body.appendChild(nueva); }
    body.insertAdjacentHTML('beforeend', sec('Ligas del grupo', grupos.juego.concat(grupos.pronto)) + sec('Terminadas', grupos.fin));
    if(bases) body.appendChild(bases);
    body.querySelectorAll('.lgl-liga').forEach(function(b){ b.addEventListener('click', function(){ ligaVer(b.dataset.code); }); });
    if(nueva) nueva.addEventListener('click', function(){ ligaForm = null; ligaPintarForm(); });
    var tit = document.getElementById('ligaTitulo'); if(tit) tit.style.display = 'none';
  }

  // ---------- «Una liga» (clasificación) ----------
  function ligaNueva(){
    var body = document.getElementById('ligaCuerpo'); if(!body || !activo()) return;
    var card = body.closest('.conv-card'); if(!card || !body.querySelector('.lg-t')) return;
    card.classList.remove('lgl', 'lgp'); card.classList.add('lgv');
    var tit = document.getElementById('ligaTitulo'); if(tit) tit.style.display = '';
    var l = (typeof ligasTodas !== 'undefined' && typeof ligaAbierta !== 'undefined') ? ligasTodas.find(function(x){ return x.code === ligaAbierta; }) : null;
    var hoy = ligaHoy(), jug = l ? l.jornadas.filter(function(j){ return j.date < hoy; }).length : 0;
    var sub = body.querySelector('.lg-sub');
    if(sub && l){ var nj = Math.min(jug + 1, l.jornadas.length); sub.innerHTML = '<span class="lgv-jor">' + (jug >= l.jornadas.length ? 'Liga terminada' : 'Jornada ' + nj + ' de ' + l.jornadas.length) + '</span><small>' + sub.textContent + '</small>'; }
    // clasificación en tarjetas (la tabla completa queda detrás de «Ver todos los datos»)
    var yo = (window.miPerfil && window.miPerfil.player_name) ? String(window.miPerfil.player_name) : '';
    var yoC = yo && typeof ligaCortoN === 'function' ? ligaCortoN(yo) : yo;
    var filas = Array.prototype.slice.call(body.querySelectorAll('.lg-t tbody tr'));
    var hayPts = !body.querySelector('.lg-aviso') || !/empiezan a contar/.test(body.textContent);
    var lis = filas.map(function(tr){
      var c = tr.children, pos = c[0].textContent.trim(), nom = c[1].textContent.trim(), pts = c[2].textContent.trim(), pr = c[3].textContent.trim();
      var gris = tr.classList.contains('lg-gris'), top = /^[123]$/.test(pos);
      var cl = 'lgv-fila' + (pos === '1' ? ' oro' : (top ? ' top' : '')) + (gris ? ' gris' : '') + (yoC && nom === yoC ? ' yo' : '');
      return '<div class="' + cl + '"><i>' + (pos === '–' ? '' : pos + '.º') + '</i><div><b>' + esc(nom) + '</b><small>' + (yoC && nom === yoC ? '<em>Tú</em> · ' : '') + pr + (pr === '1' ? ' jugada' : ' jugadas') + '</small></div><strong>' + pts + '</strong></div>';
    });
    var N = 5, caja = document.createElement('div'); caja.className = 'lgv-cla';
    caja.innerHTML = '<div class="lgv-cab"><span>Jugador</span><span>Puntos</span></div>' + lis.map(function(h, i){ return i < N ? h : h.replace('lgv-fila', 'lgv-fila mas'); }).join('')
      + (lis.length > N ? '<button type="button" class="lgv-mas" id="lgvMas">Ver los ' + lis.length + ' jugadores <b>›</b></button>' : '');
    var tw = body.querySelector('.lg-tabla-w');
    if(tw){
      tw.parentNode.insertBefore(caja, tw);
      var det = document.createElement('button'); det.type = 'button'; det.className = 'lgv-det'; det.textContent = 'Ver todos los datos (promedio, descartes…)';
      tw.hidden = true; tw.parentNode.insertBefore(det, tw);
      det.addEventListener('click', function(){ tw.hidden = !tw.hidden; det.textContent = tw.hidden ? 'Ver todos los datos (promedio, descartes…)' : 'Ocultar los datos'; });
    }
    var mas = document.getElementById('lgvMas');
    if(mas) mas.addEventListener('click', function(){ caja.classList.toggle('abierta'); mas.firstChild.textContent = caja.classList.contains('abierta') ? 'Ver solo los 5 primeros ' : 'Ver los ' + lis.length + ' jugadores '; });
  }
  function envolver(){
    if(typeof window.ligaPintarForm !== 'function' || window.ligaPintarForm.__pasos) return;
    var orig = window.ligaPintarForm;
    var nuevo = function(){ orig(); try { montar(); } catch(e){ console.error(e); } };
    nuevo.__pasos = true; window.ligaPintarForm = nuevo;
    var verO = window.ligaVer;
    if(typeof verO === 'function') window.ligaVer = async function(){ var c = document.querySelector('.conv-card.lgv'); if(c) c.classList.remove('lgv'); var r = await verO.apply(this, arguments); try { ligaNueva(); } catch(e){ console.error(e); } return r; };
    var lista = window.ligaPintarLista;
    if(typeof lista === 'function') window.ligaPintarLista = function(){ paso = 1; var c = document.querySelector('.conv-card.lgp, .conv-card.lgv'); if(c) c.classList.remove('lgp', 'lgv'); var r = lista.apply(this, arguments); try { listaNueva(); } catch(e){ console.error(e); } return r; };
  }
  envolver();
})();
