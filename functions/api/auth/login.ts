export const onRequest: PagesFunction<{
  KINDE_ISSUER_URL: string;
  KINDE_CLIENT_ID: string;
  KINDE_SITE_URL: string;
}> = async ({ env }) => {
  console.log("KINDE_ISSUER_URL:", env.KINDE_ISSUER_URL);
  console.log("KINDE_SITE_URL:", env.KINDE_SITE_URL);
  
  if (!env.KINDE_ISSUER_URL || !env.KINDE_SITE_URL) {
    return new Response("Configuration Error: Missing KINDE_ISSUER_URL or KINDE_SITE_URL", { status: 500 });
  }

  const loginUrl = new URL(`${env.KINDE_ISSUER_URL}/oauth2/auth`);
  loginUrl.searchParams.set("client_id", env.KINDE_CLIENT_ID);
  loginUrl.searchParams.set("redirect_uri", `${env.KINDE_SITE_URL}/api/auth/callback`);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("scope", "openid profile email");
  // In a real app, use state and PKCE challenge here
  
  return Response.redirect(loginUrl.toString(), 302);
};
