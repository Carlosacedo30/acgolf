/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Partido organizado → «Crear la partida con los apuntados» abre Crear partida ---
// Mismas opciones que una partida normal (puntuación, hoyos, modalidad, marcador, barras…), con el campo
// y los jugadores de cada hora ya puestos. Al empezar, la partida queda unida al partido.
// Los partidos «al tiro» (cada grupo en un hoyo) siguen creándose directamente, como antes.
(function(){
  if(typeof convCreateRound !== 'function' || typeof window.prAbrirDesdePartido !== 'function') return;
  const original = convCreateRound;
  const hoyIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  convCreateRound = async function(btn){
    if(!conv) return;
    if(typeof convAlTiro === 'function' && convAlTiro(conv)) return original(btn);
    const fresh = await convFetch(conv.code); if(fresh) conv = fresh;
    if(conv.roundCode){ renderConv(); return; }
    const grupos = conv.times.map((t, i) => (conv.groups[i] || []).slice()).filter(g => g.length);
    if(!grupos.length){ alert('Todavía no se ha apuntado nadie.'); return; }
    const partido = conv, primeraHora = (conv.times.find((t, i) => (conv.groups[i] || []).length) || '08:40');
    closeConv();
    window.prAbrirDesdePartido({
      courseId: partido.courseId,
      grupos,
      alCrear: async code => {
        // la partida queda unida al partido (la tarjeta del Inicio pasa a «Partida creada»)
        if(!conv || conv.code !== partido.code){ conv = partido; }
        await convMutate(c => { c.roundCode = code; return null; });
        // si se crea antes del día del partido, cuenta en la semana del partido
        if(partido.date && partido.date > hoyIso()){
          try { await initSupabase().from('rounds').update({ created_at: new Date(partido.date + 'T' + primeraHora + ':00').toISOString() }).eq('code', code); } catch(e){}
        }
        if(typeof renderConvHome === 'function') renderConvHome();
      }
    });
  };

  // El interruptor de marcador del partido ya no hace falta: está en Crear partida
  const pintar = renderConv;
  renderConv = function(){
    pintar.apply(this, arguments);
    if(conv && !(typeof convAlTiro === 'function' && convAlTiro(conv))){
      const m = document.getElementById('convMarc'); if(m) m.remove();
    }
  };
})();
