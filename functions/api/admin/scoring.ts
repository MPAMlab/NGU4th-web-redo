import { checkAchievements } from "../../lib/achievements";

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

    if (request.method === "POST") {
      const { matchId, roundType, redData, blueData } = await request.json() as any;
      
      if (!matchId || !roundType || !redData || !blueData) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Get match info to get player IDs and game ID
      const match: any = await env.DB.prepare("SELECT * FROM ngu4th_matches WHERE id = ?").bind(matchId).first();
      if (!match) {
        return new Response(JSON.stringify({ error: "Match not found" }), { 
          status: 404, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Helper to calculate and insert round data
      const commitRound = async (playerId: string, team: string, data: any) => {
        // 1. Get Base Exponent from Active Game
        const activeGame: any = await env.DB.prepare("SELECT red_exponent, blue_exponent FROM ngu4th_games WHERE status = 'active'").first();
        const baseTeamExponent = team === 'red' ? (activeGame?.red_exponent || 1.0) : (activeGame?.blue_exponent || 1.0);

        // 2. Fetch all selected fake cards data
        let fakeMultiplier = 1.0;
        let fakeExponentProd = 1.0; // Use Product
        
        if (data.fakeCards) {
          const cardIds = data.fakeCards.split(',').filter((id: string) => id.trim() !== '');
          if (cardIds.length > 0) {
            const placeholders = cardIds.map(() => '?').join(',');
            const cards: any = await env.DB.prepare(`SELECT multiplier, exponent_bonus FROM ngu4th_cards WHERE id IN (${placeholders})`)
              .bind(...cardIds).all();
            
            for (const card of cards.results) {
              if (card.multiplier) fakeMultiplier *= card.multiplier;
              // Multiply exponents as per (base^a)^b = base^(a*b) logic
              if (card.exponent_bonus) fakeExponentProd *= card.exponent_bonus; 
            }
          }
        }

        const jokerMultiplier = parseFloat(data.multiplier) || 1.0;
        const totalMultiplier = jokerMultiplier * fakeMultiplier;
        const baseScore = parseFloat(data.baseScore);
        
        // Final exponent for THIS round = Team Base * Card Bonuses
        const finalRoundExponent = baseTeamExponent * fakeExponentProd;

        // Placeholder for achievement types (simplified calculation)
        const totalScorePlaceholder = Math.pow(baseScore, finalRoundExponent) * totalMultiplier; 
        
        await env.DB.prepare(`
          INSERT INTO ngu4th_rounds (match_id, player_id, team, round_number, base_score, multiplier, exponent, total_score, round_type, tarot_id, poker_hand, active_fake_cards, game_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          matchId, playerId, team, 
          roundType === 'red_pick' ? 1 : 2, 
          baseScore, totalMultiplier, finalRoundExponent, 
          totalScorePlaceholder, roundType, data.tarotId || null, data.hand, data.fakeCards || null,
          match.game_id
        ).run();

        // HOOK: Check achievements
        await checkAchievements(env.DB, playerId, { 
          type: 'score', 
          value: totalScorePlaceholder,
          baseScore: baseScore,
          pokerHand: data.hand,
          fakeCards: data.fakeCards,
          jokerUsed: !!(data.multiplier && parseFloat(data.multiplier) !== 1.0),
          tarotId: data.tarotId
        });
        
        return totalScorePlaceholder;
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

    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Server Error", message: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
