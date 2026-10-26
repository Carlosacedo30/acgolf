/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Panel de super administrador → «📈 Seguimiento» ---
// Todo de un vistazo: visitas que llegan de las redes, quién prueba sin registrarse, cuentas nuevas,
// quién la instala, partidas, grupos, gente mirando en directo y el anuncio del patrocinador.
// Los datos salen de la función sa_seguimiento (solo el super administrador puede leerla).
(function(){
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const RED = { instagram:'📸 Instagram', tiktok:'🎵 TikTok', youtube:'▶️ YouTube', facebook:'👍 Facebook', whatsapp:'💬 WhatsApp', qr:'🔳 Código QR', web:'🌐 Web', directo:'🔗 Directo (sin enlace)' };
  const fecha = d => d ? new Date(d).toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : '—';
  const fechaHora = d => d ? new Date(d).toLocaleString('es-ES', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
  const pct = (a, b) => b ? Math.round(a * 100 / b) + ' %' : '—';
  let periodo = '7';
  let guardado = null, abierta = null, patro = null;
  // Desde cuándo cuenta cada periodo (igual que en la base de datos)
  function desdePeriodo(){
    if(periodo === 'todo') return 0;
    if(periodo === 'hoy'){ const h = new Date(); h.setHours(0, 0, 0, 0); return h.getTime(); }
    return Date.now() - (+periodo) * 86400000;
  }
  // Al tocar «Cuentas nuevas»: quiénes son (del periodo elegido)
  function listaCuentas(d){
    const desde = desdePeriodo();
    const l = (d.nuevos || []).filter(u => !u.invitado && new Date(u.creado).getTime() >= desde);
    const titulo = { hoy:'hoy', '7':'últimos 7 días', '30':'últimos 30 días', todo:'desde el principio' }[periodo];
    return '<div class="sg-detalle"><h3 class="sg-h">🙋 Cuentas nuevas <small>' + titulo + ' · ' + l.length + '</small></h3>'
      + (l.length ? '<div class="pa-lista">' + l.map(u => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(u.nombre)
          + (!u.confirmado ? ' <em class="sg-et gris">Sin confirmar el correo</em>' : '') + '</b>'
          + '<span>' + esc(u.email || '') + '</span>'
          + '<span>Se registró el ' + fechaHora(u.creado) + ' · ' + (u.grupos && u.grupos.length ? esc(u.grupos.join(', ')) : '<i>todavía sin grupo</i>') + '</span>'
          + '<span>Última vez que entró: ' + fechaHora(u.ultima) + '</span></div></div>').join('') + '</div>'
        : '<p class="sg-vacio">Nadie se ha registrado en este tiempo.</p>')
      + '<button type="button" class="pa-b sg-cerrar" data-ver="cuentas">Cerrar la lista</button></div>';
  }

  async function pintar(caja, client){
    caja.innerHTML = '<p class="sg-carga">Cargando los datos…</p>';
    const [res, resP] = await Promise.all([client.rpc('sa_seguimiento', { p_dias: 30 }), client.rpc('sa_patrocinio').catch(() => ({ data: null }))]);
    const { data, error } = res;
    if(error){ caja.innerHTML = '<p class="sg-carga">No se pudieron cargar los datos. Prueba en un rato.</p>'; return; }
    guardado = data; patro = (resP && resP.data) || null;
    dibujar(caja);
  }

  // ---------- El patrocinador, claro y explicado (lo que se le puede enseñar) ----------
  function seccionPatro(nombreP){
    if(!patro || !(patro.patrocinadores || []).length) return '<h3 class="sg-h">📢 Patrocinador</h3><p class="sg-vacio">Todavía no hay datos del patrocinador.</p>';
    const dir = (patro.directo || {})[periodo] || {};
    const dias = patro.por_dia || [];
    const maxD = Math.max(1, ...dias.map(x => x.vieron || 0));
    return (patro.patrocinadores || []).map(nombre => {
      const x = ((patro.periodos || {})[periodo] || {})[nombre] || { vistas: 0, personas_vieron: 0, toques: 0, personas_tocaron: 0, por_grupo: [], quien: [] };
      const fichas = [
        ['👁', x.personas_vieron, 'personas lo vieron', x.vistas + (x.vistas === 1 ? ' vez' : ' veces') + ' en total'],
        ['👆', x.personas_tocaron, 'fueron a su web', x.toques + (x.toques === 1 ? ' toque' : ' toques') + ' en total'],
        ['🎯', x.personas_vieron ? Math.round(x.personas_tocaron * 100 / x.personas_vieron) + ' %' : '—', 'de los que lo ven, van a su web', 'cuanto más alto, mejor'],
        ['📺', dir.personas || 0, 'vieron el directo', (dir.minutos || 0) + ' minutos con su franja en pantalla'],
      ];
      return '<div class="sg-patro"><h3 class="sg-h">📢 ' + esc(nombre) + ' <small>patrocinador · ' + nombreP + '</small></h3>'
        + '<div class="sg-fichas">' + fichas.map(f => '<div class="sg-ficha"><i>' + f[0] + '</i><b>' + f[1] + '</b><span>' + f[2] + '</span><small>' + f[3] + '</small></div>').join('') + '</div>'
        + '<h4 class="sg-h4">Por grupo</h4>'
        + (x.por_grupo.length ? '<table class="sg-tabla"><thead><tr><th>Grupo</th><th>Lo vieron</th><th>Fueron a su web</th></tr></thead><tbody>'
            + x.por_grupo.map(g => '<tr><td>' + esc(g.grupo) + '</td><td>' + g.vieron + '</td><td>' + (g.tocaron ? '<b>' + g.tocaron + '</b>' : '0') + '</td></tr>').join('') + '</tbody></table>'
          : '<p class="sg-vacio">Nadie en este tiempo.</p>')
        + '<h4 class="sg-h4">Día a día <small>últimos 30 días · lo vieron <i class="sg-lv"></i> · fueron a su web <i class="sg-lr"></i></small></h4>'
        + '<div class="sg-dias">' + dias.map(d => '<div class="sg-dia" title="' + fecha(d.dia) + ': ' + d.vieron + ' lo vieron, ' + d.tocaron + ' fueron a su web">'
            + '<div class="sg-col"><i class="v" style="height:' + ((d.vieron || 0) * 100 / maxD) + '%"></i><i class="r" style="height:' + ((d.tocaron || 0) * 100 / maxD) + '%"></i></div>'
            + '<span>' + new Date(d.dia).getDate() + '</span></div>').join('') + '</div>'
        + '<h4 class="sg-h4">¿Quién fue a su web? <small>' + nombreP + '</small></h4>'
        + (x.quien.length ? '<div class="pa-lista">' + x.quien.map(q => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(q.jugador) + ' <em class="sg-et">' + q.toques + (q.toques === 1 ? ' vez' : ' veces') + '</em></b>'
            + '<span>' + esc(q.grupo || '') + ' · la última, el ' + fechaHora(q.ultimo) + '</span></div></div>').join('') + '</div>'
          : '<p class="sg-vacio">Nadie ha ido a su web ' + nombreP + '.</p>')
        + '<div class="sg-enviar"><b>📤 Enviar este informe a ' + esc(nombre) + '</b><small>Solo van los números, sin nombres de jugadores.</small>'
        + '<div class="sg-enviar-b"><button type="button" class="pa-b" data-env="wa" data-patro="' + esc(nombre) + '">WhatsApp</button>'
        + '<button type="button" class="pa-b" data-env="mail" data-patro="' + esc(nombre) + '">Correo</button>'
        + '<button type="button" class="pa-b" data-env="copiar" data-patro="' + esc(nombre) + '">Copiar</button></div></div>'
        + '<div class="sg-explica"><b>Qué significa cada número</b>'
        + '<span><b>Lo vieron:</b> su logo o su anuncio salió en la pantalla de esa persona. Cada persona cuenta una sola vez al día.</span>'
        + '<span><b>Fueron a su web:</b> tocaron su enlace y se abrió su tienda. Los enlaces llevan la etiqueta «acgolf», así que él también ve en sus estadísticas las visitas que le llegan desde la app.</span>'
        + '<span><b>Vieron el directo:</b> personas que siguieron una partida en directo, donde su nombre sale siempre abajo.</span>'
        + '<span>No te contamos a ti. Datos desde el ' + fecha(patro.desde) + '.</span></div></div>';
    }).join('');
  }

  // Informe para el patrocinador: solo números (nunca nombres de jugadores)
  function informePatro(nombre){
    const x = ((patro.periodos || {})[periodo] || {})[nombre] || { vistas: 0, personas_vieron: 0, toques: 0, personas_tocaron: 0, por_grupo: [] };
    const dir = (patro.directo || {})[periodo] || {};
    const hoy = new Date(), dd = d => d.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
    const desde = periodo === 'todo' ? (patro.desde ? new Date(patro.desde) : null) : periodo === 'hoy' ? hoy : new Date(Date.now() - (+periodo) * 86400000);
    const per = periodo === 'hoy' ? 'hoy, ' + dd(hoy) : (desde ? 'del ' + dd(desde) + ' al ' + dd(hoy) : 'desde el principio');
    const pctT = x.personas_vieron ? Math.round(x.personas_tocaron * 100 / x.personas_vieron) + ' %' : '—';
    return '📢 Informe de acgolf para ' + nombre + '\n'
      + 'Periodo: ' + per + '\n\n'
      + '👁 ' + x.personas_vieron + ' personas vieron vuestra marca en la app (' + x.vistas + ' veces)\n'
      + '👆 ' + x.personas_tocaron + ' entraron en vuestra web (' + x.toques + ' visitas)\n'
      + '🎯 ' + pctT + ' de los que os ven entran en la web\n'
      + '📺 ' + (dir.personas || 0) + ' personas siguieron partidas en directo con vuestro nombre en pantalla (' + (dir.minutos || 0) + ' minutos)\n'
      + (x.por_grupo.length ? '\nPor grupo:\n' + x.por_grupo.filter(g => g.grupo !== 'Sin grupo').map(g => '• ' + g.grupo + ': ' + g.vieron + (g.vieron === 1 ? ' os vio, ' : ' os vieron, ') + g.tocaron + (g.tocaron === 1 ? ' entró en la web' : ' entraron en la web')).join('\n') + '\n' : '')
      + '\nEn vuestras estadísticas, estas visitas aparecen con la etiqueta «acgolf».\n'
      + '¡Gracias por patrocinar acgolf! ⛳ acgolf.es';
  }

  function dibujar(caja){
    const d = guardado || {}, P = (d.periodos || {})[periodo] || {}, T = d.totales || {};
    const nombreP = { hoy:'hoy', '7':'en los últimos 7 días', '30':'en los últimos 30 días', todo:'desde el principio' }[periodo];
    const fichas = [
      ['👀', P.visitas, 'Visitas a la web', 'personas distintas'],
      ['⛳', P.pruebas, 'Probaron sin registro', 'con «Probar sin registrarme»'],
      ['🙋', P.registros, 'Cuentas nuevas', 'toca para ver quiénes', 'cuentas'],
      ['📲', P.instaladas, 'La instalaron', 'en el móvil'],
      ['🏌️', P.partidas, 'Partidas creadas', ''],
      ['👥', P.grupos, 'Grupos nuevos', ''],
      ['📺', P.espectadores, 'Miraron en directo', (P.minutos_vivo || 0) + ' minutos en total'],
      ['📢', P.anuncio_vistas, 'Vieron al patrocinador', (P.anuncio_toques || 0) + ' toques · detalle abajo'],
    ];
    const P30 = (d.periodos || {})['30'] || {};
    const emb = [['Visitan la web', P30.visitas || 0], ['Prueban sin registro', P30.pruebas || 0], ['Se registran', P30.registros || 0], ['La instalan', P30.instaladas || 0]];
    const maxE = Math.max(1, ...emb.map(e => e[1]));
    const orig = d.por_origen || [];
    const maxO = Math.max(1, ...orig.map(o => o.visitas || 0));
    const dias = (d.por_dia || []).slice(-30);
    const maxD = Math.max(1, ...dias.map(x => Math.max(x.visitas || 0, x.registros || 0)));
    const nuevos = (d.nuevos || []).filter(u => new Date(u.creado).getTime() >= Date.now() - 30 * 86400000), grupos = d.grupos || [], vivo = d.en_vivo || [];

    caja.innerHTML =
      '<div class="sg-tot">En total: <b>' + (T.usuarios || 0) + '</b> cuentas · <b>' + (T.grupos || 0) + '</b> grupos · <b>' + (T.partidas || 0) + '</b> partidas'
        + (T.invitados ? ' · <b>' + T.invitados + '</b> probando sin cuenta' : '') + '</div>'
      + '<div class="sg-per">' + [['hoy','Hoy'],['7','7 días'],['30','30 días'],['todo','Todo']].map(p => '<button type="button" data-p="' + p[0] + '" class="' + (p[0] === periodo ? 'on' : '') + '">' + p[1] + '</button>').join('') + '</div>'
      + '<p class="sg-nota">Lo que ha pasado <b>' + nombreP + '</b>:</p>'
      + '<div class="sg-fichas">' + fichas.map(f => (f[4] ? '<button type="button" class="sg-ficha sg-toca' + (abierta === f[4] ? ' on' : '') + '" data-ver="' + f[4] + '">' : '<div class="sg-ficha">') + '<i>' + f[0] + '</i><b>' + (f[1] || 0) + '</b><span>' + f[2] + '</span>' + (f[3] ? '<small>' + f[3] + '</small>' : '') + (f[4] ? '</button>' : '</div>')).join('') + '</div>'
      + (abierta === 'cuentas' ? listaCuentas(d) : '')
      + seccionPatro(nombreP)

      + '<h3 class="sg-h">De cada 100 que llegan… <small>últimos 30 días</small></h3>'
      + '<div class="sg-emb">' + emb.map((e, i) => '<div class="sg-emb-f"><span>' + e[0] + '</span><div class="sg-barra"><i style="width:' + Math.max(2, e[1] * 100 / maxE) + '%"></i></div><b>' + e[1] + '</b><em>' + (i ? pct(e[1], emb[0][1]) : '') + '</em></div>').join('') + '</div>'

      + '<h3 class="sg-h">¿De dónde vienen? <small>últimos 30 días</small></h3>'
      + (orig.length ? '<div class="sg-orig">' + orig.map(o => '<div class="sg-orig-f"><div class="sg-orig-t"><b>' + esc(RED[o.origen] || o.origen) + '</b><span>' + o.visitas + ' visitas · ' + o.pruebas + ' prueban · ' + o.registros + ' se registran · ' + o.instaladas + ' instalan</span></div>'
          + '<div class="sg-barra"><i style="width:' + Math.max(2, (o.visitas || 0) * 100 / maxO) + '%"></i></div></div>').join('') + '</div>'
        : '<p class="sg-vacio">Todavía no hay visitas.</p>')
      + '<p class="sg-nota">Para saber de qué red llega cada uno, el enlace de cada perfil tiene que ser: <b>acgolf.es/?r=ig</b> (Instagram), <b>?r=tt</b> (TikTok), <b>?r=yt</b> (YouTube) y <b>?r=fb</b> (Facebook). Los que salen como «Directo» llegaron sin ese enlace.</p>'

      + '<h3 class="sg-h">Día a día <small>visitas <i class="sg-lv"></i> · cuentas nuevas <i class="sg-lr"></i></small></h3>'
      + '<div class="sg-dias">' + dias.map(x => '<div class="sg-dia" title="' + fecha(x.dia) + ': ' + x.visitas + ' visitas, ' + x.registros + ' cuentas, ' + x.partidas + ' partidas">'
          + '<div class="sg-col"><i class="v" style="height:' + ((x.visitas || 0) * 100 / maxD) + '%"></i><i class="r" style="height:' + ((x.registros || 0) * 100 / maxD) + '%"></i></div>'
          + '<span>' + new Date(x.dia).getDate() + '</span></div>').join('') + '</div>'

      + '<h3 class="sg-h">Nuevas incorporaciones <small>' + nuevos.length + ' en 30 días</small></h3>'
      + (nuevos.length ? '<div class="pa-lista">' + nuevos.map(u => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(u.nombre)
            + (u.invitado ? ' <em class="sg-et">Probando</em>' : !u.confirmado ? ' <em class="sg-et gris">Sin confirmar</em>' : '') + '</b>'
            + (u.email ? '<span>' + esc(u.email) + '</span>' : '')
            + '<span>Llegó el ' + fechaHora(u.creado) + (u.grupos && u.grupos.length ? ' · ' + esc(u.grupos.join(', ')) : ' · <i>sin grupo</i>') + '</span>'
            + '<span>Última vez: ' + fechaHora(u.ultima) + '</span></div></div>').join('') + '</div>'
        : '<p class="sg-vacio">Nadie nuevo en estos 30 días.</p>')

      + '<h3 class="sg-h">Grupos</h3>'
      + '<div class="pa-lista">' + grupos.map(g => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(g.nombre) + '</b>'
          + '<span>' + g.miembros + ' miembros' + (g.nuevos30 ? ' (' + g.nuevos30 + ' nuevos este mes)' : '') + ' · ' + g.partidas30 + ' partidas este mes · ' + g.partidas + ' en total</span>'
          + '<span>Última partida: ' + fecha(g.ultima) + ' · desde el ' + fecha(g.creado) + '</span></div></div>').join('') + '</div>'

      + '<h3 class="sg-h">Partidas vistas en directo</h3>'
      + (vivo.length ? '<div class="pa-lista">' + vivo.map(v => '<div class="pa-fila"><div class="pa-fila-t"><b>' + (v.resumen ? '🎬 Resumen · ' : '📺 ') + esc(v.partida || v.codigo) + '</b>'
            + '<span>' + fecha(v.dia) + ' · ' + v.personas + ' personas' + (v.resumen ? '' : ' · ' + v.minutos + ' minutos mirando') + '</span></div></div>').join('') + '</div>'
        : '<p class="sg-vacio">Todavía nadie ha seguido una partida en directo.</p>')
      + '<p class="sg-nota">Las visitas, pruebas e instalaciones se cuentan desde el 24 de octubre de 2026. Nunca se guarda quién es cada visitante: solo un número al azar de su móvil.</p>';

    caja.querySelectorAll('.sg-per button').forEach(b => b.onclick = () => { periodo = b.dataset.p; dibujar(caja); });
    caja.querySelectorAll('[data-env]').forEach(b => b.onclick = async () => {
      const t = informePatro(b.dataset.patro);
      if(b.dataset.env === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
      else if(b.dataset.env === 'mail') location.href = 'mailto:?subject=' + encodeURIComponent('Informe de acgolf para ' + b.dataset.patro) + '&body=' + encodeURIComponent(t);
      else { try { await navigator.clipboard.writeText(t); b.textContent = '¡Copiado!'; setTimeout(() => { b.textContent = 'Copiar'; }, 2000); } catch(e){ prompt('Copia el informe:', t); } }
    });
    caja.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { abierta = abierta === b.dataset.ver ? null : b.dataset.ver; dibujar(caja); if(abierta){ const l = caja.querySelector('.sg-detalle'); if(l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  }

  window.acgolfSeguimiento = pintar;
})();
