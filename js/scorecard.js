  // Crea, dentro de una tarjeta de 9 hoyos, una fila de golpes por cada jugador
  function buildPlayerRows(grid, pars, startHole, hcps){
    grid.querySelectorAll('.golpes-row').forEach(row => row.remove());
    players.forEach((name, pIndex)=>{
      const row = document.createElement('div');
      row.className = 'grid-row golpes-row';
      row.dataset.playerIndex = pIndex;
      const label = document.createElement('div');
      label.className = 'grid-cell side-label';
      label.textContent = name;
      row.appendChild(label);
      pars.forEach((par, i)=>{
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const input = document.createElement('input');
        input.className = 'golpes-input';
        input.type = 'text';
        input.inputMode = 'numeric';
        input.dataset.hole = startHole + i;
        input.dataset.par = par;
        input.dataset.strokeIndex = hcps[i];
        input.dataset.playerIndex = pIndex;
        input.addEventListener('input', recalcResultados);
        cell.appendChild(input);
        row.appendChild(cell);
      });
      const totalCell = document.createElement('div');
      totalCell.className = 'grid-cell nine-total';
      totalCell.style.fontWeight = '600';
      totalCell.textContent = '0';
      row.appendChild(totalCell);
      grid.appendChild(row);
    });
  }

  // Rellena las dos tarjetas de 9 hoyos de "Introducir resultados" con el par real del campo elegido,
  // y crea una fila de golpes por cada jugador de la partida
  function applyCourseToScoreGrids(course){
    const nineDefs = [
      { grid: document.getElementById('resultGridIda'), totalId:'idaParTotal', offset:0, startHole:1 },
      { grid: document.getElementById('resultGridVuelta'), totalId:'vueltaParTotal', offset: course.holes9 ? 0 : 9, startHole:10 },
    ];
    nineDefs.forEach(def=>{
      if(!def.grid) return;
      const parRow = def.grid.querySelector('.grid-row:nth-of-type(2)');
      const parCells = Array.from(parRow.querySelectorAll('.grid-cell')).slice(1, -1);
      let nineTotal = 0;
      const pars = [];
      const hcps = [];
      parCells.forEach((cell, i)=>{
        const par = course.par[def.offset + i];
        cell.textContent = par;
        cell.dataset.par = par;
        pars.push(par);
        nineTotal += par;
        hcps.push((course.hcp && course.hcp[def.offset + i] !== undefined) ? course.hcp[def.offset + i] : (i + 1));
      });
      const totalCell = document.getElementById(def.totalId);
      if(totalCell) totalCell.textContent = nineTotal;
      buildPlayerRows(def.grid, pars, def.startHole, hcps);
    });
    const nineSum = course.par.reduce((a, b) => a + b, 0);
    currentCoursePar = course.holes9 ? nineSum * 2 : nineSum;
    const parSummaryLbl = document.getElementById('parSummaryLbl');
    if(parSummaryLbl) parSummaryLbl.textContent = 'Par total del campo: ' + currentCoursePar;
    recalcResultados();
  }

  function selectCourse(course, opts){
    opts = opts || {};
    selectedCourse = course;
    const s1Meta = document.getElementById('s1CourseMeta');
    const s3Back = document.getElementById('s3Back');
    const s4Back = document.getElementById('s4Back');
    const s3Toast = document.getElementById('s3Toast');
    if(s1Meta) s1Meta.textContent = course.name;
    if(s3Back) s3Back.textContent = '‹ ' + course.name;
    if(s4Back) s4Back.textContent = '‹ ' + course.name;
    if(s3Toast) s3Toast.style.display = opts.fromAddCampo ? '' : 'none';
    applyCourseToScoreGrids(course);
  }

  // Pantalla "Jugar": construye el desplegable de campos a partir de COURSES, filtrando por lo que se escriba
  function renderDropdown(query){
    const q = (query || '').trim().toLowerCase();
    const matches = COURSES.filter(c => !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    const dropdown = document.getElementById('screen0-dropdown');
    if(!dropdown) return;
    dropdown.innerHTML = matches.map(c =>
      '<div class="dropdown-item" data-course-id="' + c.id + '"><span class="pin">📍</span><div><div class="name">' + c.name + '</div><div class="loc">' + c.location + '</div></div></div>'
    ).join('') + '<div class="dropdown-item add-new">+ Añadir un campo nuevo</div>';
    dropdown.querySelectorAll('.dropdown-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        if(item.classList.contains('add-new')){
          const typed = (screen0Search ? screen0Search.value.trim() : '') || 'Campo nuevo';
          ['campoNombreInput','campoSearchInput'].forEach(id=>{
            const el = document.getElementById(id);
            if(el) el.value = typed;
          });
          ['campoNotFoundName','campoHeading'].forEach(id=>{
            const el = document.getElementById(id);
            if(el) el.textContent = typed;
          });
          closeDropdown();
          goTo(2); // Añadir campo
          return;
        }
        const course = COURSES.find(c => c.id === item.dataset.courseId);
        if(course){
          selectCourse(course);
          if(screen0Search) screen0Search.value = course.name; // marca la selección en el buscador
        }
        closeDropdown();
        goTo(1); // Configurar partida
      });
    });
  }

  function openDropdown(){
    const dropdown = document.getElementById('screen0-dropdown');
    if(dropdown) dropdown.classList.add('open');
  }
  function closeDropdown(){
    const dropdown = document.getElementById('screen0-dropdown');
    if(dropdown) dropdown.classList.remove('open');
  }
