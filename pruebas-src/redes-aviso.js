/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Aviso «¿Nos sigues?» (una vez por móvil) ---
// Al abrir la app, si hay sesión y no se ha visto antes, invita a seguir las redes de acgolf.
// Se espera a que no haya otra ventana abierta (presentación, bienvenida, aviso de notificaciones…).
(function(){
  'use strict';
  const VISTO = 'acgolfAvisoRedes';
  const REDES = [
    { n: 'Instagram', url: 'https://www.instagram.com/acgolf.e/', c: 'ig' },
    { n: 'TikTok',    url: 'https://www.tiktok.com/@acgolf.es', c: 'tt' },
    { n: 'YouTube',   url: 'https://www.youtube.com/channel/UCUqjPt8RqN0JQeTiel8Ygsw', c: 'yt' },
    { n: 'Facebook',  url: 'https://www.facebook.com/1437955202727013', c: 'fb' },
    { n: 'LinkedIn',  url: 'https://www.linkedin.com/in/acgolf-golf-para-amigos-348364447/', c: 'li' },
  ];
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hayVentana = () => document.body.classList.contains('cg-open')
    || document.querySelector('.iv, .pb-velo, .pd-bienv, .ay-aviso, .am-preg, .ar-aviso');

  function mostrar(){
    const caja = document.createElement('div');
    caja.className = 'ar-aviso'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-label', 'Síguenos en redes');
    caja.innerHTML = '<div class="ar-aviso-c"><div class="ar-aviso-ico">⛳</div>'
      + '<h2>¿Nos sigues?</h2>'
      + '<p>Entérate de novedades, sorteos y vídeos de Lola y Curro en nuestras redes.</p>'
      + '<div class="ar-aviso-l">' + REDES.map(r => '<a class="ac-red ' + r.c + '" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.n) + '</a>').join('') + '</div>'
      + '<button type="button" class="ar-aviso-no">Ahora no</button></div>';
    document.body.appendChild(caja);
    const fin = () => { try { localStorage.setItem(VISTO, '1'); } catch(e){} caja.remove(); };
    caja.querySelector('.ar-aviso-no').onclick = fin;
    caja.querySelectorAll('a').forEach(a => a.addEventListener('click', fin));
  }
  async function intentar(intento){
    try { if(localStorage.getItem(VISTO)) return; } catch(e){ return; }
    const client = typeof initSupabase === 'function' && initSupabase();
    if(!client) return;
    try { const { data } = await client.auth.getSession(); if(!data || !data.session) return; } catch(e){ return; }
    if(hayVentana()){ if((intento || 0) < 40) setTimeout(() => intentar((intento || 0) + 1), 4000); return; }
    mostrar();
  }
  setTimeout(() => intentar(0), 9000);   // después del aviso de notificaciones (avisos-movil.js tarda 6s)
})();
