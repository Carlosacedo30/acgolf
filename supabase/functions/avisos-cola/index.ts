// © 2026 Carlos Acedo Domínguez. acgolf · Función «avisos-cola»
// Manda los avisos al móvil que están en la cola (recordatorios, ganador de la semana, hándicap, avisos aplazados de noche).
// - La lanza la base de datos cada minuto (pg_cron → _lanzar_avisos) con una llave propia (cabecera x-avisos).
// - La propia base de datos comprueba la llave en _cola_tomar; sin la llave correcta no devuelve nada.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

const WEB = "https://acgolf.es/";
const VAPID_PUBLICA = "BBAJE9Q8buIbOXVbOvfYsizs9nDzgqnz9J05v8KCkncx96wE1rXcVzgHp1d_qAaFA0Ap531_a-4x1YlQsROwPIg";
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

type Movil = { endpoint: string; p256dh: string; auth: string };
type Aviso = { titulo: string; texto: string; ruta: string; etiqueta: string | null; moviles: Movil[] };

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Solo POST" }, 405);
  const clave = req.headers.get("x-avisos") || "";
  if (!clave) return json({ error: "No autorizado" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: lista, error } = await admin.rpc("_cola_tomar", { p_clave: clave });
  if (error) return json({ error: error.message }, 401);
  const avisos = (lista || []) as Aviso[];
  if (!avisos.length) return json({ enviados: 0 });

  const { data: privada } = await admin.rpc("_vapid_privada");
  if (!privada) return json({ error: "Falta la llave de avisos" }, 500);
  webpush.setVapidDetails("mailto:avisos@acgolf.es", VAPID_PUBLICA, privada as string);

  let enviados = 0;
  const muertos = new Set<string>();
  await Promise.all(avisos.flatMap((a) => (a.moviles || []).map(async (m) => {
    const cuerpo = JSON.stringify({ titulo: a.titulo, texto: a.texto, url: WEB + (a.ruta || ""), etiqueta: a.etiqueta || undefined });
    try {
      await webpush.sendNotification({ endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } }, cuerpo, { TTL: 60 * 60 * 12, urgency: "normal" });
      enviados++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) muertos.add(m.endpoint);   // móvil que ya no acepta avisos
      else console.error("Aviso no enviado", e?.statusCode, e?.body || e?.message);
    }
  })));
  if (muertos.size) await admin.from("avisos_movil").delete().in("endpoint", [...muertos]);
  return json({ enviados, avisos: avisos.length });
});
