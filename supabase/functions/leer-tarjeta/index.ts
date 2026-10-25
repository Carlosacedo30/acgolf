// © 2026 Carlos Acedo Domínguez. acgolf · Función «leer-tarjeta»
// «Pega tu foto de la tarjeta y a jugar»:
//  · accion "leer": lee la foto (o fotos) de la tarjeta del club con Gemini (Google) y devuelve los datos.
//  · accion "guardar": guarda el campo revisado por el jugador en campos_golf (lo ven todos) y las fotos en «tarjetas».
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const ORIGENES = ["https://acgolf.es", "https://carlosacedo30.github.io"];
const MAX_FOTOS = 3;
const MAX_BYTES_FOTO = 2_500_000;
const LIMITE_PERSONA_DIA = 12;   // lecturas + guardados por persona y día
const LIMITE_TOTAL_DIA = 300;    // para no pasar del nivel gratis de Gemini
const MODELOS = () => [Deno.env.get("GEMINI_MODELO"), "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean) as string[];

let CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGENES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown, max = 80): string | null => {
  const s = typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim() : "";
  return s ? s.slice(0, max) : null;
};

type Foto = { tipo: string; datos: string };
function fotosDe(v: unknown): Foto[] {
  if (!Array.isArray(v)) return [];
  const out: Foto[] = [];
  for (const f of v.slice(0, MAX_FOTOS)) {
    const tipo = typeof f?.tipo === "string" && /^image\/(jpeg|png|webp)$/.test(f.tipo) ? f.tipo : null;
    const datos = typeof f?.datos === "string" ? f.datos.replace(/^data:[^,]*,/, "") : "";
    if (!tipo || !datos || !/^[A-Za-z0-9+/=]+$/.test(datos) || datos.length * 0.75 > MAX_BYTES_FOTO) continue;
    out.push({ tipo, datos });
  }
  return out;
}

const INSTRUCCIONES = `Eres un experto en golf. Te paso la foto (o fotos) de la tarjeta de un campo de golf (normalmente de España).
Saca SOLO lo que se lee en la tarjeta; si un dato no se ve o no está, déjalo vacío (null o lista vacía). No inventes nada.
- es_tarjeta: true si de verdad es una tarjeta o una tabla de slopes de un campo de golf.
- nombre: nombre del club o del campo, tal como sale. ciudad: si sale.
- hoyos: 9 o 18.
- par_hoyos: el par de cada hoyo, en orden del 1 al último (9 o 18 números).
- hcp_hoyos: el hándicap (también llamado HCP, Hcp, Hándicap, Ventaja, S.I., Stroke Index) de cada hoyo, en el mismo orden. Si hay una fila de caballeros y otra de damas, usa la de caballeros.
- barras: una por cada barra de salida y sexo que tenga Course Rating (también «Valor campo», «VC», «C.R.») y Slope. Si una barra tiene valores de caballeros y de damas, pon dos barras: genero "m" (caballeros) y genero "f" (damas). nombre = el color en español en plural (Blancas, Amarillas, Azules, Rojas, Negras, Verdes, Naranjas…). rating con decimales (ej. 71.4), slope entero (55-155), metros totales si salen (si están en yardas, pásalos a metros), par total si sale.
- notas: cualquier cosa rara (por ejemplo, que no se lee bien una parte), en español y corta.`;

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    es_tarjeta: { type: "BOOLEAN" },
    nombre: { type: "STRING", nullable: true },
    ciudad: { type: "STRING", nullable: true },
    hoyos: { type: "INTEGER", nullable: true },
    par_hoyos: { type: "ARRAY", items: { type: "INTEGER" } },
    hcp_hoyos: { type: "ARRAY", items: { type: "INTEGER" } },
    barras: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre: { type: "STRING" },
          genero: { type: "STRING", enum: ["m", "f"] },
          rating: { type: "NUMBER", nullable: true },
          slope: { type: "INTEGER", nullable: true },
          metros: { type: "INTEGER", nullable: true },
          par: { type: "INTEGER", nullable: true },
        },
        required: ["nombre", "genero"],
      },
    },
    notas: { type: "STRING", nullable: true },
  },
  required: ["es_tarjeta", "par_hoyos", "hcp_hoyos", "barras"],
};

class Fallo extends Error { constructor(public codigo: number, m: string) { super(m); } }

