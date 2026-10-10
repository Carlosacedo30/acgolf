/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Al crear una partida, la app manda un mail con un enlace que abre esa partida (y deja al jugador ya dentro).
// El correo les llega a todos los del grupo que no lo hayan quitado en «Mi cuenta».
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

  // Avisa por correo a los demás del grupo (lo manda el servidor, con Brevo)
  async function avisarPorMail(code){
    const p = window.miPerfil;
    if(!p || p.grupo_tipo !== 'liga') return;
    const client = initSupabase();
    if(!client || !client.functions) return;
    try {
      const { data, error } = await client.functions.invoke('avisar', { body: { code } });
      if(error) throw error;
      if(data && data.enviados) aviso('✉️ Avisados por correo ' + data.enviados + (data.enviados === 1 ? ' compañero' : ' compañeros'));
    } catch(e){ console.error('No se pudo avisar por correo', e); }
  }

  // Manda al administrador un mail con un enlace que le deja ya dentro de la app, en esa pantalla.
  // Usa el correo de «entrar con un enlace» de Supabase (la plantilla está escrita para Los Iscariotes).
  window.acgolfMandarMail = async function(url, que){
    const p = window.miPerfil;
    if(!p || !p.es_admin || !p.email){ aviso('De momento el mail solo se manda al administrador'); return false; }
    const client = initSupabase();
    if(!client) return false;
    try {
      const { error } = await client.auth.signInWithOtp({ email: p.email, options: { emailRedirectTo: url, shouldCreateUser: false } });
      if(error) throw error;
      aviso('✉️ Te hemos mandado un mail con el enlace a ' + que);
      return true;
    } catch(e){
      console.error('No se pudo mandar el mail', e);
      aviso(/rate|seconds|segundos/i.test(String(e && e.message)) ? 'Espera un minuto antes de mandar otro mail' : 'No se pudo mandar el mail');
      return false;
    }
  };

  function aviso(texto){
    const d = document.createElement('div');
    d.textContent = texto;
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:24px;z-index:9999;background:#0f1d3a;color:#fff;padding:14px 16px;border-radius:12px;font-size:16px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(d);
    setTimeout(()=> d.remove(), 4500);
  }
})();
