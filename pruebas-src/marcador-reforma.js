/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Hoja de apuntar golpes más clara (pedida por Carlos): nombre completo, par / recibes / tu par,
// vista previa grande y teclas con los colores de siempre. Se apoya en el teclado de siempre.
(function(){
  if(typeof openNumPad !== 'function') return;
  const orig = openNumPad;
  const clase = d => d <= -2 ? ['tb-eagle', 'Águila'] : d === -1 ? ['tb-birdie', 'Birdie'] : d === 0 ? ['tb-par', 'Par'] : d === 1 ? ['tb-bogey', 'Bogey'] : ['tb-doble', d === 2 ? 'Doble bogey' : '+' + d];
  const marca = (v, par) => { const c = clase(v === 1 ? -3 : v - par); return '<span class="tb-m ' + c[0] + ' np-m">' + v + '</span>'; };
  window.openNumPad = function(o){
    orig.apply(this, arguments);
    try {
      const sheet = document.querySelector('#numPadOverlay .np-sheet'), grid = document.getElementById('npGrid');
      if(!sheet || !grid) return;
      const par = o.par, rec = (o.tuPar != null && par != null) ? o.tuPar - par : 0;
      document.getElementById('npSub').textContent = '¿Cuántos golpes en el hoyo ' + o.hole + '?';
      let ch = document.getElementById('npChips');
      if(!ch){ ch = document.createElement('div'); ch.id = 'npChips'; grid.parentNode.insertBefore(ch, grid); }
      ch.innerHTML = '<div><small>PAR</small>' + (par != null ? par : '—') + '</div><div><small>RECIBES</small>' + rec + (rec ? ' ●' : '') + '</div><div><small>TU PAR</small>' + (o.tuPar != null ? o.tuPar : '—') + '</div>';
      let pv = document.getElementById('npPrev');
      if(!pv){ pv = document.createElement('div'); pv.id = 'npPrev'; grid.parentNode.insertBefore(pv, grid); }
      const cur = parseInt(o.value, 10);
      pv.innerHTML = isNaN(cur) || par == null ? '<span>Toca el número de golpes</span>' : marca(cur, par) + '<div><b>' + clase(cur === 1 ? -3 : cur - par)[1] + '</b><span>Neto ' + (cur - rec) + '</span></div>';
      if(par != null) grid.querySelectorAll('.np-key').forEach(k => {
        const v = +k.dataset.v, c = clase(v === 1 ? -3 : v - par);
        k.innerHTML = '<span class="tb-m ' + c[0] + ' np-m">' + v + '</span><small>' + c[1] + '</small>';
      });
    } catch(e){ console.error(e); }
  };
})();
