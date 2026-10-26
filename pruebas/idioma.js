/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Idioma de la app: Español / English ---
// · Se elige abajo en la portada y en «Mi cuenta». Se recuerda en cada móvil.
// · Si el móvil está en inglés y nadie ha elegido, sale en inglés.
// · Traduce lo que se ve en pantalla con la lista de idioma-en.js (lo que no está en la lista se queda en español).
(function(){
  'use strict';
  const LLAVE = 'acgolfIdioma';
  let idioma = 'es';
  try { idioma = localStorage.getItem(LLAVE) || ((navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es'); } catch(e){}
  if(idioma !== 'en') idioma = 'es';
  window.acgolfIdioma = idioma;

  function cambiar(nuevo){
    try { localStorage.setItem(LLAVE, nuevo); } catch(e){}
    location.reload();
  }

  // Selector (dos pastillas)
  function selectorHtml(){
    return '<div class="id-t">' + (idioma === 'en' ? 'Language' : 'Idioma') + '</div><div class="id-l">'
      + '<button type="button" class="id-b' + (idioma === 'es' ? ' on' : '') + '" data-idioma="es" data-no-traducir>🇪🇸 Español</button>'
      + '<button type="button" class="id-b' + (idioma === 'en' ? ' on' : '') + '" data-idioma="en" data-no-traducir>🇬🇧 English</button></div>';
  }
  function enganchar(caja){
    caja.querySelectorAll('[data-idioma]').forEach(b => b.onclick = () => { if(b.dataset.idioma !== idioma) cambiar(b.dataset.idioma); });
  }
  function ponerSelectores(){
    const pie = document.querySelector('.home-pie');
    if(pie && !document.getElementById('idPie')){
      const c = document.createElement('div'); c.id = 'idPie'; c.className = 'id-caja'; c.setAttribute('data-no-traducir', '');
      c.innerHTML = selectorHtml();
      const copy = pie.querySelector('.app-copyright');
      if(copy) pie.insertBefore(c, copy); else pie.appendChild(c);
      enganchar(c);
    }
    const mis = document.getElementById('cgMisGrupos');
    if(mis && !document.getElementById('idCuenta')){
      const c = document.createElement('div'); c.id = 'idCuenta'; c.className = 'id-caja'; c.setAttribute('data-no-traducir', '');
      c.innerHTML = selectorHtml();
      mis.parentNode.insertBefore(c, mis.nextSibling);
      enganchar(c);
    }
  }

  // ---------- Traducción ----------
  const T = idioma === 'en' ? (window.acgolfTextosEN || {}) : null;
  const P = idioma === 'en' ? (window.acgolfPatronesEN || []) : [];
  function traducir(txt){
    if(!T || !txt) return null;
    const limpio = txt.replace(/\s+/g, ' ').trim();
    if(!limpio) return null;
    let r = Object.prototype.hasOwnProperty.call(T, limpio) ? T[limpio] : null;
    if(r == null){
      for(const [re, fn] of P){ if(re.test(limpio)){ r = limpio.replace(re, fn); break; } }
    }
    if(r == null || r === limpio) return null;
    const ini = txt.match(/^\s*/)[0], fin = txt.match(/\s*$/)[0];
    return ini + r + fin;
  }
  window.acgolfTraducir = t => traducir(String(t || '')) || t;

  const SALTAR = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|svg|path)$/;
  function fuera(el){ return !el || SALTAR.test(el.nodeName) || (el.closest && el.closest('[data-no-traducir]')); }
  function nodoTexto(n){
    if(fuera(n.parentNode)) return;
    const r = traducir(n.data); if(r != null) n.data = r;
  }
  const ATRS = ['placeholder', 'aria-label', 'title'];
  function atributos(el){
    if(fuera(el)) return;
    for(const a of ATRS){ const v = el.getAttribute && el.getAttribute(a); if(v){ const r = traducir(v); if(r != null) el.setAttribute(a, r); } }
  }
  function recorrer(raiz){
    if(!raiz) return;
    if(raiz.nodeType === 3){ nodoTexto(raiz); return; }
    if(raiz.nodeType !== 1 || fuera(raiz)) return;
    atributos(raiz);
    raiz.querySelectorAll('[placeholder],[aria-label],[title]').forEach(atributos);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let n; while((n = w.nextNode())) nodoTexto(n);
  }

  if(T){
    document.documentElement.lang = 'en';
    // Ventanitas del navegador (avisos y preguntas)
    const lineas = m => String(m == null ? '' : m).split('\n').map(l => traducir(l) || l).join('\n');
    const a = window.alert, c = window.confirm, p = window.prompt;
    window.alert = m => a.call(window, lineas(m));
    window.confirm = m => c.call(window, lineas(m));
    window.prompt = (m, d) => p.call(window, lineas(m), d);
  }

  function arrancar(){
    ponerSelectores();
    if(T) recorrer(document.body);
    new MutationObserver(lista => {
      ponerSelectores();
      if(!T) return;
      for(const m of lista){
        if(m.type === 'characterData') nodoTexto(m.target);
        else if(m.type === 'attributes') atributos(m.target);
        else m.addedNodes.forEach(recorrer);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: !!T, attributeFilter: ATRS });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
