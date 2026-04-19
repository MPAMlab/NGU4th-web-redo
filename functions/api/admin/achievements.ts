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
  const user: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
    .bind(adminId).first();
  if (user?.role !== 'admin') return new Response("Forbidden", { status: 403 });

  if (request.method === "GET") {
    // List all achievements, users, and mappings
    const achievements = await env.DB.prepare("SELECT * FROM ngu4th_achievements").all();
    const members = await env.DB.prepare("SELECT kinde_id, username, email FROM ngu4th_members").all();
    const userAchievements = await env.DB.prepare("SELECT kinde_id, achievement_id FROM ngu4th_user_achievements").all();
    
    return new Response(JSON.stringify({ 
      achievements: achievements.results, 
      members: members.results,
      userAchievements: userAchievements.results
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { targetKindeId, achievementId, action } = await request.json() as any;
    
    if (action === 'grant') {
      await env.DB.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id, granted_by) VALUES (?, ?, ?)")
        .bind(targetKindeId, achievementId, adminId).run();
    } else if (action === 'revoke') {
      await env.DB.prepare("DELETE FROM ngu4th_user_achievements WHERE kinde_id = ? AND achievement_id = ?")
        .bind(targetKindeId, achievementId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
