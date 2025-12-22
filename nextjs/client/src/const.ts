export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getLoginUrl = () => {
  // Fallback para a própria origem caso a variável esteja vazia
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || window.location.origin;
  const appId = import.meta.env.VITE_APP_ID || "controlBrasil";
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    // Remove barras no final para evitar //app-auth
    const baseUrl = oauthPortalUrl.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/app-auth`);
    
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (e) {
    console.error("Erro ao construir URL de login:", e);
    // Retorno seguro em caso de falha crítica
    return `${window.location.origin}/login-error`;
  }
};