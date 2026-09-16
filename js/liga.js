  // --- Liga en Club Hato Verde: hándicap real (WHS) y clasificación acumulada ---
  const LEAGUE_COURSE_ID = 'hato-verde';
  const LEAGUE_TEE = 'amarillas'; // barra de salida habitual del grupo
  // Evita recalcular (con su consulta a la base de datos) en cada pulsación una vez la ronda ya está completa;
  // se reinicia al empezar una ronda nueva
  let leagueHandicapUpdateScheduled = false;

  // Tope de doble bogey neto por hoyo (Equitable Stroke Control de la WHS):
  // ningún hoyo cuenta, para el cálculo del hándicap, por encima de par + 2 + golpes recibidos ahí
  function netDoubleBogeyCap(par, strokesReceived){
    return par + 2 + strokesReceived;
  }

  // Diferencial de una ronda: compara el resultado (ya topado) con la dificultad real del campo
  function scoreDifferential(adjustedGrossScore, rating, slope){
    return (113 / slope) * (adjustedGrossScore - rating);
  }

  // Tabla oficial WHS: con menos de 20 rondas, cuántos diferenciales se promedian y qué ajuste se resta
  const LEAGUE_LOW_COUNT_TABLE = {
    1:[1,-2.0], 2:[1,-2.0], 3:[1,-2.0],
    4:[1,-1.0],
    5:[1,0],
    6:[2,-1.0],
    7:[2,0], 8:[2,0],
    9:[3,0], 10:[3,0], 11:[3,0],
    12:[4,0], 13:[4,0], 14:[4,0],
    15:[5,0], 16:[5,0],
    17:[6,0], 18:[6,0],
    19:[7,0],
  };

  // Índice de hándicap: media de los mejores diferenciales de las últimas 20 rondas (más recientes primero)
  function computeHandicapIndex(differentialsMostRecentFirst){
    const last20 = differentialsMostRecentFirst.slice(0, 20);
    const n = last20.length;
    if(n === 0) return null;
    const [count, adj] = n >= 20 ? [8, 0] : (LEAGUE_LOW_COUNT_TABLE[n] || [1, -2.0]);
    const best = last20.slice().sort((a, b) => a - b).slice(0, count);
    const avg = best.reduce((s, d) => s + d, 0) / best.length;
    return Math.round((avg + adj) * 10) / 10;
  }

  // Recalcula, a partir del historial real guardado en Supabase, el hándicap de cada jugador
  // que haya jugado alguna vez en Hato Verde, y actualiza FAVORITE_HANDICAPS con el resultado
  async function updateLeagueHandicaps(){
    const client = initSupabase();
    if(!client) return;
    const tee = COURSES.find(c => c.id === LEAGUE_COURSE_ID).tees[LEAGUE_TEE];
    try {
      const { data, error } = await client.from('rounds')
        .select('match_groups, course_par, course_hcp, created_at')
        .eq('course_id', LEAGUE_COURSE_ID)
        .order('created_at', { ascending: false });
      if(error || !data) return;
      const byPlayer = {}; // nombre -> [diferenciales, más reciente primero]
      data.forEach(round => {
        const par = round.course_par, strokeIndex = round.course_hcp;
        if(!par || !strokeIndex) return;
        (round.match_groups || []).forEach(group => {
          (group.players || []).forEach((name, pIndex) => {
            if(!name) return;
            const scores = group.scores && group.scores[pIndex];
            if(!scores) return;
            const playerHcp = (group.handicaps && group.handicaps[pIndex]) || 0;
            let cappedSum = 0, holesFilled = 0;
            for(let h = 1; h <= 18; h++){
              const strokes = parseInt(scores[h], 10);
              if(isNaN(strokes) || strokes <= 0) continue;
              const received = strokesForHole(playerHcp, strokeIndex[h - 1]);
              cappedSum += Math.min(strokes, netDoubleBogeyCap(par[h - 1], received));
              holesFilled++;
            }
            if(holesFilled < 18) return; // solo cuentan rondas completas de 18 hoyos
            const diff = scoreDifferential(cappedSum, tee.rating, tee.slope);
            byPlayer[name] = byPlayer[name] || [];
            byPlayer[name].push(diff);
          });
        });
      });
      Object.keys(byPlayer).forEach(name => {
        const index = computeHandicapIndex(byPlayer[name]);
        if(index !== null) FAVORITE_HANDICAPS[name] = index;
      });
    } catch(e){
      console.error('No se pudo actualizar el hándicap de la liga', e);
    }
  }

  // Recalcula el hándicap de la liga y, si cambia para alguno de estos jugadores, lo enseña en pantalla
  // (para que se note de verdad que ha pasado algo — antes se recalculaba pero no se veía en ningún sitio)
  async function runLeagueHandicapUpdate(playerNames){
    const before = {};
    playerNames.forEach(name => { before[name] = FAVORITE_HANDICAPS[name]; });
    await updateLeagueHandicaps();
    const noteEl = document.getElementById('leagueHandicapUpdateNote');
    if(!noteEl) return;
    const lines = playerNames.map(name => {
      const b = before[name], a = FAVORITE_HANDICAPS[name];
      if(a === undefined || a === b) return null;
      return '<strong>' + name + '</strong>: ' + b + ' → ' + a;
    }).filter(Boolean);
    if(lines.length){
      noteEl.innerHTML = '<div class="pattern"><p>🏌️ Hándicap de la liga actualizado<br>' + lines.join('<br>') + '</p></div>';
      noteEl.style.display = '';
    } else {
      noteEl.style.display = 'none';
    }
  }
