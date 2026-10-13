/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Código QR de invitación de cada grupo (en «Mi cuenta» del administrador) ---
// Hace una lámina lista para imprimir: «Únete a» + nombre del grupo + QR con el icono de acgolf + acgolf.es
// Usa qrcode.js (qrcode-generator, licencia MIT). Si cambia el enlace de invitación, el QR cambia con él.
(function(){
  if(typeof qrcode !== 'function') return;
  const OSCURO = '#111316', LIMA = '#C6F24E';
  let icono = null;
  try { icono = new Image(); icono.src = 'icon-512.png'; } catch(e){}

  function lamina(url, grupo){
    const q = qrcode(0, 'H'); q.addData(url); q.make();
    const n = q.getModuleCount(), m = 16, borde = 2;
    const lado = (n + borde * 2) * m;
    const W = lado + 120, H = lado + 330;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
    x.strokeStyle = LIMA; x.lineWidth = 12;
    if(x.roundRect){ x.beginPath(); x.roundRect(14, 14, W - 28, H - 28, 30); x.stroke(); } else x.strokeRect(14, 14, W - 28, H - 28);
    x.textAlign = 'center'; x.fillStyle = '#4A5A1A'; x.font = 'bold 34px Barlow, Arial, sans-serif';
    x.fillText('Únete a', W / 2, 78);
    x.fillStyle = OSCURO; x.font = 'bold ' + (String(grupo).length > 16 ? 48 : 62) + 'px Barlow, Arial, sans-serif';
    x.fillText(String(grupo), W / 2, 146);
    const ox = 60, oy = 180;
    x.fillStyle = OSCURO;
    for(let r = 0; r < n; r++) for(let k = 0; k < n; k++) if(q.isDark(r, k)) x.fillRect(ox + (k + borde) * m, oy + (r + borde) * m, m, m);
    // icono de acgolf en el centro (el QR aguanta que se tape un trozo)
    if(icono && icono.complete && icono.naturalWidth){
      const s = Math.round(lado / 5), p = 10, cx = ox + (lado - s) / 2, cy = oy + (lado - s) / 2;
      x.fillStyle = '#FFFFFF'; x.fillRect(cx - p, cy - p, s + p * 2, s + p * 2);
      x.drawImage(icono, cx, cy, s, s);
    }
    x.fillStyle = '#3B4450'; x.font = 'bold 26px Barlow, Arial, sans-serif';
    x.fillText('Escanéalo, crea tu cuenta y entras en el grupo', W / 2, oy + lado + 52);
    x.fillStyle = OSCURO; x.font = 'bold 44px Barlow, Arial, sans-serif';
    x.fillText('acgolf.es', W / 2, oy + lado + 110);
    return c.toDataURL('image/png');
  }
  window.acgolfQR = { lamina };
})();
