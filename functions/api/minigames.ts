export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let userId: string;
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    userId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  if (request.method === "GET") {
    const games: any = await env.DB.prepare(`
      SELECT g.*, c.name as fake_card_name,
             (SELECT COUNT(*) FROM ngu4th_minigame_participants WHERE minigame_id = g.id) as current_players,
             (SELECT 1 FROM ngu4th_minigame_participants WHERE minigame_id = g.id AND user_id = ?) as is_joined
      FROM ngu4th_minigames g
      LEFT JOIN ngu4th_cards c ON g.fake_card_id = c.id
      WHERE g.status != 'finished'
      ORDER BY g.start_date, g.start_time
    `).bind(userId).all();

    return new Response(JSON.stringify(games.results), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const { action, minigameId } = await request.json() as any;
    
    if (action === 'join') {
      const game: any = await env.DB.prepare("SELECT * FROM ngu4th_minigames WHERE id = ?").bind(minigameId).first();
      if (!game || game.status !== 'recruiting') {
        return new Response(JSON.stringify({ error: "Game is not recruiting" }), { status: 400 });
      }

      const count: any = await env.DB.prepare("SELECT COUNT(*) as count FROM ngu4th_minigame_participants WHERE minigame_id = ?").bind(minigameId).first();
      if (count.count >= game.max_players) {
        return new Response(JSON.stringify({ error: "Game is full" }), { status: 400 });
      }

      try {
        await env.DB.prepare("INSERT INTO ngu4th_minigame_participants (minigame_id, user_id) VALUES (?, ?)")
          .bind(minigameId, userId).run();
        return new Response(JSON.stringify({ success: true }));
      } catch (e) {
        return new Response(JSON.stringify({ error: "Already joined" }), { status: 400 });
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
