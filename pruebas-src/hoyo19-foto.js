// © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
// El hoyo 19 · foto con marco (paso 4). SOLO fotos hechas en ese momento (nada de galería).
// Cámara dentro de la app con el marco en vivo; si el móvil no la deja, se abre la cámara del móvil directamente (plan B).
// La foto se reduce en el móvil (≈ 40 KB) antes de enviarse; nunca viaja una foto grande.
(function(){
  'use strict';
  if(window.acgolfFoto19) return;
  const W = 600, H = 750, MAX_CHARS = 68000;           // lienzo 4:5; tope un poco por debajo del límite de la base de datos (70000)
  const R = { x: .055, y: .135, w: .89, h: .635 };     // dónde va la foto dentro del marco (mismas medidas que el dibujo aprobado)
  let el = null, stream = null, facing = 'environment', fuente = null, conMarco = true, ctxo = null, url = '';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---- Dibujo final (canvas) ----
  function texto(c, t, x, y, px, esp, color, neon, peso){
    c.save(); c.font = (peso || 900) + ' ' + px + 'px Archivo, Barlow, Arial, sans-serif'; c.fillStyle = color; c.textBaseline = 'alphabetic';
    const anchos = [...t].map(ch => c.measureText(ch).width), total = anchos.reduce((a, b) => a + b, 0) + esp * (t.length - 1);
    let cx = x - total / 2;
    const pasada = () => { let px0 = cx; [...t].forEach((ch, i) => { c.fillText(ch, px0, y); px0 += anchos[i] + esp; }); };
    if(neon){ c.shadowColor = neon; c.shadowBlur = 14; pasada(); c.shadowBlur = 28; pasada(); c.shadowBlur = 0; }
    pasada(); c.restore();
  }
  function recorte(c, src, dx, dy, dw, dh){            // la foto llena el hueco sin deformarse (se recorta por los lados)
    const sw = src.width || src.videoWidth, sh = src.height || src.videoHeight, k = Math.max(dw / sw, dh / sh), vw = dw / k, vh = dh / k;
    c.drawImage(src, (sw - vw) / 2, (sh - vh) / 2, vw, vh, dx, dy, dw, dh);
  }
  function componer(src, marco, campo, fecha){
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), k = W / 400;
    c.fillStyle = '#0b0907'; c.fillRect(0, 0, W, H);
    if(!marco){ recorte(c, src, 0, 0, W, H); return cv; }
    const x = R.x * W, y = R.y * H, w = R.w * W, h = R.h * H;
    recorte(c, src, x, y, w, h);
    c.strokeStyle = '#C6F24E'; c.lineWidth = 1.5 * k; c.strokeRect(x, y, w, h);                      // línea lima, sin brillo
    c.strokeStyle = 'rgba(198,242,78,.35)'; c.lineWidth = 1; c.strokeRect(7 * k, 7 * k, W - 14 * k, H - 14 * k);
    c.strokeStyle = '#C6F24E'; c.lineWidth = 2 * k; c.shadowColor = '#C6F24E'; c.shadowBlur = 4 * k; const e = 16 * k, m = 7 * k;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(a => { c.beginPath(); c.moveTo(a[0] + a[2] * e, a[1]); c.lineTo(a[0], a[1]); c.lineTo(a[0], a[1] + a[3] * e); c.stroke(); });
    c.shadowBlur = 0;
    texto(c, 'EL HOYO 19', W / 2, 0.034 * H + 26 * k, 28 * k, 7 * k, '#F7FFD9', '#C6F24E');           // neón
    texto(c, 'AQUÍ, LOS', W / 2, 0.82 * H + 6 * k, 11 * k, 5 * k, '#F3E6CC', null, 700);               // sin neón
    texto(c, 'CAMPEONES', W / 2, 0.82 * H + 30 * k, 27 * k, 4 * k, '#FFD54F', null);
    texto(c, 'DEL HOYO 19', W / 2, 0.82 * H + 47 * k, 11 * k, 5 * k, '#F3E6CC', null, 700);
    texto(c, String(campo || '').toUpperCase() + (fecha ? ' · ' + String(fecha).toUpperCase() : ''), W / 2, H * 0.964, 12 * k, 2 * k, '#cdbf9b', null, 600);
    return cv;
  }
  function jpeg(cv){
    let q = .72, d = cv.toDataURL('image/jpeg', q);
    while(d.length > MAX_CHARS && q > .3){ q -= .07; d = cv.toDataURL('image/jpeg', q); }
    return d;
  }

  // ---- Pantalla ----
  function marcoHtml(campo, fecha){
    return '<div class="mar"><div class="fino"></div><i class="esq e1"></i><i class="esq e2"></i><i class="esq e3"></i><i class="esq e4"></i>'
      + '<div class="neon tit">EL HOYO 19</div><div class="neon frase"><small>AQUÍ, LOS</small><b>CAMPEONES</b><small>DEL HOYO 19</small></div>'
      + '<div class="rem">' + esc(campo) + (fecha ? ' · ' + esc(fecha) : '') + '</div></div>';
  }
  function pintar(){
    const lz = el.querySelector('.h19f-lienzo');
    el.querySelector('.h19f-sw').hidden = !fuente; el.querySelector('.h19f-cam').hidden = !!fuente;
    if(!fuente){ lz.className = 'h19f-lienzo conm'; return; }
    lz.className = 'h19f-lienzo ' + (conMarco ? 'conm' : 'sinm') + ' fija';
    url = jpeg(componer(fuente, conMarco, ctxo.campo, ctxo.fecha));
    lz.querySelector('.h19f-res').src = url;
    el.querySelector('#h19fC1').classList.toggle('on', conMarco); el.querySelector('#h19fC0').classList.toggle('on', !conMarco);
  }
  async function encender(){
    apagar();
    const v = el.querySelector('video');
    try {
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('sin cámara');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      v.srcObject = stream; await v.play().catch(() => {});
      el.querySelector('.h19f-err').hidden = true;
    } catch(e){
      el.querySelector('.h19f-err').hidden = false;      // plan B: la cámara del móvil
    }
  }
  function apagar(){ if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } }
  function disparar(){
    const v = el.querySelector('video'); if(!v.videoWidth) return;
    const t = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * t); c.height = Math.round(v.videoHeight * t); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    fuente = c; conMarco = true; apagar(); pintar();
  }
  function deArchivo(f){
    if(!f) return; const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => { const t = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * t); c.height = Math.round(img.height * t);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); fuente = c; conMarco = true; apagar(); pintar(); };
    img.src = u;
  }
  function cerrar(){ apagar(); if(el){ el.remove(); el = null; } fuente = null; url = ''; }

  function abrir(o){
    if(el) return; ctxo = o; facing = 'environment'; fuente = null; conMarco = true;
    el = document.createElement('div'); el.id = 'h19Foto'; el.className = 'h19f'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="h19f-top"><button type="button" id="h19fCan">‹ Cancelar</button><h2>Tu foto del hoyo 19</h2><span>Quedan ' + (o.quedan | 0) + (o.quedan === 1 ? ' foto' : ' fotos') + '</span></div>'
      + '<div class="h19f-lienzo conm"><div class="h19f-foto"><video playsinline muted autoplay></video><img class="h19f-res" alt="Tu foto"></div>' + marcoHtml(o.campo, o.fecha) + '</div>'
      + '<div class="h19f-err" hidden>No he podido abrir la cámara aquí. Pulsa «Hacer foto» y se abrirá la cámara del móvil.</div>'
      + '<div class="h19f-sw" hidden><button type="button" class="chip on" id="h19fC1">Con marco</button><button type="button" class="chip" id="h19fC0">Sin marco</button></div>'
      + '<div class="h19f-cam"><button type="button" class="giro" id="h19fGiro" aria-label="Girar la cámara">⟲</button><button type="button" class="disp" id="h19fDisp" aria-label="Disparar"><i></i></button><label class="plan-b">Hacer foto<input type="file" accept="image/*" capture="environment" id="h19fFile"></label></div>'
      + '<div class="h19f-acc" id="h19fAcc" hidden><button type="button" id="h19fRep">Repetir</button><button type="button" class="pri" id="h19fEnv">Enviar al hilo</button><a id="h19fGua" class="h19f-gua" download="foto-hoyo19.jpg" hidden>Guardar en el móvil</a></div>'
      + '<p class="h19f-nota">El marco se pone solo. La foto se reduce antes de enviar y se borra con el hilo.</p>';
    document.body.appendChild(el);
    el.querySelector('#h19fCan').onclick = cerrar;
    el.querySelector('#h19fDisp').onclick = disparar;
    el.querySelector('#h19fGiro').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; encender(); };
    el.querySelector('#h19fFile').onchange = e => deArchivo(e.target.files && e.target.files[0]);
    el.querySelector('#h19fC1').onclick = () => { conMarco = true; pintar(); };
    el.querySelector('#h19fC0').onclick = () => { conMarco = false; pintar(); };
    el.querySelector('#h19fRep').onclick = () => { fuente = null; pintar(); el.querySelector('#h19fAcc').hidden = true; encender(); };
    el.querySelector('#h19fEnv').onclick = async () => { const b = el.querySelector('#h19fEnv'); b.disabled = true; b.textContent = 'Enviando…'; const ok = await o.enviar(url); if(ok) cerrar(); else if(el){ b.disabled = false; b.textContent = 'Reintentar'; const g = el.querySelector('#h19fGua'); g.hidden = false; g.href = url; } };
    const acc = el.querySelector('#h19fAcc'); new MutationObserver(() => { acc.hidden = !fuente; }).observe(el.querySelector('.h19f-lienzo'), { attributes: true });
    encender();
  }
  window.acgolfFoto19 = { abrir, cerrar, _componer: componer };
})();
