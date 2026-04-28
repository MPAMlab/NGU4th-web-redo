export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  try {
    const rounds = await env.DB.prepare(`
      SELECT r.*, m.username, c.name as tarot_name, g.name as game_name
      FROM ngu4th_rounds r
      JOIN ngu4th_members m ON r.player_id = m.kinde_id
      JOIN ngu4th_games g ON r.game_id = g.id
      LEFT JOIN ngu4th_cards c ON r.tarot_id = c.id
      ORDER BY r.created_at DESC
    `).all();

    return new Response(JSON.stringify(rounds.results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Server Error", message: e.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};
