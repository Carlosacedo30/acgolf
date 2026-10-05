/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- El caddie que habla: un bocadillo por hoyo con el campo (notas de Carlos), una frase para cada
  // jugador según su historial (vista caddie_hoyo) y, a veces, algo de pique. Todo se arma aquí, sin internet.

  // Notas del campo confirmadas por Carlos (hoyos/notas-hato-verde.md). "consejo" es la sugerencia del caddie.
  const NOTAS_CAMPO = {
    'hato-verde': {
      1:  { txt:'Lago y riachuelo por la derecha.', consejo:'Apunta al lado izquierdo de la calle.' },
      2:  { txt:'Agua delante y a la izquierda del green.', consejo:'Mejor quedarse a la derecha del green que mojarse.' },
      3:  { txt:'Búnker a la izquierda de la calle y dos delante del green.', consejo:'Al green, palo de más: lo corto acaba en la arena.' },
      4:  { txt:'Agua a la izquierda y al fondo, y búnker detrás del green.', consejo:'No te pases de green.' },
      5:  { txt:'Búnkeres delante y a la derecha del green.', consejo:'Apunta al centro-izquierda del green.' },
      6:  { txt:'Agua delante del green.', consejo:'Coge palo de más: el agua está delante.' },
      7:  { txt:'Búnker a la izquierda del green.', consejo:'Juega al centro-derecha del green.' },
      8:  { txt:'Agua cruzando la calle y detrás del green, y búnkeres a los dos lados.', consejo:'Decide antes de pegar: o pasas el agua o te quedas corto.' },
      9:  { txt:'Agua delante del green.', consejo:'Coge palo de más: el agua está delante.' },
      10: { txt:'Agua y cinco búnkeres a la izquierda, y agua detrás del green.', consejo:'Salida al lado derecho de la calle.' },
      11: { txt:'Agua a la izquierda antes del green y búnker delante.', consejo:'Apunta al centro-derecha del green.' },
      12: { txt:'Búnkeres a la izquierda por la calle y uno a la derecha del green.', consejo:'Salida por el lado derecho de la calle.' },
      13: { txt:'Búnkeres a la izquierda y uno delante del green.', consejo:'Salida por la derecha y palo de más al green.' },
      14: { txt:'Cinco búnkeres en la calle, casi todos a la izquierda.', consejo:'Mejor calle que distancia: salida al lado derecho.' },
      15: { txt:'Búnkeres a la izquierda del green.', consejo:'Apunta al centro-derecha del green.' },
      16: { txt:'Agua y búnkeres a la izquierda, y agua delante del green.', consejo:'Salida a la derecha y palo de más al green.' },
      17: { txt:'Agua al salir y a la izquierda, y tres búnkeres alrededor del green.', consejo:'Saca la bola volando del tee y busca el centro del green.' },
      18: { txt:'Agua y búnkeres a la izquierda, y un búnker a la derecha en la salida.', consejo:'Salida al centro de la calle.' },
    },
  };

  // Elige una de varias frases, siempre la misma para el mismo hoyo y jugador (para que no baile al repintar)
  const elige = (opciones, semilla) => opciones[Math.abs(semilla) % opciones.length];
  const nombreDePila = n => String(n || '').trim().split(/\s+/)[0] || n;

  // Frase para un jugador, según el veredicto del caddie y sus números en este hoyo
  function fraseJugador(nombre, r, tip, recibidos, semilla){
    const n = '<b>' + nombreDePila(nombre) + '</b>';
    const media = fmt1(r.media), rec = r.media_reciente != null ? fmt1(r.media_reciente) : null;
    let f;
    switch(tip.tag){
      case 'Hoyo trampa': f = elige([
        n + ', aquí sueles hacer ' + media + ': el bogey es buen resultado.',
        n + ', este hoyo es exigente para ti (media ' + media + '). Un bogey aquí es una victoria.',
        n + ', aquí sueles hacer ' + media + '. Con paciencia, el bogey llega solo.' ], semilla); break;
      case 'Ojo': f = elige([
        n + ', si el golpe se complica, sacar a la calle es la jugada inteligente.',
        n + ', aquí lo que más suma es no arriesgar: palo cómodo y al centro.',
        n + ', juega a lo seguro y este hoyo será tuyo.' ], semilla); break;
      case 'Ataca': f = elige([
        n + ', es de tus mejores hoyos (media ' + media + '): ¡a por el par!',
        n + ', este se te da bien. Hoy toca atacar.',
        n + ', aquí juegas como en casa: ' + media + ' de media. ¡Ataca!' ], semilla); break;
      case 'En racha': f = elige([
        n + ', últimamente lo juegas mejor (' + rec + ' en las últimas 8). Sigue así.',
        n + ', vas en racha en este hoyo. No cambies nada.' ], semilla); break;
      case 'Prudencia': f = elige([
        n + ', estos días lo tienes en ' + rec + '. Juega tranquilo, al centro.',
        n + ', calle y green, sin prisas: así se domina este hoyo.' ], semilla); break;
      case 'Nuevo': f = n + ', aún te conozco poco aquí: juega al centro.'; break;
      default: f = elige([
        n + ', ' + media + ' de media aquí: centro del green y dos putts.',
        n + ', hoyo normal para ti (' + media + '). Sin prisas.' ], semilla);
    }
    if(recibidos >= 2) f += ' Tienes 2 golpes de regalo.';
    else if(recibidos === 1 && (tip.cls === 'trampa')) f += ' Tienes golpe: úsalo.';
    return f;
  }

  // Cara del caddie (dibujo propio): ánimo 'contento', 'serio' o 'normal'
  function caddieCara(animo){
    const boca = animo === 'contento'
      ? '<path d="M33 54 Q40 61 47 54 Z" fill="#7A2E22"/><path d="M35 55.5 Q40 57.5 45 55.5" stroke="#fff" stroke-width="1.6" fill="none"/>'
      : animo === 'serio' ? '<path d="M35 56 Q40 54 45 56" stroke="#5B3A22" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
      : '<path d="M35 55 Q40 58.5 45 55" stroke="#5B3A22" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    const cejas = animo === 'serio'
      ? '<path d="M27 33 L35 35.5" stroke="#8E8E8E" stroke-width="3" stroke-linecap="round"/><path d="M53 33 L45 35.5" stroke="#8E8E8E" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M27 34.5 Q31 31 35 33.5" stroke="#8E8E8E" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M45 33.5 Q49 31 53 34.5" stroke="#8E8E8E" stroke-width="3" fill="none" stroke-linecap="round"/>';
    const ojos = animo === 'contento'
      ? '<path d="M28.5 40.5 Q31.5 37.5 34.5 40.5" stroke="#2B2B2B" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M45.5 40.5 Q48.5 37.5 51.5 40.5" stroke="#2B2B2B" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      : '<ellipse cx="31.5" cy="40" rx="2.4" ry="2.8" fill="#2B2B2B"/><ellipse cx="48.5" cy="40" rx="2.4" ry="2.8" fill="#2B2B2B"/><circle cx="32.3" cy="39" r=".8" fill="#fff"/><circle cx="49.3" cy="39" r=".8" fill="#fff"/>';
    return '<svg class="ch-cara" viewBox="0 0 80 92" width="70" height="80" aria-hidden="true">'
      // cuerpo: polo azul con cuello blanco y toalla de caddie al hombro
      + '<path d="M8 92 C8 76 20 69 40 69 C60 69 72 76 72 92 Z" fill="#1B3B6F"/>'
      + '<path d="M31 69 L40 78 L49 69 L46 67 L40 73 L34 67 Z" fill="#FFFFFF"/>'
      + '<path d="M52 69 C60 70 66 74 68 84 L61 86 C59 79 56 75 50 73 Z" fill="#F3EBD3"/><path d="M55 71.5 L62 85" stroke="#C9A227" stroke-width="1.6"/><path d="M58 70.8 L65 84.4" stroke="#C9A227" stroke-width="1.6"/>'
      + '<rect x="35" y="60" width="10" height="10" rx="4" fill="#D9A27A"/>'
      // cabeza, orejas, patillas canosas
      + '<ellipse cx="18" cy="43" rx="4.5" ry="6.5" fill="#D9A27A"/><ellipse cx="62" cy="43" rx="4.5" ry="6.5" fill="#D9A27A"/>'
      + '<ellipse cx="40" cy="43" rx="22" ry="21" fill="#E8B98F"/>'
      + '<path d="M18.5 33 C18 40 19 46 21 49 L23 40 Z M61.5 33 C62 40 61 46 59 49 L57 40 Z" fill="#BDBDBD"/>'
      + '<circle cx="26" cy="49" r="3.6" fill="#F0A58A" opacity=".5"/><circle cx="54" cy="49" r="3.6" fill="#F0A58A" opacity=".5"/>'
      + cejas + ojos
      // nariz y bigote
      + '<path d="M40 41 Q37 47 39.5 48.5 Q42 49 42.5 47" stroke="#C98D63" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + boca
      + '<path d="M40 50.5 C36 49 30 49.5 27.5 53.5 C31 53 34 53.5 36.5 54.5 C38 54.8 39 54 40 53 C41 54 42 54.8 43.5 54.5 C46 53.5 49 53 52.5 53.5 C50 49.5 44 49 40 50.5 Z" fill="#A9A9A9"/>'
      // gorra dorada con visera azul y banderita de golf
      + '<path d="M17 30 C17 11 63 11 63 30 Z" fill="#C9A227"/>'
      + '<path d="M17 28 C30 25.5 50 25.5 63 28 L63 31 C50 28.5 30 28.5 17 31 Z" fill="#A8861C"/>'
      + '<path d="M16 30 C30 27.5 52 27.5 64 30 C70 30.5 75 32 75 34.5 C66 33.5 56 32.5 40 32.5 C30 32.5 22 33 16 33.5 Z" fill="#1B3B6F"/>'
      + '<circle cx="40" cy="11.5" r="2.2" fill="#1B3B6F"/>'
      + '<path d="M38 15.5 L38 26" stroke="#1B3B6F" stroke-width="1.6"/><path d="M38 16 L45 18.5 L38 21 Z" fill="#B0433F"/>'
      + '</svg>';
  }

  // Bocadillo completo del hoyo. jugadores = [{ nombre, recibidos }]
  function caddieHablaHtml(hole, jugadores){
    const courseId = selectedCourse && selectedCourse.id;
    if(!courseId) return '';
    const par = selectedCourse.par ? +selectedCourse.par[hole - 1] : null;
    const nota = NOTAS_CAMPO[courseId] && NOTAS_CAMPO[courseId][hole];
    const course = caddieCache[courseId];
    const lineas = [];
    let malos = 0, buenos = 0;
    const netos = [];
    jugadores.forEach((j, i)=>{
      const holes = course && course[caddieKey(j.nombre)];
      const r = holes && holes[hole];
      if(!r) return;
      const tip = caddieTip(r, holes);
      if(tip.cls === 'trampa') malos++;
      if(tip.cls === 'fuerte') buenos++;
      lineas.push({ tag: tip.tag, nombre: j.nombre, texto: fraseJugador(j.nombre, r, tip, j.recibidos, hole + i) });
      if(+r.n >= 3) netos.push({ nombre: j.nombre, neto: +r.media - (j.recibidos || 0) });
    });
    if(!nota && !lineas.length) return '';

    // Pique: el que mejor juega este hoyo del grupo (en neto) y si fue el hoyo maldito de la semana
    let pique = '';
    if(typeof premiosData !== 'undefined' && premiosData && premiosData.hoyo_maldito
       && premiosData.hoyo_maldito.course_id === courseId && +premiosData.hoyo_maldito.hoyo === hole){
      pique = '🧭 Fue el hoyo más difícil de la semana pasada: juega con calma.';
    } else if(netos.length >= 2){
      netos.sort((a, b) => a.neto - b.neto);
      if(netos[1].neto - netos[0].neto >= 0.3){
        pique = elige([
          '🏆 Del grupo, el que mejor juega este hoyo es <b>' + nombreDePila(netos[0].nombre) + '</b> (' + fmt1(netos[0].neto) + ' netos de media). ¿Quién se lo quita?',
          '🏆 Aquí manda <b>' + nombreDePila(netos[0].nombre) + '</b>: ' + fmt1(netos[0].neto) + ' netos de media. A ver si hoy le ganáis.' ], hole);
      }
    }

    // Si 3 o más comparten el mismo veredicto, una sola frase para todos (no repetir lo mismo 4 veces)
    const GRUPAL = {
      'Hoyo trampa': 'hoyo trampa para vosotros. Aquí el bogey es buen resultado.',
      'Ojo': 'aquí lo inteligente es no arriesgar. Palo cómodo y al centro.',
      'Ataca': 'este hoyo se os da bien. ¡A por el par!',
      'Normal': 'hoyo normal para vosotros. Centro del green y dos putts.',
    };
    const porTag = {};
    lineas.forEach(l => { (porTag[l.tag] = porTag[l.tag] || []).push(l); });
    const textos = [];
    const unir = ns => ns.length > 1 ? ns.slice(0, -1).join(', ') + ' y ' + ns[ns.length - 1] : ns[0];
    lineas.forEach(l => {
      const grupo = porTag[l.tag];
      if(grupo.length >= 3 && GRUPAL[l.tag]){
        if(grupo[0] === l) textos.push('<b>' + unir(grupo.map(g => nombreDePila(g.nombre))) + '</b>: ' + GRUPAL[l.tag]);
      } else textos.push(l.texto);
    });
    const animo = malos > buenos ? 'serio' : buenos > malos ? 'contento' : 'normal';
    const cabecera = 'Hoyo ' + hole + (par ? ' · par ' + par : '');
    return '<div class="ch ch-' + animo + '">'
      + '<div class="ch-quien">' + caddieCara(animo) + '<span>Tu caddie</span></div>'
      + '<div class="ch-bocadillo">'
      + '<div class="ch-cab">' + cabecera + '</div>'
      + (nota ? '<p class="ch-campo">' + nota.txt + ' <strong>' + nota.consejo + '</strong></p>' : '')
      + textos.map(l => '<p>' + l + '</p>').join('')
      + (pique ? '<p class="ch-pique">' + pique + '</p>' : '')
      + '</div></div>';
  }
