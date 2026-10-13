// © 2026 Carlos Acedo Domínguez. acgolf · Función «avisar»
// Cuando alguien crea una partida, manda un correo a los demás de su grupo (a través de Brevo).
// - Solo funciona con una cuenta que haya entrado (se comprueba quién es con su sesión).
// - La base de datos comprueba que es del grupo de la partida y que no se ha avisado ya.
// - La clave de Brevo está guardada como secreto en Supabase (BREVO_API_KEY), nunca en la app.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const WEB = "https://acgolf.es/";
const ORIGENES = ["https://acgolf.es", "https://carlosacedo30.github.io"];
let CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGENES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function correo(a: any) {
  const enlace = WEB + "?partida=" + encodeURIComponent(a.code);
  const titulo = a.nombre || a.campo || "Nueva partida";
  const html = `<!doctype html><html><body style="margin:0;background:#f2f4f5;font-family:Arial,Helvetica,sans-serif;color:#111316">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#111316;border-radius:16px;padding:28px 22px;color:#F2F4F5">
<div style="font-size:13px;letter-spacing:2px;color:#C6F24E;font-weight:bold">${esc(a.grupo).toUpperCase()}</div>
<h1 style="font-size:26px;margin:10px 0 6px">Nueva partida</h1>
<p style="font-size:18px;line-height:1.5;margin:0 0 6px"><b>${esc(a.quien)}</b> ha creado la partida <b>${esc(titulo)}</b>${a.campo && a.nombre ? " en " + esc(a.campo) : ""}.</p>
<p style="font-size:17px;line-height:1.5;margin:0 0 22px;color:#B9C3CB">Toca el botón para abrirla y apuntar tus golpes.</p>
<a href="${enlace}" style="display:inline-block;background:#C6F24E;color:#111316;font-weight:bold;font-size:19px;text-decoration:none;padding:15px 26px;border-radius:12px">Abrir la partida</a>
</div>
<p style="font-size:13px;line-height:1.5;color:#5b636b;margin:16px 4px">Te llega porque eres de «${esc(a.grupo)}» en acgolf. Si no quieres estos avisos, entra en la app, toca tu nombre arriba y quita «Avisos por correo».</p>
</div></body></html>`;
  const texto = `${a.quien} ha creado la partida ${titulo} en «${a.grupo}».\nÁbrela aquí: ${enlace}\n\nSi no quieres estos avisos: en la app, toca tu nombre arriba y quita «Avisos por correo».`;
  return { asunto: `Nueva partida en ${a.grupo}: ${titulo}`, html, texto };
}

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const brevo = Deno.env.get("BREVO_API_KEY");
  if (!brevo) return res({ error: "Falta la clave de Brevo" }, 500);

  // ¿Quién es? (con su propia sesión)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta" }, 401);

  let code = "", prueba = false, libre: any = null;
  try {
    const b = await req.json(); code = String(b.code || "").trim().toUpperCase(); prueba = b.prueba === true;
    if (b.libre === true) libre = { para: String(b.para || "").trim().toLowerCase(), asunto: String(b.asunto || "").trim(), texto: String(b.texto || "").trim() };
  } catch { /* sin cuerpo */ }

  // Correo libre desde avisos@acgolf.es: solo el super administrador (Panel de super administrador → «Enviar un correo»)
  if (libre) {
    const { data: s } = await admin.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!s) return res({ error: "Solo el super administrador" }, 403);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(libre.para)) return res({ error: "El correo del destinatario no es válido" }, 400);
    if (!libre.asunto || libre.asunto.length > 150) return res({ error: "Pon un asunto (como mucho 150 letras)" }, 400);
    if (!libre.texto || libre.texto.length > 5000) return res({ error: "Escribe el texto (como mucho 5000 letras)" }, 400);
    const cuerpo = esc(libre.texto).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#4A6A00;font-weight:bold">$1</a>').replace(/\n/g, "<br>");
    const html = `<!doctype html><html><body style="margin:0;background:#f2f4f5;font-family:Arial,Helvetica,sans-serif;color:#111316">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#111316;border-radius:16px 16px 0 0;padding:18px 22px;color:#C6F24E;font-weight:bold;font-size:20px;letter-spacing:1px">acgolf</div>
<div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 22px;font-size:17px;line-height:1.55">${cuerpo}</div>
<p style="font-size:13px;color:#5b636b;margin:14px 4px">acgolf · Golf entre amigos · <a href="https://acgolf.es" style="color:#5b636b">acgolf.es</a></p>
</div></body></html>`;
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "acgolf", email: "avisos@acgolf.es" }, replyTo: { email: "avisos@acgolf.es", name: "acgolf" },
        to: [{ email: libre.para }], subject: libre.asunto, htmlContent: html, textContent: libre.texto, tags: ["correo-libre"] }),
    });
    return res(r.ok ? { enviados: 1, a: libre.para } : { error: "Brevo " + r.status + ": " + (await r.text()).slice(0, 200) }, r.ok ? 200 : 502);
  }

  // Correo de prueba: solo el super administrador, y solo a sí mismo
  if (prueba) {
    const { data: s } = await admin.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!s) return res({ error: "Solo el super administrador" }, 403);
    code = "PRUEBA"; // para el enlace del ejemplo
    const m = correo({ code, grupo: "Prueba", quien: "acgolf", nombre: "Correo de prueba", campo: "" });
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "acgolf", email: "avisos@acgolf.es" }, to: [{ email: u.user.email }],
        subject: m.asunto, htmlContent: m.html, textContent: m.texto, tags: ["aviso-prueba"] }),
    });
    return res(r.ok ? { enviados: 1, a: u.user.email } : { error: "Brevo " + r.status + ": " + (await r.text()).slice(0, 200) }, r.ok ? 200 : 502);
  }
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return res({ error: "Falta el código de la partida" }, 400);

  const { data: a, error } = await admin.rpc("_aviso_partida", { p_user: u.user.id, p_code: code });
  if (error) return res({ error: error.message }, 400);
  if (a.repetido) return res({ enviados: 0, repetido: true });
  const para = (a.para || []) as { email: string; nombre: string }[];
  if (!para.length) return res({ enviados: 0 });

  const { asunto, html, texto } = correo(a);
  // Brevo: un mensaje por persona (nadie ve los correos de los demás), hasta 99 por envío
  const versiones = para.map((p) => ({ to: [{ email: p.email, name: p.nombre }] }));
  let enviados = 0;
  for (let i = 0; i < versiones.length; i += 99) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "acgolf", email: "avisos@acgolf.es" },
        subject: asunto, htmlContent: html, textContent: texto,
        messageVersions: versiones.slice(i, i + 99),
        tags: ["aviso-partida"],
      }),
    });
    if (r.ok) enviados += versiones.slice(i, i + 99).length;
    else console.error("Brevo", r.status, await r.text());
  }
  return res({ enviados, total: para.length });
});
