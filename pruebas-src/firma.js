/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Firma de la tarjeta (versión de pruebas) ---
// Al terminar la partida, un jugador del grupo (con su cuenta) firma la tarjeta.
// Solo las tarjetas firmadas cuentan para hándicap, premios y clasificación; firmada ya no se puede cambiar.
(function(){
  const share = document.getElementById('s4ShareSection');
  if(!share) return;
  const sec = document.createElement('section');
  sec.id = 'firmaSection';
  sec.className = 'fm';
  sec.style.display = 'none';
  share.parentNode.insertBefore(sec, share.nextSibling);

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hora = iso => { const d = new Date(iso); return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'short' }) + ' a las ' + d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }); };
  let estado = null, estadoCode = null, cargando = false, aviso = '';

  async function cargar(){
    if(!currentRoundCode || cargando) return;
    cargando = true;
    try {
      const { data, error } = await initSupabase().rpc('estado_firma', { p_code: currentRoundCode });
      if(error) throw error;
      estado = data || []; estadoCode = currentRoundCode;
    } catch(e){ aviso = 'No se pudo comprobar la firma. Revisa la conexión.'; }
    cargando = false;
    pintar();
  }

  // Guarda ya los golpes que haya en el móvil, para firmar exactamente lo que se ve
  async function guardarAhora(){
    try {
      matchGroups[activeGroup].scores = collectGroupScores();
      clearTimeout(saveTimer);
      if(currentRoundId) await initSupabase().from('rounds').update({ match_groups: matchGroups, updated_at: new Date().toISOString() }).eq('id', currentRoundId);
    } catch(e){}
  }

  function pintar(){
    // Se ve al pulsar «Finalizar ronda» y también al volver a abrir una partida que ya tiene los 18 hoyos
    const terminada = (typeof roundMarkedFinished !== 'undefined' && roundMarkedFinished)
      || (typeof isRoundFinished === 'function' && isRoundFinished(matchGroups));
    if(!currentRoundCode || !terminada){ sec.style.display = 'none'; return; }
    sec.style.display = '';
    if(estadoCode !== currentRoundCode){ sec.innerHTML = '<div class="eyebrow">Firma de la tarjeta</div><p class="fm-p">Comprobando…</p>'; cargar(); return; }
    const g = (estado || []).find(x => +x.grupo === +activeGroup);
    if(!g){ sec.innerHTML = '<div class="eyebrow">Firma de la tarjeta</div><p class="fm-p">' + esc(aviso || 'Esta partida no tiene tarjeta que firmar.') + '</p>'; return; }
    const yo = window.miPerfil && window.miPerfil.player_name;
    const soyDelGrupo = !!yo && g.jugadores.some(j => j.nombre === yo);
    let h = '<div class="eyebrow">Firma de la tarjeta' + ((estado || []).length > 1 ? ' · Grupo ' + (+g.grupo + 1) : '') + '</div>'
      + '<div class="fm-tabla">' + g.jugadores.map(j => '<div class="fm-fila"><span>' + esc(j.nombre) + '</span><b>'
        + (j.hoyos >= 18 ? j.golpes + ' golpes' : j.hoyos + ' de 18 hoyos') + '</b></div>').join('') + '</div>';
    if(g.firma){
      h += '<div class="fm-ok">✅ Firmada por <b>' + esc(g.firma.por) + '</b><br><small>' + esc(hora(g.firma.en)) + ' · Ya cuenta para la liga y no se puede cambiar.</small></div>';
    } else if(!g.completa){
      h += '<p class="fm-p">Faltan hoyos por apuntar. Cuando estén los 18 de todos, un jugador del grupo firma la tarjeta.</p>'
        + '<button type="button" class="fm-link" id="fmRecargar">Ya están: comprobar otra vez</button>';
    } else if(soyDelGrupo){
      h += '<p class="fm-p">Revisa los golpes. Al firmar, la tarjeta cuenta para la liga y ya no se puede cambiar.</p>'
        + '<button type="button" class="fm-btn" id="fmFirmar">✍️ Firmo que los golpes son correctos</button>';
    } else {
      h += '<p class="fm-p">Pendiente de firma: tiene que firmarla un jugador de este grupo desde su móvil.</p>'
        + '<button type="button" class="fm-link" id="fmRecargar">Comprobar si ya está firmada</button>';
    }
    if(aviso) h += '<p class="fm-aviso">' + esc(aviso) + '</p>';
    sec.innerHTML = h;
    const r = document.getElementById('fmRecargar');
    if(r) r.onclick = async () => { aviso = ''; await guardarAhora(); estadoCode = null; pintar(); };
    const f = document.getElementById('fmFirmar');
    if(f) f.onclick = async () => {
      if(!confirm('¿Firmas la tarjeta?\n\n' + g.jugadores.map(j => j.nombre + ': ' + j.golpes).join('\n') + '\n\nDespués ya no se puede cambiar.')) return;
      f.disabled = true; f.textContent = 'Firmando…'; aviso = '';
      await guardarAhora();
      const { data, error } = await initSupabase().rpc('firmar_tarjeta', { p_code: currentRoundCode, p_grupo: +g.grupo });
      if(error){ aviso = String(error.message || 'No se pudo firmar. Revisa la conexión.'); estadoCode = null; }
      else { estado = data || []; estadoCode = currentRoundCode; }
      pintar();
    };
  }

  // Cada vez que la app pinta la pantalla de resultados, se pinta también la firma
  if(typeof window.renderDiagnostico === 'function'){
    const orig = window.renderDiagnostico;
    window.renderDiagnostico = function(){ const r = orig.apply(this, arguments); try { pintar(); } catch(e){} return r; };
  }
})();
