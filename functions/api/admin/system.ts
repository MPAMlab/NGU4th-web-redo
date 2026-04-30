export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (!match) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const idToken = match[1];
    let userId: string;
    
    try {
      const payloadPart = idToken.split(".")[1];
      // Robust Base64URL decoding with padding fix
      let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const payload = JSON.parse(atob(base64));
      userId = payload.sub;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid token format", details: (e as Error).message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing subject in token" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // 🛡️ Auth check: query internal DB
    let user: any;
    try {
      user = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
        .bind(userId)
        .first();
    } catch (dbErr) {
      return new Response(JSON.stringify({ error: "Database error during auth", details: (dbErr as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required", foundRole: user?.role }), { 
        status: 403, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (request.method === "GET") {
      const config = await env.DB.prepare("SELECT * FROM ngu4th_system_config").all();
      const games = await env.DB.prepare("SELECT * FROM ngu4th_games ORDER BY created_at DESC").all();
      
      const configMap = (config.results || []).reduce((acc: any, row: any) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      return new Response(JSON.stringify({ config: configMap, games: games.results }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const body = await request.json() as any;
      const { action, key, value, gameId, name, settings } = body;

      if (key && value !== undefined) {
        await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_config (key, value) VALUES (?, ?)")
          .bind(key, value === null ? null : value.toString()).run();
      }

      if (action === 'create_game') {
        await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE status = 'active'").run();
        await env.DB.prepare("INSERT INTO ngu4th_games (name, status) VALUES (?, 'active')").bind(name).run();
        await env.DB.prepare("UPDATE ngu4th_members SET is_registered = 0, team = NULL, team_order = 0, joker_card_id = NULL").run();
        await env.DB.prepare("DELETE FROM ngu4th_matches").run();
        await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_config (key, value) VALUES ('active_match_id', NULL)").run();
        await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_config (key, value) VALUES ('registration_open', 'true')").run();
      }

      if (action === 'archive_game') {
        await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE id = ?").bind(gameId).run();
      }

      if (action === 'update_settings') {
        const { location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards, red_exponent, blue_exponent } = settings;
        await env.DB.prepare(`
          UPDATE ngu4th_games 
          SET location = ?, description = ?, show_rules = ?, show_minigames = ?, show_stamps = ?, show_achievements = ?, show_cards = ?, red_exponent = ?, blue_exponent = ?
          WHERE id = ?
        `).bind(location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards, red_exponent || 1.0, blue_exponent || 1.0, gameId).run();
      }

      if (action === 'reset_all_achievements') {
        await env.DB.prepare(`
          DELETE FROM ngu4th_user_achievements 
          WHERE achievement_id IN (
            SELECT id FROM ngu4th_achievements 
            WHERE name NOT IN ('NGU传说的冒险者', 'NGU STAFF')
          )
        `).run();

        // Re-calculate for all members
        const { checkAchievements } = await import("../../../lib/achievements");
        const members = await env.DB.prepare("SELECT kinde_id FROM ngu4th_members").all();
        
        for (const m of (members.results || [])) {
          // Trigger various types to catch all possible triggers
          await checkAchievements(env.DB, m.kinde_id as string, { type: 'login' });
          await checkAchievements(env.DB, m.kinde_id as string, { type: 'registration' });
          await checkAchievements(env.DB, m.kinde_id as string, { type: 'team_join' });
          await checkAchievements(env.DB, m.kinde_id as string, { type: 'score' }); // Recalculate contribution
          await checkAchievements(env.DB, m.kinde_id as string, { type: 'stamp' }); // Recalculate stamp counts
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (globalErr) {
    return new Response(JSON.stringify({ 
      error: "Global server error", 
      message: (globalErr as Error).message,
      stack: (globalErr as Error).stack 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
