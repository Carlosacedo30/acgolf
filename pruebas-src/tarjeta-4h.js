/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Norma de Carlos (23-nov-2026): la tarjeta se abre 4 horas antes de la primera salida, todo el partido a la vez.
// Sin hora: se abre desde el principio de ese día. El administrador puede abrirla antes.
(function(){
  const HORAS_ANTES = 4;
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const esAdmin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const hm = v => { const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '')); return m ? [+m[1], +m[2]] : null; };
  // Momento en que se abre: { cuando: Date, conHora: bool } o null si no hay fecha
  function apertura(fecha, horas){
    const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || ''); if(!f) return null;
    const lista = (horas || []).map(hm).filter(Boolean).sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
    const dia = new Date(+f[1], +f[2] - 1, +f[3], 0, 0, 0);
    if(!lista.length) return { cuando: dia, conHora: false, dia };
    const salida = new Date(+f[1], +f[2] - 1, +f[3], lista[0][0], lista[0][1], 0);
    return { cuando: new Date(salida.getTime() - HORAS_ANTES * 3600 * 1000), conHora: true, dia };
  }
  const dosd = n => String(n).padStart(2, '0');
  function textoApertura(a){
    if(!a) return '';
    if(!a.conHora) return 'el ' + DIAS[a.dia.getDay()] + ' ' + a.dia.getDate();
    const mismoDia = a.cuando.toDateString() === a.dia.toDateString();
    return 'a las ' + a.cuando.getHours() + ':' + dosd(a.cuando.getMinutes()) + (mismoDia ? '' : ' del ' + DIAS[a.cuando.getDay()] + ' ' + a.cuando.getDate());
  }
  function cerrada(fecha, horas){
    if(esAdmin()) return false;
    const a = apertura(fecha, horas); if(!a) return false;
    return Date.now() < a.cuando.getTime();
  }
  function aviso(fecha, horas){
    const a = apertura(fecha, horas); if(!a) return;
    const viejo = document.getElementById('t4Ov'); if(viejo) viejo.remove();
    const ov = document.createElement('div'); ov.id = 't4Ov'; ov.className = 't4-ov';
    ov.innerHTML = '<div class="t4-caja" role="dialog" aria-modal="true"><div class="t4-eti">TARJETA CERRADA</div>'
      + '<div class="t4-tit">🔒 Se abre ' + textoApertura(a) + '</div>'
      + '<p>' + (a.conHora ? 'Se abre ' + HORAS_ANTES + ' horas antes de la salida' : 'Se abre el día del partido') + ', para que la cargues con buena cobertura antes de salir al campo.</p>'
      + '<button type="button" class="t4-ok">ENTENDIDO</button></div>';
    ov.addEventListener('click', e => { if(e.target === ov || e.target.closest('.t4-ok')) ov.remove(); });
    document.body.appendChild(ov);
  }
  window.acgolfTarjeta4h = { apertura, cerrada, aviso, texto: (f, h) => textoApertura(apertura(f, h)) };
  // La etiqueta de «Partida creada» se refresca sola cuando llega la hora
  setInterval(() => { try { if(document.querySelector('.ip-cerrada') && typeof renderConvHome === 'function') renderConvHome(); } catch(e){} }, 60000);
})();
