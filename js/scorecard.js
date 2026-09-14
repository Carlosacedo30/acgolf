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

  function selectCourse(course){
    selectedCourse = course;
    const s1Meta = document.getElementById('s1CourseMeta');
    const s3Back = document.getElementById('s3Back');
    const s4Back = document.getElementById('s4Back');
    if(s1Meta) s1Meta.textContent = course.name;
    if(s3Back) s3Back.textContent = '‹ ' + course.name;
    if(s4Back) s4Back.textContent = '‹ ' + course.name;
    applyCourseToScoreGrids(course);
  }

  // Tabla de solo lectura (Par/Hcp por hoyo) para la pantalla "Empezar tu partida" de un campo ya conocido
  function renderReadOnlyNineGrid(grid, pars, hcps, startHole){
    if(!grid) return;
    const holeCells = pars.map((p, i) => '<div class="grid-cell">' + (startHole + i) + '</div>').join('');
    const parCells = pars.map(p => '<div class="grid-cell">' + p + '</div>').join('');
    const hcpCells = hcps.map(h => '<div class="grid-cell">' + h + '</div>').join('');
    const total = pars.reduce((a, b) => a + b, 0);
    grid.innerHTML =
      '<div class="grid-row label-row"><div class="grid-cell side-label">Hoyo</div>' + holeCells + '<div class="grid-cell">' + (startHole === 1 ? 'Ida' : 'Vuelta') + '</div></div>'
      + '<div class="grid-row"><div class="grid-cell side-label">Par</div>' + parCells + '<div class="grid-cell" style="font-weight:600;">' + total + '</div></div>'
      + '<div class="grid-row"><div class="grid-cell side-label">Hcp</div>' + hcpCells + '<div class="grid-cell">—</div></div>';
  }

  // Rellena la vista de confirmación "Hoy juegas en este campo" para un campo ya conocido
  function renderCampoKnown(course){
    const nameEl = document.getElementById('campoKnownName');
    const metaEl = document.getElementById('campoKnownMeta');
    if(nameEl) nameEl.textContent = course.name;
    const total = course.par.reduce((a, b) => a + b, 0);
    if(metaEl) metaEl.textContent = (course.location ? course.location + ' · ' : '') + 'Par ' + total;
    renderReadOnlyNineGrid(document.getElementById('campoKnownGridIda'), course.par.slice(0, 9), course.hcp.slice(0, 9), 1);
    if(!course.holes9){
      renderReadOnlyNineGrid(document.getElementById('campoKnownGridVuelta'), course.par.slice(9, 18), course.hcp.slice(9, 18), 10);
    }
  }

  // Pantalla 2 "Empezar tu partida": confirma el campo ya elegido (siempre uno de nuestra base de datos)
  function showCampoScreen(course){
    renderCampoKnown(course);
    goTo(2);
  }

  // Pantalla "Jugar": construye el desplegable de campos a partir de COURSES, filtrando por lo que se escriba
  function renderDropdown(query){
    const q = (query || '').trim().toLowerCase();
    const matches = COURSES.filter(c => !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    const dropdown = document.getElementById('screen0-dropdown');
    if(!dropdown) return;
    dropdown.innerHTML = matches.length ? matches.map(c =>
      '<div class="dropdown-item" data-course-id="' + c.id + '"><span class="pin">📍</span><div><div class="name">' + c.name + '</div><div class="loc">' + c.location + '</div></div></div>'
    ).join('') : '<div class="dropdown-item" style="color:#7A8A99;">Ningún campo de nuestra base de datos coincide</div>';
    dropdown.querySelectorAll('.dropdown-item[data-course-id]').forEach(item=>{
      item.addEventListener('click', ()=>{
        const course = COURSES.find(c => c.id === item.dataset.courseId);
        if(course){
          selectCourse(course);
          if(screen0Search) screen0Search.value = course.name; // marca la selección en el buscador
        }
        closeDropdown();
        showCampoScreen(course); // Empezar tu partida
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
