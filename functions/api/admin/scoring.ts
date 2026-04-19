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
    const { matchId, roundType, redData, blueData } = await request.json() as any;
    
    if (!matchId || !roundType || !redData || !blueData) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Helper to calculate and insert
    const commitRound = async (playerId: string, team: string, data: any) => {
      const totalScore = parseFloat(data.baseScore) * Math.pow(parseFloat(data.multiplier) || 1, parseFloat(data.exponent) || 1);
      
      await env.DB.prepare(`
        INSERT INTO ngu4th_rounds (match_id, player_id, team, round_number, base_score, multiplier, exponent, total_score, round_type, tarot_used, poker_hand)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        matchId, playerId, team, 
        roundType === 'red_pick' ? 1 : 2, 
        data.baseScore, data.multiplier, data.exponent || 1, 
        totalScore, roundType, data.tarot, data.hand
      ).run();

      // Mark Joker as used for the primary team ONLY if that's their pick
      const shouldConsumeJoker = (team === 'red' && roundType === 'red_pick') || (team === 'blue' && roundType === 'blue_pick');
      if (shouldConsumeJoker) {
        await env.DB.prepare(`
          UPDATE ngu4th_inventory SET status = 'used' 
          WHERE owner_id = ? AND status = 'unused' AND card_id IN (SELECT id FROM ngu4th_cards WHERE type = '小丑牌')
        `).bind(playerId).run();
      }
      return totalScore;
    };

    // Get match info to get player IDs
    const match: any = await env.DB.prepare("SELECT * FROM ngu4th_matches WHERE id = ?").bind(matchId).first();
    
    await commitRound(match.red_player_id, 'red', redData);
    await commitRound(match.blue_player_id, 'blue', blueData);

    // Update match status
    const statusCol = roundType === 'red_pick' ? 'round_1_status' : 'round_2_status';
    await env.DB.prepare(`UPDATE ngu4th_matches SET ${statusCol} = 'completed' WHERE id = ?`).bind(matchId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
