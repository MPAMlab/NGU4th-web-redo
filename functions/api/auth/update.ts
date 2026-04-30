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
      const { username } = await request.json() as { username: string };
      
      if (!username || username.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Username cannot be empty" }), { status: 400 });
      }

      if (username.length > 32) {
        return new Response(JSON.stringify({ error: "Username too long (max 32 chars)" }), { status: 400 });
      }

      await env.DB.prepare("UPDATE ngu4th_members SET username = ? WHERE kinde_id = ?")
        .bind(username.trim(), kindeId).run();

      return new Response(JSON.stringify({ success: true, username: username.trim() }));
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Update failed", message: e.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};
