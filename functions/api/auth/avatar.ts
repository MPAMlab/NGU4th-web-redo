export const onRequest: PagesFunction<{
  DB: D1Database;
  BUCKET: R2Bucket;
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
      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });

      // Check file size (e.g., 2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 2MB)" }), { status: 400 });
      }

      const ext = file.name.split('.').pop();
      const fileName = `avatars/ngu4th/${kindeId}_${Date.now()}.${ext}`;
      
      await env.BUCKET.put(fileName, file, {
        httpMetadata: { contentType: file.type }
      });

      // Fetch base URL from config
      const config: any = await env.DB.prepare("SELECT value FROM ngu4th_system_config WHERE key = 'avatar_base_url'").first();
      const baseUrl = config?.value || "https://ngu3-signup-bucket.srt.pub/";
      const avatarUrl = `${baseUrl}${fileName}`;

      await env.DB.prepare("UPDATE ngu4th_members SET avatar_url = ? WHERE kinde_id = ?")
        .bind(avatarUrl, kindeId).run();

      return new Response(JSON.stringify({ success: true, avatarUrl }));
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Upload failed", message: e.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};
