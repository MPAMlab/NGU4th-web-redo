export const onRequest: PagesFunction<{
  KINDE_ISSUER_URL: string;
  KINDE_CLIENT_ID: string;
  KINDE_CLIENT_SECRET: string;
  KINDE_SITE_URL: string;
  DB: D1Database;
}> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    const cookieHeader = request.headers.get("Cookie") || "";
    const storedStateMatch = cookieHeader.match(/kinde_auth_state=([^;]+)/);
    const storedVerifierMatch = cookieHeader.match(/kinde_auth_verifier=([^;]+)/);

    if (!code || !state || !storedStateMatch || state !== storedStateMatch[1]) {
      return new Response("Invalid state or missing code", { status: 400 });
    }

    const codeVerifier = storedVerifierMatch ? storedVerifierMatch[1] : "";
    const callbackUrl = `${env.KINDE_SITE_URL.replace(/\/$/, "")}/api/auth/callback`;

    const tokenUrl = `${env.KINDE_ISSUER_URL}/oauth2/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.KINDE_CLIENT_ID,
        client_secret: env.KINDE_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        redirect_uri: callbackUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Failed to exchange token: ${errorText}`, { status: 500 });
    }

    const tokens: any = await response.json();
    const idToken = tokens.id_token;

    // 🛠️ Robust JWT Decoding
    const payloadPart = idToken.split(".")[1];
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    
    const kindeId = payload.sub;
    const email = payload.email;
    const username = payload.given_name || payload.preferred_username || "Anonymous";

    // Check if first user
    const { count }: any = await env.DB.prepare("SELECT COUNT(*) as count FROM ngu4th_members").first();
    const role = count === 0 ? "admin" : "user";

    // Check legacy status
    let legacyStatus = 0;
    try {
      const legacyUser = await env.DB.prepare("SELECT * FROM members WHERE kinde_id = ?").bind(kindeId).first();
      if (legacyUser) legacyStatus = 1;
    } catch (e) {}

    // Upsert user into ngu4th_members
    await env.DB.prepare(`
      INSERT INTO ngu4th_members (kinde_id, username, email, role, legacy_status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(kinde_id) DO UPDATE SET
        username = excluded.username,
        email = excluded.email
    `).bind(kindeId, username, email, role, legacyStatus).run();

    // Grant special achievements...
    if (legacyStatus === 1) {
      const legacyAch: any = await env.DB.prepare("SELECT id FROM ngu4th_achievements WHERE name = 'NGU传说的冒险者'").first();
      if (legacyAch) {
        await env.DB.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
          .bind(kindeId, legacyAch.id).run();
      }
    }
    
    if (role === 'admin') {
       const staffAch: any = await env.DB.prepare("SELECT id FROM ngu4th_achievements WHERE name = 'NGU STAFF'").first();
       if (staffAch) {
          await env.DB.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
            .bind(kindeId, staffAch.id).run();
       }
    }

    const cookie = `auth_token=${idToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`; // 1 year
    
    return new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": cookie,
        "Location": "/dashboard",
      },
    });
  } catch (err: any) {
    return new Response(`Auth Callback Error: ${err.message}`, { status: 500 });
  }
};
