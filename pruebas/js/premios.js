/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Premios de la semana (lunes a domingo), calculados en Supabase con premios_semana() ---
  // Se muestran en Inicio y se pueden enviar al grupo de WhatsApp con un toque.
  const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  let premiosData = null;

  function premiosFecha(iso){
    const [y, m, d] = String(iso).split('-').map(Number);
    return d + ' ' + MESES_CORTOS[m - 1];
  }
  function premiosNombreCampo(id){
    return id === 'zaudin' ? 'Zaudín' : 'Hato Verde';
  }
  function premiosSigno(n){
    n = Number(n);
    return n > 0 ? '+' + n : String(n);
  }

  // Lista de premios lista para pintar o para compartir (solo los que tienen ganador)
  function premiosLista(p){
    const out = [];
    if(p.iscariote) out.push({ ico:'corona', wa:'👑', titulo:'Iscariote de la semana', quien:p.iscariote.jugador,
      detalle: p.iscariote.neto + ' netos (' + p.iscariote.bruto + ' golpes − ' + p.iscariote.hcp + ' de hándicap)',
      regalo: (typeof PATROCINADOR !== 'undefined' && PATROCINADOR) ? PATROCINADOR.premioIscariote : '' });
    if(p.mejora) out.push({ ico:'sube', wa:'📈', titulo:'El que más mejora', quien:p.mejora.jugador,
      detalle: String(p.mejora.golpes).replace('.', ',') + ' golpes mejor que su media' });
    if(p.birdies) out.push({ ico:'pluma', wa:'🐦', titulo:'Rey de los birdies', quien:p.birdies.jugador,
      detalle: p.birdies.n + (p.birdies.n === 1 ? ' birdie' : ' birdies') });
    if(p.hoyo_maldito) out.push({ ico:'llama', wa:'😈', titulo:'Hoyo maldito', quien:'Hoyo ' + p.hoyo_maldito.hoyo + ' de ' + premiosNombreCampo(p.hoyo_maldito.course_id),
      detalle: premiosSigno(p.hoyo_maldito.sobre_par).replace('.', ',') + ' golpes de media para todos' });
    if(p.piedra) out.push({ ico:'piedra', wa:'🧨', titulo:'La piedra', quien:p.piedra.jugador,
      detalle: p.piedra.golpes + ' golpes en el hoyo ' + p.piedra.hoyo + ' (par ' + p.piedra.par + ')' });
    return out;
  }

  function premiosTextoWhatsApp(p){
    const lista = premiosLista(p);
    return '🏆 *PREMIOS DE LA SEMANA* · ' + premiosFecha(p.desde) + ' – ' + premiosFecha(p.hasta) + '\n'
      + lista.map(x => '\n' + x.wa + ' *' + x.titulo + '*\n' + x.quien + ' — ' + x.detalle + (x.regalo ? '\n🎁 ' + x.regalo : '')).join('\n')
      + '\n\n⛳ ' + p.tarjetas + ' tarjetas jugadas. ¡A por la próxima semana!'
      + ((typeof PATROCINADOR !== 'undefined' && PATROCINADOR) ? '\n\n🤝 Premios patrocinados por *' + PATROCINADOR.nombre + '* 👉 ' + PATROCINADOR.web : '')
      + '\n' + location.origin + location.pathname;
  }

  function renderPremios(){
    const el = document.getElementById('premiosHome');
    if(!el) return;
    const p = premiosData;
    if(!p || !p.tarjetas){ el.style.display = 'none'; return; }
    const lista = premiosLista(p);
    el.style.display = '';
    el.innerHTML =
      '<div class="premios-head">'
      + '<div><div class="eyebrow" style="margin:0;">' + icono('trofeo') + ' Ganadores de la semana</div>'
      + '<div class="premios-fechas">' + premiosFecha(p.desde) + ' – ' + premiosFecha(p.hasta) + ' · ' + p.tarjetas + ' tarjetas</div></div>'
      + '</div>'
      + '<div class="premios-lista">' + lista.map((x, i) =>
          '<div class="premio' + (i === 0 ? ' top' : '') + '">'
          + '<div class="premio-ico">' + icono(x.ico) + '</div>'
          + '<div class="premio-txt"><div class="premio-titulo">' + x.titulo + '</div>'
          + '<div class="premio-quien">' + x.quien + '</div>'
          + '<div class="premio-detalle">' + x.detalle + '</div>' + (x.regalo ? '<div class="premio-regalo">' + icono('regalo') + x.regalo + '</div>' : '') + '</div></div>'
        ).join('') + '</div>'
      + '<a class="premios-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(premiosTextoWhatsApp(p)) + '">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
      + 'Enviar al grupo</a>';
  }

  function loadPremios(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return;
    client.rpc('premios_semana').then(({ data, error })=>{
      if(error || !data) return;
      premiosData = data;
      renderPremios();
    });
  }

  loadPremios();
