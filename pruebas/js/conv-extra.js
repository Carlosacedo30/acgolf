/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Convocatoria: botón para mandarla por mail, botón para volver a la liga
   (si se abrió desde una liga), y el nombre de la liga y la jornada si es de una liga
   (en la convocatoria, en la tarjeta de la portada y en el mensaje de WhatsApp). */

// Si la convocatoria es de una liga (su código es «código de la liga» + J + número), devuelve la liga y la jornada
function ligaDeConv(code){
  const m = String(code || '').match(/^(.+)J(\d+)$/);
  if(!m || typeof ligasTodas === 'undefined') return null;
  const l = ligasTodas.find(x => x.code === m[1]);
  if(!l) return null;
  return { liga: l, n: Number(m[2]), total: l.jornadas.length };
}
function ligaDeConvTexto(code){
  const d = ligaDeConv(code);
  return d ? d.liga.nombre + ' · Jornada ' + d.n + ' de ' + d.total : '';
}

(function(){
  if(typeof renderConv !== 'function') return;
  const pintarOriginal = renderConv;
  window.renderConv = function(){
    const r = pintarOriginal.apply(this, arguments);
    try { extras(); } catch(e){ console.error(e); }
    return r;
  };
  const cerrarOriginal = typeof closeConv === 'function' ? closeConv : null;
  if(cerrarOriginal) window.closeConv = function(){ window.convVolverLiga = null; return cerrarOriginal.apply(this, arguments); };

  // Tarjetas de la portada: «Liga de otoño · Jornada 3 de 8» en vez de «Próxima salida»
  if(typeof renderConvHome === 'function'){
    const portadaOriginal = renderConvHome;
    window.renderConvHome = function(){
      const r = portadaOriginal.apply(this, arguments);
      try {
        document.querySelectorAll('#convHome [data-conv-code]').forEach(card => {
          const t = ligaDeConvTexto(card.dataset.convCode);
          const ey = card.querySelector('.conv-home-eyebrow');
          if(t && ey) ey.textContent = t;
        });
      } catch(e){}
      return r;
    };
  }
  // Mensaje de WhatsApp: primera línea con la liga y la jornada
  if(typeof convWaHref === 'function'){
    const waOriginal = convWaHref;
    window.convWaHref = function(){
      const href = waOriginal.apply(this, arguments);
      const t = conv ? ligaDeConvTexto(conv.code) : '';
      if(!t) return href;
      try {
        const u = new URL(href);
        u.searchParams.set('text', '🏆 *' + t + '*\n' + (u.searchParams.get('text') || ''));
        return 'https://wa.me/?text=' + encodeURIComponent(u.searchParams.get('text'));
      } catch(e){ return href; }
    };
  }
  // Cuando terminan de cargar las ligas, se repintan la portada y la convocatoria abierta
  if(typeof ligaCargar === 'function'){
    const cargarOriginal = ligaCargar;
    window.ligaCargar = async function(){
      const r = await cargarOriginal.apply(this, arguments);
      try {
        renderConvHome();
        const ov = document.getElementById('convOverlay');
        if(ov && !ov.hidden && conv && !document.getElementById('convNewDate')) renderConv();
      } catch(e){}
      return r;
    };
  }

  function extras(){
    const ov = document.getElementById('convOverlay'); if(!ov || !conv) return;
    const t = ligaDeConvTexto(conv.code);
    const body = document.getElementById('convBody');
    if(t && body && !body.querySelector('.conv-liga')){
      const d = document.createElement('div');
      d.className = 'conv-liga';
      d.innerHTML = (typeof icono === 'function' ? icono('trofeo') : '') + '<span></span>';
      d.querySelector('span').textContent = t;
      body.insertBefore(d, body.firstChild);
    }
    // Jornada de liga: los grupos los hace el administrador en la liga, así que no hace falta la lista para apuntarse
    if(t && body){
      body.querySelectorAll('.conv-search, .conv-list').forEach(e => e.remove());
      body.querySelectorAll('.conv-eyebrow').forEach(e => { if(/Qui[eé]n eres/i.test(e.textContent)) e.remove(); });
      if(!body.querySelector('.conv-liga-nota')){
        const nota = document.createElement('div');
        nota.className = 'lg-aviso conv-liga-nota';
        nota.textContent = 'Partidas de la jornada preparadas por el administrador. Si no puedes venir, avísale.';
        const tees = body.querySelector('.conv-tees');
        if(tees && tees.nextSibling) body.insertBefore(nota, tees.nextSibling); else body.appendChild(nota);
      }
    }
    const acc = ov.querySelector('.conv-actions'); if(!acc) return;
    const p = window.miPerfil;
    if(p && p.es_admin && !acc.querySelector('#convMail')){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'conv-btn ghost'; b.id = 'convMail';
      b.textContent = '✉️ Enviar la convocatoria por mail';
      const wa = acc.querySelector('#convShareWa');
      if(wa && wa.nextSibling) acc.insertBefore(b, wa.nextSibling); else acc.appendChild(b);
      b.addEventListener('click', async ()=>{
        if(b.dataset.busy) return; b.dataset.busy = '1'; b.textContent = 'Enviando…';
        await acgolfMandarMail('https://carlosacedo30.github.io/acgolf/pruebas/?conv=' + encodeURIComponent(conv.code), 'la convocatoria');
        delete b.dataset.busy; b.textContent = '✉️ Enviar la convocatoria por mail';
      });
    }
    const code = window.convVolverLiga;
    if(code && !ov.querySelector('#convVolverLiga')){
      const v = document.createElement('button');
      v.type = 'button'; v.className = 'conv-btn primary'; v.id = 'convVolverLiga';
      v.textContent = '‹ Volver a la liga';
      acc.insertBefore(v, acc.firstChild);
      v.addEventListener('click', async ()=>{
        closeConv();
        if(typeof ligaVentana !== 'function') return;
        ligaVentana().hidden = false;
        if(!ligasTodas.some(l => l.code === code)){ try { await ligaCargar(); } catch(e){} }
        ligaVer(code);
      });
    }
  }
})();
