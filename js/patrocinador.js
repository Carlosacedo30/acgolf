/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Patrocinador de la liga: aparece en Inicio, en los premios de la semana y en el mensaje de WhatsApp ---
  // Para cambiar de patrocinador basta con tocar estos datos (y poner su logo en la carpeta de la app).
  const PATROCINADOR = {
    nombre: 'Bolarecuperada.com',
    logo: 'logo-bolarecuperada.png?v=1',
    web: 'https://bolarecuperada.com',
    premio: '12 bolas cada semana para los premios de la liga',
    premioIscariote: '🎁 Se lleva las bolas de Bolarecuperada.com',
  };

  function renderPatrocinadorHome(){
    const el = document.getElementById('sponsorHome');
    if(!el || !PATROCINADOR) return;
    el.innerHTML =
      '<div class="sponsor-label">Liga patrocinada por</div>'
      + '<a class="sponsor-logo" href="' + PATROCINADOR.web + '" target="_blank" rel="noopener sponsored">'
      + '<img src="' + PATROCINADOR.logo + '" alt="' + PATROCINADOR.nombre + '" width="240" height="98"></a>'
      + '<div class="sponsor-premio">' + PATROCINADOR.premio + '</div>'
      + '<a class="sponsor-btn" href="' + PATROCINADOR.web + '" target="_blank" rel="noopener sponsored">Ver sus bolas</a>';
  }
  renderPatrocinadorHome();
