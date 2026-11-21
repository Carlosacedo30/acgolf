/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* Avisos de «¿Seguro?» con el diseño nuevo (21-nov-2026): sustituyen al cartel del navegador (confirm).
   window.acgolfConfirmar(texto) devuelve una promesa: true si acepta, false si cancela. Sin el diseño nuevo usa el cartel de siempre. */
(function(){
  'use strict';
  const nativo = window.confirm.bind(window);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BOTONES = [
    [/^¿Salir de esta partida/, 'Salir', 'Seguir marcando', false],
    [/^¿Borrar/, 'Borrar', 'No borrar', true],
    [/^¿Cerrar sesión/, 'Cerrar sesión', 'Seguir dentro', false],
    [/^¿(Quitar|Quitarte|Quitarle|Dar de baja|Anular|Reiniciar)/, 'Sí, hacerlo', 'No', true],
    [/^¿Crear/, 'Crear', 'Ahora no', false],
    [/^¿Enviar/, 'Enviar', 'No enviar', false],
    [/^¿Mandar/, 'Mandar', 'No mandar', false],
    [/^¿Eres/, 'Sí, soy yo', 'No soy yo', false],
    [/^¿Seguro que tu correo/, 'Sí, está bien', 'Voy a corregirlo', false],
    [/^¿Salir sin guardar|sin guardar/, 'Salir sin guardar', 'Seguir aquí', true],
    [/^¿Entregas/, 'Entregar', 'Todavía no', false],
    [/^¿Cerrar la tarjeta/, 'Cerrar la tarjeta', 'No', false],
    [/^¿Crear la partida/, 'Crear la partida', 'Ahora no', false],
    [/^Este móvil ya puede borrar/, 'Quitar permiso', 'Dejarlo', true],
  ];
  window.acgolfConfirmar = function(texto){
    if(!document.documentElement.classList.contains('in-on')) return Promise.resolve(nativo(texto));
    const partes = String(texto || '').split('\n'), titulo = partes.shift().trim(), resto = partes.join('\n').trim();
    const b = BOTONES.find(x => x[0].test(titulo) || x[0].test(String(texto))) || [null, 'Aceptar', 'Cancelar', false];
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'cf-ov'; ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="cf-card"><h2 class="cf-t">' + esc(titulo) + '</h2>' + (resto ? '<p class="cf-p">' + esc(resto).replace(/\n+/g, '<br>') + '</p>' : '')
        + '<div class="cf-bot"><button type="button" class="cf-no">' + esc(b[2]) + '</button><button type="button" class="cf-si' + (b[3] ? ' cf-peligro' : '') + '">' + esc(b[1]) + '</button></div></div>';
      const cerrar = v => { ov.remove(); res(v); };
      ov.querySelector('.cf-no').onclick = () => cerrar(false);
      ov.querySelector('.cf-si').onclick = () => cerrar(true);
      ov.addEventListener('click', e => { if(e.target === ov) cerrar(false); });
      document.body.appendChild(ov);
      ov.querySelector('.cf-no').focus();
    });
  };
})();
