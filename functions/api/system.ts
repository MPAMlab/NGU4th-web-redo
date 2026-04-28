export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const games = await env.DB.prepare("SELECT * FROM ngu4th_games WHERE status = 'active' LIMIT 1").first();
    const config = await env.DB.prepare("SELECT * FROM ngu4th_system_config").all();
    
    const configMap = (config.results || []).reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return new Response(JSON.stringify({ activeGame: games, config: configMap }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};
