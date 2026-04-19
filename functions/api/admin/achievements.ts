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
    const templates = await env.DB.prepare("SELECT * FROM ngu4th_achievements ORDER BY id ASC").all();
    const members = await env.DB.prepare("SELECT kinde_id, username, email FROM ngu4th_members").all();
    const userAchievements = await env.DB.prepare(`
        SELECT ua.id as instance_id, ua.kinde_id, ua.achievement_id, ua.earned_at
        FROM ngu4th_user_achievements ua
    `).all();

    return new Response(JSON.stringify({ 
      templates: templates.results, 
      members: members.results,
      userAchievements: userAchievements.results
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const body = await request.json() as any;
    const { action, targetKindeId, achievementId, instanceId, name, condition, scene, notes } = body;
    
    if (action === 'grant') {
      await env.DB.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
        .bind(targetKindeId, achievementId).run();
    } else if (action === 'revoke') {
      if (instanceId) {
        await env.DB.prepare("DELETE FROM ngu4th_user_achievements WHERE id = ?").bind(instanceId).run();
      } else {
        await env.DB.prepare("DELETE FROM ngu4th_user_achievements WHERE kinde_id = ? AND achievement_id = ?")
          .bind(targetKindeId, achievementId).run();
      }
    } else if (action === 'create_template') {
      await env.DB.prepare("INSERT INTO ngu4th_achievements (name, condition, scene, notes) VALUES (?, ?, ?, ?)")
        .bind(name, condition, scene, notes).run();
    } else if (action === 'update_template') {
      await env.DB.prepare("UPDATE ngu4th_achievements SET name = ?, condition = ?, scene = ?, notes = ? WHERE id = ?")
        .bind(name, condition, scene, notes, achievementId).run();
    } else if (action === 'delete_template') {
      // Also delete associations
      await env.DB.prepare("DELETE FROM ngu4th_user_achievements WHERE achievement_id = ?").bind(achievementId).run();
      await env.DB.prepare("DELETE FROM ngu4th_achievements WHERE id = ?").bind(achievementId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
