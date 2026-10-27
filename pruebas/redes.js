/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Redes sociales de acgolf, al final de la portada (encima del ©) ---
(function(){
  'use strict';
  // Cambiar aquí si cambia alguna dirección
  const REDES = [
    { n: 'Instagram', url: 'https://www.instagram.com/acgolf.e/', c: 'ig' },
    { n: 'TikTok',    url: 'https://www.tiktok.com/@acgolf.es', c: 'tt' },
    { n: 'YouTube',   url: 'https://www.youtube.com/channel/UCUqjPt8RqN0JQeTiel8Ygsw', c: 'yt' },
    { n: 'Facebook',  url: 'https://www.facebook.com/1437955202727013', c: 'fb' },
    { n: 'LinkedIn',  url: 'https://www.linkedin.com/in/acgolf-golf-para-amigos-348364447/', c: 'li' },
  ];
  // Reseñas en Google: la nuestra y la del patrocinador
  const RESENAS = [
    { n: '⭐ acgolf', url: 'https://g.page/r/Ceq0QgzdhDQ8ECE/review' },
    { n: '⭐ Bolarecuperada', url: 'https://maps.app.goo.gl/j7pf91yTuF8MWC43A' },
  ];
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function poner(){
    const pie = document.querySelector('.home-pie'); if(!pie || document.getElementById('acRedes')) return;
    const caja = document.createElement('div');
    caja.id = 'acRedes'; caja.className = 'ac-redes';
    caja.innerHTML = '<div class="ac-redes-t">Síguenos</div><div class="ac-redes-l">'
      + REDES.map(r => '<a class="ac-red ' + r.c + '" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.n) + '</a>').join('') + '</div>'
      + '<div class="ac-resenas"><div class="ac-redes-t">Déjanos tu reseña en Google</div>'
      + '<p>Un minuto y nos ayudas muchísimo. Gracias 🙏</p><div class="ac-redes-l">'
      + RESENAS.map(r => '<a class="ac-resena" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.n) + '</a>').join('') + '</div></div>';
    const copy = pie.querySelector('.app-copyright');
    if(copy) pie.insertBefore(caja, copy); else pie.appendChild(caja);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner); else poner();
})();
