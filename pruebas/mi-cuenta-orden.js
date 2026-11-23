/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Mi cuenta ordenada (dibujo aprobado por Carlos, 23-nov-2026):
// · Tarjeta «Ajustes» con 4 filas (Mi perfil, Avisos, Ayuda, Síguenos): cada una abre SU pantalla con «‹ Volver».
// · Tarjeta «Administrar el grupo» con cabecera dorada «ADMINISTRADOR» (solo la ve un administrador).
// · «Cerrar sesión» discreto al final. «Borrar mi cuenta» solo dentro de «Mi perfil».
// Reutiliza las filas de siempre (no hace nada por su cuenta: las pulsa).
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  (function esperar(n){
    const cn = $('cnPant'), todo = $('cnTodo'), bloque = todo && todo.querySelector('.lm-cn');
    if(!cn || !todo || !bloque){ if(n < 60) setTimeout(() => esperar(n + 1), 500); return; }
    iniciar(cn, todo, bloque);
  })(0);

  function iniciar(cn, todo, bloque){
    document.documentElement.classList.add('mo-on');
    const fl = '<i class="cn-fl" aria-hidden="true"></i>';
    const fila = (attr, va, t, s) => '<button type="button" class="lm-fila" ' + attr + '="' + va + '"><span class="lm-ftx"><b>' + t + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</span>' + fl + '</button>';
    const grupo = bloque.querySelector('.lm-grupo');
    const ajustes = document.createElement('div'); ajustes.className = 'lm-card mo-ajustes';
    ajustes.innerHTML = '<div class="lm-k">Ajustes</div>' + fila('data-mo-go', 'perfil', 'Mi perfil', 'Foto, contraseña y datos') + fila('data-mo-go', 'avisos', 'Avisos', 'Cómo te avisamos')
      + fila('data-mo-go', 'ayuda', 'Ayuda', 'Soporte, manual y reglas') + fila('data-mo-go', 'redes', 'Síguenos', 'Redes y reseña');
    const admin = document.createElement('div'); admin.className = 'lm-card mo-admin'; admin.hidden = true;
    admin.innerHTML = '<div class="mo-adm-cab"><span class="mo-adm-esc" aria-hidden="true">🛡</span><div><b>ADMINISTRADOR</b><span>Esto solo lo ven los administradores del grupo</span></div></div>'
      + fila('data-de', 'miembros', 'Miembros', 'Quién está en el grupo') + fila('data-de', 'portada', 'Portada', 'Escudo, colores y campo')
      + fila('data-de', 'ayudajug', 'Ayuda con un jugador', '') + fila('data-ir', 'ligas', 'Ligas', 'Crear y gestionar ligas') + fila('data-ir', 'normas', 'Normas de la liga', '');
    const dueno = document.createElement('div'); dueno.className = 'lm-card mo-dueno'; dueno.hidden = true;
    dueno.innerHTML = '<div class="lm-k">Solo el dueño de la app</div>' + fila('data-ir', 'super', 'Panel general', '');
    const sal = document.createElement('p'); sal.className = 'mo-sal'; sal.innerHTML = '<button type="button" data-mo-salir>Cerrar sesión</button>';
    (grupo || bloque.lastElementChild).after(admin, ajustes, dueno, sal);
    // Cabecera de las pantallas de ajustes
    const cab = document.createElement('div'); cab.className = 'mo-cab'; cab.hidden = true;
    cab.innerHTML = '<button type="button" class="mo-volver" id="moVolver">‹ Volver</button><h2 class="mo-tit" id="moTit"></h2>';
    todo.insertBefore(cab, todo.firstChild);
    const TIT = { perfil: 'Mi perfil', avisos: 'Avisos', ayuda: 'Ayuda', redes: 'Síguenos' };

    // Cada trozo de la lista de siempre, a su pantalla
    function asignar(){
      Array.from(todo.children).forEach(e => { if(e === bloque || e === cab) return; delete e.dataset.mo; });
      const hijos = Array.from(todo.children);
      hijos.forEach((e, i) => {
        if(e.querySelector && e.querySelector('[data-va="foto"]')) e.dataset.mo = 'perfil';
        if(e.id === 'cnPleg') e.dataset.mo = 'avisos';
        if(e.classList.contains('cn-sesion')) e.dataset.mo = 'perfil';
        if(e.querySelector && e.querySelector('[data-va="soporte"]')) { e.dataset.mo = 'ayuda'; }
        if(e.id === 'cnSecRedes'){ for(let j = i; j < hijos.length && !hijos[j].classList.contains('cn-sesion'); j++) hijos[j].dataset.mo = 'redes'; hijos[i].dataset.moTit = '1'; }
      });
    }
    asignar();

    const origDe = va => todo.querySelector('[data-va="' + va + '"]:not(.lm-fila)');
    const visible = el => !!el && !el.closest('[hidden]');
    function ir(sub){
      cn.classList.add('mo-sub'); cn.dataset.mo = sub; cn.classList.toggle('lm-ajustes', sub !== 'ayuda'); cn.classList.toggle('lm-ayuda', sub === 'ayuda'); $('moTit').textContent = TIT[sub] || ''; cab.hidden = false;
      asignar();
      if(sub === 'avisos'){ const c = $('cnPlegC'), b = $('cnPleg'); if(c && c.hidden && b){ const bt = b.querySelector('button') || b; bt.click(); } }
      const main = $('cnMain'); if(main) main.scrollTop = 0;
    }
    function volver(){ cn.classList.remove('mo-sub', 'lm-ajustes', 'lm-ayuda'); delete cn.dataset.mo; cab.hidden = true; const main = $('cnMain'); if(main) main.scrollTop = 0; }
    cab.addEventListener('click', e => { if(e.target.closest('#moVolver')) volver(); });
    bloque.addEventListener('click', e => {
      const g = e.target.closest('[data-mo-go]'); if(g){ ir(g.dataset.moGo); return; }
      if(e.target.closest('[data-mo-salir]')){ const s = origDe('salir'); if(s) s.click(); return; }
      const r = e.target.closest('[data-ir]'); if(r){ const o = bloque.querySelector('[data-lm="' + r.dataset.ir + '"]') || document.querySelector('[data-lm="' + r.dataset.ir + '"]'); if(o) o.click(); }
    });

    function repasar(){
      if(cn.hidden){ if(cn.classList.contains('mo-sub')) volver(); return; }
      const p = window.miPerfil || {};
      // Administrador: solo se enseñan las filas que existen y se ven para este jugador
      const filas = Array.from(admin.querySelectorAll('.lm-fila'));
      let hay = false;
      filas.forEach(f => {
        let ok;
        if(f.dataset.de) ok = visible(origDe(f.dataset.de)) || !!(p.es_admin && origDe(f.dataset.de) && f.dataset.de === 'ayudajug' && false);
        else { const o = document.querySelector('[data-lm="' + f.dataset.ir + '"]'); ok = !!p.es_admin && !!o && !o.hidden && !(o.closest('[hidden]')); }
        f.hidden = !ok; if(ok) hay = true;
      });
      admin.hidden = !(p.es_admin && hay);
      const s = bloque.querySelector('[data-lm="super"]'); dueno.hidden = !(s && !s.hidden);
      // «Mi perfil»: si no hay nada que enseñar, la fila sobra
    }
    setInterval(repasar, 700); repasar();
  }
})();
