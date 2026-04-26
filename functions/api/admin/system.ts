export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const matchToken = cookieHeader.match(/auth_token=([^;]+)/);
  if (!matchToken) return new Response("Missing auth_token cookie", { status: 401 });

  const idToken = matchToken[1];
  let adminId: string;
  try {
    const payloadPart = idToken.split(".")[1];
    if (!payloadPart) throw new Error("Invalid JWT format");
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    adminId = payload.sub;
  } catch (e: any) {
    return new Response(`Invalid token: ${e.message}`, { status: 401 });
  }

  // Verify admin role for non-GET requests
  const adminUser: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
    .bind(adminId).first();
  
  if (request.method !== "GET" && adminUser?.role !== 'admin') {
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method === "GET") {
    const state = await env.DB.prepare("SELECT * FROM ngu4th_system_state").all();
    const games = await env.DB.prepare("SELECT * FROM ngu4th_games ORDER BY created_at DESC").all();
    
    // Map to simple object
    const config: any = {};
    state.results.forEach((s: any) => config[s.key] = s.value);

    return new Response(JSON.stringify({ config, games: games.results }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const body = await request.json() as any;
    const { key, value, action, name, gameId, settings } = body;
    
    if (action === 'create_game') {
      await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE status = 'active'").run();
      await env.DB.prepare("INSERT INTO ngu4th_games (name, status) VALUES (?, 'active')").bind(name).run();
      await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_state (key, value) VALUES ('active_match_id', NULL)").run();
    } else if (action === 'archive_game') {
      await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE id = ?").bind(gameId).run();
    } else if (action === 'update_settings') {
      const { location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards } = settings;
      await env.DB.prepare(`
        UPDATE ngu4th_games 
        SET location = ?, description = ?, show_rules = ?, show_minigames = ?, show_stamps = ?, show_achievements = ?, show_cards = ?
        WHERE id = ?
      `).bind(location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards, gameId).run();
    } else if (action === 'delete_game') {
      await env.DB.prepare("DELETE FROM ngu4th_games WHERE id = ?").bind(gameId).run();
    } else if (key) {
      await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_state (key, value) VALUES (?, ?)")
        .bind(key, value).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
