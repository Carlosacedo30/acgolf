// © 2026 Carlos Acedo Domínguez. acgolf · Función «promocion»
// Correos de promoción desde avisos@acgolf.es (a través de Brevo). Solo el súper administrador.
// - accion «ver»: devuelve el correo ya dibujado (para verlo en pantalla antes de enviar).
// - accion «prueba»: manda el correo solo al propio súper administrador.
// - accion «enviar»: manda un mensaje distinto a cada persona (nadie ve los correos de los demás).
//   Alcance: «todos», «grupo» (con grupo) o «persona» (con para). Se salta a quien apagó «Novedades de acgolf».
//   Antes de enviar a varias personas hay que confirmar el número exacto que se enseñó en pantalla (confirmo).
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
const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const urlOk = (v: unknown) => { const s = String(v ?? "").trim(); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ""; };

// El diseño profesional de acgolf, igual para todas las promociones: lo que cambia es el contenido.
function correo(p: any) {
  const ventajas: string[] = (p.ventajas || []).map((x: unknown) => txt(x, 200)).filter(Boolean).slice(0, 10);
  const t = p.tarjeta;
  const filas = t && Array.isArray(t.filas) ? t.filas.slice(0, 8) : [];
  const tarjeta = t && txt(t.titulo, 120) ? `<tr><td style="padding:16px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f1;border:2px solid #0b3d20;border-radius:12px;">
<tr><td style="padding:18px 18px 6px 18px;"><div style="font-size:14px;color:#555;text-transform:uppercase;letter-spacing:1px;">${esc(txt(t.etiqueta, 60))}</div>
<div style="font-size:22px;font-weight:bold;color:#0b3d20;margin-top:4px;">${esc(txt(t.titulo, 120))}</div>
<div style="font-size:17px;color:#333;margin-top:4px;">${esc(txt(t.subtitulo, 160))}</div></td></tr>
${filas.length ? `<tr><td style="padding:10px 18px 18px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:19px;">${filas.map((f: any[], i: number) =>
  `<tr${i === 0 ? ' style="background:#c6f04a;"' : ""}><td style="padding:12px 10px;font-weight:bold;width:44px;${i ? "border-top:1px solid #d5d9d2;" : ""}">${esc(txt(f[0], 20))}</td>
<td style="padding:12px 6px;${i === 0 ? "font-weight:bold;" : ""}${i ? "border-top:1px solid #d5d9d2;" : ""}">${esc(txt(f[1], 60))}</td>
<td style="padding:12px 6px;text-align:right;color:#333;${i ? "border-top:1px solid #d5d9d2;" : ""}">${esc(txt(f[2], 40))}</td>
<td style="padding:12px 10px;text-align:right;font-weight:bold;${i ? "border-top:1px solid #d5d9d2;" : ""}">${esc(txt(f[3], 40))}</td></tr>`).join("")}</table>
${txt(t.nota, 200) ? `<div style="font-size:15px;color:#555;margin-top:10px;">${esc(txt(t.nota, 200))}</div>` : ""}</td></tr>` : ""}
</table></td></tr>` : "";
  const img = urlOk(p.imagen_url) ? `<tr><td style="padding:8px 24px 0 24px;"><img src="${esc(urlOk(p.imagen_url))}" alt="" width="100%" style="display:block;border-radius:12px;width:100%;height:auto;"></td></tr>` : "";
  const boton = urlOk(p.boton_url) && txt(p.boton_texto, 60)
    ? `<tr><td align="center" style="padding:28px 24px 8px 24px;"><a href="${esc(urlOk(p.boton_url))}" style="display:inline-block;background:#0b3d20;color:#c6f04a;font-size:22px;font-weight:bold;text-decoration:none;padding:18px 36px;border-radius:12px;">${esc(txt(p.boton_texto, 60))}</a></td></tr>` : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;"><tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0b3d20;padding:28px 24px;text-align:center;"><div style="font-size:34px;font-weight:bold;color:#c6f04a;letter-spacing:1px;">acgolf</div><div style="font-size:18px;color:#ffffff;margin-top:8px;">La app de golf para jugar entre amigos</div></td></tr>
<tr><td style="padding:28px 24px 8px 24px;"><div style="font-size:26px;font-weight:bold;line-height:1.25;color:#0b3d20;">${esc(txt(p.titulo, 140))}</div>
${txt(p.intro, 600) ? `<div style="font-size:19px;line-height:1.5;margin-top:12px;">${esc(txt(p.intro, 600))}</div>` : ""}</td></tr>
${img}${tarjeta}
${ventajas.length ? `<tr><td style="padding:8px 24px 0 24px;"><div style="font-size:22px;font-weight:bold;color:#0b3d20;">Con acgolf tienes:</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:19px;line-height:1.5;margin-top:8px;">${ventajas.map((v) => `<tr><td style="padding:6px 0;width:34px;color:#0b3d20;font-weight:bold;">✔</td><td style="padding:6px 0;">${esc(v)}</td></tr>`).join("")}</table></td></tr>` : ""}
${boton}
<tr><td style="padding:12px 24px 28px 24px;text-align:center;font-size:18px;line-height:1.5;color:#333;">Instálala en tu móvil y crea el grupo con tus amigos.</td></tr>
<tr><td style="background:#0b3d20;padding:18px 24px;text-align:center;font-size:15px;line-height:1.5;color:#ffffff;">acgolf · <a href="https://acgolf.es" style="color:#c6f04a;">acgolf.es</a><br>¿Dudas? Escríbenos a <a href="mailto:avisos@acgolf.es" style="color:#c6f04a;">avisos@acgolf.es</a><br>
<span style="font-size:13px;color:#cfd8d2;">Si no quieres recibir más novedades de acgolf, entra en la app, toca tu nombre y quita «Novedades de acgolf». O responde a este correo con la palabra BAJA.</span></td></tr>
</table></td></tr></table></body></html>`;
  const texto = [txt(p.titulo, 140), "", txt(p.intro, 600), "", ...ventajas.map((v) => "- " + v), "",
    urlOk(p.boton_url) ? txt(p.boton_texto, 60) + ": " + urlOk(p.boton_url) : "", "",
    "Si no quieres recibir más novedades de acgolf, entra en la app, toca tu nombre y quita «Novedades de acgolf». O responde a este correo con la palabra BAJA."].join("\n");
  return { html, texto };
}

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const brevo = Deno.env.get("BREVO_API_KEY");
  if (!brevo) return res({ error: "Falta la clave de Brevo" }, 500);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta" }, 401);
  const { data: s } = await admin.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
  if (!s) return res({ error: "Solo el super administrador" }, 403);

  let b: any = {};
  try { b = await req.json(); } catch { return res({ error: "Falta el contenido" }, 400); }
  const p = b.promo || {};
  const asunto = txt(p.asunto, 150), titulo = txt(p.titulo, 140);
  if (!asunto) return res({ error: "Pon un asunto" }, 400);
  if (!titulo) return res({ error: "Pon un título" }, 400);
  const { html, texto } = correo(p);
  const base = { sender: { name: "acgolf", email: "avisos@acgolf.es" }, replyTo: { email: "avisos@acgolf.es", name: "acgolf" },
    headers: { "List-Unsubscribe": "<mailto:avisos@acgolf.es?subject=BAJA>" } };
  const enviar = (cuerpo: unknown) => fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(cuerpo) });

  if (b.accion === "ver") return res({ html });   // solo para enseñar cómo queda en pantalla, no manda nada
  if (b.accion === "prueba") {
    const r = await enviar({ ...base, to: [{ email: u.user.email }], subject: "[Prueba] " + asunto, htmlContent: html, textContent: texto, tags: ["promo-prueba"] });
    return res(r.ok ? { enviados: 1, a: u.user.email } : { error: "Brevo " + r.status + ": " + (await r.text()).slice(0, 200) }, r.ok ? 200 : 502);
  }
  if (b.accion !== "enviar") return res({ error: "Acción no válida" }, 400);

  let para: { email: string; nombre: string }[] = [];
  const alcance = String(b.alcance || "");
  let grupo: string | null = null;
  if (alcance === "persona") {
    const e = String(b.para || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return res({ error: "El correo del destinatario no es válido" }, 400);
    para = [{ email: e, nombre: "" }];
  } else if (alcance === "todos" || alcance === "grupo") {
    if (alcance === "grupo") { grupo = String(b.grupo || ""); if (!/^[0-9a-f-]{36}$/.test(grupo)) return res({ error: "Falta el grupo" }, 400); }
    const { data, error } = await admin.rpc("_promo_para", { p_alcance: alcance, p_grupo: grupo });
    if (error) return res({ error: error.message }, 400);
    para = (data || []) as { email: string; nombre: string }[];
    // Solo se envía si el número coincide con el que se enseñó en pantalla
    if (Number(b.confirmo) !== para.length) return res({ error: "La lista ha cambiado (ahora son " + para.length + "). Vuelve a mirarla y confirma." }, 409);
  } else return res({ error: "Alcance no válido" }, 400);
  if (!para.length) return res({ enviados: 0 });

  let enviados = 0;
  for (let i = 0; i < para.length; i += 99) {
    const trozo = para.slice(i, i + 99);
    const r = await enviar({ ...base, subject: asunto, htmlContent: html, textContent: texto, tags: ["promocion"],
      messageVersions: trozo.map((x) => ({ to: [x.nombre ? { email: x.email, name: x.nombre } : { email: x.email }] })) });
    if (r.ok) enviados += trozo.length; else console.error("Brevo", r.status, await r.text());
  }
  await admin.from("promos_enviadas").insert({ promocion_id: /^[0-9a-f-]{36}$/.test(String(p.id || "")) ? p.id : null, asunto, alcance, grupo_id: grupo, correos: enviados, enviado_por: u.user.id });
  return res({ enviados, total: para.length });
});
