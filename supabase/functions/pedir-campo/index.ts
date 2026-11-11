// © 2026 Carlos Acedo Domínguez. acgolf · Función «pedir-campo»
// Cuando alguien no encuentra su campo habitual y marca la casilla de prioridad,
// manda un correo a avisos@acgolf.es (a través de Brevo) para grabar ese campo cuanto antes.
// - Solo funciona con una cuenta que haya entrado.
// - Una misma persona solo puede pedir el mismo campo una vez al día (se apunta en campos_busquedas).
// - La clave de Brevo está guardada como secreto en Supabase (BREVO_API_KEY), nunca en la app.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const ORIGENES = ["https://acgolf.es", "https://carlosacedo30.github.io"];
let CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGENES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const brevo = Deno.env.get("BREVO_API_KEY");
  if (!brevo) return res({ error: "Falta la clave de Brevo." }, 500);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta." }, 401);

  let b: any = {};
  try { b = await req.json(); } catch { /* sin cuerpo */ }
  const nombre = limpio(b.nombre, 80), pueblo = limpio(b.pueblo, 60), provincia = limpio(b.provincia, 40);
  if (b.prioridad !== true) return res({ error: "Falta marcar la casilla." }, 400);
  if (nombre.length < 3) return res({ error: "Escribe el nombre del campo." }, 400);
  if (!provincia) return res({ error: "Elige la provincia." }, 400);

  // Una vez al día por persona y campo
  const hoy = new Date().toISOString().slice(0, 10);
  const marca = `pedido:${u.user.id}:${sinAcentos(nombre)}:${hoy}`.slice(0, 200);
  const { data: ya } = await admin.from("campos_busquedas").select("termino").eq("termino", marca).maybeSingle();
  if (ya) return res({ ok: true, repetido: true });

  const quien = limpio(u.user.user_metadata?.full_name || u.user.user_metadata?.name || "", 80) || "(sin nombre)";
  const correo = u.user.email || "";
  const html = `<!doctype html><html><body style="margin:0;background:#f2f4f5;font-family:Arial,Helvetica,sans-serif;color:#111316">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#111316;border-radius:16px;padding:26px 22px;color:#F2F4F5">
<div style="font-size:13px;letter-spacing:2px;color:#C6F24E;font-weight:bold">CAMPO PEDIDO CON PRIORIDAD</div>
<h1 style="font-size:24px;margin:10px 0 14px">${esc(nombre)}</h1>
<p style="font-size:18px;line-height:1.6;margin:0 0 6px"><b>Pueblo:</b> ${esc(pueblo || "(no lo ha puesto)")}</p>
<p style="font-size:18px;line-height:1.6;margin:0 0 6px"><b>Provincia:</b> ${esc(provincia)}</p>
<p style="font-size:18px;line-height:1.6;margin:14px 0 6px"><b>Lo pide:</b> ${esc(quien)}</p>
<p style="font-size:18px;line-height:1.6;margin:0 0 6px"><b>Correo:</b> ${esc(correo)}</p>
<p style="font-size:16px;line-height:1.5;margin:16px 0 0;color:#B9C3CB">Ha marcado la casilla para que se grabe con prioridad y se le avise cuando esté listo. Puedes contestar a este correo para hablar con esa persona.</p>
</div></div></body></html>`;
  const texto = `Campo pedido con prioridad: ${nombre}\nPueblo: ${pueblo || "(no lo ha puesto)"}\nProvincia: ${provincia}\nLo pide: ${quien} (${correo})\nHa pedido que se le avise cuando esté listo.`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "acgolf", email: "avisos@acgolf.es" },
      to: [{ email: "avisos@acgolf.es", name: "acgolf" }],
      ...(correo ? { replyTo: { email: correo, name: quien } } : {}),
      subject: `Piden un campo: ${nombre} (${provincia})`,
      htmlContent: html, textContent: texto, tags: ["campo-pedido"],
    }),
  });
  if (!r.ok) { console.error("Brevo", r.status, await r.text()); return res({ error: "No se pudo enviar el aviso. Inténtalo más tarde." }, 502); }
  await admin.from("campos_busquedas").upsert({ termino: marca, resultados: 0, hecha_en: new Date().toISOString() });
  return res({ ok: true });
});
