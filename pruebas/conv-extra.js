/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Convocatoria: botón para mandarla por mail y botón para volver a la liga
   (si se abrió desde una liga), en vez de salir a la portada. */
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

  function extras(){
    const ov = document.getElementById('convOverlay'); if(!ov || !conv) return;
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
