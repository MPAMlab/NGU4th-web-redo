export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let kindeId: string;
  try {
    const payloadPart = idToken.split(".")[1];
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    kindeId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  // 1. Get user and their team
  const user: any = await env.DB.prepare("SELECT team FROM ngu4th_members WHERE kinde_id = ?").bind(kindeId).first();
  if (!user) return new Response("User not found", { status: 404 });

  // 2. Fetch inventory items
  // We want to fetch both personal and team-owned cards
  const inventory = await env.DB.prepare(`
    SELECT i.id as instance_id, i.status, i.assigned_at, c.*
    FROM ngu4th_inventory i
    JOIN ngu4th_cards c ON i.card_id = c.id
    WHERE (i.owner_type = 'user' AND i.owner_id = ?) 
       OR (i.owner_type = 'team' AND i.owner_id = ?)
    ORDER BY i.assigned_at DESC
  `).bind(kindeId, user.team || 'none').all();

  return new Response(JSON.stringify(inventory.results || []), {
    headers: { "Content-Type": "application/json" }
  });
};
