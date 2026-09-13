  // Jugadores guardados en este navegador (los que se han escrito en partidas anteriores)
  function getStoredPlayerHistory(){
    try {
      const raw = localStorage.getItem('golfAppPlayerHistory');
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  // Lista para sugerir en el buscador: favoritos (compañeros habituales) + guardados en este navegador
  function getPlayerHistory(){
    const merged = FAVORITE_PLAYERS.slice();
    getStoredPlayerHistory().forEach(name=>{
      if(name && !merged.some(m => m.toLowerCase() === name.toLowerCase())) merged.push(name);
    });
    return merged;
  }
  function rememberPlayers(names){
    try {
      const history = getStoredPlayerHistory();
      names.forEach(name=>{
        if(name && !history.some(h => h.toLowerCase() === name.toLowerCase())) history.push(name);
      });
      localStorage.setItem('golfAppPlayerHistory', JSON.stringify(history));
    } catch(e){ /* almacenamiento no disponible en este navegador */ }
  }

  // Conecta un campo "Jugador N" con un desplegable de jugadores usados antes
  function setupPlayerSearch(inputId, dropdownId){
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if(!input || !dropdown) return;
    function renderOptions(query){
      const q = (query || '').trim().toLowerCase();
      const matches = getPlayerHistory().filter(name => !q || name.toLowerCase().includes(q));
      if(!matches.length){
        dropdown.innerHTML = '';
        dropdown.classList.remove('open');
        return;
      }
      dropdown.innerHTML = matches.map(name => {
        const bits = [];
        if(FAVORITE_HANDICAPS[name] !== undefined) bits.push('Hcp ' + FAVORITE_HANDICAPS[name]);
        if(FAVORITE_LAST_PLAYED[name]) bits.push('Última vez ' + formatShortDate(FAVORITE_LAST_PLAYED[name]));
        const sub = bits.length ? '<div class="loc">' + bits.join(' · ') + '</div>' : '';
        return '<div class="dropdown-item"><div><div class="name">' + name + '</div>' + sub + '</div></div>';
      }).join('');
      dropdown.classList.add('open');
      dropdown.querySelectorAll('.dropdown-item').forEach((item, i)=>{
        item.addEventListener('click', ()=>{
          input.value = matches[i];
          dropdown.classList.remove('open');
          const hcpInput = document.getElementById(inputId.replace('Input', 'Hcp'));
          if(hcpInput && FAVORITE_HANDICAPS[matches[i]] !== undefined){
            hcpInput.value = FAVORITE_HANDICAPS[matches[i]];
          }
        });
      });
    }
    input.addEventListener('focus', ()=> renderOptions(input.value));
    input.addEventListener('input', ()=> renderOptions(input.value));
    document.addEventListener('click', (e)=>{
      if(input.contains(e.target) || dropdown.contains(e.target)) return;
      dropdown.classList.remove('open');
    });
  }
