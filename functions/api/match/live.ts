export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendState = async () => {
        try {
          // 1. Get active match ID
          const stateRecord: any = await env.DB.prepare("SELECT value FROM ngu4th_system_state WHERE key = 'active_match_id'").first();
          const activeMatchId = stateRecord?.value;

          // 2. Get active match details if exists
          let activeMatch = null;
          if (activeMatchId) {
            activeMatch = await env.DB.prepare(`
              SELECT m.*, r.username as red_name, b.username as blue_name
              FROM ngu4th_matches m
              LEFT JOIN ngu4th_members r ON m.red_player_id = r.kinde_id
              LEFT JOIN ngu4th_members b ON m.blue_player_id = b.kinde_id
              WHERE m.id = ?
            `).bind(activeMatchId).first();
          }

          // 3. Get team totals and exponents
          const totals: any = await env.DB.prepare(`
            SELECT team, SUM(total_score) as sum FROM ngu4th_rounds GROUP BY team
          `).all();
          
          const teamScores = { red: 0, blue: 0 };
          totals.results.forEach((r: any) => {
            if (r.team === 'red') teamScores.red = r.sum;
            if (r.team === 'blue') teamScores.blue = r.sum;
          });

          const exponents: any = await env.DB.prepare("SELECT key, value FROM ngu4th_system_state WHERE key LIKE '%_exponent'").all();
          const teamExponents = { red: 1.0, blue: 1.0 };
          exponents.results.forEach((e: any) => {
            if (e.key === 'red_exponent') teamExponents.red = parseFloat(e.value) || 1.0;
            if (e.key === 'blue_exponent') teamExponents.blue = parseFloat(e.value) || 1.0;
          });

          // 4. Get recent rounds with Tarot names
          const recentRounds = await env.DB.prepare(`
            SELECT r.*, m.username, c.name as tarot_name FROM ngu4th_rounds r
            JOIN ngu4th_members m ON r.player_id = m.kinde_id
            LEFT JOIN ngu4th_cards c ON r.tarot_id = c.id
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
        await sendState();
      }, 3000);

      // Clean up on close (note: may not always trigger in edge functions)
      // but the stream will eventually time out
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
