// © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
// Aviso cuando se intenta cambiar un golpe de una partida ya cerrada (pasadas 12 horas) o de una tarjeta entregada.
(function(){
  let abierto = false;
  window.acgolfAvisoCerrada = function(){
    if(abierto) return; abierto = true;
    const fondo = document.createElement('div');
    fondo.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
    fondo.innerHTML = '<div role="alertdialog" aria-modal="true" style="background:#2F3A1C;border:1px solid #C6F24E;border-radius:18px;padding:20px;max-width:340px;width:100%;color:#F2F4F5;font-family:Barlow,system-ui,sans-serif;">'
      + '<div style="font-family:Archivo,Barlow,sans-serif;font-weight:800;font-size:19px;margin-bottom:6px;">No se ha guardado</div>'
      + '<div style="font-size:15px;line-height:1.4;margin-bottom:16px;">Esta partida ya está cerrada (pasaron más de 12 horas). Si hay un error, díselo a acgolf.</div>'
      + '<button type="button" style="width:100%;padding:13px;border:0;border-radius:999px;background:#C6F24E;color:#111316;font-family:Archivo,Barlow,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Entendido</button></div>';
    const b = fondo.querySelector('button');
    b.addEventListener('pointerdown', ()=>{ b.style.transform = 'scale(.97)'; });
    b.addEventListener('click', ()=>{ fondo.remove(); abierto = false; });
    document.body.appendChild(fondo);
  };
})();
