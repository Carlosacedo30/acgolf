  const labels = ["1. Jugar","2. Configurar partida","3. Empezar partida","4. Introducir resultados","5. Diagnóstico post-ronda","6. Consejos de Golf"];
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
  function goTo(n){ current = n; render(); if(n === 1) updateLeagueHandicaps(); if(n === 4) renderDiagnostico(); if(n === 0) renderRecentRounds(); if(n === 5) renderConsejos(); }
