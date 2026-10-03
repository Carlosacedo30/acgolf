/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Enviar partidas por mail a los jugadores de la liga ---
  // Los correos se guardan en Supabase en una tabla privada: solo el móvil administrador los puede leer o cambiar.
  // El envío abre el correo del administrador con el texto y todos los jugadores en copia oculta (CCO); él pulsa Enviar.
  let ligaEmails = {}; // { nombre: correo }

  async function loadLigaEmails(){
    ligaEmails = {};
    const key = (typeof getAdminKey === 'function') ? getAdminKey() : '';
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!key || !client) return ligaEmails;
    try {
      const { data, error } = await client.rpc('get_league_emails', { p_key: key });
      if(error) throw error;
      (data || []).forEach(r => { ligaEmails[r.name] = r.email; });
    } catch(e){ console.error('No se pudieron cargar los correos', e); }
    return ligaEmails;
  }

  async function guardarEmailJugador(nombre, email, input){
    const v = String(email || '').trim();
    if(v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ alert('El correo de ' + nombre + ' no parece válido.'); return false; }
    try {
      const { data, error } = await initSupabase().rpc('set_player_email', { p_key: getAdminKey(), p_name: nombre, p_email: v });
      if(error) throw error;
      if(!data){ alert('No tienes permiso para guardar correos.'); return false; }
      if(v) ligaEmails[nombre] = v.toLowerCase(); else delete ligaEmails[nombre];
      if(input){ input.classList.add('lp-mail-ok'); setTimeout(()=> input.classList.remove('lp-mail-ok'), 1500); }
      return true;
    } catch(e){ alert('No se pudo guardar el correo. Revisa la conexión.'); return false; }
  }

  // Quita el formato de WhatsApp (*negrita*) para que el mail se lea limpio
  function textoParaMail(t){ return String(t || '').replace(/\*([^*\n]+)\*/g, '$1'); }

  async function enviarMailLiga(asunto, cuerpo){
    await loadLigaEmails();
    const lista = Object.values(ligaEmails).filter(Boolean);
    if(!lista.length){
      alert('Aún no hay correos de jugadores.\n\nAñádelos en «Jugadores de la liga», debajo de cada nombre.');
      return;
    }
    const url = 'mailto:?bcc=' + encodeURIComponent(lista.join(','))
      + '&subject=' + encodeURIComponent(asunto)
      + '&body=' + encodeURIComponent(textoParaMail(cuerpo) + '\n\n— Los Iscariotes · Liga de golf');
    window.location.href = url;
  }
