/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Historia del golf (con Seve Ballesteros como protagonista) ---
// Textos propios, en lenguaje sencillo. Fotos de Wikimedia Commons con licencia libre (autor y licencia al pie de cada una).
(function(){
  const C = 'https://upload.wikimedia.org/wikipedia/commons/';
  const FOTOS = {
    seveAccion:  { src: C + 'thumb/b/ba/Pro_Am_open_golfkampioenschap_S._Ballesteros_in_actie%2C_Bestanddeelnr_934-0383.jpg/960px-Pro_Am_open_golfkampioenschap_S._Ballesteros_in_actie%2C_Bestanddeelnr_934-0383.jpg',
                   w: 960, h: 1446, pos: 'center 30%', autor: 'Bart Molendijk / Anefo (1987)', lic: 'CC0', file: 'Pro_Am_open_golfkampioenschap_S._Ballesteros_in_actie,_Bestanddeelnr_934-0383.jpg' },
    seveLluvia:  { src: C + 'thumb/6/60/KLM-Golftoernooi_in_Noordwijk_Seve_Ballesteros_in_actie_%28in_regenpak%29%2C_Bestanddeelnr_933-7165.jpg/960px-KLM-Golftoernooi_in_Noordwijk_Seve_Ballesteros_in_actie_%28in_regenpak%29%2C_Bestanddeelnr_933-7165.jpg',
                   w: 960, h: 1445, pos: 'center 25%', autor: 'Bart Molendijk / Anefo (1986)', lic: 'CC0', file: 'KLM-Golftoernooi_in_Noordwijk_Seve_Ballesteros_in_actie_(in_regenpak),_Bestanddeelnr_933-7165.jpg' },
    seve2006:    { src: C + 'thumb/2/23/Seve_Ballesteros%2C_Open_2006_%282661608701%29.jpg/960px-Seve_Ballesteros%2C_Open_2006_%282661608701%29.jpg',
                   w: 960, h: 1440, pos: 'center 20%', autor: 'Steven Newton (2006)', lic: 'CC BY 2.0', file: 'Seve_Ballesteros,_Open_2006_(2661608701).jpg' },
    pedrena:     { src: C + 'thumb/c/cb/Jugando_al_golf_en_el_Club_de_Pedre%C3%B1a._Cantabria.jpg/960px-Jugando_al_golf_en_el_Club_de_Pedre%C3%B1a._Cantabria.jpg',
                   w: 960, h: 687, pos: 'center', autor: 'Joaquín del Palacio, 1942 (Biblioteca de la Facultad de Empresa y Gestión Pública, Universidad de Zaragoza)', lic: 'CC BY-SA 2.0', file: 'Jugando_al_golf_en_el_Club_de_Pedreña._Cantabria.jpg' },
    lytham:      { src: C + 'thumb/e/ed/The_Royal_Lytham_St_Anne%27s_Golf_Course_-_geograph.org.uk_-_3208239.jpg/960px-The_Royal_Lytham_St_Anne%27s_Golf_Course_-_geograph.org.uk_-_3208239.jpg',
                   w: 960, h: 639, pos: 'center', autor: 'Steve Daniels', lic: 'CC BY-SA 2.0', file: "The_Royal_Lytham_St_Anne's_Golf_Course_-_geograph.org.uk_-_3208239.jpg" },
    green18:     { src: C + '3/3c/18th_Green_and_Clubhouse.jpg',
                   w: 640, h: 427, pos: 'center', autor: 'Paul Birrell', lic: 'CC BY-SA 2.0', file: '18th_Green_and_Clubhouse.jpg' },
    olazabal:    { src: C + 'thumb/1/13/Jos%C3%A9_Mar%C3%ADa_Olaz%C3%A1bal_Ryder_Cup_2025-116.jpg/960px-Jos%C3%A9_Mar%C3%ADa_Olaz%C3%A1bal_Ryder_Cup_2025-116.jpg',
                   w: 960, h: 1440, pos: 'center 25%', autor: 'Bryan Berlin (2025)', lic: 'CC BY-SA 4.0', file: 'José_María_Olazábal_Ryder_Cup_2025-116.jpg' },
    kolf:        { src: C + 'thumb/c/cb/Hendrick_Avercamp%2C_Kolfspelers_op_het_ijs%2C_Circa_1625.jpg/960px-Hendrick_Avercamp%2C_Kolfspelers_op_het_ijs%2C_Circa_1625.jpg',
                   w: 960, h: 537, pos: 'center', autor: 'Hendrick Avercamp, hacia 1625', lic: 'Dominio público', file: 'Hendrick_Avercamp,_Kolfspelers_op_het_ijs,_Circa_1625.jpg' },
    calotipo:    { src: C + 'thumb/d/dd/Captain_David_Campbell%2C_Allan_Robertson%2C_Tom_Morris%2C_Bob_Andrews%2C_Sir_Hugh_Playfair_and_Watty_Alexander_2.jpg/960px-Captain_David_Campbell%2C_Allan_Robertson%2C_Tom_Morris%2C_Bob_Andrews%2C_Sir_Hugh_Playfair_and_Watty_Alexander_2.jpg',
                   w: 960, h: 675, pos: 'center', autor: 'Hill & Adamson, 1843-1847 (National Galleries of Scotland)', lic: 'Sin restricciones conocidas', file: 'Captain_David_Campbell,_Allan_Robertson,_Tom_Morris,_Bob_Andrews,_Sir_Hugh_Playfair_and_Watty_Alexander_2.jpg' },
    swilcan:     { src: C + 'thumb/3/3b/R%26A_Clubhouse%2C_Old_Course%2C_Swilcan_Burn_bridge.jpg/960px-R%26A_Clubhouse%2C_Old_Course%2C_Swilcan_Burn_bridge.jpg',
                   w: 960, h: 641, pos: 'center', autor: 'Optograph (2012)', lic: 'CC BY-SA 3.0', file: 'R&A_Clubhouse,_Old_Course,_Swilcan_Burn_bridge.jpg' },
    featherie:   { src: C + 'thumb/f/fe/Featherie_golf_ball.JPG/960px-Featherie_golf_ball.JPG',
                   w: 960, h: 896, pos: 'center', autor: 'Geni (2013)', lic: 'CC BY-SA 4.0', file: 'Featherie_golf_ball.JPG' },
    morris:      { src: C + 'b/bc/Old_and_Young_Tom_Morris.jpg',
                   w: 371, h: 527, pos: 'center 20%', autor: 'Thomas Rodger, hacia 1870', lic: 'Dominio público', file: 'Old_and_Young_Tom_Morris.jpg' },
    jones:       { src: C + '5/57/Bobby_Jones_wins_British_Open_in_1930.jpg',
                   w: 768, h: 971, pos: 'center 20%', autor: 'Autor desconocido, 1930', lic: 'CC0', file: 'Bobby_Jones_wins_British_Open_in_1930.jpg' },
  };

  const SEVE_CIFRAS = [
    ['5', 'grandes', '3 Open Británicos y 2 Masters'],
    ['50', 'torneos del Circuito Europeo', 'nadie ha ganado más'],
    ['+90', 'victorias en total', 'por todo el mundo'],
    ['6', 'Órdenes de Mérito', 'el mejor de Europa del año'],
    ['8', 'Ryder Cup como jugador', 'y capitán ganador en 1997'],
    ['19', 'años', 'cuando asombró al mundo en 1976'],
  ];

  const SEVE = [
    { foto: 'pedrena', ano: '1957–1974', t: 'Un niño, una playa y un hierro 3',
      p: ['Severiano Ballesteros nació el 9 de abril de 1957 en Pedreña (Cantabria), al lado del campo de golf. Su padre trabajaba en el campo, sus hermanos mayores también se dedicaron al golf y su tío, Ramón Sota, fue campeón de España.',
          'Con 8 años su hermano Manuel le regaló la cabeza de un hierro 3. Seve le puso un palo de madera y se pasaba el día en la playa de Pedreña dando golpes de todo tipo con ese único palo. De ahí salió su famosa imaginación: aprendió a sacar cualquier golpe con lo que tenía.',
          'A los 9 años ya hacía de caddie y a los 16 se hizo profesional.'] },
    { foto: 'seveAccion', ano: '1976', t: 'Con 19 años, segundo en el Open',
      p: ['En el Open Británico de Royal Birkdale, un chaval español desconocido lideró el torneo y acabó segundo. El mundo del golf descubrió a Seve. Ese mismo año ganó su primer Orden de Mérito, el título al mejor jugador de Europa.'] },
    { foto: 'lytham', ano: '1979', t: 'El campeón del aparcamiento',
      p: ['Ganó su primer grande, el Open Británico de Royal Lytham, con 22 años. En el hoyo 16 de la última vuelta su salida acabó entre los coches aparcados. Tomó alivio, dejó la bola en el green e hizo birdie. Desde entonces le llamaron «el campeón del aparcamiento».',
          'Ningún jugador de la Europa continental ganaba el Open desde el francés Arnaud Massy, en 1907.'] },
    { foto: 'seveLluvia', ano: '1980 y 1983', t: 'Dos chaquetas verdes en Augusta',
      p: ['En 1980 ganó el Masters de Augusta: fue el primer europeo en ganarlo y, con 23 años, el campeón más joven de su historia hasta entonces. En 1983 lo volvió a ganar.',
          'Su golf era distinto: pegaba fuerte y a veces se iba lejos, pero desde los árboles, la arena o el rough se inventaba golpes que nadie más veía. Su juego corto era magia.'] },
    { foto: 'green18', ano: '1984', t: 'St Andrews y el puño al cielo',
      p: ['En el Open de St Andrews, la cuna del golf, metió el putt de birdie del hoyo 18 para ganar. Lo celebró con el puño en alto, una y otra vez, en una de las imágenes más famosas del golf.',
          'Él mismo contó que fue el momento más feliz de toda su vida deportiva.'] },
    { foto: 'lytham', ano: '1988', t: 'La vuelta perfecta en Lytham',
      p: ['Volvió a ganar el Open en Royal Lytham con una última vuelta de 65 golpes, que él consideraba quizá la mejor de su carrera. Era su quinto grande.'] },
    { foto: 'olazabal', ano: '1979–1997', t: 'El alma de la Ryder Cup',
      p: ['Desde 1979 los jugadores de toda Europa pueden jugar la Ryder Cup contra Estados Unidos. Seve fue el gran motivo: con él, Europa pasó de perder casi siempre a ganar.',
          'Jugó 8 Ryder Cups. Con José María Olazábal formó la mejor pareja de la historia del torneo: jugaron 15 partidos juntos y ganaron 11, empataron 2 y solo perdieron 2.',
          'En 1997 fue el capitán en Valderrama (Cádiz), la primera Ryder Cup jugada en la Europa continental. Europa ganó 14½ a 13½.'],
      pie: 'En la foto, José María Olazábal en la Ryder Cup de 2025.' },
    { foto: 'seve2006', ano: '2008–2011', t: 'La despedida',
      p: ['En 2008 le encontraron un tumor cerebral. Luchó con varias operaciones y en 2009 creó la Fundación Seve Ballesteros para investigar los tumores cerebrales.',
          'Murió el 7 de mayo de 2011 en Pedreña, con 54 años. Había recibido el Premio Príncipe de Asturias de los Deportes (1989) y entró en el Salón de la Fama del golf mundial (1999). Hoy el aeropuerto de Santander lleva su nombre.',
          'Con él, el golf en España dejó de ser un deporte raro: miles de personas empezaron a jugar por Seve.'],
      pie: 'En la foto, Seve en el Open de 2006.' },
  ];

  const HISTORIA = [
    { foto: 'kolf', ano: 'Siglos XIII–XVII', t: 'Antes del golf: el «kolf»',
      p: 'En los Países Bajos se jugaba al «colf» o «kolf»: golpear una bola con un palo hacia un objetivo, muchas veces sobre los canales helados en invierno, como en este cuadro de Avercamp.' },
    { ano: '1457', t: 'Escocia lo prohíbe… porque gustaba demasiado',
      p: 'La primera vez que aparece la palabra golf en Escocia es en una ley del rey Jacobo II que lo prohíbe: los soldados jugaban al golf en vez de practicar el tiro con arco. En 1502 Jacobo IV ya se compraba sus propios palos.' },
    { foto: 'calotipo', ano: '1744', t: 'Las primeras reglas escritas',
      p: 'Los golfistas de Leith, en Edimburgo, escribieron las 13 primeras reglas del golf para su torneo. Algunas ideas siguen hoy, como no cambiar de bola durante el hoyo.',
      pie: 'En la foto, golfistas de St Andrews hacia 1845, entre ellos Allan Robertson y un joven Tom Morris: una de las fotografías de golf más antiguas.' },
    { ano: '1754–1764', t: 'St Andrews y los 18 hoyos',
      p: 'En 1754 se fundó la sociedad de golfistas de St Andrews, que en 1834 pasó a llamarse Royal and Ancient (la R&A, que todavía publica las reglas). En 1764 su campo se quedó con 18 hoyos y desde entonces es la medida de todos los campos del mundo.' },
    { foto: 'featherie', ano: '1848 y 1898', t: 'De las plumas a la goma',
      p: 'Las primeras bolas buenas eran de cuero relleno de plumas («featherie»): caras y se rompían. En 1848 llegó la de gutapercha, mucho más barata, y en 1898 la Haskell, con núcleo de hilos de goma, que volaba mucho más. Ahí empezó el golf moderno.' },
    { foto: 'morris', ano: '1860', t: 'Nace el Open',
      p: 'El primer Open se jugó en Prestwick (Escocia) y lo ganó Willie Park. Old Tom Morris lo ganó cuatro veces y su hijo, Young Tom, otras cuatro; fue el primer gran genio del golf y murió con solo 24 años.' },
    { ano: '1895–1916', t: 'Nacen los otros grandes',
      p: 'Al Open se sumaron el US Open (1895) y el PGA Championship (1916). Con el Masters, desde 1934, forman los cuatro «grandes» que hoy deciden quién es el mejor jugador del mundo.' },
    { ano: '1900', t: 'El golf, deporte olímpico',
      p: 'El golf estuvo en los Juegos Olímpicos de París 1900 y de San Luis 1904. Luego desapareció y no volvió hasta Río 2016.' },
    { ano: '1891', t: 'El golf llega a España',
      p: 'Un grupo de británicos que vivían en Gran Canaria fundó el club de golf de Las Palmas, el más antiguo de España.' },
    { foto: 'jones', ano: '1927–1934', t: 'Ryder Cup, Bobby Jones y Augusta',
      p: 'En 1927 se jugó la primera Ryder Cup, en Estados Unidos. En 1930 el aficionado Bobby Jones ganó los cuatro grandes de la época en el mismo año, algo que nadie ha repetido. Después creó el campo de Augusta, donde en 1934 nació el Masters.' },
    { ano: '1958–1986', t: 'La televisión y los gigantes',
      p: 'La televisión llevó el golf a todas las casas. Arnold Palmer arrastraba multitudes y Jack Nicklaus ganó 18 grandes, el récord que todavía nadie ha superado. Durante años los americanos ganaban casi todo.' },
    { seve: true, ano: '1976–1997', t: 'Seve Ballesteros, el genio de Pedreña' },
    { ano: '1997–2019', t: 'Tiger Woods',
      p: 'Ganó su primer Masters en 1997 con 21 años y por 12 golpes. Llegó a 15 grandes y cambió el deporte: más fuerza, más preparación física y millones de nuevos aficionados.' },
    { ano: '1994–2023', t: 'Los herederos españoles',
      p: 'José María Olazábal ganó el Masters en 1994 y 1999; Sergio García, en 2017; y Jon Rahm ganó el US Open de 2021 y el Masters de 2023. En 2016 el golf volvió a los Juegos Olímpicos después de 112 años.' },
  ];

  // Reportajes: historias largas, escritas para la app
  const REPORTAJES = [
    { foto: 'morris', t: 'Old Tom y Young Tom, padre e hijo', sub: 'La primera gran saga del golf',
      p: ['Tom Morris, al que todos llaman Old Tom, fue el gran hombre de St Andrews en el siglo XIX: hacía bolas y palos, diseñaba campos y cuidaba el Old Course. Ganó cuatro Open y en 1867, con 46 años, se convirtió en el campeón más veterano de la historia del torneo. Ese récord sigue en pie.',
          'Su hijo, Young Tom, fue todavía mejor. En 1868 ganó el Open con 17 años, el campeón más joven de siempre, y lo volvió a ganar en 1869 y 1870. Al ganarlo tres veces seguidas se quedó en propiedad el premio de entonces, un cinturón de cuero rojo, y en 1871 no hubo Open porque no había trofeo.',
          'Para el año siguiente se encargó una jarra de plata, la famosa Claret Jug, que todavía hoy levanta el ganador del Open. El primer nombre grabado en ella es el de Young Tom, que ganó en 1872.',
          'Su historia acabó en tragedia. En 1875 murieron su mujer y su hijo recién nacido en el parto, y pocos meses después, el día de Navidad, murió él con solo 24 años. Padre e hijo están enterrados en St Andrews, a pocos metros del campo donde lo cambiaron todo.'] },
    { foto: 'jones', t: 'Bobby Jones y el año perfecto', sub: '1930: los cuatro grandes en un solo año',
      p: ['Bobby Jones nunca fue profesional. Era abogado en Atlanta y jugaba como aficionado, pero ganaba a los mejores del mundo.',
          'En 1930 hizo algo que nadie ha repetido: ganó en el mismo año los cuatro grandes torneos de la época. Primero el Amateur Británico en St Andrews, después el Open en Hoylake, luego el US Open y por último el Amateur de Estados Unidos. Nueva York le recibió con un desfile por las calles.',
          'Con solo 28 años decidió retirarse. Ya no tenía nada que demostrar.',
          'Su gran obra vino después: junto a su amigo Clifford Roberts creó en Georgia el club de Augusta National. En 1934 organizó allí un torneo por invitación que acabó siendo el Masters, el grande más famoso del mundo. El que Seve ganaría dos veces.'] },
    { foto: 'olazabal', t: 'Seve y Olazábal, la pareja invencible', sub: 'La Armada española de la Ryder Cup',
      p: ['En 1987 Europa viajó a Muirfield Village, en Ohio, el campo de Jack Nicklaus, a defender la Ryder Cup. Nunca había ganado en Estados Unidos. En el equipo iba un debutante de 21 años de Hondarribia, José María Olazábal, y el capitán lo emparejó con Seve.',
          'Funcionó desde el primer día. Seve era el genio que se inventaba golpes imposibles; Olazábal, el compañero tranquilo que no fallaba. Se hablaban en castellano, se animaban con el puño en alto y los americanos no sabían cómo pararlos. Europa ganó aquella Ryder, la primera en suelo americano.',
          'Juntos jugaron 15 partidos de Ryder Cup: ganaron 11, empataron 2 y solo perdieron 2. Es el mejor registro de una pareja en toda la historia del torneo. La prensa los bautizó como la Armada española.',
          'Olazábal ganaría después dos Masters, en 1994 y 1999, y en 2012 fue el capitán europeo en la remontada de Medinah. Aquel equipo jugó el último día con la silueta de Seve, que había muerto el año anterior, bordada en la ropa.'] },
    { foto: 'lytham', t: 'Lytham 1979: el campeón del aparcamiento', sub: 'El primer grande de Seve',
      p: ['Royal Lytham & St Annes, en la costa noroeste de Inglaterra, julio de 1979. Seve tiene 22 años y llega al último día luchando por el Open con Hale Irwin, campeón del US Open.',
          'Seve no es un jugador recto. Pega fuerte y la bola se le va, pero tiene una mano prodigiosa para salvar golpes desde cualquier sitio. En el hoyo 16 su salida se marcha muy a la derecha y acaba entre los coches del aparcamiento de los espectadores.',
          'Le dan alivio por la zona de coches, juega un golpe precioso al green y mete el putt para birdie. Irwin, que jugaba con él, no daba crédito. Seve ganó por tres golpes y la prensa británica le llamó para siempre «el campeón del aparcamiento».',
          'Era el primer jugador de la Europa continental que ganaba el Open desde 1907. Aquella victoria abrió la puerta a todo lo que vino después.'] },
    { foto: 'green18', t: 'St Andrews 1984: el puño al cielo', sub: 'El momento más feliz de Seve',
      p: ['El Open de 1984 se jugó en St Andrews, la cuna del golf. El último día Seve iba codo con codo con Tom Watson, que buscaba su sexto Open.',
          'En el hoyo 18, con el viejo edificio de la R&A al fondo, Seve tenía un putt para birdie. La bola cayó en el hoyo por el borde y Seve explotó: se giró hacia el público y levantó el puño una y otra vez, con una sonrisa enorme.',
          'Watson, que iba un partido por detrás, hizo bogey en el famoso hoyo 17, el Road Hole, y Seve se llevó su segundo Open.',
          'Aquella celebración se convirtió en la imagen de su vida. Él mismo dijo que fue el momento más feliz de toda su carrera deportiva.'] },
    { foto: 'seveLluvia', t: 'Valderrama 1997: la Ryder de Seve', sub: 'La primera Ryder Cup en la Europa continental',
      p: ['Durante setenta años la Ryder Cup se jugó siempre en Gran Bretaña o en Estados Unidos. En 1997 llegó por fin a la Europa continental: al club Valderrama, en Sotogrande (Cádiz). Y el capitán europeo era Seve.',
          'Seve vivió aquella semana a su manera: recorría el campo sin parar en un buggy, aparecía en cualquier hoyo a dar consejos y estaba encima de cada detalle. Enfrente estaban los americanos, con un debutante llamado Tiger Woods.',
          'Europa dominó los dos primeros días y llegó al domingo con ventaja. Los americanos apretaron en los individuales, pero no les alcanzó: Europa ganó 14½ a 13½.',
          'Fue la última gran página de Seve en la Ryder: la Copa levantada en España, por un capitán español. Para muchos, el día que el golf español se hizo mayor.'] },
  ];

  // Webs oficiales del golf (se abren fuera de la app)
  const WEBS = [
    ['En España', [
      ['Real Federación Española de Golf', 'Licencias, hándicap, torneos y la selección española', 'https://www.rfegolf.es', 'es'],
      ['Fundación Seve Ballesteros', 'La fundación de Seve contra los tumores cerebrales', 'https://seveballesteros.com/es/', 'es'],
    ]],
    ['Los cuatro grandes', [
      ['The Masters', 'Augusta, en abril: la chaqueta verde', 'https://www.masters.com', 'en'],
      ['PGA Championship', 'El grande de mayo', 'https://www.pgachampionship.com', 'en'],
      ['US Open', 'El grande de junio, el más duro', 'https://www.usopen.com', 'en'],
      ['The Open', 'El Open Británico, el más antiguo', 'https://www.theopen.com', 'en'],
    ]],
    ['Circuitos y competiciones', [
      ['DP World Tour', 'El circuito europeo, el de Seve', 'https://www.europeantour.com', 'en'],
      ['PGA Tour', 'El circuito americano', 'https://www.pgatour.com', 'en'],
      ['LIV Golf', 'La liga por equipos, con varios españoles', 'https://www.livgolf.com', 'en'],
      ['Ryder Cup', 'Europa contra Estados Unidos', 'https://www.rydercup.com', 'en'],
    ]],
  ];

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function foto(id, clase, pie){
    const f = FOTOS[id]; if(!f) return '';
    return '<figure class="hg-foto ' + (clase || '') + '">'
      + '<img src="' + f.src + '" width="' + f.w + '" height="' + f.h + '" loading="lazy" decoding="async" alt="' + esc(pie || '') + '" style="object-position:' + f.pos + '">'
      + '<figcaption>' + (pie ? esc(pie) + ' · ' : '') + 'Foto: ' + esc(f.autor) + ' · ' + esc(f.lic) + ' · Wikimedia Commons' + '</figcaption></figure>';
  }

  const ICO_HIST = '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3 6 19"/><path d="M6 19h4"/><circle cx="16.5" cy="18.5" r="2.5"/><path d="M4 21h16"/></svg>';

  // Capítulo destacado de Seve dentro de la línea del tiempo
  function capituloSeve(h){
    return '<li class="hg-hito hg-hito-seve" id="hgSeve">'
      + '<div class="hg-ano">' + esc(h.ano) + '</div><h4>' + esc(h.t) + '</h4>'
      + '<div class="hg-seve-caja">'
      +   foto('seveAccion', 'hg-seve-foto', 'Seve Ballesteros jugando en Holanda en 1987')
      +   '<p class="hg-intro">Para muchos, el golfista con más talento e imaginación de la historia. Con él Europa empezó a ganar a los americanos y en España miles de personas cogieron un palo por primera vez.</p>'
      +   '<div class="hg-cifras">' + SEVE_CIFRAS.map(c => '<div class="hg-cifra"><b>' + c[0] + '</b><span>' + c[1] + '</span><small>' + c[2] + '</small></div>').join('') + '</div>'
      +   '<ol class="hg-capitulos">' + SEVE.map((c, i) =>
            '<li class="hg-cap">'
            + (c.foto && i !== 1 && i !== 5 ? foto(c.foto, 'hg-foto-peq', c.pie || '') : '')
            + '<div class="hg-cap-txt"><div class="hg-ano">' + esc(c.ano) + '</div><h5>' + esc(c.t) + '</h5>'
            + c.p.map(x => '<p>' + esc(x) + '</p>').join('') + '</div></li>').join('') + '</ol>'
      + '</div></li>';
  }

  function pintar(){
    const body = document.getElementById('hgBody'); if(!body) return;
    body.innerHTML =
      '<nav class="hg-saltos"><a href="#hgHistoria">Los orígenes</a><a href="#hgSeve">Seve</a><a href="#hgReportajes">Reportajes</a><a href="#hgWebs">Webs</a></nav>'
      + '<div class="hg-hist" id="hgHistoria">'
      +   '<div class="hg-portada">' + foto('swilcan', 'hg-portada-foto hg-portada-ancha', 'El puente de Swilcan y la casa club de la R&A en St Andrews')
      +     '<div class="hg-portada-txt"><div class="hg-k">De Escocia al mundo</div><h3>Seis siglos de golf</h3><p>Del hielo holandés a St Andrews, Augusta y Pedreña</p></div></div>'
      +   '<p class="hg-intro">Un juego de palo y bola que se hizo mayor en las costas de Escocia y hoy se juega en todo el mundo. Estos son los momentos que lo hicieron como es.</p>'
      +   '<ol class="hg-linea">' + HISTORIA.map(h => h.seve ? capituloSeve(h) :
            '<li class="hg-hito">'
            + '<div class="hg-ano">' + esc(h.ano) + '</div><h4>' + esc(h.t) + '</h4><p>' + esc(h.p) + '</p>'
            + (h.foto ? foto(h.foto, 'hg-foto-peq', h.pie || '') : '')
            + '</li>').join('') + '</ol>'
      + '</div>'
      + '<div id="hgReportajes"><div class="hg-sec-t">Reportajes</div>'
      +   '<div class="hg-reps">' + REPORTAJES.map(r =>
            '<details class="hg-rep" name="hgrep"><summary>' + foto(r.foto, 'hg-rep-foto', '') 
            + '<span class="hg-rep-t"><b>' + esc(r.t) + '</b><small>' + esc(r.sub) + '</small><i>Leer reportaje</i></span></summary>'
            + '<div class="hg-rep-txt">' + r.p.map(x => '<p>' + esc(x) + '</p>').join('') + '</div></details>').join('') + '</div>'
      + '</div>'
      + '<div id="hgWebs"><div class="hg-sec-t">Webs del golf</div>'
      +   WEBS.map(g => '<div class="hg-webs-g">' + esc(g[0]) + '</div><div class="hg-webs">' + g[1].map(w =>
            '<a class="hg-web" href="' + w[2] + '" target="_blank" rel="noopener"><b>' + esc(w[0]) + '</b><span>' + esc(w[1]) + '</span>'
            + (w[3] === 'en' ? '<em>Web en inglés</em>' : '<em class="es">Web en español</em>') + '</a>').join('') + '</div>').join('')
      + '</div>'
      + '<p class="hg-pie">Textos escritos para la app. Fotos de Wikimedia Commons con licencia libre; debajo de cada una van su autor y su licencia.</p>';
    body.querySelectorAll('.hg-saltos a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const d = document.querySelector(a.getAttribute('href'));
      if(d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function crearPantalla(){
    if(document.getElementById('historiaOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'historiaOverlay'; ov.className = 'modal-overlay derbi-overlay'; ov.hidden = true;
    ov.innerHTML = '<div class="modal-card derbi-card reglas-card hg-card" role="dialog" aria-labelledby="hgTitulo">'
      + '<div class="reglas-cab">'
      +   '<button type="button" class="conv-close" id="hgCerrar" aria-label="Cerrar">✕</button>'
      +   '<div class="derbi-cab-k">De Escocia a Pedreña</div>'
      +   '<h2 id="hgTitulo">Historia del golf</h2>'
      +   '<p>Cómo nació el golf, quién lo hizo grande y el lugar de Seve en esa historia.</p>'
      + '</div>'
      + '<button type="button" class="home-volver pantalla-volver" id="hgVolver">‹ Volver al inicio</button>'
      + '<div id="hgBody"></div>'
      + '<button type="button" class="home-volver pantalla-volver" id="hgVolver2">‹ Volver al inicio</button>'
      + '</div>';
    document.body.appendChild(ov);
    ['hgCerrar', 'hgVolver', 'hgVolver2'].forEach(id => document.getElementById(id).addEventListener('click', cerrar));
  }

  function abrir(){
    crearPantalla();
    const ov = document.getElementById('historiaOverlay');
    if(!document.getElementById('hgBody').innerHTML) pintar();
    ov.hidden = false;
    const card = ov.querySelector('.hg-card'); if(card) card.scrollTop = 0;
  }
  function cerrar(){ const ov = document.getElementById('historiaOverlay'); if(ov) ov.hidden = true; }
  window.historiaGolfAbrir = abrir;

  (function boton(){
    const ancla = document.getElementById('hmReglas');
    if(!ancla || document.getElementById('hmHistoria')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn'; b.id = 'hmHistoria';
    b.innerHTML = ICO_HIST + '<span>Historia del golf</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    ancla.parentNode.insertBefore(b, ancla.nextSibling);
    b.addEventListener('click', abrir);
  })();
})();
