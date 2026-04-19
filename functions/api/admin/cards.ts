export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
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

  if (request.method === "GET") {
    // Fetch card library and current inventory
    const cards = await env.DB.prepare("SELECT * FROM ngu4th_cards ORDER BY type, name").all();
    
    // Inventory joins with cards to get names
    const inventory = await env.DB.prepare(`
      SELECT i.*, c.name as card_name, c.type as card_type,
             COALESCE(m.username, i.owner_id) as owner_name
      FROM ngu4th_inventory i
      JOIN ngu4th_cards c ON i.card_id = c.id
      LEFT JOIN ngu4th_members m ON i.owner_id = m.kinde_id AND i.owner_type = 'user'
      WHERE i.status = 'unused'
      ORDER BY i.assigned_at DESC
    `).all();

    return new Response(JSON.stringify({ 
      library: cards.results, 
      inventory: inventory.results 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    const body = await request.json() as any;
    const { action, cardId, ownerType, ownerId, inventoryId } = body;
    
    if (action === 'assign') {
      await env.DB.prepare("INSERT INTO ngu4th_inventory (card_id, owner_type, owner_id) VALUES (?, ?, ?)")
        .bind(cardId, ownerType, ownerId).run();
    } else if (action === 'revoke') {
      await env.DB.prepare("DELETE FROM ngu4th_inventory WHERE id = ?")
        .bind(inventoryId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
