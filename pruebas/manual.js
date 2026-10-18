/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Manual de la app: uno para el jugador y otro para el administrador ---
// Botón «Manual de la app» en el Inicio. Se abre como Reglas: «‹ Volver al inicio» arriba y abajo,
// apartados plegables (uno abierto a la vez) y pasos numerados en lenguaje sencillo.
// La pestaña «Administrador» solo la ven los administradores; el apartado del super administrador, solo Carlos.
(function(){
  const $ = id => document.getElementById(id);
  const esAdmin = () => !!((window.miPerfil && window.miPerfil.es_admin) || (typeof getAdminKey === 'function' && getAdminKey()));
  const esSuper = () => !!(window.miPerfil && window.miPerfil.es_super);
  let pestana = 'jugador';

  // Dibujos de línea (toman el color del texto)
  const ICOS = {
    llave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>',
    movil: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    casa: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    megafono: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
    bandera: '<path d="M5 22V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    resumen: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    trofeo: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    balanza: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 7a4 4 0 0 0 6 0Z"/><path d="m19 7-3 7a4 4 0 0 0 6 0Z"/><path d="M8 21h8"/>',
    medalla: '<circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 2h4l2 5 2-5h4l-2.5 8"/>',
    ryder: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5"/><path d="M12 17h.01"/>',
    escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 6 5"/>',
    papelera: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    mapa: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    pintura: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="16" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h2"/>',
    sobre: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    estrella: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>',
    grafica: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    corona: '<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5Z"/>'
  };
  const ico = n => '<svg class="ico rg-ico" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICOS[n] || '') + '</svg>';

  // ---------- MANUAL DEL JUGADOR ----------
  const NOVEDADES = { t:'Novedades de octubre', items:[
    '<b>«¿Cómo jugué?» con gráficas.</b> Ahora solo sale tu juego, en tres pestañas: <b>Mi partida</b>, <b>Mi evolución</b> (gráficas mes a mes) y <b>Comparar</b> con otro jugador del grupo.',
    '<b>Campos nuevos.</b> En el botón <b>«Campos de golf»</b> del Inicio están los campos de <b>Sevilla, Huelva y Cádiz</b> con su par, la dificultad de cada hoyo y el slope de cada barra. Puedes jugar en ellos con <b>«Buscar otro campo»</b> al crear la partida.',
    '<b>Anotar más claro.</b> La tarjeta de arriba sale siempre entera, con un <b>punto verde</b> en los hoyos donde recibes golpe de hándicap.',
    '<b>Botón «Ir App Hato Verde»</b> en el Inicio (Los Iscariotes y Cajapollos): abre la app del club para reservar.',
    '<b>Cada grupo con su escudo</b> al organizar un partido.',
    '<b>Menos correos:</b> el aviso de partida nueva solo llega a los que juegan esa partida.'
  ]};

  const JUGADOR = [
    { sec:'Para empezar' },
    { ico:'llave', t:'Entrar por primera vez', sub:'Crear tu cuenta en 2 minutos', pasos:[
      'Abre el <b>enlace de invitación</b> que te ha mandado el administrador de tu grupo (normalmente por WhatsApp).',
      'Pulsa <b>«Crear mi cuenta»</b>. Escribe tu correo e inventa una contraseña de al menos 8 letras o números.',
      'Te llega un correo. Ábrelo y pulsa el enlace para confirmar. Si no lo ves, mira en <b>«Correo no deseado»</b>.',
      'Vuelve a la app y pulsa <b>«Ya lo he confirmado: entrar»</b>.',
      '<b>Toca tu nombre</b> en la lista de jugadores y acepta la política de privacidad. Solo se hace una vez.',
      '¿Olvidaste la contraseña? En la pantalla de entrar pulsa <b>«He olvidado mi contraseña»</b> y te llega un correo para poner otra.' ]},
    { ico:'movil', t:'Tener la app en el móvil', sub:'Como una app más, con su icono', pasos:[
      'Toca <b>tu nombre</b> arriba del todo para abrir <b>«Mi cuenta»</b>.',
      'Pulsa <b>«Instalar la app en el móvil»</b> y sigue los pasos que salen en pantalla.',
      'A partir de ahí, la abres desde su icono, como WhatsApp. El móvil recuerda tu cuenta: no hace falta volver a poner la contraseña.' ]},
    { ico:'casa', t:'La pantalla de Inicio', sub:'Qué hay en cada botón', pasos:[
      'Arriba ves <b>tu nombre</b> (toca para abrir «Mi cuenta») y <b>tu grupo</b> (toca para cambiar de grupo si estás en varios).',
      '<b>«Crear partida»</b>: el botón grande, para empezar a jugar.',
      'En Los Iscariotes y Cajapollos, encima sale <b>«Ir App Hato Verde»</b>: abre la app del club para reservar y ver tu carnet. Si no la tienes, te lleva a instalarla.',
      'Debajo, los <b>partidos organizados</b> con amigos, para apuntarte.',
      '<b>«Clasificación liga»</b>, <b>«Ganadores de la semana»</b>, <b>«Medallas nuevas»</b>, <b>«Mi hándicap»</b>, <b>«¿Cómo jugué?»</b> y <b>«Últimas partidas»</b>: toda la información de la liga.',
      '<b>«Ryder Cup»</b>: el torneo por equipos del grupo.',
      '<b>«Campos de golf»</b>: buscar campos y guardar tus favoritos.',
      '<b>«Reglas de golf»</b>, <b>«Consejos de golf»</b> e <b>«Historia del golf»</b>: para consultar y aprender.',
      'Desde cualquier pantalla, el botón <b>«‹ Volver al inicio»</b> te devuelve aquí.' ]},

    { sec:'Antes de jugar' },
    { ico:'calendario', t:'Apuntarte a un partido', sub:'Elegir tu hora de salida', pasos:[
      'En el Inicio, busca la tarjeta <b>«Próximo partido»</b> (día y campo).',
      'Pulsa <b>«Apuntarme»</b> y toca la hora que quieras (por ejemplo 8:40 u 8:50).',
      'Ya está: la tarjeta pone <b>«✓ 8:40»</b>. Si cambias de idea, pulsa <b>«Cambiar hora o decir que no voy»</b>.',
      'Si tocas la tarjeta ves quién va en cada hora y <b>qué tiempo hará</b> en el campo ese día.',
      'El día del partido la tarjeta te dice <b>«Hoy juegas»</b>, tu hora y con quién sales.' ]},
    { ico:'megafono', t:'Organizar un partido con amigos', sub:'Cualquier jugador puede hacerlo', pasos:[
      'En el Inicio pulsa <b>«Organizar partido con amigos»</b>. Sale con el <b>escudo de tu grupo</b>.',
      'Elige el <b>día</b>, el <b>campo</b> y las <b>horas</b> de la 1ª y la 2ª partida. Pulsa <b>«Crear el partido»</b>.',
      'Pulsa <b>«Enviar al grupo de WhatsApp»</b>: les llega el enlace y cada uno se apunta desde su móvil.',
      'Cuando estén todos, tú, que lo has organizado, pulsa <b>«Crear la partida con los apuntados»</b>. La partida queda hecha con los jugadores en su hora.' ]},
    { ico:'bandera', t:'Crear una partida', sub:'En 4 toques', pasos:[
      'Pulsa <b>«Crear partida»</b>.',
      '<b>¿Dónde jugáis?</b> Toca Hato Verde o Zaudín. Para otro campo pulsa <b>«Buscar otro campo»</b> o toca uno de tus favoritos.',
      '<b>¿Cómo jugáis?</b> Ya viene puesto lo de la liga: <b>Stroke Play, 18 hoyos, individual</b>. Cámbialo solo si jugáis otra cosa.',
      '<b>¿Quién juega?</b> Toca los nombres. Para alguien de fuera pulsa <b>«Añadir un invitado»</b> y escribe su nombre y su hándicap.',
      'Si alguien sale de otra barra (blancas, azules, rojas), elígela al lado de su nombre. Si no, salen de amarillas.',
      '<b>¿Todo bien?</b> Pulsa <b>«Empezar partida»</b>. A los jugadores de esa partida les llega un correo con el enlace.',
      'No hace falta escribir el hándicap de los jugadores de la liga: <b>lo pone la app sola</b>.' ]},
    { ico:'mapa', nuevo:true, t:'Campos de golf', sub:'Buscar campos y guardar favoritos', pasos:[
      'En el Inicio pulsa <b>«Campos de golf»</b>.',
      'Escribe el <b>nombre o la ciudad</b>, o pulsa <b>«Cerca de un sitio»</b> y elige a cuántos kilómetros.',
      'Ya están los campos de <b>Sevilla, Huelva y Cádiz</b>: cada uno con su par, la dificultad de cada hoyo y el <b>rating y slope</b> de cada barra.',
      'Puedes <b>filtrar</b> por slope (113 es lo normal; más alto, más difícil), por par, por número de hoyos y por barras de caballeros o damas.',
      'Toca la <b>estrella</b> para guardar un campo en <b>Favoritos</b> (hasta 5). Se ven aunque no haya cobertura.',
      'Para jugar en uno: al crear la partida pulsa <b>«Buscar otro campo»</b> y toca <b>«Jugar aquí»</b>.',
      '¿Falta un campo o su tarjeta? Escribe a soporte y lo añadimos.' ]},

    { sec:'Durante la partida' },
    { ico:'lapiz', t:'Apuntar los golpes', sub:'Hoyo a hoyo, con números grandes', pasos:[
      'Arriba ves la <b>clasificación en directo</b> y la <b>tarjeta entera</b>. Un <b>punto verde</b> junto al par marca los hoyos donde recibes golpe de hándicap (dos puntos, dos golpes).',
      'Debajo, el hoyo en el que estáis. Cambia de hoyo con las <b>flechas grandes</b>.',
      '<b>Toca la casilla</b> de cada jugador y pulsa el número de golpes en el teclado grande.',
      '¿Te has equivocado? Toca otra vez la casilla y pon el número bueno, o pulsa <b>«Borrar golpes»</b>.',
      'Los colores son como en la tele: <b>círculo rojo</b> birdie, <b>amarillo</b> eagle, <b>cuadro azul</b> bogey y <b>azul oscuro</b> doble bogey o más.',
      'Cada uno puede apuntar desde su móvil: todo se junta solo en la misma partida.',
      'El <b>caddie</b> te va dando ánimos y un consejo para el hoyo siguiente. Nunca riñe.',
      'En Hato Verde, con <b>«Activar GPS»</b> ves la distancia al green.' ]},
    { ico:'ayuda', t:'Sin cobertura o si sales de la app', sub:'No se pierde nada', pasos:[
      'Si no hay cobertura, <b>sigue apuntando</b>. Sale el aviso «Sin conexión» y todo se sube solo cuando vuelva la cobertura.',
      'Si cierras la app o pulsas <b>«‹ Salir de la partida»</b>, la partida queda guardada.',
      'Para volver: <b>«Últimas partidas»</b> en el Inicio y pulsa <b>«Continuar»</b>. También puedes abrir el enlace del correo.' ]},
    { ico:'check', t:'Terminar la partida', sub:'Cerrar la tarjeta', pasos:[
      'Cuando tengas los 18 hoyos apuntados, pulsa <b>«Finalizar ronda»</b>.',
      'Si a alguien le falta algún hoyo, la app te avisa para que lo revises.',
      'Arriba de la tarjeta ves quién <b>falta por cerrarla</b> y cuántos hoyos lleva.',
      'Las partidas normales <b>cuentan solas para la liga</b>: no hay que firmar ni entregar nada.' ]},
    { ico:'grupo', t:'Partidas de una liga (con marcador)', sub:'Solo en las jornadas de una liga', pasos:[
      'Antes de empezar, el grupo elige <b>quién marca a quién</b>. Toca para cambiarlo y pulsa <b>«Empezar a jugar»</b>.',
      'Cada uno apunta en su móvil <b>sus golpes y los del jugador al que marca</b>.',
      'En cada hoyo verás <b>✅ Coincide</b> o <b>⚠️ No coincide</b>. Si no coincide, hablad y corregid el hoyo.',
      'Al final pulsa <b>«Entregar mi tarjeta»</b>. Es <b>oficial</b> cuando también la confirma tu marcador.' ]},

    { sec:'Después de jugar' },
    { ico:'resumen', t:'Resumen al terminar', sub:'Tarjeta, hándicap y cervezas', pasos:[
      'Al terminar sale un botón por jugador. Toca el tuyo.',
      'Ves tu <b>tarjeta entera</b>, si te cambia el <b>hándicap</b>, las <b>medallas</b> que has ganado y cómo vas en la <b>semana</b> y en el <b>mes</b>.',
      'También sale quién paga <b>las cervezas</b>: la mitad de abajo de la clasificación.' ]},
    { ico:'grafica', nuevo:true, t:'¿Cómo jugué?', sub:'Tu juego con gráficas, para mejorar', pasos:[
      'En el Inicio pulsa <b>«¿Cómo jugué?»</b>. Sale <b>solo tu juego</b>, con tus últimas 18 tarjetas completas.',
      '<b>Mi partida:</b> cuántos golpes hiciste <b>mejor o peor que tu media</b> y los <b>golpes perdidos en hoyos desastre</b> (doble bogey o peor). Es lo primero que hay que bajar para bajar hándicap.',
      'Debajo, <b>qué trabajar</b> (los hoyos que te salieron peor de lo normal), <b>lo que te salió bien</b> y cómo jugaste los <b>par 3, par 4 y par 5</b>. Más abajo sigue tu tarjeta, el hándicap y las medallas.',
      '<b>Mi evolución:</b> gráficas de barras mes a mes con tus <b>dobles por partida</b> y tus <b>golpes sobre el par</b>. Cuanto más baja la barra, mejor.',
      'También salen <b>los 3 hoyos que más te cuestan</b>. Con <b>«Ver el detalle hoyo a hoyo»</b> ves todas tus tarjetas en colores: rojo birdie, blanco par, azul claro bogey y azul oscuro doble o más.',
      '<b>Comparar:</b> elige a un jugador de tu grupo. Se compara <b>con el hándicap descontado</b> y solo en los campos que habéis jugado los dos, para que sea justo.',
      'Ves también el <b>cara a cara</b> de los días que jugasteis juntos (gana el mejor neto) y <b>quién juega mejor cada hoyo</b>: verde tú, azul él.' ]},
    { ico:'trofeo', t:'La liga y los premios', sub:'Cómo se gana', pasos:[
      'Cuentan las partidas de <b>18 hoyos</b> en Hato Verde o Zaudín apuntadas en la app. Si no está en la app, no cuenta.',
      'La semana va de <b>lunes a domingo</b>. Gana la semana el <b>mejor neto</b>: golpes totales menos tu hándicap.',
      'En golf no hay empates: a igual resultado gana el de <b>hándicap más bajo</b>.',
      'Los ganadores salen solos cada lunes en <b>«Ganadores de la semana»</b>. Con las flechas ves las semanas anteriores.',
      'En <b>«Clasificación liga»</b> ves el mes; con las flechas, los meses pasados.',
      'Las normas completas están abajo del Inicio, en <b>«Normas de la liga»</b>.' ]},
    { ico:'balanza', t:'Mi hándicap', sub:'Se calcula solo', pasos:[
      'La app lo calcula sola con la regla de la Federación: la media de tus <b>8 mejores tarjetas de las últimas 20</b>.',
      'Se actualiza <b>15 minutos después</b> de terminar la partida (por si hay que corregir algún golpe). Ese rato sale en el Inicio la lista de hándicaps.',
      '<b>Nadie lo puede cambiar a mano</b>, tampoco el administrador.',
      'En <b>«Mi hándicap»</b> ves cómo ha cambiado y qué te hace falta para bajarlo.' ]},
    { ico:'medalla', t:'Medallas', sub:'Logros que vas ganando', pasos:[
      'Se ganan solas con tus tarjetas de la liga: no hay que apuntar nada.',
      'Las nuevas de la semana salen en <b>«Medallas nuevas»</b>. Toda tu vitrina está en la clasificación de la liga, tocando tu nombre.' ]},
    { ico:'ryder', t:'Ryder Cup y ligas', sub:'Torneos especiales del grupo', pasos:[
      'Los organiza el administrador del grupo. Tú solo tienes que apuntarte y jugar.',
      'En la <b>Ryder Cup</b> ves los dos equipos, el marcador y tu partido. Dentro tienes <b>«Qué es y cómo se gana»</b> explicado fácil.',
      'En una <b>liga</b>, cada jornada te sale en el Inicio como un partido más, con tu hora y tu grupo ya puestos.' ]},

    { sec:'Tu cuenta' },
    { ico:'persona', t:'Mi cuenta', sub:'Toca tu nombre arriba', pasos:[
      '<b>«Mi foto o avatar»</b>: pon tu foto o elige un dibujo de golf. Sale al lado de tu nombre en toda la app.',
      '<b>«Mis grupos»</b>: si juegas en varios grupos, cambias de uno a otro aquí.',
      '<b>«Avisos por correo»</b>: quita la marca si no quieres el correo cada vez que alguien crea una partida.',
      '<b>«Cambiar mi contraseña»</b>, <b>«Cerrar sesión en este móvil»</b> y <b>«Borrar mi cuenta»</b>.',
      '<b>«Descargar mis datos»</b>: te bajas todo lo tuyo en un archivo.' ]},
    { ico:'ayuda', t:'Si algo no va', sub:'Lo que más pasa', pasos:[
      '<b>No me llega el correo:</b> mira en «Correo no deseado». En la pantalla de entrar puedes pulsar «Reenviar correo».',
      '<b>No encuentro mi partida:</b> está en «Últimas partidas» del Inicio.',
      '<b>No estoy en la lista de jugadores:</b> díselo al administrador de tu grupo.',
      '<b>Un golpe mal apuntado en una partida ya terminada:</b> avisa al administrador cuanto antes.',
      '<b>La app se ha quedado rara:</b> ciérrala del todo y vuelve a abrirla.' ]}
  ];

  // ---------- MANUAL DEL ADMINISTRADOR ----------
  const ADMIN = [
    { nota:'Como administrador puedes hacer todo lo del manual del jugador y, además, lo de aquí. En «Mi cuenta», debajo de tu correo, pone <b>Administrador</b>.' },
    { sec:'Montar el grupo' },
    { ico:'escudo', t:'Crear un grupo nuevo', sub:'Eliges el plan y lo creas', pasos:[
      'Ve a <b>«Mis grupos» → «Crear un grupo con liga»</b> (si aún no tienes grupo, pulsa <b>«Crear mi grupo»</b>).',
      'Elige el <b>plan</b> según cuántos jugadores vais a ser: <b>Par</b> hasta 11, <b>Birdie</b> hasta 30, <b>Eagle</b> hasta 50 o <b>Club</b> sin límite. Ahora mismo son gratis.',
      'Pulsa <b>«Activar el plan»</b>, pon el <b>nombre del grupo</b> y pulsa <b>«Crear el grupo»</b>. Quedas como su administrador.',
      'Para cambiar de plan más adelante: «Mi cuenta» → <b>«Plan del grupo»</b>.',
      'La app te guía en unos pasos: <b>campo</b> donde soléis jugar, <b>colores</b> de la app, <b>escudo</b> con las iniciales y <b>patrocinador</b> (opcional).',
      'Pulsa <b>«Guardar la portada»</b>. Se puede cambiar cuando quieras desde «Mi cuenta» → <b>«Cambiar la portada del grupo»</b>.' ]},
    { ico:'enlace', t:'Invitar a los jugadores', sub:'Un enlace para todo el grupo', pasos:[
      'Abre <b>«Mi cuenta»</b> (toca tu nombre arriba). Arriba sale <b>«Invitar a tu grupo»</b>.',
      'Pulsa <b>«Enviar por WhatsApp»</b> y mándalo al grupo, o <b>«Copiar el enlace»</b>.',
      'Al abrirlo y crear su cuenta, cada jugador <b>entra directamente</b> en tu grupo.',
      'Si el enlace llega a quien no debe, pulsa <b>«Cambiar el enlace»</b>: el anterior deja de valer.',
      'Si alguien ya tiene cuenta en acgolf, en <b>«Miembros del grupo»</b> → <b>«Añadir a alguien que ya tiene cuenta»</b> escribe su correo.' ]},
    { ico:'grupo', t:'Miembros y jugadores de la liga', sub:'Quién está en el grupo', pasos:[
      '<b>«Miembros del grupo»</b> (en «Mi cuenta»): ves quién tiene cuenta, añades o <b>quitas</b> a alguien.',
      '<b>«Jugadores de la liga»</b> (abajo del todo del Inicio): añades un jugador con su <b>hándicap de partida</b> o lo quitas.',
      'Después, el hándicap lo actualiza la app sola. <b>Ni tú lo puedes cambiar a mano</b>: así nadie hace trampas.',
      '<b>«Fotos y avatares»</b> (en «Mi cuenta»): puedes poner la foto a cualquier jugador de tu grupo.' ]},

    { sec:'Partidos y partidas' },
    { ico:'megafono', t:'Gestionar un partido organizado', sub:'Apuntados, bajas y reserva', pasos:[
      'Toca la tarjeta del partido en el Inicio para abrirlo.',
      '<b>Dar de baja a alguien:</b> toca su nombre en la lista y pulsa <b>«No voy»</b>.',
      '<b>Apuntar a otro:</b> toca su nombre y elige la hora. Para alguien de fuera, escríbelo en el buscador y pulsa <b>«Apuntar como invitado»</b>.',
      '<b>«Pedir reserva al club»</b> (si el campo tiene correo de reservas): se abre tu correo con el mensaje ya escrito (día, horas y jugadores). Solo tienes que pulsar Enviar. La primera vez te pide tu teléfono para que el club te llame.',
      '<b>«Crear la partida con los apuntados»</b>: la partida queda lista con cada uno en su hora.',
      '<b>«Borrar este partido»</b>: desaparece para todos.' ]},
    { ico:'papelera', t:'Borrar una partida', sub:'Solo el administrador', pasos:[
      'En el Inicio pulsa <b>«Últimas partidas»</b>.',
      'Al lado de cada partida tienes el botón <b>«Borrar»</b>.',
      'Se borra para todos y <b>no se puede deshacer</b>.',
      'Si la partida ya estaba terminada, sus golpes salen de la liga y <b>los hándicaps se vuelven a calcular solos</b>.' ]},

    { sec:'Torneos' },
    { ico:'calendario', t:'Crear una liga', sub:'Varias jornadas con clasificación', pasos:[
      'En el Inicio pulsa <b>«Ligas»</b> (solo lo ven los administradores) y luego <b>«＋ Crear liga»</b>.',
      'Ponle <b>nombre</b> y toca los <b>jugadores</b>.',
      'Elige cuántas <b>jornadas</b>, si se juega en <b>sábado o domingo</b>, <b>cada semana o cada 15 días</b>, el <b>campo</b> y la <b>primera hora</b>.',
      'Elige la salida: <b>por un hoyo</b> (una partida cada 10 minutos) o <b>al tiro</b> (todos a la vez, cada grupo en un hoyo).',
      'Revisa el calendario y pulsa <b>«Crear la liga»</b>.',
      'Cada jornada es <b>una partida con todos</b>. Puntos por puesto como en la Fórmula 1: 25, 18, 15, 12, 10, 8, 6, 4, 2 y 1.',
      'En las jornadas de liga se juega <b>con marcador</b>: la tarjeta solo cuenta si la confirma el marcador.' ]},
    { ico:'lapiz', t:'Preparar cada jornada', sub:'Fecha, hora y grupos', pasos:[
      'Dentro de la liga, <b>toca una jornada</b>.',
      'Puedes cambiar su <b>fecha, campo, hora y salida</b>.',
      'Los grupos los hace la app, distintos cada jornada. Pulsa <b>«Repartir de nuevo»</b> o cámbialos a mano.',
      'Si alguien no juega, pásalo a <b>«No juega esta jornada»</b>. Un sustituto puede jugar, pero no suma puntos.',
      'Pulsa <b>«Guardar y publicar el partido»</b>: los jugadores lo ven ya hecho.',
      'Para quitar una liga entera: <b>«Borrar esta liga»</b>. Las partidas ya jugadas no se tocan.' ]},
    { ico:'ryder', t:'Crear una Ryder Cup', sub:'Dos equipos, a match play', pasos:[
      'En el Inicio pulsa <b>«Ryder Cup»</b> y luego <b>«Crear una Ryder»</b>. Son 3 pasos.',
      'Elige el <b>día</b> y el <b>campo</b>, el <b>nombre y el color</b> de cada equipo y los <b>jugadores</b> de cada uno.',
      'Marca las modalidades: <b>Foursome</b> (una bola por pareja), <b>Fourball</b> (cuenta la mejor bola de la pareja) e <b>Individuales</b>.',
      'La app <b>empareja por hándicap</b>. Si quieres, cambia a cualquier jugador de sitio.',
      'Pulsa <b>«Crear la Ryder»</b>. Ganar un partido da 1 punto; empatar, medio punto a cada equipo.' ]},

    { sec:'Más ajustes' },
    { ico:'mapa', t:'Greens en el mapa', sub:'Para que funcione la distancia por GPS', pasos:[
      'Abajo del Inicio pulsa <b>«Greens en el mapa»</b>.',
      'Pulsa <b>«Traer del mapa libre»</b>: la app coloca sola los greens que encuentra.',
      'Para corregir uno, elige el hoyo y <b>toca su green</b> en la foto del campo.',
      'Pulsa <b>«Guardar»</b>. También puedes hacerlo en el campo: en el hoyo, pulsa <b>«Guardar green aquí»</b>.' ]},
    { ico:'pintura', t:'La portada del grupo', sub:'Escudo, colores y patrocinador', pasos:[
      '«Mi cuenta» → <b>«Cambiar la portada del grupo»</b>.',
      'Cambia el <b>tono de fondo</b>, el <b>color</b>, el <b>escudo</b> o el <b>patrocinador</b>. La app cambia mientras eliges.',
      'Pulsa <b>«Guardar la portada»</b>.' ]},
    { ico:'papelera', t:'Bajas y borrar el grupo', sub:'Con cuidado: no se puede deshacer', pasos:[
      'Si algún jugador pide borrar su cuenta, te sale en «Mi cuenta» en <b>«Cuentas para borrar»</b>. Ponte en contacto con acgolf para terminar de borrarla.',
      'Para borrar el grupo entero: <b>«Mis grupos» → «Borrar»</b> y escribe su nombre para confirmar.',
      'Se borran sus jugadores, partidas, hándicaps y ligas. Los Iscariotes no se pueden borrar.' ]}
  ];
  const SUPER = [
    { sec:'Solo super administrador' },
    { ico:'corona', t:'Panel de super administrador', sub:'Todos los grupos de acgolf', pasos:[
      '«Mi cuenta» → <b>«Panel de super administrador»</b>: ves todos los grupos y todos los usuarios.',
      '<b>Códigos de administrador:</b> crea un código y mándaselo a quien vaya a montar un grupo nuevo. Cada código sirve una vez.',
      'Puedes <b>hacer super administrador</b> a otro usuario o quitárselo.',
      'En el Inicio ves el <b>contador</b> de jugadores con cuenta y cuántos han usado la app hoy y esta semana.',
      'Al tocar el contador ves también los <b>patrocinadores</b>: cuántas veces se ha visto su logo y <b>quién ha ido a su web</b>, con filtro por periodo y por grupo.',
      '<b>«Mandarme un correo de prueba»</b>: comprueba que los avisos por correo funcionan.' ]}
  ];

  // ---------- Pintar ----------
  function lista(items){
    return items.map(x => {
      if(x.sec) return '<div class="rg-sec-t">' + x.sec + '</div>';
      if(x.nota) return '<div class="mn-nota">' + x.nota + '</div>';
      return '<details class="rg-item mn-item" name="manual">'
        + '<summary>' + ico(x.ico) + '<span class="rg-st"><b>' + x.t + (x.nuevo ? ' <em class="mn-nuevo">Nuevo</em>' : '') + '</b><small>' + x.sub + '</small></span><span class="rg-mas" aria-hidden="true"></span></summary>'
        + '<ol class="rg-pasos mn-pasos">' + x.pasos.map(p => '<li>' + p + '</li>').join('') + '</ol>'
        + '</details>';
    }).join('');
  }

  function pintar(){
    const body = $('manualBody'); if(!body) return;
    const admin = esAdmin();
    if(!admin) pestana = 'jugador';
    const tit = $('manualTitulo'), sub = $('manualSub');
    if(tit) tit.textContent = pestana === 'admin' ? 'Manual del administrador' : 'Manual del jugador';
    if(sub) sub.textContent = pestana === 'admin' ? 'Cómo montar y llevar tu grupo: jugadores, partidos, ligas y Ryder.' : 'Todo lo que hace falta para jugar con la app, paso a paso.';
    body.innerHTML =
      (admin ? '<div class="mn-tabs" role="tablist">'
        + '<button type="button" role="tab" class="mn-tab' + (pestana === 'jugador' ? ' sel' : '') + '" data-p="jugador" aria-selected="' + (pestana === 'jugador') + '">Jugador</button>'
        + '<button type="button" role="tab" class="mn-tab' + (pestana === 'admin' ? ' sel' : '') + '" data-p="admin" aria-selected="' + (pestana === 'admin') + '">Administrador</button>'
        + '</div>' : '')
      + (pestana === 'jugador' ? '<div class="mn-novedades" id="mnNovedades"><div class="mn-nov-t">' + ico('estrella').replace('rg-ico', 'mn-nov-ico') + '<span>' + NOVEDADES.t + '</span></div><ul>' + NOVEDADES.items.map(i => '<li>' + i + '</li>').join('') + '</ul></div>' : '')
      + '<div class="rg-lista mn-lista">' + lista(pestana === 'admin' ? ADMIN.concat(esSuper() ? SUPER : []) : JUGADOR) + '</div>'
      + '<div class="rg-pie">¿Dudas que no están aquí? Pregunta al administrador de tu grupo o escribe a soporte.</div>'
      + (window.acgolfAyuda ? '<a class="ay-soporte" href="' + window.acgolfAyuda.correoSoporte() + '">✉️ Escribir a soporte</a>'
          + '<button type="button" class="ay-visto' + (window.acgolfAyuda.visto() ? ' hecho' : '') + '" id="mnVisto">' + (window.acgolfAyuda.visto() ? '✓ Visto' : 'Visto: no volver a avisar') + '</button>' : '');
    const v = $('mnVisto');
    if(v) v.onclick = async () => { await window.acgolfAyuda.marcarVisto(); v.classList.add('hecho'); v.textContent = '✓ Visto'; };
    body.querySelectorAll('.mn-tab').forEach(b => b.addEventListener('click', () => {
      pestana = b.dataset.p; pintar();
      const card = document.querySelector('#manualOverlay .reglas-card'); if(card) card.scrollTop = 0;
    }));
    // Color de acento del grupo: el mismo que usan los títulos de apartado
    const t = body.querySelector('.rg-sec-t');
    if(t){ try { body.style.setProperty('--mn-acento', getComputedStyle(t).color); } catch(e){} }
    // Solo uno abierto a la vez, y se lleva a la vista
    body.querySelectorAll('details.mn-item').forEach(d => d.addEventListener('toggle', () => {
      if(!d.open) return;
      body.querySelectorAll('details.mn-item').forEach(o => { if(o !== d) o.open = false; });
      setTimeout(() => { try { d.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(e){} }, 60);
    }));
  }

  function ventana(){
    let ov = $('manualOverlay');
    if(ov) return ov;
    ov = document.createElement('div');
    ov.id = 'manualOverlay'; ov.className = 'modal-overlay derbi-overlay'; ov.hidden = true;
    ov.innerHTML = '<div class="modal-card derbi-card reglas-card" role="dialog" aria-labelledby="manualTitulo">'
      + '<div class="reglas-cab"><div class="derbi-cab-k">acgolf · paso a paso</div><h2 id="manualTitulo">Manual del jugador</h2><p id="manualSub"></p></div>'
      + '<button type="button" class="home-volver pantalla-volver" id="manualVolver">‹ Volver al inicio</button>'
      + '<div id="manualBody"></div>'
      + '<button type="button" class="home-volver pantalla-volver" id="manualVolver2">‹ Volver al inicio</button>'
      + '</div>';
    document.body.appendChild(ov);
    ['manualVolver', 'manualVolver2'].forEach(id => $(id).addEventListener('click', cerrar));
    return ov;
  }
  function abrir(p){
    const ov = ventana();
    if(p) pestana = p;
    pintar();
    ov.hidden = false;
    const card = ov.querySelector('.reglas-card'); if(card) card.scrollTop = 0;
  }
  function cerrar(){ const ov = $('manualOverlay'); if(ov) ov.hidden = true; }

  // ---------- Botón en el Inicio (después de «Consejos de golf») ----------
  function ponerBoton(){
    if($('hmManual')) return;
    const ref = $('hmConsejos') || document.querySelector('.home-menu-btn:last-of-type');
    if(!ref) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn'; b.id = 'hmManual';
    b.innerHTML = ico('ayuda').replace('rg-ico', '') + '<span>Manual de la app</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    b.onclick = () => abrir();
    ref.parentNode.insertBefore(b, ref.nextSibling);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ponerBoton); else ponerBoton();
  window.acgolfManual = { abrir, cerrar };
})();
