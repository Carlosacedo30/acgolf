/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Varios grupos en la misma partida sin pisarse.
   Antes, cada móvil subía la tarjeta entera (todos los grupos) y, si tenía una copia atrasada
   del otro grupo, la borraba. Ahora cada móvil sube SOLO las casillas que ha cambiado él
   (función save_round_group en Supabase) y, al recibir cambios de otros móviles, los mezcla
   sin perder lo que tiene pendiente de subir. Se carga al final, después de los demás scripts. */

let gpBase = null;            // última copia conocida del servidor (para saber qué ha cambiado este móvil)
let gpSubiendo = false;
let gpOtraVez = false;

const gpClon = o => JSON.parse(JSON.stringify(o == null ? null : o));
const gpVal = v => (v === undefined || v === null) ? '' : String(v);

// Casillas, jugadores y hándicaps que este móvil tiene distintos a la última copia del servidor
function gpCambios(){
  if(!gpBase) return [];
  const out = [];
  matchGroups.forEach((g, gi) => {
    const b = gpBase[gi] || { players: [], handicaps: [], scores: {} };
    const parche = {};
    let hayGolpes = false;
    Object.keys(g.scores || {}).forEach(p => {
      Object.keys(g.scores[p] || {}).forEach(h => {
        const local = gpVal(g.scores[p][h]);
        const serv = gpVal(b.scores && b.scores[p] && b.scores[p][h]);
        if(local !== serv){ (parche[p] = parche[p] || {})[h] = local; hayGolpes = true; }
      });
    });
    const jug = JSON.stringify(g.players || []) !== JSON.stringify(b.players || []);
    const hcp = JSON.stringify(g.handicaps || []) !== JSON.stringify(b.handicaps || []);
    if(hayGolpes || jug || hcp){
      out.push({ gi, scores: hayGolpes ? parche : null, players: jug ? g.players : null, handicaps: hcp ? g.handicaps : null });
    }
  });
  return out;
}

// Mezcla lo que llega del servidor con lo que este móvil aún no ha subido
function gpMezclar(remoto){
  const r = normalizeMatchGroups(remoto);
  const base = gpBase ? normalizeMatchGroups(gpBase) : null;
  const res = r.map((rg, gi) => {
    const lg = matchGroups[gi] || { players: [], handicaps: [], scores: {} };
    if(!base) return rg;
    const bg = base[gi];
    const scores = gpClon(rg.scores) || {};
    Object.keys(lg.scores || {}).forEach(p => {
      Object.keys(lg.scores[p] || {}).forEach(h => {
        const local = gpVal(lg.scores[p][h]);
        if(local !== gpVal(bg.scores[p] && bg.scores[p][h])){ (scores[p] = scores[p] || {})[h] = local; }
      });
    });
    return {
      players: JSON.stringify(lg.players) !== JSON.stringify(bg.players) ? lg.players : rg.players,
      handicaps: JSON.stringify(lg.handicaps) !== JSON.stringify(bg.handicaps) ? lg.handicaps : rg.handicaps,
      scores,
    };
  });
  gpBase = gpClon(r);
  matchGroups = res;
}

// Vuelve a pintar el grupo que se está viendo
function gpPintar(){
  const g = matchGroups[activeGroup] || matchGroups[0];
  players = g.players.length ? g.players : ['Jugador 1'];
  playerHandicaps = g.handicaps.length ? g.handicaps : [0];
  if(selectedCourse){
    restoringScores = true;
    applyCourseToScoreGrids(selectedCourse);
    applyGroupScores(g.scores || {});
    restoringScores = false;
    recalcResultados(); // si no hay nada pendiente no sube nada
  }
  renderGroupSwitcher();
  if(typeof current !== 'undefined' && current === 4 && typeof renderDiagnostico === 'function') renderDiagnostico();
}

// Trae la partida del servidor (al volver a la app, al reconectar o si falta la copia base)
async function gpRecargar(){
  const client = initSupabase();
  if(!client || !currentRoundId) return false;
  const id = currentRoundId;
  try {
    const { data, error } = await client.from('rounds').select('match_groups, scoring_type, round_name').eq('id', id).single();
    if(error || !data || id !== currentRoundId) return false;
    matchGroups[activeGroup].scores = collectGroupScores();
    gpMezclar(data.match_groups);
    if(data.scoring_type) scoringType = data.scoring_type;
    if(data.round_name){ roundName = data.round_name; updateS3Title(); }
    gpPintar();
    return true;
  } catch(e){ return false; }
}

