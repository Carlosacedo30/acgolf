/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// acgolf como app: guarda la app en el móvil y ofrece «Instalar la app» (Android) o explica cómo hacerlo (iPhone).
(function(){
  if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if(instalada) return;
  let yaNo = false; try { yaNo = localStorage.getItem('acgolfNoInstalar') === '1'; } catch(e){}
  if(yaNo) return;
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let aviso = null;
  function pintar(html, alInstalar){
    if(aviso) aviso.remove();
    aviso = document.createElement('div');
    aviso.className = 'ins-aviso';
    aviso.innerHTML = '<img src="icon-192.png" alt="" width="44" height="44"><div class="ins-txt">' + html + '</div>'
      + (alInstalar ? '<button type="button" class="ins-si">Instalar</button>' : '')
      + '<button type="button" class="ins-no" aria-label="Cerrar">✕</button>';
    document.body.appendChild(aviso);
    if(alInstalar) aviso.querySelector('.ins-si').onclick = alInstalar;
    aviso.querySelector('.ins-no').onclick = () => { aviso.remove(); try { localStorage.setItem('acgolfNoInstalar', '1'); } catch(e){} };
  }
  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    pintar('<b>Instala acgolf</b><span>Tendrás el icono en el móvil, como una app.</span>', async () => {
      ev.prompt();
      try { await ev.userChoice; } catch(e){}
      if(aviso) aviso.remove();
    });
  });
  if(iphone) setTimeout(() => {
    pintar('<b>Instala acgolf</b><span>Toca <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Compartir"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> <b>Compartir</b> y después <b>«Añadir a pantalla de inicio»</b>.</span>');
  }, 4000);
})();
