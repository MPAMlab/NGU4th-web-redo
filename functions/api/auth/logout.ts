export const onRequest: PagesFunction<{
  KINDE_ISSUER_URL: string;
  KINDE_SITE_URL: string;
}> = async ({ env }) => {
  const cookieOptions = "Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
  
  // Construct Kinde global logout URL
  const logoutUrl = new URL(`${env.KINDE_ISSUER_URL}/logout`);
  logoutUrl.searchParams.set("redirect", env.KINDE_SITE_URL);

  const headers = new Headers({
    "Location": logoutUrl.toString(),
  });
  
  // Clear local cookies
  headers.append("Set-Cookie", `auth_token=; ${cookieOptions}`);
  headers.append("Set-Cookie", `kinde_auth_state=; ${cookieOptions}`);
  headers.append("Set-Cookie", `kinde_auth_verifier=; ${cookieOptions}`);

  return new Response(null, {
    status: 302,
    headers,
  });
};
