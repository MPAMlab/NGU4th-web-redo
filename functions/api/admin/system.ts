export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  // Basic admin check via JWT
  try {
    const payload = JSON.parse(atob(match[1].split(".")[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'admin') return new Response("Forbidden", { status: 403 });
  } catch (e) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.method === "GET") {
    const config = await env.DB.prepare("SELECT * FROM ngu4th_system_config").all();
    const games = await env.DB.prepare("SELECT * FROM ngu4th_games ORDER BY created_at DESC").all();
    
    const configMap = config.results.reduce((acc: any, row: any) => {
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

    // Standard KV update
    if (key && value !== undefined) {
      await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_config (key, value) VALUES (?, ?)")
        .bind(key, value.toString()).run();
    }

    // Advanced Actions
    if (action === 'create_game') {
      // 1. Archive current active games
      await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE status = 'active'").run();
      
      // 2. Create new active game
      await env.DB.prepare("INSERT INTO ngu4th_games (name, status) VALUES (?, 'active')")
        .bind(name).run();

      // 3. NUCLEAR RESET: Clear player participation for the new round
      // We keep the accounts, but they must "re-register" for the new phase
      await env.DB.prepare(`
        UPDATE ngu4th_members 
        SET is_registered = 0, team = NULL, team_order = 0, joker_card_id = NULL
      `).run();

      // 4. Clear all match schedules as players/teams are reset
      await env.DB.prepare("DELETE FROM ngu4th_matches").run();
      
      // 5. Reset active match pointer
      await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_config (key, value) VALUES ('active_match_id', NULL)").run();
    }

    if (action === 'archive_game') {
      await env.DB.prepare("UPDATE ngu4th_games SET status = 'archived' WHERE id = ?").bind(gameId).run();
    }

    if (action === 'update_settings') {
      const { location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards } = settings;
      await env.DB.prepare(`
        UPDATE ngu4th_games 
        SET location = ?, description = ?, show_rules = ?, show_minigames = ?, show_stamps = ?, show_achievements = ?, show_cards = ?
        WHERE id = ?
      `).bind(location, description, show_rules, show_minigames, show_stamps, show_achievements, show_cards, gameId).run();
    }

    // NEW: Nuclear Achievement Reset
    if (action === 'reset_all_achievements') {
      // Delete all user achievements except 'registration' and 'legacy' types
      await env.DB.prepare(`
        DELETE FROM ngu4th_user_achievements 
        WHERE achievement_id IN (
          SELECT id FROM ngu4th_achievements 
          WHERE trigger_type NOT IN ('registration', 'legacy') OR trigger_type IS NULL
        )
      `).run();
    }

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response("Method not allowed", { status: 405 });
};
