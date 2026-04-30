export const onRequest: PagesFunction<{
  DB: D1Database;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

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
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }

  if (request.method === "POST") {
    try {
      const { username, selected_achievements, show_collector_avatars } = await request.json() as { 
        username?: string, 
        selected_achievements?: string, 
        show_collector_avatars?: number 
      };
      
      const updates: string[] = [];
      const params: any[] = [];

      if (username !== undefined) {
        if (username.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Username cannot be empty" }), { status: 400 });
        }
        if (username.length > 32) {
          return new Response(JSON.stringify({ error: "Username too long (max 32 chars)" }), { status: 400 });
        }
        updates.push("username = ?");
        params.push(username.trim());
      }

      if (selected_achievements !== undefined) {
        updates.push("selected_achievements = ?");
        params.push(selected_achievements);
      }

      if (show_collector_avatars !== undefined) {
        updates.push("show_collector_avatars = ?");
        params.push(show_collector_avatars);
      }

      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: "No fields to update" }), { status: 400 });
      }

      params.push(kindeId);
      await env.DB.prepare(`UPDATE ngu4th_members SET ${updates.join(", ")} WHERE kinde_id = ?`)
        .bind(...params).run();

      return new Response(JSON.stringify({ success: true, username, selected_achievements, show_collector_avatars }));
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Update failed", message: e.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};
