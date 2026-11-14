/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Cada jugador ve SOLO su grupo (norma de Carlos, 14-nov-2026) ---
// En las partidas con marcadores no tiene sentido enseñar los botones «Grupo 1, Grupo 2…»: cada grupo marca el suyo.
// Si el jugador está en un grupo, la app lo pone en ese grupo y esconde las pestañas. Quien no juega (administrador,
// espectador) sigue viendo todas las pestañas.
(function(){
  if(typeof window.renderGroupSwitcher !== 'function') return;
  const yo = () => window.miPerfil && window.miPerfil.player_name;
  const conMarcador = () => !!(window.acgolfModoMarcador && currentRoundCode && window.acgolfModoMarcador.con(currentRoundCode));
  function miGrupo(){
    const n = yo(); if(!n || typeof matchGroups === 'undefined') return -1;
    return matchGroups.findIndex(g => g && (g.players || []).some(p => g.modo === 'foursome' ? String(p).indexOf(n) >= 0 : p === n));
  }
  const orig = window.renderGroupSwitcher;
  window.renderGroupSwitcher = function(){
    const r = orig.apply(this, arguments);
    try {
      if(conMarcador()){
        const g = miGrupo();
        if(g >= 0){
          if(+activeGroup !== g && typeof switchGroup === 'function'){ switchGroup(g); return r; }
          const s = document.getElementById('groupSwitchSection'); if(s) s.style.display = 'none';
        }
      }
    } catch(e){ console.error(e); }
    return r;
  };
  // el modo «con marcadores» se sabe un momento después de abrir la partida: se vuelve a comprobar
  let ult = '';
  setInterval(() => { try { const k = currentRoundCode + ':' + conMarcador() + ':' + miGrupo() + ':' + activeGroup; if(k !== ult){ ult = k; window.renderGroupSwitcher(); } } catch(e){} }, 1500);
  if(window.acgolfModoMarcador && currentRoundCode) window.acgolfModoMarcador.cargar(currentRoundCode);
})();
