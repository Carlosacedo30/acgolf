// © 2026 Carlos Acedo Domínguez. acgolf · Función «campos»
// Busca campos de golf por texto (nombre del campo, club o ciudad) en GolfCourseAPI.
// - La clave de GolfCourseAPI va guardada como secreto en Supabase (GOLFCOURSE_API_KEY), nunca en la app.
// - Solo responde a cuentas que hayan entrado (para que nadie de fuera gaste las consultas).
// - Lo que llega se guarda en la tabla campos_golf: la misma búsqueda en 30 días no vuelve a gastar consulta,
//   y así la búsqueda «cerca de mí» (campos_cerca) tiene datos con coordenadas.
// - Lleva la cuenta de consultas del día y para antes de pasarse del plan (CAMPOS_LIMITE_DIA, 30 por defecto).
//
// Datos confirmados en la documentación de GolfCourseAPI (v1):
//   GET https://api.golfcourseapi.com/v1/search?search_query=<texto>   cabecera  Authorization: Key <clave>
//   Cada campo: id, club_name, course_name, location{address, city, state, country, latitude, longitude},
//   tees{ female[], male[] } y en cada barra: tee_name, course_rating, slope_rating, par_total,
//   number_of_holes, total_meters, total_yards.
// Si la búsqueda no trae las barras de algún campo, se piden con la ficha del campo (sección «Get golf course»
// de la documentación). La ruta de la ficha se comprueba con la primera llamada real: está en RUTA_FICHA.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const API = "https://api.golfcourseapi.com/v1";
const RUTA_FICHA = (id: number) => `${API}/courses/${id}`;
const DIAS_CACHE = 30;
const MAX_FICHAS = 3; // fichas extra por búsqueda como mucho (cada una gasta una consulta)
const ORIGENES = ["https://acgolf.es", "https://carlosacedo30.github.io"];

let CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGENES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------- Utilidades ----------
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 200) : null;
};

type Barra = { genero: "m" | "f"; nombre: string; rating: number | null; slope: number | null; par: number | null; hoyos: number | null; metros: number | null; par_hoyos?: number[]; hcp_hoyos?: number[] };

// Par y dificultad (hándicap) de cada hoyo, solo si vienen completos y tienen sentido (9 o 18 hoyos)
function hoyosDe(lista: unknown): { par_hoyos?: number[]; hcp_hoyos?: number[] } {
  if (!Array.isArray(lista) || (lista.length !== 9 && lista.length !== 18)) return {};
  const par = lista.map((h: any) => num(h?.par));
  if (par.some((p) => p === null || p < 3 || p > 6)) return {};
  const out: { par_hoyos?: number[]; hcp_hoyos?: number[] } = { par_hoyos: par as number[] };
  const hcp = lista.map((h: any) => num(h?.handicap));
  const n = lista.length;
  // La dificultad vale si es 1..n sin repetir (o 1..18 repartida en 9 hoyos)
  const enteros = hcp.every((x) => x !== null && Number.isInteger(x) && x >= 1 && x <= 18);
  if (enteros && new Set(hcp).size === n && (n === 18 ? Math.max(...(hcp as number[])) === 18 : true)) out.hcp_hoyos = hcp as number[];
  return out;
}

function barrasDe(tees: any): Barra[] {
  const out: Barra[] = [];
  const lado = (lista: unknown, genero: "m" | "f") => {
    if (!Array.isArray(lista)) return;
    for (const t of lista) {
      if (!t || typeof t !== "object") continue;
      const slope = num(t.slope_rating);
      out.push({
        genero,
        nombre: txt(t.tee_name) || "Barra",
        rating: num(t.course_rating),
        // el slope válido va de 55 a 155; si llega otra cosa, mejor no enseñarlo
        slope: slope !== null && slope >= 55 && slope <= 155 ? Math.round(slope) : null,
        par: num(t.par_total),
        hoyos: num(t.number_of_holes),
        metros: num(t.total_meters) ?? (num(t.total_yards) !== null ? Math.round(num(t.total_yards)! * 0.9144) : null),
        ...hoyosDe(t.holes),
      });
    }
  };
  lado(tees?.male, "m");
  lado(tees?.female, "f");
  return out;
}

function aFila(c: any) {
  const id = num(c?.id);
  if (id === null) return null;
  const club = txt(c.club_name);
  const curso = txt(c.course_name);
  const nombre = club && curso && sinAcentos(club) !== sinAcentos(curso) ? `${club} — ${curso}` : (curso || club);
  if (!nombre) return null;
  const loc = c.location || {};
  const barras = barrasDe(c.tees);
  const slopes = barras.map((b) => b.slope).filter((s): s is number => s !== null);
  const lat = num(loc.latitude), lon = num(loc.longitude);
  return {
    id: `gca:${id}`,
    fuente: "golfcourseapi",
    externo_id: id,
    club,
    nombre,
    direccion: txt(loc.address),
    ciudad: txt(loc.city),
    region: txt(loc.state),
    pais: txt(loc.country),
    lat: lat !== null && Math.abs(lat) <= 90 ? lat : null,
    lon: lon !== null && Math.abs(lon) <= 180 ? lon : null,
    barras,
    slope_min: slopes.length ? Math.min(...slopes) : null,
    slope_max: slopes.length ? Math.max(...slopes) : null,
    actualizado_en: new Date().toISOString(),
  };
}

