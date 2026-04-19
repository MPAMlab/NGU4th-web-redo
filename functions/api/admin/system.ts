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
    const state = await env.DB.prepare("SELECT * FROM ngu4th_system_state").all();
    const result: any = {};
    state.results.forEach((row: any) => { result[row.key] = row.value; });
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "POST") {
    const { key, value } = await request.json() as any;
    await env.DB.prepare("INSERT OR REPLACE INTO ngu4th_system_state (key, value) VALUES (?, ?)")
      .bind(key, value).run();
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};
