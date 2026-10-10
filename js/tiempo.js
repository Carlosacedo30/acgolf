/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- El tiempo en la convocatoria ---
// Al abrir una convocatoria se ve qué tiempo hará en el campo ese día, de la hora de salida a la de llegada.
// Datos de Open-Meteo (gratis, sin clave). El pronóstico solo existe para los próximos 16 días.
(function(){
  if(typeof renderConv !== 'function') return;
  const CAMPOS = { 'hato-verde': [37.565, -6.035], 'zaudin': [37.378, -6.045] };
  const cache = {};   // 'campo|fecha' → datos (o promesa)

  // Código del tiempo → dibujo y palabra
  function cielo(c){
    if(c === 0) return ['☀️', 'Despejado'];
    if(c <= 2) return ['🌤️', 'Algunas nubes'];
    if(c === 3) return ['☁️', 'Nublado'];
    if(c === 45 || c === 48) return ['🌫️', 'Niebla'];
    if(c >= 51 && c <= 57) return ['🌦️', 'Llovizna'];
    if((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return ['🌧️', 'Lluvia'];
    if(c >= 71 && c <= 77) return ['🌨️', 'Nieve'];
    if(c >= 95) return ['⛈️', 'Tormenta'];
    return ['🌤️', ''];
  }
  const diasHasta = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(new Date().toDateString())) / 86400000);

  function pedir(campo, fecha){
    const k = campo + '|' + fecha;
    if(cache[k]) return cache[k];
    const [lat, lon] = CAMPOS[campo] || CAMPOS['hato-verde'];
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
      + '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m'
      + '&timezone=Europe%2FMadrid&wind_speed_unit=kmh&start_date=' + fecha + '&end_date=' + fecha;
    cache[k] = fetch(url).then(r => r.ok ? r.json() : null).then(d => { cache[k] = d || { error: true }; return cache[k]; })
      .catch(() => { cache[k] = { error: true }; return cache[k]; });
    return cache[k];
  }

  function html(d, desde){
    const H = d && d.hourly;
    if(!H || !H.time) return '<div class="tq-p">No se ha podido ver el tiempo. Revisa la cobertura.</div>';
    const h0 = Math.max(6, Math.min(18, desde));
    const idx = []; for(let h = h0; h <= h0 + 5 && h <= 21; h++) idx.push(h);
    const v = (arr, h) => arr && arr[h] != null ? arr[h] : null;
    const temps = idx.map(h => v(H.temperature_2m, h)).filter(x => x != null);
    const lluvia = Math.max(0, ...idx.map(h => v(H.precipitation_probability, h) || 0));
    const viento = Math.max(0, ...idx.map(h => v(H.wind_speed_10m, h) || 0));
    const rachas = Math.max(0, ...idx.map(h => v(H.wind_gusts_10m, h) || 0));
    const codigos = idx.map(h => v(H.weather_code, h)).filter(x => x != null);
    const peor = codigos.length ? Math.max(...codigos) : 0; // el código más alto es el peor tiempo
    const [ico, palabra] = cielo(peor);
    const tmin = Math.round(Math.min(...temps)), tmax = Math.round(Math.max(...temps));
    const consejos = [];
    if(lluvia >= 50) consejos.push('🌂 Lleva chubasquero y paraguas');
    else if(lluvia >= 25) consejos.push('🌂 Puede caer algo: mete el chubasquero');
    if(rachas >= 40) consejos.push('💨 Mucho viento: coge palo de más');
    if(tmax >= 30) consejos.push('🧢 Calor: agua, gorra y crema');
    if(tmin <= 9) consejos.push('🧥 Fresco a primera hora: lleva algo de abrigo');
    if(!consejos.length) consejos.push('⛳ Buen día para jugar');
    return '<div class="tq-res"><span class="tq-ico">' + ico + '</span>'
      + '<div><b>' + tmin + '° → ' + tmax + '°</b><span>' + palabra + '</span></div></div>'
      + '<div class="tq-datos"><span>💧 Lluvia <b>' + Math.round(lluvia) + '%</b></span><span>💨 Viento <b>' + Math.round(viento) + ' km/h</b>' + (rachas >= viento + 8 ? ' <small>(rachas ' + Math.round(rachas) + ')</small>' : '') + '</span></div>'
      + '<div class="tq-horas">' + idx.map(h => '<div><small>' + h + ' h</small><i>' + cielo(v(H.weather_code, h))[0] + '</i><b>' + Math.round(v(H.temperature_2m, h)) + '°</b></div>').join('') + '</div>'
      + '<div class="tq-cons">' + consejos.join('<br>') + '</div>';
  }

  function pintar(){
    if(typeof conv === 'undefined' || !conv || !conv.date) return;
    const donde = document.querySelector('#convBody .conv-where');
    if(!donde) return;
    let box = document.getElementById('convTiempo');
    if(!box){ box = document.createElement('div'); box.id = 'convTiempo'; box.className = 'tq'; donde.after(box); }
    const n = diasHasta(conv.date);
    const hora = parseInt(String((conv.times || [])[0] || '9').split(':')[0], 10) || 9;
    const cab = '<div class="tq-t">El tiempo en el campo · de ' + hora + ' a ' + Math.min(21, hora + 5) + ' h</div>';
    if(n < 0){ box.remove(); return; }
    if(n > 15){ box.innerHTML = cab + '<div class="tq-p">El pronóstico sale cuando falten menos de 16 días.</div>'; return; }
    const campo = conv.courseId || 'hato-verde';
    const k = campo + '|' + conv.date;
    const d = cache[k];
    if(d && !(d instanceof Promise)){ box.innerHTML = cab + html(d, hora) + (n > 7 ? '<div class="tq-nota">Falta más de una semana: puede cambiar.</div>' : ''); return; }
    box.innerHTML = cab + '<div class="tq-p">Mirando el tiempo…</div>';
    pedir(campo, conv.date).then(() => pintar());
  }

  const orig = renderConv;
  window.renderConv = function(){ const r = orig.apply(this, arguments); try { pintar(); } catch(e){ console.error(e); } return r; };
})();
