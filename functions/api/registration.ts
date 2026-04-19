export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response("Unauthorized", { status: 401 });

  const idToken = match[1];
  let kindeId: string;
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    kindeId = payload.sub;
  } catch (e) {
    return new Response("Invalid token", { status: 401 });
  }

  if (request.method === "GET") {
    const user = await env.DB.prepare("SELECT is_registered, last_registered_at FROM ngu4th_members WHERE kinde_id = ?")
      .bind(kindeId).first();
    return new Response(JSON.stringify(user), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "POST") {
    const { action } = await request.json() as { action: 'register' | 'cancel' };
    
    const user: any = await env.DB.prepare("SELECT last_registered_at FROM ngu4th_members WHERE kinde_id = ?")
      .bind(kindeId).first();

    const now = new Date();
    if (user.last_registered_at) {
      const lastAction = new Date(user.last_registered_at);
      const diffHours = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return new Response(JSON.stringify({ error: "24h cooldown in effect" }), { 
          status: 429, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    }

    const isRegistered = action === 'register' ? 1 : 0;
    await env.DB.prepare("UPDATE ngu4th_members SET is_registered = ?, last_registered_at = ? WHERE kinde_id = ?")
      .bind(isRegistered, now.toISOString(), kindeId).run();

    return new Response(JSON.stringify({ success: true, is_registered: isRegistered }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
