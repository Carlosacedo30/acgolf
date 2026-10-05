/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Reglas de golf explicadas fácil ---
  // Resumen propio, en lenguaje sencillo, de las Reglas de Golf de la R&A y la USGA (edición vigente, 2023),
  // que son las que aplica la Real Federación Española de Golf. No sustituye al reglamento oficial.
  const RG_PEN = {
    sin: { txt: 'Sin penalidad', cls: 'rg-sin' },
    uno: { txt: '1 golpe', cls: 'rg-uno' },
    dos: { txt: '2 golpes', cls: 'rg-dos' },
    var: { txt: 'Depende', cls: 'rg-var' },
  };

  // "¿Qué hago si…?": lo que más pasa en el campo
  const RG_CASOS = [
    { ico: 'agua', t: 'Mi bola ha caído al agua', sub: 'Estacas o líneas amarillas o rojas', pen: 'uno', pasos: [
      'Si puedes jugarla tal como está, juégala: no hay penalidad.',
      'Si no, con 1 golpe de penalidad eliges una opción:',
      '<b>Repetir</b> desde donde jugaste el golpe anterior.',
      '<b>Atrás en línea</b>: imagina una línea desde la bandera que pase por el punto donde la bola cruzó el borde del agua. Dropa en esa línea, tan atrás como quieras.',
      '<b>Solo si es roja</b>: también puedes dropar a <b>2 palos</b> del punto donde cruzó el borde, sin acercarte al hoyo.',
    ]},
    { ico: 'lupa', t: 'No encuentro mi bola', sub: 'Tienes 3 minutos para buscarla', pen: 'uno', pasos: [
      'Si a los 3 minutos no aparece, está perdida.',
      'Con 1 golpe de penalidad, vuelve a jugar desde donde diste el golpe anterior (se llama «golpe y distancia»).',
      '<b>Consejo</b>: si dudas de que vayas a encontrarla, juega antes una <b>bola provisional</b> diciendo en voz alta «juego una provisional». Si la original aparece, sigues con ella.',
      'Algunos clubes permiten una regla local: dropar cerca de donde se perdió, en la calle, con <b>2 golpes</b>. Solo vale si el club la tiene puesta.',
    ]},
    { ico: 'limite', t: 'Mi bola ha salido fuera', sub: 'Estacas o líneas blancas (fuera de límites)', pen: 'uno', pasos: [
      'La bola está fuera cuando está <b>entera</b> fuera de la línea de las estacas blancas.',
      'Igual que una bola perdida: 1 golpe y repetir desde donde jugaste. Vale también la provisional.',
      'Las estacas blancas <b>no se pueden quitar</b>, aunque te molesten.',
    ]},
    { ico: 'arbusto', t: 'No puedo jugar mi bola', sub: 'Dentro de un arbusto, entre raíces…', pen: 'uno', pasos: [
      'Tú decides si tu bola es injugable (en cualquier sitio menos en el agua). Con 1 golpe eliges:',
      '<b>Repetir</b> desde donde jugaste el golpe anterior.',
      '<b>Atrás en línea</b>: en la línea entre la bandera y tu bola, tan atrás como quieras.',
      '<b>Lateral</b>: a <b>2 palos</b> de donde está la bola, sin acercarte al hoyo.',
      'En un bunker, si dropas dentro del bunker es 1 golpe; si quieres salir del bunker atrás en línea, son <b>2 golpes</b>.',
    ]},
    { ico: 'camino', t: 'Mi bola está en un camino o junto a un aspersor', sub: 'Caminos, casetas, aspersores, vallas de obra', pen: 'sin', pasos: [
      'Son «obstrucciones inamovibles». Tienes alivio gratis si te molestan para colocarte o hacer el swing.',
      'Busca el <b>punto más cercano</b> donde ya no te molesten, sin acercarte al hoyo.',
      'Mide <b>1 palo</b> desde ese punto y dropa dentro de esa zona.',
      'Si prefieres, puedes jugarla tal como está.',
    ]},
    { ico: 'charco', t: 'Charco, zona en reparación o agujero de animal', sub: 'Agua acumulada, líneas blancas en el suelo, madrigueras', pen: 'sin', pasos: [
      'Es una «condición anormal del terreno»: alivio gratis igual que con un camino (punto más cercano y 1 palo).',
      'En un bunker: alivio gratis <b>dentro</b> del bunker, o con 1 golpe fuera del bunker, atrás en línea.',
      'En el green: colocas la bola en el punto más cercano sin el charco, aunque esté fuera del green, sin acercarte al hoyo.',
    ]},
    { ico: 'empotrada', t: 'Mi bola se ha quedado clavada', sub: 'Hundida en su propio pique, en la calle o el rough', pen: 'sin', pasos: [
      'Si está en su propio pique en el «área general» (calle, rough…), tienes alivio gratis.',
      'Dropa a <b>1 palo</b> justo detrás del pique, sin acercarte al hoyo.',
      'En un bunker no hay este alivio.',
    ]},
    { ico: 'hoja', t: 'Ramas, hojas o piedras junto a mi bola', sub: 'Lo que la naturaleza deja suelto', pen: 'var', pasos: [
      'Puedes quitarlos <b>en cualquier sitio</b>, también en el bunker y en el agua.',
      'Si al quitarlos <b>se mueve tu bola</b> (fuera del green): 1 golpe y la vuelves a poner donde estaba.',
      'En el green, si se mueve, la repones <b>sin penalidad</b>.',
      'Rastrillos, botellas o carteles se quitan siempre; si la bola se mueve, la repones sin penalidad.',
    ]},
    { ico: 'mano', t: 'He movido mi bola sin querer', sub: 'Buscándola, con el pie o con el palo', pen: 'var', pasos: [
      '<b>Buscándola</b>: sin penalidad. La vuelves a poner.',
      '<b>En el green</b>: sin penalidad. La vuelves a poner.',
      'En el resto de casos (por ejemplo, con el palo al prepararte en la calle): <b>1 golpe</b> y la vuelves a poner.',
    ]},
    { ico: 'bolas', t: 'He jugado la bola de otro', sub: 'Bola equivocada', pen: 'dos', pasos: [
      '<b>2 golpes</b> de penalidad. Los golpes dados con la bola equivocada no cuentan.',
      'Vuelve a donde está tu bola y juégala. Si no lo corriges antes de salir en el siguiente hoyo, quedas descalificado.',
      'En Match Play pierdes el hoyo.',
      '<b>Consejo</b>: pinta una marca en tu bola antes de salir.',
    ]},
    { ico: 'green', t: 'Mi bola ha dado a otra en el green', sub: 'Las dos bolas estaban en el green', pen: 'dos', pasos: [
      'Si las dos estaban en el green: <b>2 golpes</b> al que jugó (en Match Play no hay penalidad).',
      'La bola golpeada se vuelve a poner donde estaba; la tuya se juega donde quede.',
      'Para evitarlo, pide que marquen la bola que estorba.',
    ]},
    { ico: 'bandera', t: 'Mi bola ha dado en la bandera', sub: 'Putt con la bandera puesta', pen: 'sin', pasos: [
      'No hay penalidad. Puedes patear con la bandera puesta o quitada, como prefieras.',
      'Si la bola queda apoyada en la bandera y una parte está por debajo del borde del hoyo, se considera embocada.',
    ]},
    { ico: 'tee', t: 'He salido por delante de las barras', sub: 'Golpe de salida fuera del sitio', pen: 'dos', pasos: [
      'El sitio de salida es un rectángulo: entre las barras y hasta 2 palos hacia atrás.',
      'En Stroke Play: <b>2 golpes</b> y repetir desde el sitio correcto.',
      'En Match Play no hay penalidad, pero el rival puede pedirte que repitas.',
    ]},
    { ico: 'palos', t: 'Llevo más de 14 palos', sub: 'Lo descubres durante la vuelta', pen: 'dos', pasos: [
      '<b>2 golpes</b> por cada hoyo en el que los hayas llevado, con un máximo de 4.',
      'En cuanto te des cuenta, dilo y deja de usar el palo que sobra.',
    ]},
  ];

  // Reglas locales de Los Iscariotes (las que dice el organizador para nuestras partidas)
  const RG_LOCALES = [
    { ico: 'mano', t: 'Se puede mover la bola un palo', sub: 'Colocar la bola, sin penalidad', pasos: [
      'En nuestras partidas puedes <b>mover tu bola hasta 1 palo</b> para mejorar dónde está, <b>sin penalidad</b>.',
      'Antes de levantarla, <b>márcala</b> con una moneda o un tee.',
      'Colócala con la mano a <b>1 palo como máximo</b> de donde estaba y <b>nunca más cerca del hoyo</b>.',
      'Solo se puede hacer <b>una vez</b> por golpe: en cuanto la sueltas, la bola está en juego.',
      'No vale dentro de los <b>bunkers</b>, del <b>agua</b> ni en el <b>green</b> (en el green ya puedes marcar y limpiar siempre).',
    ]},
  ];

  // Lo demás que conviene saber, por temas
  const RG_TEMAS = [
    { ico: 'trofeo', t: 'Modalidades de juego', sub: 'Stroke Play, Stableford, Match Play, parejas', html: [
      ['Stroke Play (juego por golpes)', 'Cuentas <b>todos</b> los golpes de la vuelta. Tu resultado neto es golpes menos hándicap. Hay que terminar todos los hoyos. Es la modalidad de la liga.'],
      ['Stableford', 'Cada hoyo da puntos según tu resultado neto: doble bogey o peor <b>0</b>, bogey <b>1</b>, par <b>2</b>, birdie <b>3</b>, eagle <b>4</b>. Gana quien suma más. Si ya no puedes puntuar en un hoyo, recoge la bola y sigue: ayuda al ritmo. Hacer 36 puntos es jugar exactamente a tu hándicap.'],
      ['Match Play (hoyo a hoyo)', 'Juegas contra un rival y cada hoyo lo gana quien hace menos golpes netos. El marcador se dice así: «2 arriba», «igualados»… Puedes conceder un putt o un hoyo al rival.'],
      ['Mejor bola (Fourball)', 'Por parejas. Cada uno juega su bola y en cada hoyo cuenta la <b>mejor</b> de los dos. Se juega con el 85 % del hándicap (90 % en Match Play).'],
      ['Foursome', 'Por parejas y con <b>una sola bola</b>: golpes alternos. Uno sale en los hoyos impares y el otro en los pares. El hándicap de la pareja es la mitad de la suma de los dos.'],
      ['¿Qué es el «Hcp» de cada hoyo?', 'Es lo difícil que es el hoyo: el 1 es el más difícil y el 18 el más fácil. Los golpes que te da tu hándicap se reparten empezando por el Hcp 1. En la app lo ves como «Tu par».'],
    ]},
    { ico: 'soltar', t: 'Cómo se dropa bien', sub: 'Alivio paso a paso', html: [
      ['1. Busca el punto de referencia', 'El punto más cercano de alivio, el punto por donde cruzó el agua o el punto de la línea que hayas elegido.'],
      ['2. Mide la zona', 'Con el palo <b>más largo</b> de tu bolsa, menos el putter: 1 palo o 2 palos según el caso. Nunca más cerca del hoyo.'],
      ['3. Suelta desde la rodilla', 'De pie, deja caer la bola desde la altura de la rodilla, sin lanzarla ni darle efecto.'],
      ['4. Tiene que quedarse dentro', 'La bola debe caer y quedarse dentro de la zona. Si sale, dropa otra vez. Si vuelve a salir, colócala con la mano donde tocó el suelo la segunda vez.'],
    ]},
    { ico: 'green', t: 'En el green', sub: 'Marcar, limpiar y reparar', html: [
      ['Marcar y limpiar', 'Puedes levantar tu bola, limpiarla y volver a ponerla. Márcala antes con una moneda o marcador.'],
      ['Reparar', 'Puedes arreglar piques, marcas de clavos y otros daños del green antes de patear. No puedes arreglar lo natural, como la caída o hierba más alta.'],
      ['La bandera', 'Puesta o quitada, como quieras. Si das en ella, no hay penalidad.'],
      ['No probar el green', 'No se puede frotar el green ni hacer rodar una bola para ver cómo corre.'],
    ]},
    { ico: 'bunker', t: 'En el bunker', sub: 'Lo que se puede y lo que no', html: [
      ['No tocar la arena con el palo', 'Ni justo delante o detrás de la bola, ni en el swing de práctica, ni al subir el palo. Si lo haces: <b>2 golpes</b>.'],
      ['Sí se puede', 'Quitar hojas, piedras y ramas, apoyarte en el palo para no caerte o dejar los palos sobre la arena.'],
      ['Al salir', 'Rastrilla tus huellas y el pique, y deja el rastrillo como pida el club.'],
    ]},
    { ico: 'reloj', t: 'Ritmo y buenas costumbres', sub: 'Para que todos disfruten', html: [
      ['Juega cuando estés listo', 'En partidas amistosas se puede jugar en cuanto estés preparado, sin esperar a que juegue el que está más lejos, siempre que sea seguro.'],
      ['Tiempo de búsqueda', '3 minutos como máximo. Si dudas de encontrarla, juega antes una provisional.'],
      ['Cuida el campo', 'Repón las chuletas, arregla tu pique en el green y rastrilla el bunker.'],
      ['Respeto', 'Silencio y quietud cuando juega otro, sin ponerte en su línea ni detrás de él. Grita «¡bola!» si puede dar a alguien.'],
    ]},
    { ico: 'libro', t: 'Palabras que conviene saber', sub: 'El idioma de las reglas', html: [
      ['Área general', 'Todo el campo salvo el tee de salida, el agua, los bunkers y el green.'],
      ['Área de penalización', 'El agua y otras zonas marcadas con estacas <b>amarillas</b> o <b>rojas</b>. Las rojas dan una opción más: el alivio lateral.'],
      ['Fuera de límites', 'Lo marcado con estacas o líneas <b>blancas</b>. Desde ahí no se juega.'],
      ['Obstrucción', 'Cualquier cosa hecha por el hombre. Si se puede mover (rastrillo, botella) se quita; si no (camino, aspersor), da alivio gratis.'],
      ['Impedimento suelto', 'Algo natural que está suelto: hojas, ramas, piedras. Se puede quitar.'],
      ['Golpe y distancia', 'Sumar 1 golpe y volver a jugar desde donde diste el golpe anterior.'],
      ['Punto más cercano de alivio', 'El sitio más próximo a tu bola, no más cerca del hoyo, donde ya no te molesta lo que te da alivio.'],
    ]},
  ];

  // Iconos propios de esta pantalla (dibujos de línea)
  const RG_ICOS = {
    agua: '<path d="M2 15c2 0 2-1.5 4-1.5S8 15 10 15s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M2 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><circle cx="12" cy="7" r="3"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    limite: '<path d="M5 21V4"/><path d="M12 21V4"/><path d="M19 21V4"/><path d="M3 9h18"/>',
    arbusto: '<path d="M12 21v-5"/><path d="M7 16a4 4 0 0 1-1-7.9A5 5 0 0 1 15.6 6 4.5 4.5 0 0 1 18 16Z"/>',
    camino: '<path d="M8 3 5 21"/><path d="m16 3 3 18"/><path d="M12 5v2M12 11v2M12 17v2"/>',
    charco: '<path d="M3 15c0-2.5 3-3.5 5-3s4-1.5 7-1 6 1.5 6 4-3 3.5-9 3.5S3 17.5 3 15Z"/><path d="M8 6v2M12 4v3M16 6v2"/>',
    empotrada: '<path d="M2 16h20"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/><path d="M5 20h14"/>',
    hoja: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    mano: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    bolas: '<circle cx="8" cy="12" r="5"/><circle cx="17" cy="12" r="4"/>',
    green: '<path d="M7 3v14"/><path d="M7 3l7 3-7 3"/><ellipse cx="12" cy="18" rx="9" ry="3"/>',
    bandera: '<path d="M5 22V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    tee: '<path d="M8 3h8"/><path d="M12 3v10"/><path d="m9 21 3-8 3 8"/>',
    palos: '<path d="M6 3l3 15"/><path d="M12 3v15"/><path d="M18 3l-3 15"/><path d="M5 21h14"/>',
    soltar: '<circle cx="12" cy="5" r="2.5"/><path d="M12 9v8"/><path d="m8.5 13.5 3.5 3.5 3.5-3.5"/><path d="M4 21h16"/>',
    bunker: '<path d="M2 18c3-4 6-6 10-6s7 2 10 6"/><path d="M6 21h12"/><circle cx="12" cy="8" r="2"/>',
    reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
    trofeo: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    libro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  };
  function rgIco(n){ return '<svg class="ico rg-ico" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (RG_ICOS[n] || '') + '</svg>'; }
  function rgTag(p){ const x = RG_PEN[p]; return '<span class="rg-tag ' + x.cls + '">' + x.txt + '</span>'; }

  function rgPintar(){
    const body = document.getElementById('reglasBody'); if(!body) return;
    body.innerHTML =
      '<div class="rg-leyenda">' + ['sin', 'uno', 'dos'].map(rgTag).join('') + '</div>'
      + '<div class="rg-sec-t">Reglas de Los Iscariotes</div>'
      + '<div class="rg-lista">' + RG_LOCALES.map(c =>
          '<details class="rg-item rg-local" name="reglas">'
          + '<summary>' + rgIco(c.ico) + '<span class="rg-st"><b>' + c.t + '</b><small>' + c.sub + '</small><span class="rg-tag rg-casa">Regla de la liga</span></span><span class="rg-mas" aria-hidden="true"></span></summary>'
          + '<ul class="rg-pasos">' + c.pasos.map(p => '<li>' + p + '</li>').join('') + '</ul>'
          + '</details>').join('') + '</div>'
      + '<div class="rg-sec-t">¿Qué hago si…?</div>'
      + '<div class="rg-lista">' + RG_CASOS.map(c =>
          '<details class="rg-item" name="reglas">'
          + '<summary>' + rgIco(c.ico) + '<span class="rg-st"><b>' + c.t + '</b><small>' + c.sub + '</small>' + rgTag(c.pen) + '</span><span class="rg-mas" aria-hidden="true"></span></summary>'
          + '<ul class="rg-pasos">' + c.pasos.map(p => '<li>' + p + '</li>').join('') + '</ul>'
          + '</details>').join('') + '</div>'
      + '<div class="rg-sec-t">Para saber más</div>'
      + '<div class="rg-lista">' + RG_TEMAS.map(t =>
          '<details class="rg-item" name="reglas">'
          + '<summary>' + rgIco(t.ico) + '<span class="rg-st"><b>' + t.t + '</b><small>' + t.sub + '</small></span><span class="rg-mas" aria-hidden="true"></span></summary>'
          + '<div class="rg-fichas">' + t.html.map(f => '<div class="rg-ficha"><div class="rg-ficha-t">' + f[0] + '</div><div class="rg-ficha-d">' + f[1] + '</div></div>').join('') + '</div>'
          + '</details>').join('') + '</div>'
      + '<div class="rg-pie">Resumen en lenguaje sencillo de las Reglas de Golf de la R&amp;A y la USGA (edición vigente), que aplica la Real Federación Española de Golf. Si hay dudas en una competición, manda el reglamento oficial y las reglas locales del club. Para consultarlo entero, la app gratuita oficial «Rules of Golf» de la R&amp;A.</div>';
    // Solo uno abierto a la vez, y se lleva a la vista
    body.querySelectorAll('details.rg-item').forEach(d => d.addEventListener('toggle', ()=>{
      if(!d.open) return;
      body.querySelectorAll('details.rg-item').forEach(o => { if(o !== d) o.open = false; });
      setTimeout(()=>{ try { d.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(e){} }, 60);
    }));
  }

  function rgAbrir(){
    const ov = document.getElementById('reglasOverlay'); if(!ov) return;
    rgPintar();
    ov.hidden = false;
    const card = ov.querySelector('.reglas-card'); if(card) card.scrollTop = 0;
  }
  function rgCerrar(){ const ov = document.getElementById('reglasOverlay'); if(ov) ov.hidden = true; }

  (function(){
    const b = document.getElementById('hmReglas'); if(b) b.addEventListener('click', rgAbrir);
    ['reglasCerrar', 'reglasVolver', 'reglasVolver2'].forEach(id => { const x = document.getElementById(id); if(x) x.addEventListener('click', rgCerrar); });
  })();
