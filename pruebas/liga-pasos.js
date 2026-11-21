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
  function envolver(){
    if(typeof window.ligaPintarForm !== 'function' || window.ligaPintarForm.__pasos) return;
    var orig = window.ligaPintarForm;
    var nuevo = function(){ orig(); try { montar(); } catch(e){ console.error(e); } };
    nuevo.__pasos = true; window.ligaPintarForm = nuevo;
    var lista = window.ligaPintarLista;
    if(typeof lista === 'function') window.ligaPintarLista = function(){ paso = 1; var c = document.querySelector('.conv-card.lgp'); if(c) c.classList.remove('lgp'); return lista.apply(this, arguments); };
  }
  envolver();
})();
