// © 2026 Carlos Acedo Domínguez. acgolf · Función «avisar-movil»
// Manda avisos al móvil (notificaciones) a los jugadores que los han activado.
// - { code }: partida nueva → avisa a los apuntados en esa partida (menos a quien la crea), una sola vez.
// - { prueba: true }: aviso de prueba, solo el super administrador y solo a sus propios móviles.
// - { redes: true }: invita a seguir las redes, solo el super administrador y a TODOS los móviles con avisos activados.
// - La llave privada está en el Vault de Supabase («vapid_privada»), nunca en la app ni en el código.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

const WEB = "https://acgolf.es/";
const VAPID_PUBLICA = "BBAJE9Q8buIbOXVbOvfYsizs9nDzgqnz9J05v8KCkncx96wE1rXcVzgHp1d_qAaFA0Ap531_a-4x1YlQsROwPIg";
const ORIGENES = ["https://acgolf.es", "https://carlosacedo30.github.io"];
let CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGENES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const res = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Movil = { endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  const origen = req.headers.get("Origin") || "";
  CORS = { ...CORS, "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0] };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return res({ error: "Solo POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return res({ error: "Tienes que entrar con tu cuenta" }, 401);

  let code = "", prueba = false, redes = false, volver = WEB;
  try {
    const b = await req.json();
    code = String(b.code || "").trim().toUpperCase(); prueba = b.prueba === true; redes = b.redes === true;
    // Al tocar el aviso se abre la misma app desde la que se pidió (acgolf.es o pruebas)
    if (typeof b.web === "string" && /^https:\/\/(acgolf\.es|carlosacedo30\.github\.io\/acgolf\/pruebas)\//.test(b.web)) volver = b.web;
  } catch { /* sin cuerpo */ }

  const { data: privada } = await admin.rpc("_vapid_privada");
  if (!privada) return res({ error: "Falta la llave de avisos" }, 500);
  webpush.setVapidDetails("mailto:avisos@acgolf.es", VAPID_PUBLICA, privada as string);

  let para: Movil[] = [], aviso: Record<string, unknown>;
  if (prueba) {
    const { data: s } = await admin.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!s) return res({ error: "Solo el super administrador" }, 403);
    const { data } = await admin.rpc("_moviles_de", { p_user: u.user.id });
    para = (data || []) as Movil[];
    aviso = { titulo: "⛳ acgolf", texto: "¡Funciona! Así te llegarán los avisos de tu grupo.", url: volver, etiqueta: "prueba" };
  } else if (redes) {
    const { data: s } = await admin.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!s) return res({ error: "Solo el super administrador" }, 403);
    const { data } = await admin.from("avisos_movil").select("endpoint,p256dh,auth");
    para = (data || []) as Movil[];
    aviso = {
      titulo: "⛳ acgolf",
      texto: "¿Nos sigues en redes? Novedades, sorteos y vídeos de Lola y Curro. Toca para verlas.",
      url: volver + "?redes=1",
      etiqueta: "redes",
    };
  } else {
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return res({ error: "Falta el código de la partida" }, 400);
    const { data: a, error } = await admin.rpc("_aviso_movil", { p_user: u.user.id, p_code: code });
    if (error) return res({ error: error.message }, 400);
    if (a.repetido) return res({ enviados: 0, repetido: true });
    para = (a.para || []) as Movil[];
    const donde = a.campo ? " en " + a.campo : "";
    aviso = {
      titulo: "⛳ Nueva partida · " + a.grupo,
      texto: a.quien + " te ha apuntado en " + (a.nombre ? "«" + a.nombre + "»" : "una partida") + donde + ". Toca para abrirla.",
      url: volver + "?partida=" + encodeURIComponent(a.code),
      etiqueta: "partida-" + a.code,
    };
  }
  if (!para.length) return res({ enviados: 0 });

  let enviados = 0;
  const cuerpo = JSON.stringify(aviso);
  await Promise.all(para.map(async (m) => {
    try {
      await webpush.sendNotification({ endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } }, cuerpo, { TTL: 60 * 60 * 12, urgency: "high" });
      enviados++;
      await admin.from("avisos_movil").update({ ultimo_ok: new Date().toISOString() }).eq("endpoint", m.endpoint);
    } catch (e: any) {
      // El móvil ya no acepta avisos (app borrada o permiso quitado): se olvida
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("avisos_movil").delete().eq("endpoint", m.endpoint);
      else console.error("Aviso no enviado", e?.statusCode, e?.body || e?.message);
    }
  }));
  return res({ enviados, total: para.length });
});
