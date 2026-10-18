/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Marcador de jugadores que usan la app (solo lo ve el super administrador) ---
// En la portada: cuántos jugadores tienen cuenta en acgolf (todos los grupos), cuántos la han usado hoy
// y esta semana. Al tocarlo, el detalle por grupo.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let datos = null, patros = [];

  async function cargar(){
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) return;
    try {
      const { data, error } = await client.rpc('contador_app');
      if(error || !data) return;
      datos = data;
      try { const r = await client.rpc('contador_patro'); patros = (r && r.data) || []; } catch(e){ patros = []; }
      pintar();
    } catch(e){}
  }
  function pintar(){
    if(!datos) return;
    let box = document.getElementById('ctJugadores');
    if(!box){
      const ref = document.getElementById('homeAhora');
      if(!ref) return;
      box = document.createElement('button');
      box.type = 'button'; box.id = 'ctJugadores'; box.className = 'ct-caja';
      box.onclick = detalle;
      ref.parentNode.insertBefore(box, ref);
    }
    box.innerHTML = '<span class="ct-num">' + datos.jugadores + '</span>'
      + '<span class="ct-txt"><b>jugadores usan acgolf</b><small>' + datos.hoy + ' hoy · ' + datos.semana + ' esta semana · en todos los grupos</small></span>'
      + '<span class="ct-flecha" aria-hidden="true">›</span>';
  }
  function detalle(){
    const ov = document.createElement('div');
    ov.className = 'av-ov';
    const fila = (t, n) => '<div class="ct-fila"><span>' + esc(t) + '</span><b>' + n + '</b></div>';
    // Fila que se despliega con los nombres: quién, su grupo y cuándo
    const quien = (t, n, lista) => '<details class="ct-quien"><summary class="ct-fila"><span>' + esc(t) + ' <i>· ver quién</i></span><b>' + n + '</b></summary>'
      + (lista.length ? lista.map(([j, g, h]) => '<div class="ct-q"><span>' + esc(j) + '<small>' + esc(g || '') + '</small></span><em>' + esc(h || '') + '</em></div>').join('') : '<p class="ct-nota">Nadie todavía.</p>')
      + '</details>';
    ov.innerHTML = '<div class="av-caja" style="text-align:left">'
      + '<button type="button" class="av-x" aria-label="Cerrar">✕</button>'
      + '<div class="av-tit" style="text-align:left;margin-left:0">Jugadores en acgolf</div>'
      + fila('Con cuenta', datos.jugadores)
      + quien('Han usado la app hoy', datos.hoy, (datos.hoy_lista || []).map(x => [x.jugador, x.grupo, x.hora]))
      + quien('Esta semana', datos.semana, (datos.semana_lista || []).map(x => [x.jugador, x.grupo, x.dia]))
      + (datos.sin_terminar ? fila('Cuentas a medio crear', datos.sin_terminar) : '')
      + '<div class="ct-sub">Por grupo</div>'
      + (datos.grupos || []).map(g => fila(g.nombre, g.jugadores)).join('')
      + (datos.solo_personal ? fila('Sin grupo (solo sus partidas)', datos.solo_personal) : '')
      + '<div class="ct-sub">Patrocinadores · este mes</div>'
      + (patros.length ? patros.map(p => '<div class="ct-patro"><b>' + esc(p.patrocinador) + '</b>'
          + fila('Veces que se ha visto', p.vistas_mes) + fila('Toques para ir a su web', p.toques_mes) + fila('Jugadores distintos que tocaron', p.jugadores_toque_mes)
          + '<small>Desde el principio: ' + p.vistas + ' vistas y ' + p.toques + ' toques.</small></div>').join('')
        : '<p class="ct-nota">Todavía no hay datos: se empiezan a contar desde hoy.</p>')
      + (patros.length ? '<div class="ct-sub">¿Quién ha ido a su web?</div>'
          + '<div class="ct-filtros" id="ptPeriodo">' + [['hoy','Hoy'],['semana','Semana'],['mes','Mes'],['todo','Todo']].map(([k, t]) => '<button type="button" data-p="' + k + '"' + (k === filtro.periodo ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>'
          + '<div class="ct-filtros" id="ptTipo"><button type="button" data-t="toque"' + (filtro.tipo === 'toque' ? ' class="on"' : '') + '>Tocaron la web</button><button type="button" data-t="vista"' + (filtro.tipo === 'vista' ? ' class="on"' : '') + '>Vieron el logo</button></div>'
          + '<div class="ct-filtros ct-filtros-sel"><select id="ptGrupo" aria-label="Grupo"><option value="">Todos los grupos</option></select>'
          + '<label class="ct-yo"><input type="checkbox" id="ptYo"' + (filtro.yo ? ' checked' : '') + '> Contarme a mí</label></div>'
          + '<div id="ptLista"><p class="ct-nota">Cargando…</p></div>' : '')
      + '<p class="ct-nota">Solo lo ves tú. Cada jugador cuenta una sola vez: en el grupo que tiene abierto (o en el primero al que se unió).</p>'
      + '<button type="button" class="av-btn" id="ctCerrar">Cerrar</button></div>';
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    ov.querySelector('.av-x').onclick = cerrar;
    ov.querySelector('#ctCerrar').onclick = cerrar;
    if(patros.length) montarFiltro(ov);
  }

  // --- Filtro del patrocinador: quién tocó su web (o vio el logo), por periodo y grupo ---
  const filtro = { periodo: 'mes', tipo: 'toque', grupo: '', yo: false };
  let filas = [];
  async function montarFiltro(ov){
    const lista = ov.querySelector('#ptLista');
    const selGrupo = ov.querySelector('#ptGrupo');
    const marcar = (cont, attr, val) => cont.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
    async function traer(){
      lista.innerHTML = '<p class="ct-nota">Cargando…</p>';
      const client = typeof initSupabase === 'function' ? initSupabase() : null;
      try {
        const { data, error } = await client.rpc('contador_patro_quien', { p_periodo: filtro.periodo });
        if(error) throw error;
        filas = data || [];
      } catch(e){ lista.innerHTML = '<p class="ct-nota">No se han podido cargar los datos. Inténtalo de nuevo.</p>'; return; }
      // Grupos que salen en los datos, para el desplegable
      const grupos = [...new Set(filas.map(f => f.grupo || 'Sin grupo'))].sort((a, b) => a.localeCompare(b, 'es'));
      if(filtro.grupo && !grupos.includes(filtro.grupo)) filtro.grupo = '';
      selGrupo.innerHTML = '<option value="">Todos los grupos</option>' + grupos.map(g => '<option' + (g === filtro.grupo ? ' selected' : '') + '>' + esc(g) + '</option>').join('');
      dibujar();
    }
    function dibujar(){
      const toque = filtro.tipo === 'toque';
      const vis = filas.filter(f => (toque ? f.toques : f.vistas) > 0)
        .filter(f => filtro.yo || !f.yo)
        .filter(f => !filtro.grupo || (f.grupo || 'Sin grupo') === filtro.grupo)
        .sort((a, b) => toque ? (b.toques - a.toques) : (b.vistas - a.vistas));
      const total = vis.reduce((s, f) => s + (toque ? f.toques : f.vistas), 0);
      const nombrePer = { hoy: 'hoy', semana: 'esta semana', mes: 'este mes', todo: 'desde el principio' }[filtro.periodo];
      if(!vis.length){ lista.innerHTML = '<p class="ct-nota">Nadie ' + (toque ? 'ha tocado la web' : 'ha visto el logo') + ' ' + nombrePer + '.</p>'; return; }
      lista.innerHTML = '<div class="ct-resumen"><b>' + vis.length + '</b> ' + (vis.length === 1 ? 'jugador' : 'jugadores distintos')
        + ' · ' + total + ' ' + (toque ? (total === 1 ? 'toque' : 'toques') : (total === 1 ? 'día visto' : 'días vistos')) + ' ' + nombrePer + '</div>'
        + vis.map(f => '<div class="ct-q"><span>' + esc(f.jugador) + (f.yo ? ' (tú)' : '') + '<small>' + esc(f.grupo || 'Sin grupo')
          + ' · último: ' + esc((toque ? f.ultimo_toque : f.ultima_vista) || '') + '</small></span><em>' + (toque ? f.toques : f.vistas) + '</em></div>').join('')
        + (toque ? '' : '<p class="ct-nota">Las vistas cuentan como mucho una vez al día por jugador.</p>');
    }
    ov.querySelector('#ptPeriodo').onclick = e => { const b = e.target.closest('button'); if(!b) return; filtro.periodo = b.dataset.p; marcar(e.currentTarget, 'p', filtro.periodo); traer(); };
    ov.querySelector('#ptTipo').onclick = e => { const b = e.target.closest('button'); if(!b) return; filtro.tipo = b.dataset.t; marcar(e.currentTarget, 't', filtro.tipo); dibujar(); };
    selGrupo.onchange = () => { filtro.grupo = selGrupo.value; dibujar(); };
    ov.querySelector('#ptYo').onchange = e => { filtro.yo = e.target.checked; dibujar(); };
    traer();
  }

  (function esperar(n){
    const p = window.miPerfil;
    if(p){ if(p.es_super){ cargar(); setInterval(cargar, 5 * 60 * 1000); } return; }
    if(n > 0) setTimeout(() => esperar(n - 1), 400);
  })(60);
})();
