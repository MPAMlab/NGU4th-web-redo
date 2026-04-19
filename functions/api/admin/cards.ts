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
    // Fetch card library
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
    const { action, cardId, ownerType, ownerId, inventoryId, name, type, description, is_variable, multiplier, exponent_bonus } = body;
    
    if (action === 'assign') {
      await env.DB.prepare("INSERT INTO ngu4th_inventory (card_id, owner_type, owner_id) VALUES (?, ?, ?)")
        .bind(cardId, ownerType, ownerId).run();
    } else if (action === 'revoke') {
      await env.DB.prepare("DELETE FROM ngu4th_inventory WHERE id = ?").bind(inventoryId).run();
    } else if (action === 'create_card') {
      await env.DB.prepare("INSERT INTO ngu4th_cards (name, type, description, is_variable, multiplier, exponent_bonus) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(name, type, description, is_variable ? 1 : 0, multiplier || 1.0, exponent_bonus || 0.0).run();
    } else if (action === 'update_card') {
      await env.DB.prepare("UPDATE ngu4th_cards SET name = ?, type = ?, description = ?, is_variable = ?, multiplier = ?, exponent_bonus = ? WHERE id = ?")
        .bind(name, type, description, is_variable ? 1 : 0, multiplier || 1.0, exponent_bonus || 0.0, cardId).run();
    } else if (action === 'delete_card') {
      // Also cleanup inventory references
      await env.DB.prepare("DELETE FROM ngu4th_inventory WHERE card_id = ?").bind(cardId).run();
      await env.DB.prepare("DELETE FROM ngu4th_cards WHERE id = ?").bind(cardId).run();
    } else if (action === 'random_joker') {
      const jokers: any = await env.DB.prepare("SELECT id FROM ngu4th_cards WHERE type = 'joker'").all();
      const users: any = await env.DB.prepare("SELECT kinde_id FROM ngu4th_members WHERE is_registered = 1").all();
      
      if (jokers.results.length === 0 || users.results.length === 0) return new Response("No cards or users", { status: 400 });

      // Clear existing Joker assignments
      await env.DB.prepare("UPDATE ngu4th_members SET joker_card_id = NULL WHERE is_registered = 1").run();

      const shuffledJokers = [...jokers.results].sort(() => Math.random() - 0.5);
      const statements = users.results.map((u: any, i: number) => {
         const joker = shuffledJokers[i % shuffledJokers.length];
         return env.DB.prepare("UPDATE ngu4th_members SET joker_card_id = ? WHERE kinde_id = ?")
           .bind(joker.id, u.kinde_id);
      });
      await env.DB.batch(statements);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
