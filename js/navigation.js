  const labels = ["1. Jugar","1. Jugar","2. Resumen","3. Introducir resultados","4. Diagnóstico post-ronda","5. Consejos de Golf","6. Liga"];
  let current = 0;
  const screens = document.querySelectorAll('.screen');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const navLabel = document.getElementById('navLabel');

  function render(){
    screens.forEach(s => s.classList.toggle('active', +s.dataset.screen === current));
    dots.forEach(d => d.classList.toggle('active', +d.dataset.goto === current));
    navLabel.textContent = labels[current];
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === screens.length - 1;
    nextBtn.textContent = current === screens.length - 1 ? 'Fin ›' : 'Siguiente ›';
  }
  // Todos los caminos para cambiar de pantalla (puntos, Anterior/Siguiente, o un botón concreto)
  // pasan siempre por goTo(), para que el contenido de la pantalla de destino se rellene sí o sí
  prevBtn.addEventListener('click', () => { if(current>0) goTo(current - 1); });
  nextBtn.addEventListener('click', () => { if(current<screens.length-1) goTo(current + 1); });
  dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.goto)));
  // Si el día/hora de comienzo están vacíos (partida nueva), los rellena con el momento actual
  function setDefaultRoundDateTime(){
    const dateInput = document.getElementById('roundDateInput');
    const timeInput = document.getElementById('roundTimeInput');
    const now = new Date();
    if(dateInput && !dateInput.value){
      const pad = n => String(n).padStart(2, '0');
      dateInput.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    }
    if(timeInput && !timeInput.value){
      const pad = n => String(n).padStart(2, '0');
      timeInput.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }
  }
  // "Configurar partida" ya no es una pantalla aparte: vive dentro de "Jugar" y se despliega al elegir campo
  function showConfigBlock(show){
    const block = document.getElementById('configPartidaBlock');
    if(!block) return;
    block.style.display = show ? '' : 'none';
    if(show){
      setTimeout(() => block.scrollIntoView({ behavior:'smooth', block:'start' }), 50);
    }
  }
  function goTo(n){
    if(n !== 3){ // al salir de la ronda, fuera los avisos de "¡Qué bueno eres!" y similares
      if(typeof toastQueue !== 'undefined') toastQueue.length = 0;
      const t = document.getElementById('messageToast'); if(t) t.classList.remove('show');
    }
    if(n === 1){ updateLeagueHandicaps(); setDefaultRoundDateTime(); showConfigBlock(true); n = 0; }
    else if(n === 0){ showConfigBlock(false); document.querySelectorAll('.start-choice-opt').forEach(o => o.classList.remove('active')); }
    current = n; render(); if(n === 4) renderDiagnostico(); if(n === 0) renderRecentRounds(); if(n === 5) renderConsejos(); if(n === 6){ ligaRoundsCache = null; renderLigaStandings(); } }
