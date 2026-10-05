/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Caddie protector: te orienta, te calma y te celebra. Nunca riñe. ---
  //  · Al apuntar golpes: un bocadillo unos segundos con una frase según tu resultado neto
  //    y un consejo para el siguiente hoyo. Se acuerda de la partida (rachas, recuperaciones, mitad).
  //  · Sin voz: solo texto en pantalla (Carlos no quiere voz).
  // Todo se calcula en el móvil: sin internet y sin coste.

  let cpPendientes = {};          // { pIndex: hoyo } golpes recién apuntados, para comentar todos juntos
  let cpTimer = null, cpOcultar = null;
  const cpYaDicho = {};           // 'hoyo-jugador-valor' para no repetir la misma frase

  const cpPila = n => { const s = String(n || ''); if(s.includes(' / ')) return s.split(' / ').map(x => x.trim().split(/\s+/)[0]).join(' y '); return s.trim().split(/\s+/)[0] || s; };
  const cpElige = (ops, semilla) => ops[Math.abs(semilla | 0) % ops.length];
  const cpTexto = html => String(html).replace(/<[^>]+>/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();

  // ---------- Datos del hoyo y del jugador ----------
  function cpHoyo(h){
    const c = (typeof selectedCourse !== 'undefined') ? selectedCourse : null;
    if(!c || !c.par) return null;
    const par = +c.par[h - 1], si = c.hcp ? +c.hcp[h - 1] : null;
    const nota = (typeof NOTAS_CAMPO !== 'undefined' && NOTAS_CAMPO[c.id]) ? NOTAS_CAMPO[c.id][h] : null;
    return { par, si, nota, courseId: c.id };
  }
  function cpRecibe(p, h){
    const d = cpHoyo(h); if(!d || d.si == null || typeof strokesForHole !== 'function') return 0;
    return Math.max(0, strokesForHole(hcpJuego(p), d.si));
  }
  function cpGolpes(p, h){
    const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + p + '"]');
    const v = inp ? parseInt(inp.value, 10) : NaN;
    return isNaN(v) || v <= 0 ? null : v;
  }
  // Resultado neto frente al par en un hoyo (negativo = mejor que el par)
  function cpNeto(p, h){
    const g = cpGolpes(p, h), d = cpHoyo(h);
    if(g == null || !d) return null;
    return g - cpRecibe(p, h) - d.par;
  }
  // Consejo del caddie para un jugador en un hoyo, en positivo (historial de caddie_hoyo)
  function cpConsejoJugador(nombre, h){
    const d = cpHoyo(h);
    const course = d && typeof caddieCache !== 'undefined' ? caddieCache[d.courseId] : null;
    const holes = course && typeof caddieKey === 'function' ? course[caddieKey(nombre)] : null;
    const r = holes && holes[h];
    if(!r || typeof caddieTip !== 'function') return '';
    const tip = caddieTip(r, holes);
    switch(tip.tag){
      case 'Hoyo trampa': return 'este hoyo te cuesta: aquí el bogey es un buen resultado';
      case 'Ojo': return 'juega a lo seguro: aquí lo importante es no complicarse';
      case 'Ataca': return 'es de tus mejores hoyos, confía en tu juego';
      case 'En racha': return 'últimamente lo juegas muy bien, repite lo mismo';
      case 'Prudencia': return 'centro de la calle y centro del green, sin prisas';
      default: return '';
    }
  }

  function cpGolpesRegalo(h){
    const conGolpe = [];
    (players || []).forEach((n, p) => { if(n && cpRecibe(p, h) > 0) conGolpe.push(cpPila(n)); });
    if(!conGolpe.length) return '';
    if(conGolpe.length === players.filter(Boolean).length) return ' Todos tenéis golpe de regalo.';
    return ' ' + (conGolpe.length > 1 ? conGolpe.slice(0, -1).join(', ') + ' y ' + conGolpe[conGolpe.length - 1] + ' tenéis' : conGolpe[0] + ', tienes') + ' golpe de regalo.';
  }

  // ---------- Al apuntar golpes ----------
  function cpFraseResultado(p, h){
    const nombre = players[p], n = cpPila(nombre);
    const g = cpGolpes(p, h), neto = cpNeto(p, h), d = cpHoyo(h);
    if(g == null || neto == null) return null;
    const bruto = g - d.par;
    const sem = h * 7 + p;
    // Memoria de la partida: hoyos anteriores de este jugador
    const previos = [];
    for(let k = h - 1; k >= 1 && previos.length < 3; k--){ const x = cpNeto(p, k); if(x != null) previos.push(x); }
    const malosSeguidos = (() => { let c = 0; for(const x of previos){ if(x >= 2) c++; else break; } return c; })();
    const veniaDeMalo = previos.length && previos[0] >= 2;
    let f, animo;
    if(bruto <= -2){ animo = 'contento'; f = cpElige(['¡' + n + ', ÁGUILA! Esto no se ve todos los días. 🦅', '¡Águila de ' + n + '! Guárdate este hoyo para siempre.'], sem); }
    else if(bruto === -1){ animo = 'contento'; f = cpElige(['¡Birdie, ' + n + '! Precioso.', '¡' + n + ', birdie! Así se juega al golf.'], sem); }
    else if(neto <= -2){ animo = 'contento'; f = cpElige(['¡' + n + ', ' + (-neto) + ' golpes mejor que tu par! Partidazo en este hoyo.', '¡Qué bien, ' + n + '! Le has ganado ' + (-neto) + ' golpes al campo.'], sem); }
    else if(neto === -1){ animo = 'contento'; f = cpElige([n + ', mejor que tu par: ¡golpe ganado!', '¡Muy bien, ' + n + '! Le has ganado un golpe al campo.'], sem); }
    else if(neto === 0){
      animo = 'contento';
      f = veniaDeMalo ? cpElige(['¡Eso es reaccionar, ' + n + '! Par neto después de un hoyo difícil.', n + ', así se responde: par neto. Ya estás de vuelta.'], sem)
                      : cpElige([n + ', par neto. Perfecto.', 'Par neto, ' + n + '. Así, tranquilo y seguido.', n + ', tu par. Nada que corregir.'], sem);
    }
    else if(neto === 1){ animo = 'normal'; f = cpElige([n + ', bogey neto: sin drama, es un resultado digno.', n + ', solo un golpe por encima de tu par. Seguimos.'], sem); }
    else {
      animo = 'serio';
      if(malosSeguidos >= 1) f = cpElige([n + ', dos hoyos complicados seguidos. Respira hondo: en el siguiente, palo cómodo y a la calle. El objetivo es solo el bogey.', n + ', no pasa nada. Baja una marcha: juega a lo seguro en el siguiente y la partida vuelve sola.'], sem);
      else f = cpElige([n + ', un mal hoyo no hace una mala partida. Olvídalo ya.', n + ', esto le pasa a todos. Lo que cuenta es el siguiente golpe.', n + ', hoyo para olvidar. Respira y vamos al siguiente.'], sem);
    }
    return { texto: f, animo, neto };
  }

  function cpConsejoSiguiente(h, nombres){
    const sig = h + 1; if(sig > 18) return '';
    const d = cpHoyo(sig); if(!d) return '';
    let t = 'En el ' + sig + ' (par ' + d.par + ')' + (d.nota ? ': ' + d.nota.consejo.charAt(0).toLowerCase() + d.nota.consejo.slice(1) : ': centro de la calle y centro del green.');
    // Consejo personal para el primero que lo necesite
    for(const p of nombres){ const c = cpConsejoJugador(players[p], sig); if(c){ t += ' ' + cpPila(players[p]) + ', ' + c + '.'; break; } }
    return t;
  }

  function cpResumenMitad(){
    const out = [];
    (players || []).forEach((n, p) => {
      if(!n) return;
      let tot = 0, hoyos = 0;
      for(let h = 1; h <= 9; h++){ const x = cpNeto(p, h); if(x != null){ tot += x; hoyos++; } }
      if(hoyos === 9) out.push(cpPila(n) + ' ' + (tot === 0 ? 'al par' : (tot > 0 ? '+' + tot : tot)));
    });
    if(!out.length) return '';
    return 'Mitad de la partida. Respecto a vuestro par: ' + out.join(', ') + '. Hidrátate y a por la vuelta.';
  }

  function cpMostrar(html, animo){
    let el = document.getElementById('cpAviso');
    if(!el){
      el = document.createElement('div'); el.id = 'cpAviso'; el.className = 'cp-aviso'; el.setAttribute('role', 'status');
      el.addEventListener('click', () => el.classList.remove('ver'));
      document.body.appendChild(el);
    }
    el.className = 'cp-aviso cp-' + (animo || 'normal');
    el.innerHTML = (typeof caddieCara === 'function' ? caddieCara(animo === 'serio' ? 'normal' : animo) : '') + '<div class="cp-txt"><b>Tu caddie</b>' + html + '<small class="cp-cerrar">Toca para cerrar</small></div>';
    requestAnimationFrame(() => el.classList.add('ver'));
    clearTimeout(cpOcultar);
    cpOcultar = setTimeout(() => el.classList.remove('ver'), Math.min(14000, 5000 + cpTexto(html).length * 45));
  }

  function cpComentar(){
    const items = Object.keys(cpPendientes).map(Number);
    const h = items.length ? cpPendientes[items[0]] : null;
    cpPendientes = {};
    if(h == null) return;
    const frases = [];
    let peor = 'contento';
    items.forEach(p => {
      const clave = h + '-' + p + '-' + cpGolpes(p, h);
      if(cpYaDicho[clave]) return;
      const r = cpFraseResultado(p, h); if(!r) return;
      cpYaDicho[clave] = true;
      frases.push(r.texto);
      if(r.animo === 'serio' || (r.animo === 'normal' && peor === 'contento')) peor = r.animo;
    });
    if(!frases.length) return;
    // ¿Está completo el hoyo para todo el grupo? Entonces, consejo del siguiente (o resumen de la mitad)
    const todos = (players || []).map((n, p) => n ? p : null).filter(p => p != null);
    const completo = todos.every(p => cpGolpes(p, h) != null);
    let extra = '';
    if(completo){
      if(h === 9) extra = cpResumenMitad();
      if(h < 18){
        extra = (extra ? extra + ' ' : '') + cpConsejoSiguiente(h, todos) + cpGolpesRegalo(h + 1);
      }
      else extra = '¡Partida terminada! Gracias por dejarme acompañaros.';
    }
    const html = frases.map(f => '<p>' + f + '</p>').join('') + (extra ? '<p class="cp-sig">' + extra + '</p>' : '');
    cpMostrar(html, peor);
  }

  // Escucha cualquier golpe apuntado (casilla grande, teclado o tarjeta)
  document.addEventListener('input', e => {
    const t = e.target;
    if(!t || !t.classList || !t.classList.contains('golpes-input')) return;
    const h = +t.dataset.hole, p = +t.dataset.playerIndex;
    if(!h || isNaN(p) || t.value === '') return;
    cpPendientes[p] = h;
    clearTimeout(cpTimer);
    cpTimer = setTimeout(cpComentar, 1600); // espera por si se apuntan varios jugadores seguidos
  }, true);
