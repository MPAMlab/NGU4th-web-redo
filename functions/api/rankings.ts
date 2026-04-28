export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  // Aggregate rankings by achievement count
  const rankings = await env.DB.prepare(`
    SELECT m.username, m.team, COUNT(ua.achievement_id) as achievement_count
    FROM ngu4th_members m
    JOIN ngu4th_user_achievements ua ON m.kinde_id = ua.kinde_id
    GROUP BY m.kinde_id
    HAVING achievement_count > 0
    ORDER BY achievement_count DESC, m.username ASC
    LIMIT 50
  `).all();
  
  return new Response(JSON.stringify(rankings.results || []), {
    headers: { "Content-Type": "application/json" }
  });
};
