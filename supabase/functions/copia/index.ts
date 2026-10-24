// © 2026 Carlos Acedo Domínguez. acgolf · Función «copia»: copia de seguridad de toda la base de datos.
// - La llama la propia base de datos cada semana (pg_cron) con una clave guardada en _copia_clave.
// - Guarda un .zip en la carpeta privada «copias» de Supabase (se quedan las 12 últimas)
//   y manda el mismo .zip por correo a Carlos (a través de Brevo), para tener otra copia fuera.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";

const PARA = "carlosacedo30@gmail.com";
const GUARDAR = 12;
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

function base64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ¿La clave es la buena?
  const clave = req.headers.get("x-copia") || "";
  const { data: k } = await admin.from("_copia_clave").select("clave").eq("id", 1).maybeSingle();
  if (!k || !clave || clave !== k.clave) return res({ error: "No autorizado" }, 401);

  const { data, error } = await admin.rpc("copia_seguridad");
  if (error) return res({ error: error.message }, 500);

  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `copia-acgolf-${fecha}.zip`;
  const zip = zipSync({
    [`copia-acgolf-${fecha}.json`]: strToU8(JSON.stringify(data, null, 1)),
    "LEEME.txt": strToU8(
      "Copia de seguridad de acgolf (" + fecha + ").\n" +
      "Dentro está todo: las tablas con sus filas (partidas, jugadores, grupos, liga, hándicaps…),\n" +
      "los usuarios (solo id y correo), las funciones y las reglas de la base de datos.\n" +
      "Guárdala. Si alguna vez hace falta, Claude puede recuperarlo todo con este archivo.\n"),
  }, { level: 9 });

  // 1) A la carpeta privada «copias»
  const sub = await admin.storage.from("copias").upload(nombre, zip, { contentType: "application/zip", upsert: true });
  let borradas = 0;
  const { data: lista } = await admin.storage.from("copias").list("", { limit: 200, sortBy: { column: "name", order: "desc" } });
  const viejas = (lista || []).filter((f) => f.name.startsWith("copia-acgolf-")).slice(GUARDAR).map((f) => f.name);
  if (viejas.length) { await admin.storage.from("copias").remove(viejas); borradas = viejas.length; }

  // 2) Por correo
  let correo = "sin clave de Brevo";
  const brevo = Deno.env.get("BREVO_API_KEY");
  if (brevo) {
    const t = (data as any)?.tablas || {};
    const n = (x: string) => Array.isArray(t[x]) ? t[x].length : 0;
    const texto = `Copia de seguridad semanal de acgolf (${fecha}).\n\nPartidas: ${n("rounds")} · Jugadores: ${n("perfiles")} · Grupos: ${n("grupos")}\n\nEl archivo adjunto lo tiene todo. Guárdalo: no hay que hacer nada más.`;
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "acgolf", email: "avisos@acgolf.es" }, to: [{ email: PARA, name: "Carlos" }],
        subject: `Copia de seguridad de acgolf · ${fecha}`,
        htmlContent: `<p style="font-family:Arial;font-size:17px">${texto.replace(/\n/g, "<br>")}</p>`, textContent: texto,
        attachment: [{ name: nombre, content: base64(zip) }], tags: ["copia-seguridad"],
      }),
    });
    correo = r.ok ? "enviado" : "Brevo " + r.status + ": " + (await r.text()).slice(0, 200);
  }
  return res({ ok: !sub.error, archivo: nombre, kb: Math.round(zip.length / 1024), carpeta: sub.error ? sub.error.message : "guardado", borradas, correo });
});
