/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Iconos de la app: dibujos de línea fina (en lugar de los emojis de WhatsApp) ---
  // Toman el color del texto que los rodea. Uso: icono('trofeo') o icono('trofeo', 'clase-extra').
  const ICONOS = {
    balanza:  '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M4 7h16"/><path d="M4 7l-3 7a3.5 3.5 0 0 0 6 0z"/><path d="M20 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    bandera:  '<path d="M5 22V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/><ellipse cx="9" cy="21.5" rx="5" ry="0.8"/>',
    podio:    '<path d="M3 21h18"/><path d="M9.5 21V8h5v13"/><path d="M4 21v-8h5.5"/><path d="M14.5 21V11H20v10"/><path d="M12 3.2l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
    trofeo:   '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    corona:   '<path d="M3 7l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
    medalla:  '<path d="M7.2 2h3.6l2.2 5.5"/><path d="M16.8 2h-3.6L11 7.5"/><circle cx="12" cy="15" r="6.5"/><circle cx="12" cy="15" r="3.5"/>',
    historial:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    libro:    '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    llave:    '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>',
    sube:     '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    pluma:    '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
    llama:    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    piedra:   '<path d="M3 19.5 6.5 9 12 5l6.5 3.5L21 19.5z"/><path d="M9 11.5l3-2 3 2.5"/>',
    regalo:   '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    megafono: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    papelera: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    hecho:    '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
    brillo:   '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v3M17.5 4.5h3"/>',
    flecha:   '<path d="m9 6 6 6-6 6"/>',
    diana:    '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    palo:     '<path d="M15 2.5 7.5 18.5"/><path d="M7.5 18.5c-.6 1.4-.1 2.6 1.3 2.9l3.2.6c.9.2 1.5-.7 1-1.4l-.8-1.2"/><circle cx="18" cy="19.5" r="1.6"/>',
    llaveInglesa:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    calentar: '<path d="M12 2v3"/><path d="M12 19v3"/><path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="m4.9 19.1 2.1-2.1"/><path d="m17 7 2.1-2.1"/><circle cx="12" cy="12" r="4"/>',
  };
  function icono(nombre, clase){
    const d = ICONOS[nombre];
    if(!d) return '';
    return '<svg class="ico' + (clase ? ' ' + clase : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  // Pone los iconos escritos en el HTML como <i data-ico="nombre"></i>
  function pintarIconos(raiz){
    (raiz || document).querySelectorAll('i[data-ico]').forEach(i => { if(!i.firstChild) i.outerHTML = icono(i.dataset.ico, i.className); });
  }
  pintarIconos();
