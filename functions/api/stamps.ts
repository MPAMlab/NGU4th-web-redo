import { checkAchievements } from "../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let kindeId: string;
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    kindeId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  if (request.method === "GET") {
    const stamps = await env.DB.prepare(`
      SELECT s.created_at, m.username, m.role
      FROM ngu4th_stamps s
      JOIN ngu4th_members m ON s.scannee_id = m.kinde_id
      WHERE s.collector_id = ?
      ORDER BY s.created_at DESC
    `).bind(kindeId).all();

    return new Response(JSON.stringify(stamps.results || []), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { action, scanneeId } = await request.json() as any;
    
    if (action === 'collect') {
      if (!scanneeId) return new Response("Missing scanneeId", { status: 400 });
      if (scanneeId === kindeId) return new Response("Cannot scan yourself", { status: 400 });

      // Check if already collected
      const existing = await env.DB.prepare("SELECT id FROM ngu4th_stamps WHERE collector_id = ? AND scannee_id = ?")
        .bind(kindeId, scanneeId).first();
      
      if (!existing) {
        await env.DB.prepare("INSERT INTO ngu4th_stamps (collector_id, scannee_id) VALUES (?, ?)")
          .bind(kindeId, scanneeId).run();
        
        // HOOK: Check achievements for stamps
        await checkAchievements(env.DB, kindeId, { type: 'stamp' });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
