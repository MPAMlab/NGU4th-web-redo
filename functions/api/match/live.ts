export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendState = async () => {
        try {
          // 1. Get active match ID from system_config
          const configRecord: any = await env.DB.prepare("SELECT value FROM ngu4th_system_config WHERE key = 'active_match_id'").first();
          const activeMatchId = configRecord?.value;

          // 2. Get active game settings (for exponents)
          const activeGame: any = await env.DB.prepare("SELECT red_exponent, blue_exponent FROM ngu4th_games WHERE status = 'active'").first();
          const teamExponents = { 
            red: activeGame?.red_exponent || 1.0, 
            blue: activeGame?.blue_exponent || 1.0 
          };

          // 3. Get active match details if exists
          let activeMatch = null;
          if (activeMatchId) {
            activeMatch = await env.DB.prepare(`
              SELECT m.*, r.username as red_player_name, b.username as blue_player_name
              FROM ngu4th_matches m
              LEFT JOIN ngu4th_members r ON m.red_player_id = r.kinde_id
              LEFT JOIN ngu4th_members b ON m.blue_player_id = b.kinde_id
              WHERE m.id = ?
            `).bind(activeMatchId).first();
          }

          // 4. Get team totals using new formula: (Sum of Base ^ Current Global Exp) * Product of Multipliers
          const rawRounds: any = await env.DB.prepare(`
            SELECT team, base_score, multiplier 
            FROM ngu4th_rounds 
            WHERE game_id = (SELECT id FROM ngu4th_games WHERE status = 'active')
          `).all();
          
          const teamAggregates: any = {
            red: { sumBase: 0, prodMult: 1.0 },
            blue: { sumBase: 0, prodMult: 1.0 }
          };

          (rawRounds.results || []).forEach((r: any) => {
            const team = r.team as 'red' | 'blue';
            if (teamAggregates[team]) {
              teamAggregates[team].sumBase += (r.base_score || 0);
              teamAggregates[team].prodMult *= (r.multiplier || 1.0);
            }
          });

          const teamScores = {
            red: Math.pow(teamAggregates.red.sumBase, teamExponents.red) * teamAggregates.red.prodMult,
            blue: Math.pow(teamAggregates.blue.sumBase, teamExponents.blue) * teamAggregates.blue.prodMult
          };

          // 5. Get recent rounds with Tarot names
          const recentRounds = await env.DB.prepare(`
            SELECT r.*, m.username, c.name as tarot_name FROM ngu4th_rounds r
            JOIN ngu4th_members m ON r.player_id = m.kinde_id
            LEFT JOIN ngu4th_cards c ON r.tarot_id = c.id
            WHERE r.game_id = (SELECT id FROM ngu4th_games WHERE status = 'active')
            ORDER BY r.created_at DESC LIMIT 5
          `).all();

          const payload = JSON.stringify({
            activeMatch,
            teamScores,
            teamExponents,
            recentRounds: recentRounds.results,
            timestamp: Date.now()
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (e) {
          console.error("SSE Error:", e);
        }
      };

      // Initial send
      await sendState();

      // Poll every 3 seconds
      const interval = setInterval(async () => {
        try {
          await sendState();
        } catch (err) {
          // If the stream is closed, this will error
          clearInterval(interval);
        }
      }, 3000);
    },
    cancel() {
      // Cleanup logic if supported
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};
