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
      // 1. Get Base settings from Active Game
      const activeGame: any = await env.DB.prepare("SELECT red_exponent, blue_exponent FROM ngu4th_games WHERE status = 'active'").first();
      const baseTeamExponent = team === 'red' ? (activeGame?.red_exponent || 1.0) : (activeGame?.blue_exponent || 1.0);

      // 2. Fetch all selected fake cards data
      let fakeMultiplier = 1.0;
      let fakeExponentMultiplier = 1.0;
      
      if (data.fakeCards) {
        const cardIds = data.fakeCards.split(',').filter((id: string) => id.trim() !== '');
        if (cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          const cards: any = await env.DB.prepare(`SELECT multiplier, exponent_bonus FROM ngu4th_cards WHERE id IN (${placeholders})`)
            .bind(...cardIds).all();
          
          for (const card of cards.results) {
            if (card.multiplier) fakeMultiplier *= card.multiplier;
            // 如果是 1.05 这种形式，我们将其视为复合系数 (Multiplier)
            // 如果是 0.05 这种形式，通常代表 Additive，但根据你的描述，我们采用复合乘法
            if (card.exponent_bonus) fakeExponentMultiplier *= card.exponent_bonus;
          }
        }
      }

      // 3. Final Calculation
      const finalBase = parseFloat(data.baseScore) * (parseFloat(data.multiplier) || 1.0) * fakeMultiplier;
      const finalExponent = baseTeamExponent * fakeExponentMultiplier;
      const totalScore = Math.pow(finalBase, finalExponent);
      
      await env.DB.prepare(`
        INSERT INTO ngu4th_rounds (match_id, player_id, team, round_number, base_score, multiplier, exponent, total_score, round_type, tarot_id, poker_hand, active_fake_cards, game_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        matchId, playerId, team, 
        roundType === 'red_pick' ? 1 : 2, 
        data.baseScore, (parseFloat(data.multiplier) || 1.0) * fakeMultiplier, finalExponent, 
        totalScore, roundType, data.tarotId || null, data.hand, data.fakeCards || null,
        match.game_id
      ).run();

      // HOOK: Check achievements for score
      await checkAchievements(env.DB, playerId, { 
        type: 'score', 
        value: totalScore,
        baseScore: parseFloat(data.baseScore),
        pokerHand: data.hand,
        fakeCards: data.fakeCards,
        jokerUsed: !!(data.multiplier && parseFloat(data.multiplier) !== 1.0),
        tarotId: data.tarotId
      });
      
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
