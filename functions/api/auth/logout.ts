export const onRequest: PagesFunction = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": "auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      "Location": "/",
    },
  });
};
