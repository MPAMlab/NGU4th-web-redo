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
  const adminUser: any = await env.DB.prepare("SELECT role FROM ngu4th_members WHERE kinde_id = ?")
    .bind(adminId).first();
  if (adminUser?.role !== 'admin') return new Response("Forbidden", { status: 403 });

  if (request.method === "GET") {
    const matches = await env.DB.prepare(`
      SELECT m.*, 
             r.username as red_player_name, 
             b.username as blue_player_name 
      FROM ngu4th_matches m
      LEFT JOIN ngu4th_members r ON m.red_player_id = r.kinde_id
      LEFT JOIN ngu4th_members b ON m.blue_player_id = b.kinde_id
      ORDER BY m.order_index ASC
    `).all();
    return new Response(JSON.stringify(matches.results), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const body = await request.json() as any;
    const { action, matchId, redPlayerId, bluePlayerId, orderIndex } = body;
    
    if (action === 'create') {
      await env.DB.prepare("INSERT INTO ngu4th_matches (red_player_id, blue_player_id, order_index) VALUES (?, ?, ?)")
        .bind(redPlayerId, bluePlayerId, orderIndex || 0).run();
    } else if (action === 'delete') {
      await env.DB.prepare("DELETE FROM ngu4th_matches WHERE id = ?")
        .bind(matchId).run();
    } else if (action === 'reorder') {
      const { matches: matchList } = body; // Use the already parsed body
      const statements = matchList.map((m: any) => 
        env.DB.prepare("UPDATE ngu4th_matches SET order_index = ? WHERE id = ?").bind(m.order_index, m.id)
      );
      await env.DB.batch(statements);
    } else if (action === 'update_players') {
      await env.DB.prepare("UPDATE ngu4th_matches SET red_player_id = ?, blue_player_id = ? WHERE id = ?")
        .bind(redPlayerId, bluePlayerId, matchId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
