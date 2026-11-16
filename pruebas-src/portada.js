/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Portada de cada grupo (versión de pruebas): escudo hecho con las iniciales, color, campo y patrocinador.
// Los datos los elige el administrador en el asistente al crear el grupo y se guardan en grupos.marca.
(function(){
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const COLORES = [
    { c:'#C6F24E', n:'Lima' }, { c:'#4FD1E8', n:'Turquesa' }, { c:'#FFB547', n:'Naranja' },
    { c:'#FF7A6B', n:'Coral' }, { c:'#E6C25A', n:'Oro' }, { c:'#5FD38D', n:'Verde' }
  ];
  // Tonos de fondo de toda la app: cada gris del tema grafito se cambia por el tono equivalente
  const FONDOS = [
    { id:'grafito', n:'Grafito', t:['#111316','#1B1E22','#24282D','#2A2E33','#2C3137','#33383E','#4A5058','#9AA3AB'] },
    { id:'verde',   n:'Verde club', t:['#0C1F17','#142C21','#1B382A','#1F3D2F','#214032','#28493A','#3D5E4E','#9DB5A8'] },
    { id:'azul',    n:'Azul noche', t:['#0D1626','#152238','#1C2B45','#21314C','#22344F','#293C5A','#3E5375','#9FB0C8'] },
    { id:'burdeos', n:'Burdeos', t:['#1E0F15','#2B1620','#361C28','#3C202D','#3E2230','#472836','#634050','#BBA0AA'] }
  ];
  const ESCUDOS = [
    { id:'sello', n:'Sello moderno' }, { id:'clasico', n:'Escudo clásico' },
    { id:'bandera', n:'Bandera de green' }, { id:'bola', n:'Bola de golf' }
  ];

  // Iniciales a partir del nombre: «Los Pollos de Hato» → «PH»; «Cajapollos» → «CA»
  function iniciales(nombre){
    const sobran = /^(los|las|el|la|de|del|y|club|the)$/i;
    const pal = String(nombre || '').trim().split(/\s+/).filter(p => p && !sobran.test(p));
    if(!pal.length) return 'G';
    if(pal.length === 1) return pal[0].slice(0, 2).toUpperCase();
    return (pal[0][0] + pal[1][0]).toUpperCase();
  }

  // Dibuja el escudo (SVG) con las iniciales y el color del grupo.
  // Estilo fino y elegante: línea de 1,6, doble filete, letra con serifa y fondo azul noche.
  function escudo(tipo, ini, color, tam){
    ini = esc(String(ini || 'G').slice(0, 3).toUpperCase());
    color = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#C6F24E';
    tam = tam || 96;
    const fs = ini.length > 2 ? 26 : 34;
    const serif = "font-family=\"'Playfair Display', Georgia, 'Times New Roman', serif\"";
    const gid = 'esc' + tipo + ini.replace(/[^A-Z0-9]/g, '') + color.slice(1);
    // El degradado va al final: así el primer dibujo del SVG sigue siendo el círculo (lo usa el Inicio para el aro dorado)
    const defs = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17233D"/><stop offset="1" stop-color="#0F1626"/></linearGradient></defs>';
    const fondo = 'url(#' + gid + ')';
    let dentro;
    if(tipo === 'clasico'){
      return '<svg width="' + Math.round(tam * .87) + '" height="' + tam + '" viewBox="0 0 100 116" aria-hidden="true">'
        + '<path d="M50 5 L90 16 V58 C90 85 71 100 50 110 C29 100 10 85 10 58 V16 Z" fill="' + fondo + '" stroke="' + color + '" stroke-width="1.6"/>'
        + '<path d="M50 11 L84 21 V58 C84 81 68 94 50 103 C32 94 16 81 16 58 V21 Z" fill="none" stroke="' + color + '" stroke-width=".7" opacity=".8"/>'
        + '<circle cx="40" cy="22" r="1.4" fill="' + color + '"/><circle cx="50" cy="19.5" r="1.8" fill="' + color + '"/><circle cx="60" cy="22" r="1.4" fill="' + color + '"/>'
        + '<text x="50" y="66" text-anchor="middle" ' + serif + ' font-weight="700" font-size="' + fs + '" fill="' + color + '">' + ini + '</text>'
        + '<path d="M28 80 H46 M54 80 H72" stroke="' + color + '" stroke-width=".8"/><path d="M50 77.2 l2.8 2.8 -2.8 2.8 -2.8 -2.8z" fill="' + color + '"/>' + defs + '</svg>';
    }
    if(tipo === 'bandera'){
      dentro = '<rect x="7" y="7" width="86" height="86" rx="24" fill="' + fondo + '" stroke="' + color + '" stroke-width="1.6"/>'
        + '<rect x="12.5" y="12.5" width="75" height="75" rx="19" fill="none" stroke="' + color + '" stroke-width=".7" opacity=".75"/>'
        + '<path d="M32 78 V24" stroke="#F4F1E8" stroke-width="1.6" stroke-linecap="round"/>'
        + '<path d="M33 24 L58 32 L33 41 Z" fill="' + color + '" fill-opacity=".9" stroke="' + color + '" stroke-width=".8" stroke-linejoin="round"/>'
        + '<path d="M22 79 q10 -3.5 20 0" stroke="#F4F1E8" stroke-width=".9" fill="none" opacity=".6"/>'
        + '<text x="65" y="74" text-anchor="middle" ' + serif + ' font-weight="700" font-size="' + (fs - 12) + '" fill="#F4F1E8">' + ini + '</text>';
    } else if(tipo === 'bola'){
      const hoyos = [[50,25],[38,31],[62,31],[28,42],[72,42],[24,54],[76,54],[30,66],[70,66],[40,75],[60,75],[50,79]]
        .map(q => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.1" fill="' + color + '" opacity=".45"/>').join('');
      dentro = '<circle cx="50" cy="50" r="45" fill="' + fondo + '" stroke="' + color + '" stroke-width="1.6"/>'
        + '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width=".7" opacity=".8"/>' + hoyos
        + '<text x="50" y="60" text-anchor="middle" ' + serif + ' font-weight="700" font-size="' + (fs - 4) + '" fill="#F4F1E8">' + ini + '</text>';
    } else {
      let marcas = '';
      for(let i = 0; i < 36; i++){
        const an = i * 10 * Math.PI / 180, r1 = 40.5, r2 = i % 3 === 0 ? 36.5 : 38.2;
        marcas += '<path d="M' + (50 + r1 * Math.sin(an)).toFixed(2) + ' ' + (50 - r1 * Math.cos(an)).toFixed(2) + ' L' + (50 + r2 * Math.sin(an)).toFixed(2) + ' ' + (50 - r2 * Math.cos(an)).toFixed(2) + '" stroke="' + color + '" stroke-width=".8" opacity=".85"/>';
      }
      dentro = '<circle cx="50" cy="50" r="46" fill="' + fondo + '" stroke="' + color + '" stroke-width="1.6"/>'
        + '<circle cx="50" cy="50" r="42.5" fill="none" stroke="' + color + '" stroke-width=".6" opacity=".7"/>' + marcas
        + '<text x="50" y="60" text-anchor="middle" ' + serif + ' font-weight="700" font-size="' + (fs - 2) + '" fill="' + color + '">' + ini + '</text>'
        + '<path d="M38 69 H62" stroke="' + color + '" stroke-width=".8"/>';
    }
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 100 100" aria-hidden="true">' + dentro + defs + '</svg>';
  }

  // ---- Tonos de la app ----
  // Se copia la hoja del tema con los colores cambiados y se pone detrás de la original (gana la copia).
  const hojas = {};
  async function leerHoja(nombre){
    if(hojas[nombre] !== undefined) return hojas[nombre];
    const l = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(x => (x.getAttribute('href') || '').split('?')[0] === nombre);
    hojas[nombre] = '';
    if(!l) return '';
    try { hojas[nombre] = await (await fetch(l.href)).text(); } catch(e){}
    return hojas[nombre];
  }
  const rgb = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
  let turno = 0;
  async function tonos(color, fondo){
    const yo = ++turno;
    const f = FONDOS.find(x => x.id === fondo) || FONDOS[0];
    color = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color.toUpperCase() : '#C6F24E';
    let st = document.getElementById('pgTonos');
    if(f.id === 'grafito' && color === '#C6F24E'){ if(st) st.textContent = ''; return; }
    const css = (await leerHoja('tema-grafito.css')) + '\n' + (await leerHoja('cuenta.css'));
    if(yo !== turno) return;
    let out = css.replace(/#C6F24E/gi, color).replace(/rgba\(\s*198\s*,\s*242\s*,\s*78\s*,/g, 'rgba(' + rgb(color) + ',');
    FONDOS[0].t.forEach((g, i) => { out = out.split(g).join(f.t[i]).split(g.toLowerCase()).join(f.t[i]); });
    out = out.replace(/rgba\(\s*17\s*,\s*19\s*,\s*22\s*,/g, 'rgba(' + rgb(f.t[0]) + ',');
    if(!st){ st = document.createElement('style'); st.id = 'pgTonos'; document.head.appendChild(st); }
    st.textContent = out;
    const mt = document.querySelector('meta[name="theme-color"]'); if(mt) mt.setAttribute('content', f.t[0]);
  }

  // Marca efectiva de un perfil: la guardada o, si no hay, una automática con el nombre del grupo
  function marcaDe(perfil){
    const m = (perfil && perfil.grupo_marca) || {};
    return {
      escudo: m.escudo || 'sello',
      color: m.color || '#C6F24E',
      fondo: m.fondo || 'grafito',
      iniciales: m.iniciales || iniciales(perfil && perfil.grupo),
      campo: m.campo || '',
      temporada: m.temporada || ('Liga ' + new Date().getFullYear()),
      patrocinador: m.patrocinador || '',
      hecho: !!m.hecho
    };
  }

  // Los Iscariotes conservan su portada de siempre mientras no elijan otra
  function esPortadaOriginal(perfil){
    const m = (perfil && perfil.grupo_marca) || {};
    return !m.hecho && /^los iscariotes$/i.test(String(perfil && perfil.grupo || '').trim());
  }

  // Pantalla de la liga con el nombre del grupo (y su campeón de la semana)
  function nombreLiga(grupo){
    window.acgolfGrupo = grupo;
    const pant = document.querySelector('.screen[data-screen="6"] .app-bar');
    if(!pant) return;
    const h = pant.querySelector('h1');
    if(h) h.textContent = 'Liga de ' + grupo;
    const meta = pant.querySelector('.meta');
    const camp = (typeof premiosCampeon === 'function') ? premiosCampeon(grupo) : 'Campeón';
    if(meta) meta.textContent = camp + ' cada semana · campeón del mes por puntos';
    if(typeof renderPremios === 'function') renderPremios();
  }

  // Pinta la portada del grupo en la pantalla de inicio
  function aplicar(perfil){
    if(perfil && perfil.grupo_tipo !== 'personal' && perfil.grupo) nombreLiga(perfil.grupo);
    if(!perfil || esPortadaOriginal(perfil)) return;
    const cab = document.querySelector('.home-cab');
    if(!cab) return;
    const personal = perfil.grupo_tipo === 'personal';
    const m = personal
      ? Object.assign(marcaDe(perfil), { iniciales: iniciales(perfil.player_name), escudo: 'bola', campo: 'Mi golf', temporada: 'Gratis' })
      : marcaDe(perfil);
    const nombre = personal ? String(perfil.player_name || 'Mi golf').split(' ')[0] : (perfil.grupo || 'Mi grupo');
    document.documentElement.classList.add('con-marca');
    tonos(m.color, m.fondo);
    document.documentElement.style.setProperty('--grupo-color', m.color);

    const img = cab.querySelector('.pv2-escudo');
    if(img){
      const div = document.createElement('div');
      div.className = 'pv2-escudo pg-escudo';
      div.setAttribute('role', 'img');
      div.setAttribute('aria-label', 'Escudo de ' + nombre);
      div.innerHTML = escudo(m.escudo, m.iniciales, m.color, 120);
      img.replaceWith(div);
    } else {
      const div = cab.querySelector('.pg-escudo');
      if(div) div.innerHTML = escudo(m.escudo, m.iniciales, m.color, 120);
    }
    const eb = cab.querySelector('.pv2-eyebrow');
    if(eb) eb.textContent = [m.campo, m.temporada].filter(Boolean).join(' · ');
    const t = cab.querySelector('.pv2-titulo');
    if(t){
      const pal = nombre.trim().split(/\s+/);
      t.innerHTML = pal.length > 1 ? esc(pal[0]) + '<br><span>' + esc(pal.slice(1).join(' ')) + '</span>' : '<span>' + esc(nombre) + '</span>';
    }
    // El patrocinador de Los Iscariotes no sale en los demás grupos (ni en Inicio, ni en premios, ni en WhatsApp)
    try { if(typeof PATROCINADOR !== 'undefined') PATROCINADOR = null; } catch(e){}
    const sh = document.getElementById('sponsorHome'); if(sh){ sh.innerHTML = ''; sh.style.display = 'none'; }
    // El logo de Bolarecuperada (con enlace a su web) sale en TODOS los grupos.
    // Si el grupo tiene además su propio patrocinador, se pone al lado del logo.
    const pat = document.querySelector('.home-patro');
    if(pat){
      pat.style.display = '';
      const viejo = document.querySelector('.pg-patro-propio');
      if(viejo) viejo.remove();
      if(m.patrocinador && !personal){
        let fila = pat.parentNode;
        if(!fila.classList.contains('pg-patro-fila')){
          fila = document.createElement('div');
          fila.className = 'pg-patro-fila';
          pat.replaceWith(fila);
          fila.appendChild(pat);
        }
        const b = document.createElement('b');
        b.className = 'pg-patro-propio';
        b.textContent = m.patrocinador;
        fila.appendChild(b);
      }
    }
    document.title = (personal ? 'Mi golf' : nombre) + ' · acgolf';
  }

  window.acgolfPortada = { COLORES, ESCUDOS, FONDOS, tonos, iniciales, escudo, marcaDe, aplicar, esPortadaOriginal };
})();
