// © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
// El hoyo 19 · botón del Inicio.
//  · Despierto (pancarta grande, ARRIBA del menú): si el grupo tiene una partida de los últimos 5 días.
//  · Dormido (franja pequeña, junto a Cartas): el resto del tiempo.
// Solo se pregunta a la base de datos UNA vez al abrir la app (y otra al volver a ella pasado un minuto). Nunca mientras se anota.
(function(){
  'use strict';
  if(window.acgolfHoyo19) return;
  const DIAS = 5;                       // días que dura el hilo (el mismo límite que la base de datos)
  const NUEVO_HASTA = Date.parse('2026-12-31'); // «NUEVO» las primeras semanas
  let btn = null, estado = '', ultimaConsulta = 0, partida = null;

  const JARRA = '<path d="M12 26h42v58a8 8 0 01-8 8H20a8 8 0 01-8-8z" fill="#E8A317"/><path d="M12 26h42v22H12z" fill="#F7C948"/>'
    + '<path d="M54 38h10a8 8 0 018 8v18a8 8 0 01-8 8H54v-8h8a1 1 0 001-1V47a1 1 0 00-1-1h-8z" fill="#F2F4F5"/>'
    + '<path d="M10 28a10 10 0 0110-12 12 12 0 0122-4 11 11 0 0114 10 9 9 0 01-3 6H13z" fill="#fff"/><rect x="20" y="40" width="4" height="40" rx="2" fill="#fff" opacity=".35"/>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function crear(){
    if(btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'hmHoyo19'; btn.className = 'home-menu-btn hm-hoyo19';
    btn.onclick = abrir;
    return btn;
  }

  function pintar(est){
    crear();
    if(est === estado && btn.parentNode) return;
    estado = est;
    if(est === 'despierto'){
      const donde = [partida && partida.round_name, partida && partida.course_name].filter(Boolean).join(' · ');
      btn.className = 'home-menu-btn hm-hoyo19 h19-despierto';
      btn.innerHTML = (Date.now() < NUEVO_HASTA ? '<span class="h19-nuevo">NUEVO</span>' : '')
        + '<span class="h19-tit">Hoyo 19</span><span class="h19-sub">Brinda con tu grupo</span>'
        + (donde ? '<span class="h19-sub2">' + esc(donde) + '</span>' : '')
        + '<svg class="h19-jarra" viewBox="0 0 80 96" aria-hidden="true">' + JARRA + '</svg>';
      btn.setAttribute('aria-label', 'Hoyo 19, brinda con tu grupo');
    } else {
      btn.className = 'home-menu-btn hm-hoyo19 h19-dormido';
      btn.innerHTML = '<svg class="h19-jarra-s" viewBox="0 0 80 96" aria-hidden="true">' + JARRA + '</svg>'
        + '<span class="h19-txt"><b>Hoyo 19</b><small>Se abre cuando termina una partida</small></span>';
      btn.setAttribute('aria-label', 'Hoyo 19, se abre cuando termina una partida');
    }
    colocar();
  }

  // Despierto: arriba del menú. Dormido: justo debajo de Cartas (o al final).
  function colocar(){
    const menu = document.querySelector('.home-menu');
    if(!menu || !btn) return;
    if(estado === 'despierto'){ menu.insertBefore(btn, menu.firstChild); return; }
    const ref = document.getElementById('hmCartas');
    if(ref && ref.parentNode){ ref.parentNode.insertBefore(btn, ref.nextSibling); } else { menu.appendChild(btn); }
  }

  async function consultar(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client || !window.miPerfilId) return false;          // sin cuenta no se enseña nada
    ultimaConsulta = Date.now();
    let est = 'dormido';
    try {
      const desde = new Date(Date.now() - DIAS * 864e5).toISOString();
      const r = await client.from('rounds').select('code, course_name, round_name, updated_at')
        .not('course_id', 'is', null).gt('updated_at', desde).order('updated_at', { ascending: false }).limit(1);
      if(!r.error && r.data && r.data.length){ partida = r.data[0]; est = 'despierto'; }
    } catch(e){ /* si falla, queda dormido y la app sigue igual */ }
    pintar(est);
    return true;
  }

  function abrir(){
    if(document.getElementById('h19Aviso')) return;
    const f = document.createElement('div');
    f.id = 'h19Aviso'; f.className = 'h19-fondo';
    f.innerHTML = '<div class="h19-caja" role="alertdialog" aria-modal="true"><h3>Hoyo 19</h3>'
      + '<p>Muy pronto: aquí se abrirá el hilo de la partida para brindar con tu grupo.</p><button type="button">Entendido</button></div>';
    f.querySelector('button').onclick = () => f.remove();
    document.body.appendChild(f);
  }

  function arrancar(){
    if(consultarYa()) return;
    let n = 0;
    const t = setInterval(() => { if(consultarYa() || ++n > 40) clearInterval(t); }, 500);   // espera a que entre la cuenta (20 s como mucho)
  }
  function consultarYa(){ if(!window.miPerfilId || !document.querySelector('.home-menu')) return false; consultar(); return true; }

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && window.miPerfilId && Date.now() - ultimaConsulta > 60000) consultar();
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  window.acgolfHoyo19 = { abrir, consultar, _pintar: pintar };
})();
