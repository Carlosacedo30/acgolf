/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Ganadores de la semana: pasar de semana con el mismo pasador que la clasificación ---
// «Esta semana», «La semana pasada», «Hace 2 semanas»… con las fechas debajo y «Volver a esta semana».
(function(){
  if(typeof renderPremios !== 'function' || typeof initSupabase !== 'function') return;
  const PRIMER_LUNES = '2026-09-28'; // la liga empezó a jugarse en la app la semana del 29 de septiembre
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const deIso = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const masDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
  let base = null;   // lunes de «esta semana» (el que da la app al empezar)
  let atras = 0;     // semanas hacia atrás
  let cargando = false;

  function rango(lunes){
    const a = deIso(lunes), b = deIso(masDias(lunes, 6));
    return a.getMonth() === b.getMonth()
      ? 'del ' + a.getDate() + ' al ' + b.getDate() + ' de ' + MESES[b.getMonth()]
      : 'del ' + a.getDate() + ' de ' + MESES[a.getMonth()].slice(0, 3) + '. al ' + b.getDate() + ' de ' + MESES[b.getMonth()];
  }
  const titulo = n => n === 0 ? 'Esta semana' : n === 1 ? 'La semana pasada' : 'Hace ' + n + ' semanas';

  function pasador(){
    const lunes = masDias(base, -7 * atras);
    const hayAntes = masDias(lunes, -7) >= PRIMER_LUNES;
    return '<div class="liga-month gn-pasador">'
      + '<button type="button" class="hole-nav-btn" id="gnAntes" aria-label="Semana anterior"' + (hayAntes && !cargando ? '' : ' disabled') + '><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg></button>'
      + '<div class="liga-month-txt"><div class="liga-month-label">' + titulo(atras) + '</div><div class="liga-month-sub">' + rango(lunes) + '</div></div>'
      + '<button type="button" class="hole-nav-btn" id="gnDespues" aria-label="Semana siguiente"' + (atras > 0 && !cargando ? '' : ' disabled') + '><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button></div>'
      + (atras > 0 ? '<button type="button" class="nv-hoy" id="gnHoy">Volver a esta semana</button>' : '');
  }

  const original = renderPremios;
  window.renderPremios = function(){
    const el = document.getElementById('premiosHome');
    const p = typeof premiosData !== 'undefined' ? premiosData : null;
    if(p && p.desde && !base) base = String(p.desde).slice(0, 10);
    original.apply(this, arguments);
    if(!el || !base) return;
    // semana sin tarjetas: se deja el pasador y un aviso, para poder seguir pasando
    if(!p || !p.tarjetas){
      el.style.display = '';
      el.innerHTML = '<div class="eyebrow" style="margin:0 0 8px;">Ganadores de la semana</div><div class="empty-hint">No hubo tarjetas de la liga esa semana.</div>';
    }
    el.insertAdjacentHTML('afterbegin', '<h1 class="nv-tit">Ganadores de la semana</h1>' + pasador());
    const top = el.querySelector('.premio.top .premio-titulo');
    if(top) top.textContent = atras === 0 ? 'Va ganando' : 'Ganador de la semana';
    const det = el.querySelector('.premio.top .premio-detalle');
    if(det && p && p.iscariote) det.textContent = p.iscariote.neto + ' netos';
    clasifSemana(el, masDias(base, -7 * atras));
    const fechas = el.querySelector('.premios-fechas'); if(fechas) fechas.textContent = (p && p.tarjetas ? p.tarjetas : 0) + ' tarjetas';
    const ir = n => { if(cargando) return; atras = Math.max(0, n); cargar(); };
    const a = el.querySelector('#gnAntes'), d = el.querySelector('#gnDespues'), h = el.querySelector('#gnHoy');
    if(a) a.onclick = () => ir(atras + 1);
    if(d) d.onclick = () => ir(atras - 1);
    if(h) h.onclick = () => ir(0);
  };

  // Clasificación de esa semana (de la liga: mejor neto de cada uno), debajo del ganador
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };
  const escH = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const semCache = {};
  async function clasifSemana(el, lunes){
    if(typeof fetchLigaMes !== 'function') return;
    let filas = semCache[lunes];
    if(!filas){
      const meses = [deIso(lunes), deIso(masDias(lunes, 6))];
      filas = [];
      for(const d of meses){
        try {
          const datos = await fetchLigaMes(d.getFullYear(), d.getMonth());
          const sem = ((datos && datos.semanas) || []).find(x => String(x.desde).slice(0, 10) === lunes);
          if(sem && sem.clasificacion && sem.clasificacion.length){ filas = sem.clasificacion; break; }
        } catch(e){}
      }
      semCache[lunes] = filas;
    }
    if(!filas.length || masDias(base, -7 * atras) !== lunes) return;
    const viejo = el.querySelector('.gn-lista'); if(viejo) viejo.remove();
    const html = '<div class="gn-lista">' + filas.map(f => '<div class="gn-fila"><span class="gn-pos">' + escH(f.pos) + '</span><span class="gn-nom">' + escH(corto(f.jugador)) + '</span><span class="gn-neto">' + escH(f.neto) + ' netos</span></div>').join('') + '</div>';
    const top = el.querySelector('.premio.top');
    if(top) top.insertAdjacentHTML('afterend', html);
  }

  function cargar(){
    const client = initSupabase(); if(!client || !base) return;
    cargando = true; window.renderPremios();
    client.rpc('premios_semana', { p_lunes: masDias(base, -7 * atras) }).then(({ data, error }) => {
      cargando = false;
      if(!error && data){ premiosData = data; }
      window.renderPremios();
    }, () => { cargando = false; window.renderPremios(); });
  }
  if(typeof premiosData !== 'undefined' && premiosData) window.renderPremios();
})();
