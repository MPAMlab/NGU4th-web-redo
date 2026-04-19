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
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    const kindeId = payload.sub;

    const user = await env.DB.prepare("SELECT * FROM ngu4th_members WHERE kinde_id = ?")
      .bind(kindeId)
      .first();

    const achievements = await env.DB.prepare(`
      SELECT a.* FROM ngu4th_achievements a
      JOIN ngu4th_user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.kinde_id = ?
    `).bind(kindeId).all();

    return new Response(JSON.stringify({ user, achievements: achievements.results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ user: null, error: "Invalid token" }), { status: 401 });
  }
};
