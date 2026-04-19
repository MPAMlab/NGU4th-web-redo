import { checkAchievements } from "../../lib/achievements";

export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const matchToken = cookieHeader.match(/auth_token=([^;]+)/);
  if (!matchToken) return new Response("Unauthorized", { status: 401 });

  const idToken = matchToken[1];
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

    // Get match info to get player IDs and game ID
    const match: any = await env.DB.prepare("SELECT * FROM ngu4th_matches WHERE id = ?").bind(matchId).first();
    if (!match) return new Response("Match not found", { status: 404 });

    // Helper to calculate, insert and check achievements
    const commitRound = async (playerId: string, team: string, data: any) => {
      const totalScore = parseFloat(data.baseScore) * (parseFloat(data.multiplier) || 1);
      
      await env.DB.prepare(`
        INSERT INTO ngu4th_rounds (match_id, player_id, team, round_number, base_score, multiplier, exponent, total_score, round_type, tarot_id, poker_hand, active_fake_cards, game_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        matchId, playerId, team, 
        roundType === 'red_pick' ? 1 : 2, 
        data.baseScore, data.multiplier, 1.0, 
        totalScore, roundType, data.tarotId || null, data.hand, data.fakeCards || null,
        match.game_id
      ).run();

      // HOOK: Check achievements for score
      await checkAchievements(env.DB, playerId, { type: 'score', value: totalScore });
      
      return totalScore;
    };

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
