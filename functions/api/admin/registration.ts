import { checkAchievements } from "../../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let adminId: string;
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    adminId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  // Verify admin role
  const adminUser: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
    .bind(adminId).first();
  if (adminUser?.role !== 'admin') return new Response("Forbidden", { status: 403 });

  if (request.method === "GET") {
    const members = await env.DB.prepare("SELECT * FROM ngu4th_members ORDER BY team DESC, team_order ASC").all();
    return new Response(JSON.stringify(members.results), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { targetKindeId, action, team, jokerCardId, mapping } = await request.json() as any;
    
    if (action === 'set_team') {
      await env.DB.prepare("UPDATE ngu4th_members SET team = ? WHERE kinde_id = ?")
        .bind(team, targetKindeId).run();
      // HOOK: Check achievements for team join
      await checkAchievements(env.DB, targetKindeId, { type: 'team_join' });
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

  return new Response("Method not allowed", { status: 405 });
};
