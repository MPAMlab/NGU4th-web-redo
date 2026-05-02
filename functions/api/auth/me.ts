export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response(JSON.stringify({ user: null }), { 
    status: 200, 
    headers: { "Content-Type": "application/json" } 
  });

  const idToken = match[1];
  try {
    // 🛠️ Robust JWT Decoding with padding fix
    const payloadPart = idToken.split(".")[1];
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    const kindeId = payload.sub;

    let user: any = await env.DB.prepare("SELECT * FROM ngu4th_members WHERE kinde_id = ?")
      .bind(kindeId)
      .first();

    if (user && !user.avatar_url) {
      try {
        const legacy: any = await env.DB.prepare("SELECT avatar_url FROM members WHERE kinde_user_id = ? OR kinde_id = ?")
          .bind(kindeId, kindeId).first();
        if (legacy?.avatar_url) {
          await env.DB.prepare("UPDATE ngu4th_members SET avatar_url = ? WHERE kinde_id = ?")
            .bind(legacy.avatar_url, kindeId).run();
          user.avatar_url = legacy.avatar_url;
        }
      } catch (e) {
        // legacy table might not exist
      }
    }

    if (user) {
      const { checkAchievements } = await import("../../lib/achievements");
      await checkAchievements(env.DB, kindeId, { type: 'login' });

      // Fetch additional stats
      const contributionRes: any = await env.DB.prepare("SELECT SUM(total_score) as total FROM ngu4th_rounds WHERE player_id = ?")
        .bind(kindeId).first();
      user.contribution = contributionRes?.total || 0;

      if (user.team) {
        const teamContributionRes: any = await env.DB.prepare("SELECT SUM(total_score) as total FROM ngu4th_rounds WHERE team = ?")
          .bind(user.team).first();
        user.team_contribution = teamContributionRes?.total || 0;
      } else {
        user.team_contribution = 0;
      }
    }

    const allAchievements = await env.DB.prepare(`
      SELECT a.*, (ua.achievement_id IS NOT NULL) as is_earned
      FROM ngu4th_achievements a
      LEFT JOIN ngu4th_user_achievements ua ON a.id = ua.achievement_id AND ua.kinde_id = ?
    `).bind(kindeId).all();

    return new Response(JSON.stringify({ user, achievements: allAchievements.results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ user: null, error: "Invalid token", details: (e as Error).message }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
};