async function gpSubir(){
  if(gpSubiendo){ gpOtraVez = true; return; }
  const client = initSupabase();
  if(!client || !currentRoundId) return;
  gpSubiendo = true;
  try {
    if(!gpBase && !(await gpRecargar())) throw new Error('sin copia del servidor');
    const id = currentRoundId;
    for(const c of gpCambios()){
      const { error } = await client.rpc('save_round_group', {
        p_id: id, p_group: c.gi, p_players: c.players, p_handicaps: c.handicaps, p_scores: c.scores,
      });
      if(error) throw error;
      if(id !== currentRoundId) break;
      // Lo subido pasa a ser parte de la copia del servidor
      const b = gpBase[c.gi] = gpBase[c.gi] || { players: [], handicaps: [], scores: {} };
      if(c.players) b.players = gpClon(c.players);
      if(c.handicaps) b.handicaps = gpClon(c.handicaps);
      if(c.scores){
        b.scores = b.scores || {};
        Object.keys(c.scores).forEach(p => { b.scores[p] = Object.assign({}, b.scores[p] || {}, c.scores[p]); });
      }
    }
    setSyncStatus('live');
  } catch(e){
    console.error('No se pudo guardar la partida', e);
    setSyncStatus('error');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(gpSubir, 5000); // reintento: lo pendiente no se pierde
  }
  gpSubiendo = false;
  if(gpOtraVez){ gpOtraVez = false; gpSubir(); }
}

// Sustituye al guardado anterior (que subía la tarjeta entera)
function saveRoundState(){
  if(restoringScores) return;
  matchGroups[activeGroup].scores = collectGroupScores();
  saveLocalBackup();
  if(!currentRoundId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(gpSubir, 600);
}

// Cambios de otros móviles: se mezclan en vez de sustituir
function subscribeToRound(id){
  const client = initSupabase();
  if(!client) return;
  if(realtimeChannel){ client.removeChannel(realtimeChannel); realtimeChannel = null; }
  let yaConectado = false;
  realtimeChannel = client.channel('round-' + id)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + id }, payload => {
      const row = payload.new;
      if(!row || !row.match_groups || id !== currentRoundId) return;
      matchGroups[activeGroup].scores = collectGroupScores();
      gpMezclar(row.match_groups);
      if(row.scoring_type) scoringType = row.scoring_type;
      if(row.round_name){ roundName = row.round_name; updateS3Title(); }
      gpPintar();
    })
    .subscribe(status => {
      if(status === 'SUBSCRIBED'){
        setSyncStatus('live');
        if(yaConectado) gpRecargar(); // se cortó y ha vuelto: ponerse al día
        yaConectado = true;
      } else setSyncStatus('connecting');
    });
}

// Al crear, unirse o salir de una partida: fijar o borrar la copia base
(function(){
  const crear = createSharedRound, unirse = joinSharedRound, salir = leaveCurrentRound;
  createSharedRound = async function(){ await crear.apply(this, arguments); if(currentRoundId) gpBase = gpClon(matchGroups); };
  joinSharedRound = async function(){
    gpBase = null;
    const r = await unirse.apply(this, arguments);
    if(r && r.ok) gpBase = gpClon(matchGroups);
    return r;
  };
  leaveCurrentRound = function(){ gpBase = null; return salir.apply(this, arguments); };
})();

// Al volver a la app (pantalla encendida) o recuperar internet: ponerse al día y subir lo pendiente
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && currentRoundId) gpRecargar().then(()=> gpSubir()); });
window.addEventListener('online', ()=>{ if(currentRoundId) gpRecargar().then(()=> gpSubir()); });

// Hándicaps de otras partidas abiertas: tocar solo los grupos que cambian, nunca los golpes
async function syncOpenRoundsHandicaps(){
  if(typeof syncingRoundHandicaps !== 'undefined' && syncingRoundHandicaps) return;
  const client = initSupabase();
  if(!client) return;
  try { syncingRoundHandicaps = true; } catch(e){}
  try {
    const hcpMap = await fetchCurrentHandicaps();
    if(!hcpMap) return;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await client.from('rounds').select('id, match_groups')
      .not('course_id', 'is', null).gte('updated_at', since);
    if(error || !data) return;
    for(const r of data){
      if(r.id === currentRoundId){ applyHandicapsToOpenRound(hcpMap); continue; }
      const groups = Array.isArray(r.match_groups) ? r.match_groups : [];
      if(isRoundFinished(groups)) continue;
      for(let gi = 0; gi < groups.length; gi++){
        const antes = JSON.stringify((groups[gi] && groups[gi].handicaps) || []);
        if(!refreshGroupHandicaps([groups[gi]], hcpMap)) continue;
        if(JSON.stringify(groups[gi].handicaps) === antes) continue;
        await client.rpc('save_round_group', { p_id: r.id, p_group: gi, p_handicaps: groups[gi].handicaps, p_touch: false });
      }
    }
  } catch(e){
    console.error('No se pudieron poner al día los hándicaps de las partidas', e);
  } finally {
    try { syncingRoundHandicaps = false; } catch(e){}
  }
}
