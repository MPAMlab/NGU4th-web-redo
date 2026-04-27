export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const matchToken = cookieHeader.match(/auth_token=([^;]+)/);
    if (!matchToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const idToken = matchToken[1];
    const payloadPart = idToken.split(".")[1];
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) { base64 += '='; }
    const payload = JSON.parse(atob(base64));
    const userId = payload.sub;

    const user: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?").bind(userId).first();
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "GET") {
      const activeGame: any = await env.DB.prepare("SELECT id FROM ngu4th_games WHERE status = 'active'").first();
      const gameId = new URL(request.url).searchParams.get("gameId") || activeGame?.id;

      if (!gameId) return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });

      const matches = await env.DB.prepare(`
        SELECT m.*, r.username as red_player_name, b.username as blue_player_name 
        FROM ngu4th_matches m
        JOIN ngu4th_members r ON m.red_player_id = r.kinde_id
        JOIN ngu4th_members b ON m.blue_player_id = b.kinde_id
        WHERE m.game_id = ?
        ORDER BY m.order_index ASC
      `).bind(gameId).all();

      return new Response(JSON.stringify(matches.results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const { action, redPlayerId, bluePlayerId, orderIndex, matchId } = await request.json() as any;
      
      if (action === 'create') {
        const activeGame: any = await env.DB.prepare("SELECT id FROM ngu4th_games WHERE status = 'active'").first();
        if (!activeGame) {
          return new Response(JSON.stringify({ error: "No active game" }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
          });
        }

        await env.DB.prepare("INSERT INTO ngu4th_matches (red_player_id, blue_player_id, order_index, game_id) VALUES (?, ?, ?, ?)")
          .bind(redPlayerId, bluePlayerId, orderIndex, activeGame.id).run();
      } else if (action === 'delete') {
        await env.DB.prepare("DELETE FROM ngu4th_matches WHERE id = ?").bind(matchId).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Server Error", message: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
