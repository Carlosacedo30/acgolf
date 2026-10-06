/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Patrocinador de la liga: aparece en Inicio, en los premios de la semana y en el mensaje de WhatsApp ---
  // Para cambiar de patrocinador basta con tocar estos datos (y poner su logo en la carpeta de la app).
  let PATROCINADOR = {
    nombre: 'Bolarecuperada.com',
    logo: 'logo-bolarecuperada.png?v=1',
    web: 'https://bolarecuperada.com',
    premio: '12 bolas cada semana para los premios de la liga',
    premioIscariote: 'Se lleva las bolas de Bolarecuperada.com',
    foto: 'premio-semana.jpg?v=2',          // foto del premio de la semana (cámbiala cuando cambie el premio)
    fotoTexto: 'El premio de esta semana: 12 bolas Srixon AD333',
    premioCorto: '12 bolas Srixon AD333',  // lo que se lee bajo la foto en Inicio
  };

  function renderPatrocinadorHome(){
    const el = document.getElementById('sponsorHome');
    if(!el || !PATROCINADOR) return;
    // En Inicio: "Premio de la semana" con la foto; el patrocinador se nombra una sola vez, junto al premio
    el.innerHTML =
      '<div class="eyebrow">Premio de la semana</div>'
      + (PATROCINADOR.foto ? '<figure class="sponsor-foto"><img src="' + PATROCINADOR.foto + '" alt="' + (PATROCINADOR.fotoTexto || 'Premio de la semana') + '" width="800" height="600" loading="lazy"></figure>' : '')
      + '<div class="sponsor-pie"><div class="sponsor-premio">' + (PATROCINADOR.premioCorto ? '<b>' + PATROCINADOR.premioCorto + '</b><br>' : '')
      + 'cortesía de <a href="' + PATROCINADOR.web + '" target="_blank" rel="noopener sponsored">' + PATROCINADOR.nombre + '</a></div>'
      + '<a class="sponsor-btn" href="' + PATROCINADOR.web + '" target="_blank" rel="noopener sponsored">Ver sus bolas</a></div>';
  }
  renderPatrocinadorHome();
