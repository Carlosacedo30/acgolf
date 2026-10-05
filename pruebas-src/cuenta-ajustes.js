/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Versión con cuentas: "quién eres" lo dice la cuenta, no el móvil ---
// La app de la liga pregunta «¿Quién eres?» y lo guarda en el móvil. Aquí eso sobra:
// cada uno es el jugador de su cuenta. Solo se sigue mostrando la lista para «ver el de otro jugador».
(function(){
  const original = window.elegirQuienEres;
  window.elegirQuienEres = function(sinGuardar){
    const mio = window.miPerfil && window.miPerfil.player_name;
    if(!sinGuardar && mio){
      try { localStorage.setItem('golfAppConvMe', mio); } catch(e){}
      return Promise.resolve(mio);
    }
    return typeof original === 'function' ? original(true) : Promise.resolve('');
  };
  // Botones de «No soy yo» / «Cambiar quién soy»: con cuenta no tienen sentido
  const css = document.createElement('style');
  css.textContent = '#dbiNoSoy, #dbiQuien, .dbi-nosoy{ display:none !important; }';
  document.head.appendChild(css);
})();
