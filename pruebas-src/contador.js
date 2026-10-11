/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Marcador de jugadores que usan la app (solo lo ve el super administrador) ---
// En la portada: cuántos jugadores tienen cuenta en acgolf (todos los grupos), cuántos la han usado hoy
// y esta semana. Al tocarlo, el detalle por grupo.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let datos = null;

  async function cargar(){
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) return;
    try {
      const { data, error } = await client.rpc('contador_app');
      if(error || !data) return;
      datos = data; pintar();
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
    ov.innerHTML = '<div class="av-caja" style="text-align:left">'
      + '<button type="button" class="av-x" aria-label="Cerrar">✕</button>'
      + '<div class="av-tit" style="text-align:left;margin-left:0">Jugadores en acgolf</div>'
      + fila('Con cuenta', datos.jugadores) + fila('Han usado la app hoy', datos.hoy) + fila('Esta semana', datos.semana)
      + (datos.sin_terminar ? fila('Cuentas a medio crear', datos.sin_terminar) : '')
      + '<div class="ct-sub">Por grupo</div>'
      + (datos.grupos || []).map(g => fila(g.nombre, g.jugadores)).join('')
      + (datos.solo_personal ? fila('Sin grupo (solo sus partidas)', datos.solo_personal) : '')
      + '<p class="ct-nota">Solo lo ves tú. Cada jugador cuenta una sola vez: en el grupo que tiene abierto (o en el primero al que se unió).</p>'
      + '<button type="button" class="av-btn" id="ctCerrar">Cerrar</button></div>';
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    ov.querySelector('.av-x').onclick = cerrar;
    ov.querySelector('#ctCerrar').onclick = cerrar;
  }

  (function esperar(n){
    const p = window.miPerfil;
    if(p){ if(p.es_super){ cargar(); setInterval(cargar, 5 * 60 * 1000); } return; }
    if(n > 0) setTimeout(() => esperar(n - 1), 400);
  })(60);
})();
