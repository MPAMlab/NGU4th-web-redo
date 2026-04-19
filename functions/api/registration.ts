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
    const member = await env.DB.prepare("SELECT * FROM ngu4th_members WHERE kinde_id = ?")
      .bind(kindeId).first();
    return new Response(JSON.stringify(member), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { action } = await request.json() as { action: string };
    
    if (action === "register") {
      await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 1 WHERE kinde_id = ?")
        .bind(kindeId).run();
      // HOOK: Check achievements for registration
      await checkAchievements(env.DB, kindeId, { type: 'registration' });
    } else if (action === "cancel") {
      await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 0, team = NULL WHERE kinde_id = ?")
        .bind(kindeId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