async function preguntarGemini(fotos: Foto[], clave: string) {
  const cuerpo = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: INSTRUCCIONES }, ...fotos.map((f) => ({ inline_data: { mime_type: f.tipo, data: f.datos } }))] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: ESQUEMA },
  });
  let ultimo = "";
  for (const modelo of MODELOS()) {
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), 45000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": clave }, body: cuerpo, signal: ctl.signal,
      });
      if (r.status === 404) { ultimo = "modelo " + modelo + " no existe"; continue; }
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        const t = (await r.text()).slice(0, 300); console.error("Gemini", r.status, t);
        if (/API key|API_KEY|permission/i.test(t)) throw new Fallo(502, "La clave de Google (Gemini) no es válida.");
        throw new Fallo(502, "No se ha podido leer la foto. Prueba con otra foto más clara.");
      }
      if (r.status === 429) throw new Fallo(503, "Hoy se han leído muchas tarjetas. Prueba más tarde o escribe tú los datos.");
      if (!r.ok) { ultimo = "Gemini " + r.status; console.error(ultimo, (await r.text()).slice(0, 300)); continue; }
      const j = await r.json();
      const texto = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
      try { return JSON.parse(texto); } catch { throw new Fallo(502, "No se ha podido leer la tarjeta. Prueba con otra foto más clara."); }
    } catch (e) {
      if (e instanceof Fallo) throw e;
      if ((e as Error).name === "AbortError") throw new Fallo(504, "Está tardando demasiado. Inténtalo otra vez.");
      ultimo = String(e); console.error("Gemini", ultimo);
    } finally { clearTimeout(reloj); }
  }
  console.error("Gemini sin respuesta:", ultimo);
  throw new Fallo(502, "El servicio que lee las fotos no responde. Escribe tú los datos.");
}

// Limpia lo que devuelve Gemini (para enseñarlo en el formulario; el jugador lo revisa)
function limpiarLectura(l: any) {
  const ints = (a: unknown) => Array.isArray(a) ? a.map((x) => num(x)).map((x) => (x === null ? null : Math.round(x))) : [];
  let par = ints(l?.par_hoyos), hcp = ints(l?.hcp_hoyos);
  const n = [9, 18].includes(par.length) ? par.length : [9, 18].includes(num(l?.hoyos) || 0) ? num(l?.hoyos)! : 18;
  par = par.slice(0, n); hcp = hcp.slice(0, n);
  const barras = (Array.isArray(l?.barras) ? l.barras : []).slice(0, 10).map((b: any) => ({
    nombre: txt(b?.nombre, 30) || "",
    genero: b?.genero === "f" ? "f" : "m",
    rating: num(b?.rating),
    slope: num(b?.slope) === null ? null : Math.round(num(b?.slope)!),
    metros: num(b?.metros) === null ? null : Math.round(num(b?.metros)!),
  }));
  return { es_tarjeta: l?.es_tarjeta !== false, nombre: txt(l?.nombre), ciudad: txt(l?.ciudad), hoyos: n, par_hoyos: par, hcp_hoyos: hcp, barras, notas: txt(l?.notas, 200) };
}

// Comprueba el campo que manda el jugador antes de guardarlo para todos
function validarCampo(c: any): { fila?: any; error?: string } {
  const nombre = txt(c?.nombre);
  if (!nombre || nombre.length < 3) return { error: "Escribe el nombre del campo." };
  const par = Array.isArray(c?.par_hoyos) ? c.par_hoyos.map((x: unknown) => num(x)) : [];
  const n = par.length;
  if (n !== 9 && n !== 18) return { error: "Faltan hoyos: tienen que ser 9 o 18." };
  if (par.some((p: number | null) => p === null || !Number.isInteger(p) || p < 3 || p > 6)) return { error: "El par de cada hoyo tiene que ser 3, 4, 5 o 6." };
  const hcp = Array.isArray(c?.hcp_hoyos) ? c.hcp_hoyos.map((x: unknown) => num(x)) : [];
  if (hcp.length !== n || hcp.some((h: number | null) => h === null || !Number.isInteger(h) || h < 1 || h > 18) || new Set(hcp).size !== n)
    return { error: "El hándicap de los hoyos tiene que ir del 1 al 18 sin repetir ninguno." };
  const barras: any[] = [];
  for (const b of (Array.isArray(c?.barras) ? c.barras : []).slice(0, 10)) {
    const nb = txt(b?.nombre, 30);
    const rating = num(b?.rating), slope = num(b?.slope), metros = num(b?.metros);
    if (!nb || rating === null || slope === null) continue;
    if (rating < 20 || rating > 90) return { error: "El rating de la barra " + nb + " no parece bien (" + rating + ")." };
    if (!Number.isInteger(slope) || slope < 55 || slope > 155) return { error: "El slope de la barra " + nb + " tiene que estar entre 55 y 155." };
    barras.push({
      genero: b?.genero === "f" ? "f" : "m", nombre: nb, rating: Math.round(rating * 10) / 10, slope,
      par: par.reduce((a: number, x: number) => a + x, 0), hoyos: n,
      metros: metros !== null && metros >= 300 && metros <= 8000 ? Math.round(metros) : null,
      par_hoyos: par, hcp_hoyos: hcp,
    });
  }
  if (!barras.length) return { error: "Pon al menos una barra con su rating y su slope." };
  const lat = num(c?.lat), lon = num(c?.lon);
  const slopes = barras.map((b) => b.slope);
  return {
    fila: {
      id: "tarjeta:" + crypto.randomUUID(), fuente: "tarjeta", externo_id: null, club: nombre, nombre, direccion: null,
      ciudad: txt(c?.ciudad), region: txt(c?.region), pais: txt(c?.pais) || "España",
      lat: lat !== null && Math.abs(lat) <= 90 ? lat : null, lon: lon !== null && Math.abs(lon) <= 180 ? lon : null,
      barras, slope_min: Math.min(...slopes), slope_max: Math.max(...slopes), actualizado_en: new Date().toISOString(),
    },
  };
}

