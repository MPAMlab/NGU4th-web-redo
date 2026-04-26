import { checkAchievements } from "../../lib/achievements";

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

  // Verify admin role
  const adminUser: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
    .bind(adminId).first();
  if (adminUser?.role !== 'admin') return new Response(`Forbidden: User role is ${adminUser?.role}`, { status: 403 });

  if (request.method === "GET") {
    // Fetch all minigames and their participant counts
    const games: any = await env.DB.prepare(`
      SELECT g.*, c.name as fake_card_name, 
             (SELECT COUNT(*) FROM ngu4th_minigame_participants WHERE minigame_id = g.id) as participant_count,
             w.username as winner_name
      FROM ngu4th_minigames g
      LEFT JOIN ngu4th_cards c ON g.fake_card_id = c.id
      LEFT JOIN ngu4th_members w ON g.winner_id = w.kinde_id
      ORDER BY g.created_at DESC
    `).all();

    // Fetch participants for all games
    const participants: any = await env.DB.prepare(`
      SELECT p.minigame_id, p.user_id, m.username, m.team
      FROM ngu4th_minigame_participants p
      JOIN ngu4th_members m ON p.user_id = m.kinde_id
    `).all();

    return new Response(JSON.stringify({ 
      games: games.results, 
      participants: participants.results 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const body = await request.json() as any;
    const { action, id, title, short_desc, detailed_desc, start_date, start_time, max_players, fake_card_id, achievement_id, winner_id } = body;
    
    if (action === 'create') {
      await env.DB.prepare(`
        INSERT INTO ngu4th_minigames (title, short_desc, detailed_desc, start_date, start_time, max_players, fake_card_id, achievement_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(title, short_desc, detailed_desc, start_date, start_time, max_players, fake_card_id, achievement_id).run();
    } else if (action === 'update') {
      await env.DB.prepare(`
        UPDATE ngu4th_minigames 
        SET title = ?, short_desc = ?, detailed_desc = ?, start_date = ?, start_time = ?, max_players = ?, fake_card_id = ?, achievement_id = ?
        WHERE id = ?
      `).bind(title, short_desc, detailed_desc, start_date, start_time, max_players, fake_card_id, achievement_id, id).run();
    } else if (action === 'start') {
      await env.DB.prepare("UPDATE ngu4th_minigames SET status = 'active' WHERE id = ?").bind(id).run();
    } else if (action === 'finish') {
      // 1. Update game status and winner
      await env.DB.prepare("UPDATE ngu4th_minigames SET status = 'finished', winner_id = ? WHERE id = ?")
        .bind(winner_id || null, id).run();

      // 2. If winner exists, grant rewards
      if (winner_id) {
        const winner: any = await env.DB.prepare("SELECT team FROM ngu4th_members WHERE kinde_id = ?").bind(winner_id).first();
        const game: any = await env.DB.prepare("SELECT fake_card_id, achievement_id FROM ngu4th_minigames WHERE id = ?").bind(id).first();
        
        // Grant Card
        if (winner?.team && game?.fake_card_id) {
          await env.DB.prepare("INSERT INTO ngu4th_inventory (card_id, owner_type, owner_id) VALUES (?, 'team', ?)")
            .bind(game.fake_card_id, winner.team).run();
        }

        // Grant specific achievement if linked
        if (game?.achievement_id) {
          await env.DB.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
            .bind(winner_id, game.achievement_id).run();
        }

        // Also trigger general minigame_win check
        await checkAchievements(env.DB, winner_id, { type: 'minigame_win', minigameId: id });
      }
    } else if (action === 'delete') {
      await env.DB.prepare("DELETE FROM ngu4th_minigame_participants WHERE minigame_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM ngu4th_minigames WHERE id = ?").bind(id).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
