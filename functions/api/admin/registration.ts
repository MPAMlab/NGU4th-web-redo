import { checkAchievements } from "../../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const idToken = match[1];
    const payloadPart = idToken.split(".")[1];
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) { base64 += '='; }
    const payload = JSON.parse(atob(base64));
    const userId = payload.sub;

    const user: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?").bind(userId).first();
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "GET") {
      const members = await env.DB.prepare("SELECT * FROM ngu4th_members ORDER BY team DESC, team_order ASC").all();
      return new Response(JSON.stringify(members.results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const { targetKindeId, action, team, jokerCardId, mapping } = await request.json() as any;
      
      if (action === 'set_team') {
        await env.DB.prepare("UPDATE ngu4th_members SET team = ?, is_registered = 1 WHERE kinde_id = ?")
          .bind(team, targetKindeId).run();
        // HOOK: Check achievements for team join
        try {
          await checkAchievements(env.DB, targetKindeId, { type: 'team_join' });
        } catch (achErr) {
          console.error("Admin: checkAchievements failed:", achErr);
        }
      } else if (action === 'set_joker') {
        await env.DB.prepare("UPDATE ngu4th_members SET joker_card_id = ? WHERE kinde_id = ?")
          .bind(jokerCardId, targetKindeId).run();
      } else if (action === 'remove_registration') {
        await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 0, team = NULL WHERE kinde_id = ?")
          .bind(targetKindeId).run();
      } else if (action === 'reorder') {
        for (const item of mapping) {
          await env.DB.prepare("UPDATE ngu4th_members SET team_order = ? WHERE kinde_id = ?")
            .bind(item.order, item.id).run();
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Server Error", message: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
