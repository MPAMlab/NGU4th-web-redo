export const onRequest: PagesFunction<{
  KINDE_ISSUER_URL: string;
  KINDE_CLIENT_ID: string;
  KINDE_SITE_URL: string;
}> = async ({ env }) => {
  if (!env.KINDE_ISSUER_URL || !env.KINDE_SITE_URL) {
    return new Response("Configuration Error: Missing KINDE_ISSUER_URL or KINDE_SITE_URL", { status: 500 });
  }

  // Generate random state and code verifier for PKCE
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  
  // PKCE: code_challenge = base64url(sha256(code_verifier))
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const codeChallenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const loginUrl = new URL(`${env.KINDE_ISSUER_URL}/oauth2/auth`);
  loginUrl.searchParams.set("client_id", env.KINDE_CLIENT_ID);
  loginUrl.searchParams.set("redirect_uri", `${env.KINDE_SITE_URL}/api/auth/callback`);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("scope", "openid profile email");
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("code_challenge", codeChallenge);
  loginUrl.searchParams.set("code_challenge_method", "S256");

  // Store state and code_verifier in cookies to verify them in the callback
  const cookieOptions = "Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300";
  const headers = new Headers({
    "Location": loginUrl.toString(),
    "Set-Cookie": `kinde_auth_state=${state}; ${cookieOptions}`,
  });
  headers.append("Set-Cookie", `kinde_auth_verifier=${codeVerifier}; ${cookieOptions}`);

  return new Response(null, {
    status: 302,
    headers,
  });
};
