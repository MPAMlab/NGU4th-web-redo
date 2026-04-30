export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  // Achievement rankings
  const achievementRankings = await env.DB.prepare(`
    SELECT m.username, m.team, COUNT(ua.achievement_id) as value
    FROM ngu4th_members m
    JOIN ngu4th_user_achievements ua ON m.kinde_id = ua.kinde_id
    GROUP BY m.kinde_id
    HAVING value > 0
    ORDER BY value DESC, m.username ASC
    LIMIT 20
  `).all();

  // Contribution rankings (Sum of total_score from ngu4th_rounds)
  const scoreRankings = await env.DB.prepare(`
    SELECT m.username, m.team, SUM(r.total_score) as value
    FROM ngu4th_members m
    JOIN ngu4th_rounds r ON m.kinde_id = r.player_id
    GROUP BY m.kinde_id
    HAVING value > 0
    ORDER BY value DESC, m.username ASC
    LIMIT 20
  `).all();
  
  return new Response(JSON.stringify({
    achievements: achievementRankings.results || [],
    scores: scoreRankings.results || []
  }), {
    headers: { "Content-Type": "application/json" }
  });
};
