/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Listado de hándicaps tras cada partida de la liga ---
  // Sale en Inicio 15 minutos después de que la partida termine (margen para corregir algún golpe) y se quita solo a las 5 horas.
  // Lo calcula Supabase: listado_handicap_reciente() → [{ code, nombre, terminada, jugadores:[...] }]
  let hcpListados = [];

  const hcpFmt = v => Number(v).toFixed(1).replace('.', ',');
  const hcpEsc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function hcpFecha(iso){
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'short' }) + ', ' + d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
  }
  // Nombre corto para la tabla: sin el segundo apellido ("Francisco Javier Garcia Martinez" → "Francisco Javier Garcia")
  function hcpNombreCorto(n){
    const w = String(n || '').trim().split(/\s+/);
    return w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' ');
  }
  function hcpCambio(j){
    const a = Number(j.hcp_antes), d = Number(j.hcp_despues);
    if(!j.liga) return { txt:'invitado', cls:'inv', ico:'' };
    if(Math.abs(d - a) < 0.05) return { txt:hcpFmt(a), cls:'igual', ico:'＝' };
    return d < a ? { txt:hcpFmt(a) + ' → ' + hcpFmt(d), cls:'baja', ico:'▼' } : { txt:hcpFmt(a) + ' → ' + hcpFmt(d), cls:'sube', ico:'▲' };
  }

  function hcpTextoWhatsApp(p){
    const lineas = p.jugadores.map((j, i) => {
      const c = hcpCambio(j);
      const hcp = j.liga ? (c.cls === 'igual' ? 'hcp ' + hcpFmt(j.hcp_antes) + ' (igual)' : 'hcp ' + c.txt + (c.cls === 'baja' ? ' 🔻' : ' 🔺')) : 'invitado';
      return (i + 1) + '. ' + j.jugador + ' — ' + j.golpes + ' golpes, ' + j.neto + ' netos · ' + hcp;
    });
    return '📊 *HÁNDICAPS ACTUALIZADOS*\n' + (p.nombre || 'Partida de la liga') + '\n\n' + lineas.join('\n')
      + '\n\nCalculado solo por la app con la regla de la Federación. 🔒\n' + location.origin + location.pathname;
  }

  function renderHcpListado(){
    const el = document.getElementById('hcpListHome');
    if(!el) return;
    if(!hcpListados.length){ el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = hcpListados.slice(0, 2).map(p =>
      '<div class="hcpl">'
      + '<div class="eyebrow" style="margin:0;">📊 Hándicaps actualizados</div>'
      + '<div class="hcpl-sub">' + hcpEsc(p.nombre || 'Partida de la liga') + ' · ' + hcpEsc(hcpFecha(p.terminada)) + '</div>'
      + '<div class="hcpl-tabla">'
      + '<div class="hcpl-fila hcpl-cab"><span>Jugador</span><span>Golpes</span><span>Neto</span><span>Hándicap</span></div>'
      + p.jugadores.map(j => {
          const c = hcpCambio(j);
          return '<div class="hcpl-fila"><span class="hcpl-nom" title="' + hcpEsc(j.jugador) + '">' + hcpEsc(hcpNombreCorto(j.jugador)) + '</span>'
            + '<span>' + j.golpes + '</span><span>' + j.neto + '</span>'
            + '<span class="hcpl-h ' + c.cls + '">' + (c.ico ? '<i aria-hidden="true">' + c.ico + '</i> ' : '') + hcpEsc(c.txt) + '</span></div>';
        }).join('')
      + '</div>'
      + '<a class="premios-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(hcpTextoWhatsApp(p)) + '">Enviar al grupo</a>'
      + '</div>'
    ).join('');
  }

  async function loadHcpListado(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return;
    try {
      const { data, error } = await client.rpc('listado_handicap_reciente', { p_dias: 4 });
      if(error) throw error;
      hcpListados = Array.isArray(data) ? data : [];
    } catch(e){ hcpListados = []; }
    renderHcpListado();
  }

  loadHcpListado();
  setInterval(loadHcpListado, 60 * 1000); // si la app está abierta, el listado aparece solo al cumplirse los 15 minutos
