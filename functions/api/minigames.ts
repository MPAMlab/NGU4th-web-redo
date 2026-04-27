import { checkAchievements } from "../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let userId: string;
  try {
    const payloadPart = idToken.split(".")[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    userId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  if (request.method === "GET") {
    // Fetch all games (including finished ones for history)
    const games: any = await env.DB.prepare(`
      SELECT g.*, c.name as fake_card_name,
             (SELECT COUNT(*) FROM ngu4th_minigame_participants WHERE minigame_id = g.id) as participant_count,
             (SELECT 1 FROM ngu4th_minigame_participants WHERE minigame_id = g.id AND user_id = ?) as is_joined
      FROM ngu4th_minigames g
      LEFT JOIN ngu4th_cards c ON g.fake_card_id = c.id
      ORDER BY 
        CASE WHEN g.status = 'active' THEN 0 WHEN g.status = 'recruiting' THEN 1 ELSE 2 END,
        g.start_date ASC, g.start_time ASC
    `).bind(userId).all();

    return new Response(JSON.stringify(games.results), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { action, minigameId } = await request.json() as any;
    
    // Verify user is a registered player first
    const member: any = await env.DB.prepare("SELECT is_registered FROM ngu4th_members WHERE kinde_id = ?")
      .bind(userId).first();
    
    if (!member || !member.is_registered) {
      return new Response("Please complete registration first", { status: 403 });
    }

    if (action === 'join') {
      const game: any = await env.DB.prepare("SELECT * FROM ngu4th_minigames WHERE id = ?").bind(minigameId).first();
      if (!game || game.status !== 'recruiting') {
        return new Response("This challenge is not open for recruitment", { status: 400 });
      }

      const count: any = await env.DB.prepare("SELECT COUNT(*) as count FROM ngu4th_minigame_participants WHERE minigame_id = ?").bind(minigameId).first();
      if (count.count >= game.max_players) {
        return new Response("This challenge is already full", { status: 400 });
      }

      try {
        await env.DB.prepare("INSERT INTO ngu4th_minigame_participants (minigame_id, user_id) VALUES (?, ?)")
          .bind(minigameId, userId).run();
        return new Response(JSON.stringify({ success: true }));
      } catch (e) {
        return new Response("You are already enrolled in this challenge", { status: 400 });
      }
    }

    if (action === 'leave') {
      await env.DB.prepare("DELETE FROM ngu4th_minigame_participants WHERE minigame_id = ? AND user_id = ?")
        .bind(minigameId, userId).run();
      return new Response(JSON.stringify({ success: true }));
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