const deBase64 = (b: string) => Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0));

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta." }, 401);
  const yo = u.user.id;

  let cuerpo: any = {};
  try { cuerpo = await req.json(); } catch { return res({ error: "Petición no válida." }, 400); }
  const fotos = fotosDe(cuerpo?.fotos);

  try {
    if (cuerpo?.accion === "leer") {
      if (!fotos.length) return res({ error: "Falta la foto de la tarjeta." }, 400);
      const clave = (Deno.env.get("GEMINI_API_KEY") || "").trim();
      if (!clave) return res({ sinLector: true, aviso: "La lectura automática aún no está activada: escribe tú los datos mirando la foto." });
      const { data: hay } = await admin.rpc("campos_tarjeta_sumar", { p_user: yo, p_limite: LIMITE_PERSONA_DIA, p_total: LIMITE_TOTAL_DIA });
      if (!hay) return res({ sinLector: true, aviso: "Hoy ya has leído muchas tarjetas: escribe tú los datos mirando la foto." });
      const lectura = limpiarLectura(await preguntarGemini(fotos, clave));
      return res({ lectura });
    }

    if (cuerpo?.accion === "guardar") {
      const v = validarCampo(cuerpo?.campo);
      if (v.error) return res({ error: v.error }, 400);
      const { data: hay } = await admin.rpc("campos_tarjeta_sumar", { p_user: yo, p_limite: LIMITE_PERSONA_DIA * 2, p_total: LIMITE_TOTAL_DIA * 2 });
      if (!hay) return res({ error: "Hoy ya has guardado muchos campos. Prueba mañana." }, 429);
      const fila = v.fila;
      const { error } = await admin.from("campos_golf").insert(fila);
      if (error) { console.error("guardar campo", error); return res({ error: "No se ha podido guardar el campo." }, 500); }
      // Las fotos se guardan aparte (privadas) para poder revisar los datos más adelante
      const rutas: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        const ext = fotos[i].tipo.split("/")[1].replace("jpeg", "jpg");
        const ruta = `${fila.id.replace("tarjeta:", "")}/${i + 1}.${ext}`;
        const { error: ef } = await admin.storage.from("tarjetas").upload(ruta, deBase64(fotos[i].datos), { contentType: fotos[i].tipo, upsert: true });
        if (ef) console.error("subir foto", ef); else rutas.push(ruta);
      }
      await admin.from("campos_tarjetas").insert({ campo_id: fila.id, user_id: yo, fotos: rutas, leido: cuerpo?.leido && JSON.stringify(cuerpo.leido).length < 20000 ? cuerpo.leido : null });
      const { actualizado_en: _a, externo_id: _e, ...campo } = fila;
      return res({ campo });
    }

    return res({ error: "Acción no válida." }, 400);
  } catch (e) {
    const f = e instanceof Fallo ? e : new Fallo(500, "Algo ha fallado. Inténtalo otra vez.");
    if (!(e instanceof Fallo)) console.error(e);
    // Si no se puede leer, el jugador puede escribir los datos él mismo
    if (cuerpo?.accion === "leer") return res({ sinLector: true, aviso: f.message });
    return res({ error: f.message }, f.codigo);
  }
});
