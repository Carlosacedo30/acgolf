// Compartir la clasificación de una liga al WhatsApp: imagen hecha en el móvil (mismo estilo que El hoyo 19).
// Nombre y apellidos completos, nombre de la liga, sin nombres de grupo, pie «acgolf.es».
(function(){
  'use strict';
  function neon(c, t, x, y, px, color, glow, esp){
    if(window.acgolfNeon) return window.acgolfNeon(c, t, x, y, px, color, glow, esp);
    c.save(); c.font = '900 ' + px + 'px Arial, sans-serif'; c.fillStyle = color; c.textAlign = 'center'; c.fillText(t, x, y); c.restore();
  }
  function imagen(D){
    const filas = D.filas; if(!filas.length) return null;
    const W = 720, fila = 58, H = 270 + filas.length * fila + 80, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#1a120c'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#6b4a2b'; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10);
    neon(c, 'LA LIGA', W / 2, 96, 64, '#F7FFD9', '#C6F24E', 12);
    c.textAlign = 'center'; c.fillStyle = '#EDEBDD'; c.font = '700 30px Barlow, Arial, sans-serif'; c.fillText(D.nombre, W / 2, 146, W - 60);
    c.font = '600 22px Barlow, Arial, sans-serif'; c.fillText(D.linea, W / 2, 182, W - 60);
    c.fillStyle = '#C6F24E'; c.font = '800 20px Archivo, Arial, sans-serif'; c.fillText('CLASIFICACIÓN DE LA LIGA · ' + (D.stb ? 'PUNTOS' : 'PUNTOS F1'), W / 2, 232);
    filas.forEach((x, i) => {
      const y = 256 + i * fila;
      c.fillStyle = i === 0 ? 'rgba(198,242,78,.16)' : 'rgba(255,255,255,.06)'; c.beginPath(); c.roundRect ? c.roundRect(34, y, W - 68, fila - 8, 12) : c.rect(34, y, W - 68, fila - 8); c.fill();
      if(i === 0){ c.strokeStyle = '#C6F24E'; c.lineWidth = 2; c.stroke(); }
      c.textAlign = 'left'; c.fillStyle = '#C6F24E'; c.font = '900 26px Archivo, Arial, sans-serif'; c.fillText(String(i + 1), 54, y + 36);
      c.fillStyle = '#EDEBDD'; c.font = '700 26px Archivo, Arial, sans-serif'; c.fillText(x.n, 100, y + 36, W - 280);
      c.textAlign = 'right'; c.font = '900 30px Archivo, Arial, sans-serif'; c.fillStyle = '#fff'; c.fillText(x.p + ' pts', W - 54, y + 37);
    });
    c.textAlign = 'center'; c.fillStyle = '#C6F24E'; c.font = '800 26px Archivo, Arial, sans-serif'; c.fillText('acgolf.es', W / 2, H - 28);
    return cv;
  }
  function abrir(D){
    const cv = imagen(D); if(!cv) return alert('Todavía no hay clasificación para compartir');
    const url = cv.toDataURL('image/jpeg', .9), m = document.createElement('div'); m.className = 'lgc-modal';
    m.innerHTML = '<div class="lgc-hoja"><h3>Compartir al WhatsApp</h3><p>Se crea esta imagen en tu móvil y eliges el grupo de WhatsApp.</p><img alt="Imagen para compartir">'
      + '<button type="button" class="pri" id="lgcWa">Enviar a WhatsApp</button><button type="button" id="lgcCer">Cerrar</button></div>';
    m.querySelector('img').src = url; document.body.appendChild(m);
    m.querySelector('#lgcCer').onclick = () => m.remove();
    m.querySelector('#lgcWa').onclick = () => cv.toBlob(async blob => {
      const file = new File([blob], 'clasificacion-liga.jpg', { type: 'image/jpeg' });
      try { if(navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: D.nombre + ' · acgolf.es' }); m.remove(); return; } }
      catch(e){ if(e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = url; a.download = 'clasificacion-liga.jpg'; document.body.appendChild(a); a.click(); a.remove();
      alert('Imagen guardada: envíala desde WhatsApp');
    }, 'image/jpeg', .9);
  }
  window.acgolfLigaCompartir = function(){ const D = window.acgolfLigaComp; if(D) abrir(D); };
  window.acgolfLigaImagen = imagen; // para pruebas
})();
