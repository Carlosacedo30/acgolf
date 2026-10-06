/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Al crear una partida, la app manda un mail con un enlace que abre esa partida (y deja al jugador ya dentro).
// De momento solo se envía al administrador, para probar.
(function(){
  if(typeof createSharedRound !== 'function' || typeof rememberRoundCode !== 'function') return;
  let creando = false;
  const crearOriginal = createSharedRound;
  window.createSharedRound = async function(){
    creando = true;
    try { return await crearOriginal.apply(this, arguments); }
    finally { creando = false; }
  };
  const recordarOriginal = rememberRoundCode;
  window.rememberRoundCode = function(code){
    const r = recordarOriginal.apply(this, arguments);
    if(creando) avisarPorMail(code);
    return r;
  };

  async function avisarPorMail(code){
    const p = window.miPerfil;
    if(!p || !p.es_admin || !p.email) return; // de momento, solo al administrador
    const client = initSupabase();
    if(!client) return;
    const url = 'https://carlosacedo30.github.io/acgolf/pruebas/?partida=' + encodeURIComponent(code);
    try {
      const { error } = await client.auth.signInWithOtp({ email: p.email, options: { emailRedirectTo: url, shouldCreateUser: false } });
      if(error) throw error;
      aviso('✉️ Te hemos mandado un mail con el enlace a la partida');
    } catch(e){
      console.error('No se pudo mandar el mail de la partida', e);
      aviso('No se pudo mandar el mail de la partida');
    }
  }

  function aviso(texto){
    const d = document.createElement('div');
    d.textContent = texto;
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:24px;z-index:9999;background:#0f1d3a;color:#fff;padding:14px 16px;border-radius:12px;font-size:16px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(d);
    setTimeout(()=> d.remove(), 4500);
  }
})();
