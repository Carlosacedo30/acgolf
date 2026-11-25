/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Revisor automático del diseño (norma de Carlos, 25-nov-2026): recorre las pantallas de la versión de pruebas en 5 tamaños de móvil
// y busca: texto que se sale de su tarjeta o de la pantalla, columnas estrechas con el texto partido, letra que no se lee
// (poco contraste), botones tapados y cuadrados que no son cuadrados.
// Uso:  cd pruebas && python3 -m http.server 8833 &   y luego   node tools/auditoria-diseno.js [puerto]
const { chromium } = require('playwright');
const PUERTO = process.argv[2] || '8833';
const TAMANOS = [[320, 693], [360, 640], [393, 852], [430, 932], [480, 1040]];
const ESTADOS = [
  ['inicio', 'screen:0'], ['jugar', 'pant:jgPant'], ['liga', 'pant:lgPant'], ['cuenta', 'pant:cnPant'],
  ['pantalla1', 'screen:1'], ['pantalla2', 'screen:2'], ['pantalla3', 'screen:3'], ['pantalla4', 'screen:4'], ['pantalla5', 'screen:5'], ['pantalla6', 'screen:6'],
  ['foco-premios', 'foco:premios'], ['foco-medallas', 'foco:medallas'], ['foco-recientes', 'foco:recientes'],
  ['ov:convOverlay', 'ov:convOverlay'], ['ov:prOverlay', 'ov:prOverlay'], ['ov:normasOverlay', 'ov:normasOverlay'], ['ov:leaguePlayersOverlay', 'ov:leaguePlayersOverlay'],
  ['ov:greensMapaOverlay', 'ov:greensMapaOverlay'], ['ov:hcpOverlay', 'ov:hcpOverlay'], ['ov:reglasOverlay', 'ov:reglasOverlay'], ['ov:derbiOverlay', 'ov:derbiOverlay'],
  ['ov:ligaOverlay', 'ov:ligaOverlay'], ['ov:ryOverlay', 'ov:ryOverlay'], ['ov:riOverlay', 'ov:riOverlay'], ['ov:medallasOverlay', 'ov:medallasOverlay'],
  ['ov:manualOverlay', 'ov:manualOverlay'], ['ov:historiaOverlay', 'ov:historiaOverlay'], ['ov:camposOverlay', 'ov:camposOverlay'],
];
function revisar(estado) {
  const vw = innerWidth, vh = innerHeight, out = [];
  const nombre = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase());
  const visible = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05; };
  const rgb = s => { const m = (s || '').match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const fondo = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); const bi = cs.backgroundImage; if (bi && /url\(/.test(bi)) return null; if (bi && bi !== 'none') { const cols = [...bi.matchAll(/rgba?\([^)]*\)/g)].map(m => rgb(m[0])).filter(c => c && c[3] > .3); if (cols.length) { const mid = cols.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / cols.length); return mid; } return null; } const c = rgb(cs.backgroundColor); if (c && c[3] > .5) return c; } return [255, 255, 255]; };
  const contenedor = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); const hayFondo = (rgb(cs.backgroundColor) || [0, 0, 0, 0])[3] > .3 || (cs.backgroundImage && cs.backgroundImage !== 'none'); const borde = parseFloat(cs.borderTopWidth) > 0; if ((hayFondo || borde) && parseFloat(cs.borderTopLeftRadius) >= 12) return x; } return null; };
  const todos = [...document.querySelectorAll('body *')].filter(e => !/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|SVG|PATH)$/i.test(e.tagName) && !e.closest('#messageToastHole, [aria-hidden="true"]') && visible(e));
  for (const e of todos) {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const tieneTexto = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    // 1) Se sale por los lados de la pantalla
    if (r.right > vw + 1.5 || r.left < -1.5) { let enCarrusel = false; for (let x = e.parentElement; x; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if ((o === 'auto' || o === 'scroll' || o === 'hidden') && x.scrollWidth > x.clientWidth) { enCarrusel = true; break; } } if (!enCarrusel && (tieneTexto || /^(BUTTON|IMG|INPUT)$/.test(e.tagName))) out.push(['sale-de-pantalla', nombre(e), Math.round(r.left) + '→' + Math.round(r.right) + ' de ' + vw]); }
    // 2) Se sale de su tarjeta
    if (tieneTexto) { const c = contenedor(e); if (c) { const cr = c.getBoundingClientRect(); const ox = getComputedStyle(c).overflowX; if ((r.right > cr.right + 1.5 || r.left < cr.left - 1.5) && ox !== 'auto' && ox !== 'scroll') out.push(['sale-de-su-tarjeta', nombre(e), 'tarjeta ' + nombre(c) + ' ' + Math.round(cr.left) + '→' + Math.round(cr.right) + ', texto ' + Math.round(r.left) + '→' + Math.round(r.right)]); } }
    // 3) Columna estrecha con texto partido
    if (tieneTexto) { const txt = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim(); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25; const lineas = Math.round(r.height / lh); if (txt.length >= 10 && r.width < 105 && lineas >= 4 && cs.display !== 'inline') out.push(['texto-partido', nombre(e), '«' + txt.slice(0, 28) + '» ' + Math.round(r.width) + 'px de ancho, ' + lineas + ' líneas']); }
    // 4) Letra que no se lee
    if (tieneTexto && !e.closest('.derbi-cab, #derbiOverlay .derbi-banda')) { const col = rgb(cs.color), bg = fondo(e); if (col && bg) { const a = col[3]; const fg = a < 1 ? col.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a)) : col; const l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); if (ratio < 3) out.push(['no-se-lee', nombre(e), 'contraste ' + ratio.toFixed(1) + ' «' + e.textContent.trim().slice(0, 22) + '»']); } }
    // 5) Botón tapado
    if ((/^(BUTTON|A)$/.test(e.tagName) || e.getAttribute('role') === 'button') && !/^(prAbrirBtn|adminModeBtn)$/.test(e.id)) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx >= 0 && cx <= vw && cy >= 0 && cy <= vh) { const t = document.elementFromPoint(cx, cy); if (t && !t.closest('#inNav, .in-nav, .vv-mas, #diagPant, .lgp-pie, .pr-pie') && !(t === e || e.contains(t) || t.contains(e))) out.push(['boton-tapado', nombre(e), 'lo tapa ' + nombre(t)]); } if (r.top >= 0 && r.top < 47 && getComputedStyle(e).position !== 'static' && r.bottom > 5 && r.top + (parseFloat(getComputedStyle(e).paddingTop) || 0) < 47) out.push(['boton-bajo-la-hora', nombre(e), 'arriba=' + Math.round(r.top)]); }
    // 6) Cuadrados que no son cuadrados
    if (typeof e.className === 'string' && /(^|\s)(nt|tk|tecla|hole-cell|tb-eagle|tb-birdie|tb-par|tb-bogey|tb-doble)(\s|$)/.test(e.className) && Math.abs(r.width - r.height) > 2.5 && r.width < 80) out.push(['no-es-cuadrado', nombre(e), Math.round(r.width) + '×' + Math.round(r.height)]);
  }
  return out;
}
(async () => {
  const b = await chromium.launch(); const resumen = {};
  const EXTRA = process.argv[3] === 'extra';
  for (const [w, h] of TAMANOS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.route('**/*.css*', async r => { const resp = await r.fetch(); let t = await resp.text(); t = t.replace(/env\(safe-area-inset-top,\s*0px\)/g, '48px').replace(/env\(safe-area-inset-bottom,\s*0px\)/g, '27.7px').replace(/env\(safe-area-inset-top\)/g, '48px').replace(/env\(safe-area-inset-bottom\)/g, '27.7px'); r.fulfill({ response: resp, body: t }); });
    const p = await ctx.newPage(); p.on('pageerror', () => {});
    await p.goto('http://localhost:' + PUERTO + '/index.html'); await p.waitForTimeout(1500);
    if (process.argv[3] === 'gate') await p.evaluate(() => { window.__soloGate = true; });
    await p.evaluate(() => { document.documentElement.classList.add('in-on', 'lm-on', 'mn-on', 'tb-on'); if (!window.__soloGate) { const g = document.getElementById('cuentaGate'); if (g) g.remove(); } });
    const ovs = await p.evaluate(() => [...document.querySelectorAll('[id$="Overlay"]')].map(e => e.id));
    const lista = process.argv[3] === 'gate' ? [['entrada(cuentaGate)', 'gate:x']] : [...ESTADOS.filter(e => !e[1].startsWith('ov:')), ...ovs.map(i => ['ov:' + i, 'ov:' + i]), ['en-vivo', 'vivo:x'], ['liga-nueva-paso1', 'liga:1'], ['liga-nueva-paso2', 'liga:2'], ['liga-nueva-paso3', 'liga:3'], ['liga-nueva-paso4', 'liga:4'], ['mis-ligas', 'liga:lista']];
    for (const [nombre, clave] of lista) {
      const hay = await p.evaluate(([clave]) => {
        document.querySelectorAll('[id$="Overlay"]').forEach(o => o.hidden = true);
        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); delete s.dataset.foco; });
        document.querySelectorAll('.home-foco-on').forEach(x => x.classList.remove('home-foco-on'));
        const [tipo, v] = clave.split(':');
        if (tipo === 'screen') { const s = document.querySelector('.screen[data-screen="' + v + '"]'); if (!s) return false; s.classList.add('active'); return true; }
        if (tipo === 'pant') { const s = document.querySelector('.screen[data-screen="0"]'); s.classList.add('active'); ['jgPant','lgPant','cnPant'].forEach(i => { const x = document.getElementById(i); if (x) x.hidden = i !== v; }); const e = document.getElementById(v); if (!e) return false; return true; }
        if (tipo === 'foco') { const s = document.querySelector('.screen[data-screen="0"]'); s.classList.add('active'); s.dataset.foco = v; const id = { premios: 'premiosHome', medallas: 'medallasHome', recientes: 'homeRecientes' }[v]; const el = document.getElementById(id); if (el) { el.style.display = ''; el.classList.add('home-foco-on'); } return true; }
        if (tipo === 'vivo') { return 'vivo'; }
        if (tipo === 'liga') { return 'liga'; }
        if (tipo === 'gate') { return true; }
        if (tipo === 'ov') { const o = document.getElementById(v); if (!o) return false; o.hidden = false; return true; }
        return false;
      }, [clave]);
      if (hay === 'liga') { const paso = clave.split(':')[1]; await p.evaluate(async ([paso]) => { const ov = ligaVentana(); ov.hidden = false; if (paso === 'lista') { try { ligaForm = null; if (typeof ligaPintarLista === 'function') ligaPintarLista(); } catch (e) {} return; } ligaForm = null; ligaPintarForm(); const n = Number(paso); for (let i = 1; i < n; i++) { const nom = document.getElementById('lgNombre'); if (nom) { nom.value = 'Liga de otoño'; ligaForm.nombre = nom.value; } ligaForm.jugadores = ligaForm.jugadores && ligaForm.jugadores.length ? ligaForm.jugadores : ['a', 'b']; const sig = document.getElementById('lgpSig'); if (sig) sig.click(); await new Promise(r => setTimeout(r, 200)); } }, [paso]); await p.waitForTimeout(400); }
      else if (hay === 'vivo') { await p.evaluate(() => { const round = { code: 'X', round_name: 'Liga mar 24 nov', course_id: 'hato-verde', course_name: 'Club Hato Verde', scoring_type: 'strokeplay', match_groups: [{ players: ['Carlos Acedo Dominguez', 'Pedro Ruiz Gómez'], handicaps: [11, 18], scores: { 0: { 1: 3, 2: 5, 3: 5 }, 1: { 1: 4, 2: 6 } }, hoyoSalida: 1 }] }; window.acgolfEnVivo.pantalla('X', round); }); await p.waitForTimeout(1500); }
      else if (!hay) continue; await p.waitForTimeout(250);
      const res = await p.evaluate(revisar, nombre);
      for (const [tipo, el, det] of res) { const k = tipo + '|' + nombre + '|' + el; (resumen[k] = resumen[k] || { tipo, estado: nombre, el, det, tamanos: [] }).tamanos.push(w); }
    }
    await ctx.close();
  }
  await b.close();
  const lista = Object.values(resumen).sort((a, c) => a.tipo.localeCompare(c.tipo) || a.estado.localeCompare(c.estado));
  for (const x of lista) console.log(`[${x.tipo}] ${x.estado} · ${x.el} · ${x.det} · anchos: ${[...new Set(x.tamanos)].join(',')}`);
  console.log('\nTOTAL: ' + lista.length + ' avisos');
})();