class ErrorApi extends Error {
  constructor(public codigo: number, mensaje: string) { super(mensaje); }
}

async function pedir(url: string, clave: string) {
  const ctl = new AbortController();
  const reloj = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Key ${clave}`, Accept: "application/json" }, signal: ctl.signal });
    if (r.status === 401 || r.status === 403) throw new ErrorApi(502, "La clave de GolfCourseAPI no es válida.");
    if (r.status === 429) throw new ErrorApi(503, "Hoy ya no quedan búsquedas nuevas. Prueba mañana o busca entre los campos ya guardados.");
    if (r.status === 404) return null;
    if (!r.ok) throw new ErrorApi(502, "El servicio de campos no responde bien ahora mismo.");
    return await r.json();
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    if ((e as Error).name === "AbortError") throw new ErrorApi(504, "El servicio de campos tarda demasiado. Inténtalo otra vez.");
    throw new ErrorApi(502, "No se pudo conectar con el servicio de campos.");
  } finally {
    clearTimeout(reloj);
  }
}

// ---------- Servidor ----------
Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const clave = Deno.env.get("GOLFCOURSE_API_KEY");
  const limite = Math.max(1, parseInt(Deno.env.get("CAMPOS_LIMITE_DIA") || "30", 10) || 30);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ¿Quién es? (con su propia sesión)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta." }, 401);

  let texto = "";
  try { texto = String((await req.json())?.texto || "").trim().replace(/\s+/g, " "); } catch { /* sin cuerpo */ }
  if (texto.length < 3) return res({ error: "Escribe al menos 3 letras." }, 400);
  if (texto.length > 60) return res({ error: "El texto es demasiado largo." }, 400);
  const termino = sinAcentos(texto);

  // Lo que ya está guardado y coincide con el texto
  const guardados = async () => {
    const patron = "%" + termino.replace(/[%_\\]/g, (c) => "\\" + c) + "%";
    const { data } = await admin.from("campos_golf").select("id, fuente, club, nombre, direccion, ciudad, region, pais, lat, lon, barras, slope_min, slope_max")
      .ilike("texto_busqueda", patron).order("nombre").limit(40);
    return data || [];
  };

  // ¿Se buscó esto hace poco? Entonces no se gasta consulta
  const { data: prev } = await admin.from("campos_busquedas").select("hecha_en").eq("termino", termino).maybeSingle();
  const reciente = prev && Date.now() - new Date(prev.hecha_en).getTime() < DIAS_CACHE * 864e5;
  if (reciente || !clave) {
    const campos = await guardados();
    return res({ campos, origen: "guardados", aviso: !clave ? "Falta configurar la clave de GolfCourseAPI: solo se ven los campos ya guardados." : null });
  }

  try {
    const { data: hayCupo } = await admin.rpc("campos_api_sumar", { p_limite: limite });
    if (!hayCupo) throw new ErrorApi(503, "Hoy ya no quedan búsquedas nuevas. Prueba mañana o busca entre los campos ya guardados.");

    const cuerpo = await pedir(`${API}/search?search_query=${encodeURIComponent(texto)}`, clave);
    const lista: any[] = Array.isArray(cuerpo?.courses) ? cuerpo.courses : [];

    // Completar las barras que falten, con pocas fichas para no gastar
    let fichas = 0;
    for (let i = 0; i < lista.length && fichas < MAX_FICHAS; i++) {
      const c = lista[i];
      if (c?.tees && (Array.isArray(c.tees.male) || Array.isArray(c.tees.female))) continue;
      const id = num(c?.id);
      if (id === null) continue;
      const { data: ok } = await admin.rpc("campos_api_sumar", { p_limite: limite });
      if (!ok) break;
      fichas++;
      const f = await pedir(RUTA_FICHA(id), clave);
      const det = f?.course ?? f;
      if (det?.tees) lista[i] = { ...c, ...det };
    }

    const filas = lista.map(aFila).filter((f): f is NonNullable<ReturnType<typeof aFila>> => f !== null);
    if (filas.length) {
      const { error } = await admin.from("campos_golf").upsert(filas, { onConflict: "id" });
      if (error) console.error("guardar campos", error);
    }
    await admin.from("campos_busquedas").upsert({ termino, resultados: filas.length, hecha_en: new Date().toISOString() });

    return res({ campos: await guardados(), origen: "api" });
  } catch (e) {
    const err = e instanceof ErrorApi ? e : new ErrorApi(500, "Algo ha fallado al buscar campos.");
    if (!(e instanceof ErrorApi)) console.error(e);
    // Si falla la API pero hay campos guardados, se enseñan con un aviso
    const campos = await guardados();
    if (campos.length) return res({ campos, origen: "guardados", aviso: err.message });
    return res({ error: err.message }, err.codigo);
  }
});
