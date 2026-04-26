export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ env }) => {
  const cards = await env.DB.prepare("SELECT * FROM ngu4th_cards ORDER BY type, name").all();
  
  return new Response(JSON.stringify(cards.results || []), {
    headers: { "Content-Type": "application/json" }
  });
};
