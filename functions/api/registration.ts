import { checkAchievements } from "../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (!match) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const idToken = match[1];
    let kindeId: string;
    try {
      const payloadPart = idToken.split(".")[1];
      let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const payload = JSON.parse(atob(base64));
      kindeId = payload.sub;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    if (request.method === "GET") {
      const member = await env.DB.prepare("SELECT * FROM ngu4th_members WHERE kinde_id = ?")
        .bind(kindeId).first();
      
      const roster = await env.DB.prepare("SELECT username, team FROM ngu4th_members WHERE is_registered = 1").all();

      return new Response(JSON.stringify({
        currentUser: member,
        publicRoster: roster.results || []
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const { action, team } = await request.json() as { action: string, team?: string };
      
      if (action === "register") {
        await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 1, team = ?, last_registered_at = CURRENT_TIMESTAMP WHERE kinde_id = ?")
          .bind(team || null, kindeId).run();
        
        // Use a safe achievement check that won't crash the registration flow
        try {
          await checkAchievements(env.DB, kindeId, { type: 'registration' });
          if (team) {
            await checkAchievements(env.DB, kindeId, { type: 'team_join' });
          }
        } catch (achErr) {
          console.error("Achievement hook failed but registration continued:", achErr);
        }
      } else if (action === "cancel") {
        await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 0, team = NULL WHERE kinde_id = ?")
          .bind(kindeId).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  } catch (globalErr: any) {
    return new Response(JSON.stringify({ error: "Registration Server Error", message: globalErr.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};
