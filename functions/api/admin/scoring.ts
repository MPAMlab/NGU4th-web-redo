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

  if (request.method === "POST") {
    const { matchId, playerId, team, baseScore, multiplier, exponent } = await request.json() as any;
    
    if (!matchId || !playerId || !team) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Calculate total: base * (multiplier ^ exponent)
    const totalScore = baseScore * Math.pow(multiplier || 1, exponent || 1);

    // Get next round number for this match
    const lastRound: any = await env.DB.prepare("SELECT MAX(round_number) as maxR FROM ngu4th_rounds WHERE match_id = ?")
      .bind(matchId).first();
    const nextRound = (lastRound?.maxR || 0) + 1;

    // 1. Log the round
    await env.DB.prepare(`
      INSERT INTO ngu4th_rounds (match_id, player_id, team, round_number, base_score, multiplier, exponent, total_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(matchId, playerId, team, nextRound, baseScore, multiplier, exponent, totalScore).run();

    // 2. Mark the player's Joker as 'used' in inventory if they just played
    // (Simple logic: mark all their unused Jokers as used when a score is committed)
    await env.DB.prepare(`
      UPDATE ngu4th_inventory SET status = 'used' 
      WHERE owner_id = ? AND status = 'unused' AND card_id IN (SELECT id FROM ngu4th_cards WHERE type = '小丑牌')
    `).bind(playerId).run();

    return new Response(JSON.stringify({ success: true, totalScore }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
