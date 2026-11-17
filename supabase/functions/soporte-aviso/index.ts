// © 2026 Carlos Acedo Domínguez. acgolf · Función «soporte-aviso»
// Cuando alguien escribe en el soporte de la app, avisa por correo (desde avisos@acgolf.es, a través de Brevo) al super administrador.
// · La puede llamar cualquier persona con sesión; manda el aviso por ella (solo del último mensaje que ELLA escribió).
// · Para no llenar el correo: si esa persona ya escribió otro mensaje en los últimos 10 minutos, no se manda otro aviso.
// · No lleva el mensaje entero de forma peligrosa: se limpia y se recorta a 300 letras.
// · La clave de Brevo es un secreto de Supabase (BREVO_API_KEY). En la base de pruebas no hay clave: no se manda nada y no pasa nada.
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

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const brevo = Deno.env.get("BREVO_API_KEY");
  if (!brevo) return res({ enviados: 0, motivo: "sin clave de correo" });   // pruebas: nada que mandar
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta" }, 401);
  const uid = u.user.id;
  const cuerpo = await req.json().catch(() => ({}));

  // ---- Aviso A LA PERSONA cuando el soporte (super administrador) le escribe primero. Sin nombre ni teléfono de Carlos: firma «soporte de acgolf». ----
  if (cuerpo && cuerpo.para) {
    const { data: esSa } = await admin.from("super_admins").select("user_id").eq("user_id", uid).maybeSingle();
    if (!esSa) return res({ error: "Solo el soporte puede avisar a una persona" }, 403);
    const destino = String(cuerpo.para);
    const { data: mm } = await admin.from("soporte_mensajes").select("texto, creado_en, leido_usuario")
      .eq("user_id", destino).eq("de_soporte", true).order("id", { ascending: false }).limit(2);
    if (!mm || !mm.length) return res({ enviados: 0 });
    if (mm.length > 1 && !mm[1].leido_usuario && Date.now() - new Date(mm[1].creado_en).getTime() < 10 * 60 * 1000) return res({ enviados: 0, motivo: "ya se avisó hace poco" });
    const { data: du } = await admin.auth.admin.getUserById(destino);
    const correo = du?.user?.email; if (!correo) return res({ enviados: 0 });
    const { data: pp } = await admin.from("perfiles").select("player_name").eq("user_id", destino).maybeSingle();
    const primero = String(pp?.player_name || du?.user?.user_metadata?.nombre || "").trim().split(/\s+/)[0].replace(/,$/, "").slice(0, 40);
    const msg = String(mm[0].texto || "").slice(0, 300);
    const html2 = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f1ea;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0b3d20;color:#c6f04a;padding:16px 24px;font-size:18px;font-weight:bold;">💬 El soporte de acgolf te ha escrito</td></tr>
<tr><td style="padding:22px 24px 6px 24px;font-size:20px;color:#222;">${primero ? "Hola, <b>" + esc(primero) + "</b>:" : "Hola:"}</td></tr>
<tr><td style="padding:6px 24px 6px 24px;"><div style="background:#eef3ea;border-radius:12px;padding:14px 16px;font-size:19px;line-height:1.45;color:#111;">${esc(msg).replace(/\n/g, "<br>")}</div></td></tr>
<tr><td align="center" style="padding:18px 24px 8px 24px;"><a href="https://acgolf.es" style="display:inline-block;background:#0b3d20;color:#c6f04a;font-size:21px;font-weight:bold;text-decoration:none;padding:14px 30px;border-radius:999px;">Abrir acgolf</a></td></tr>
<tr><td style="padding:6px 24px 22px 24px;font-size:16px;line-height:1.5;color:#555;text-align:center;">Entra en acgolf con tu cuenta: verás un aviso <b>«acgolf te ha escrito»</b> con el botón <b>«Ver el mensaje»</b>. Ahí nos puedes contestar.</td></tr>
</table></td></tr></table></body></html>`;
    const r2 = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Soporte acgolf", email: "avisos@acgolf.es" }, to: [{ email: correo }], subject: "💬 El soporte de acgolf te ha escrito",
        htmlContent: html2, textContent: (primero ? "Hola, " + primero + ":\n\n" : "Hola:\n\n") + msg + "\n\nEntra en acgolf con tu cuenta (https://acgolf.es): verás un aviso «acgolf te ha escrito» con el botón «Ver el mensaje». Ahí nos puedes contestar.", tags: ["soporte-a-persona"] }) });
    if (!r2.ok) { console.error("Brevo", r2.status, await r2.text()); return res({ error: "No se pudo mandar el aviso" }, 502); }
    return res({ enviados: 1 });
  }

  // Últimos mensajes de ESTA persona (los que escribió ella)
  const { data: ms } = await admin.from("soporte_mensajes").select("texto, creado_en")
    .eq("user_id", uid).eq("de_soporte", false).order("id", { ascending: false }).limit(2);
  if (!ms || !ms.length) return res({ enviados: 0 });
  if (ms.length > 1 && Date.now() - new Date(ms[1].creado_en).getTime() < 10 * 60 * 1000) return res({ enviados: 0, motivo: "ya se avisó hace poco" });

  const { data: p } = await admin.from("perfiles").select("player_name").eq("user_id", uid).maybeSingle();
  const nombre = (p?.player_name || u.user.user_metadata?.nombre || (u.user.email || "").split("@")[0] || "Alguien").toString().slice(0, 80);
  const texto = String(ms[0].texto || "").slice(0, 300);

  const { data: sa } = await admin.from("super_admins").select("user_id");
  const ids = (sa || []).map((x: any) => x.user_id);
  const para: { email: string }[] = [];
  for (const id of ids) { const { data: au } = await admin.auth.admin.getUserById(id); if (au?.user?.email) para.push({ email: au.user.email }); }
  if (!para.length) return res({ enviados: 0 });

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f1ea;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0b3d20;color:#c6f04a;padding:16px 24px;font-size:18px;font-weight:bold;">💬 Mensaje nuevo en el soporte de acgolf</td></tr>
<tr><td style="padding:22px 24px 6px 24px;font-size:20px;color:#222;"><b>${esc(nombre)}</b> te ha escrito:</td></tr>
<tr><td style="padding:6px 24px 6px 24px;"><div style="background:#eef3ea;border-radius:12px;padding:14px 16px;font-size:19px;line-height:1.45;color:#111;">${esc(texto).replace(/\n/g, "<br>")}</div></td></tr>
<tr><td align="center" style="padding:18px 24px 8px 24px;"><a href="https://acgolf.es" style="display:inline-block;background:#0b3d20;color:#c6f04a;font-size:21px;font-weight:bold;text-decoration:none;padding:14px 30px;border-radius:999px;">Contestar en la app</a></td></tr>
<tr><td style="padding:6px 24px 22px 24px;font-size:15px;line-height:1.5;color:#555;text-align:center;">Entra en acgolf → Mi cuenta → Panel general → <b>Mensajes de soporte</b>. La respuesta se escribe en la app y la persona la ve en su chat.</td></tr>
</table></td></tr></table></body></html>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "acgolf", email: "avisos@acgolf.es" }, to: para, subject: "💬 " + nombre + " ha escrito en el soporte de acgolf",
      htmlContent: html, textContent: nombre + " te ha escrito en el soporte de acgolf:\n\n" + texto + "\n\nContesta en la app: https://acgolf.es (Mi cuenta → Panel general → Mensajes de soporte).", tags: ["soporte-aviso"] }) });
  if (!r.ok) { console.error("Brevo", r.status, await r.text()); return res({ error: "No se pudo mandar el aviso" }, 502); }
  return res({ enviados: para.length });
});
