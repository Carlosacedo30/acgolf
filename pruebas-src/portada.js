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

  // Dibuja el escudo (SVG) con las iniciales y el color del grupo
  function escudo(tipo, ini, color, tam){
    ini = esc(String(ini || 'G').slice(0, 3).toUpperCase());
    color = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#C6F24E';
    tam = tam || 96;
    const fs = ini.length > 2 ? 27 : 36;
    const anton = "font-family=\"Anton, 'Barlow Condensed', sans-serif\"";
    let dentro;
    if(tipo === 'clasico'){
      return '<svg width="' + Math.round(tam * .87) + '" height="' + tam + '" viewBox="0 0 100 116" aria-hidden="true">'
        + '<path d="M50 4 L92 16 V58 C92 86 72 102 50 112 C28 102 8 86 8 58 V16 Z" fill="#0E3324" stroke="' + color + '" stroke-width="4"/>'
        + '<path d="M50 12 L84 22 V58 C84 81 68 95 50 103 C32 95 16 81 16 58 V22 Z" fill="none" stroke="' + color + '" stroke-width="1.2"/>'
        + '<text x="50" y="68" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="' + (fs - 2) + '" fill="' + color + '">' + ini + '</text>'
        + '<path d="M30 82 H70" stroke="' + color + '" stroke-width="1.5"/></svg>';
    }
    if(tipo === 'bandera'){
      dentro = '<rect x="6" y="6" width="88" height="88" rx="22" fill="#1B1E22" stroke="' + color + '" stroke-width="3"/>'
        + '<path d="M30 82 V20" stroke="#F2F4F5" stroke-width="4" stroke-linecap="round"/>'
        + '<path d="M32 20 L62 29 L32 40 Z" fill="' + color + '"/>'
        + '<ellipse cx="34" cy="83" rx="16" ry="3.5" fill="#F2F4F5" opacity=".3"/>'
        + '<text x="66" y="78" text-anchor="middle" ' + anton + ' font-size="' + (fs - 10) + '" fill="#F2F4F5">' + ini + '</text>';
    } else if(tipo === 'bola'){
      const hoyos = [[30,30],[44,22],[58,22],[72,30],[22,46],[78,46],[26,64],[74,64],[38,77],[50,80],[62,77]]
        .map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#D3DAE2"/>').join('');
      dentro = '<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="' + color + '" stroke-width="5"/>' + hoyos
        + '<text x="50" y="62" text-anchor="middle" ' + anton + ' font-size="' + (fs - 3) + '" fill="#111316">' + ini + '</text>';
    } else {
      dentro = '<circle cx="50" cy="50" r="46" fill="#111316" stroke="' + color + '" stroke-width="4"/>'
        + '<circle cx="50" cy="50" r="37" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="3 4"/>'
        + '<text x="50" y="62" text-anchor="middle" ' + anton + ' font-size="' + (fs - 2) + '" fill="' + color + '">' + ini + '</text>';
    }
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 100 100" aria-hidden="true">' + dentro + '</svg>';
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

  // Pinta la portada del grupo en la pantalla de inicio
  function aplicar(perfil){
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
    const pat = document.querySelector('.home-patro');
    if(pat){
      if(m.patrocinador && !personal){
        const d = document.createElement('div');
        d.className = 'home-patro pg-patro';
        d.innerHTML = '<span>Patrocina</span><b>' + esc(m.patrocinador) + '</b>';
        pat.replaceWith(d);
      } else pat.style.display = 'none';
    }
    document.title = (personal ? 'Mi golf' : nombre) + ' · acgolf';
  }

  window.acgolfPortada = { COLORES, ESCUDOS, FONDOS, tonos, iniciales, escudo, marcaDe, aplicar, esPortadaOriginal };
})();
