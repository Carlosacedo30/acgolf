/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Más protagonismo para el patrocinador ---
// · Bienvenida: al abrir la app, 2 segundos con «acgolf · Presentado por» y el logo grande (una vez cada vez que se abre).
// · Franja fija abajo: «Patrocinador oficial» con el logo, siempre a la vista
//   (menos dentro de una partida, para no tapar el teclado de los golpes).
// La línea pequeña de «Patrocina» de debajo de la cabecera deja de hacer falta y se esconde.
(function(){
  const WEB = 'https://bolarecuperada.com';
  const LOGO = 'logo-bolarecuperada.png?v=1';
  const LOGO_H = 'logo-bolarecuperada-h.png?v=1';
  const ALT = 'Bolarecuperada.com';

  // ---------- Bienvenida ----------
  function bienvenida(){
    try { if(sessionStorage.getItem('acgolfBienvenida') === '1') return; sessionStorage.setItem('acgolfBienvenida', '1'); } catch(e){}
    const el = document.createElement('div');
    el.className = 'pd-bienv'; el.setAttribute('role', 'presentation');
    el.innerHTML = '<div class="pd-bienv-ac">acgolf</div>'
      + '<div class="pd-bienv-k">Presentado por</div>'
      + '<div class="pd-bienv-logo"><img src="' + LOGO + '" alt="' + ALT + '"></div>'
      + '<div class="pd-bienv-t">Patrocinador oficial</div>';
    document.body.appendChild(el);
    const quitar = () => { el.classList.add('fuera'); setTimeout(() => el.remove(), 450); };
    el.addEventListener('click', quitar);
    setTimeout(quitar, 2000);
  }

  // ---------- Franja fija abajo ----------
  function franja(){
    let f = document.getElementById('pdFranja');
    if(f) return f;
    f = document.createElement('a');
    f.id = 'pdFranja'; f.className = 'pd-franja';
    f.href = WEB; f.target = '_blank'; f.rel = 'noopener sponsored';
    f.innerHTML = '<span>Patrocinador oficial</span><img src="' + LOGO_H + '" alt="' + ALT + '"><b class="pd-propio" hidden></b>';
    document.body.appendChild(f);
    document.body.classList.add('pd-con-franja');
    return f;
  }
  function enPartida(){
    const s3 = document.querySelector('.screen[data-screen="3"]');
    return !!(s3 && s3.offsetParent !== null);
  }
  function repasar(){
    const f = franja();
    const oculta = enPartida();
    f.hidden = oculta;
    document.body.classList.toggle('pd-con-franja', !oculta);
    // Patrocinador propio del grupo (si lo tiene), al lado
    const propio = document.querySelector('.pg-patro-propio');
    const b = f.querySelector('.pd-propio');
    const txt = propio ? propio.textContent.trim() : '';
    if(b.textContent !== txt) b.textContent = txt ? '· ' + txt : '';
    b.hidden = !txt;
  }

  function arrancar(){
    // la bienvenida sale cuando termina la presentación con video (si la hay)
    (window.acgolfIntro || Promise.resolve()).then(bienvenida);
    repasar();
    setInterval(repasar, 1000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
