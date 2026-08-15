import { getOAuthConfig } from "@/src/config";
import { createAuthorizationCode, isAllowedRedirectUri } from "@/src/oauth";

function oauthError(redirectUri: string | null, error: string, state?: string | null) {
  if (redirectUri && isAllowedRedirectUri(redirectUri)) {
    const target = new URL(redirectUri);
    target.searchParams.set("error", error);
    if (state) target.searchParams.set("state", state);
    return Response.redirect(target, 302);
  }
  return Response.json({ error }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge") || undefined;
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = searchParams.get("scope") || "generate:ads";
  const config = getOAuthConfig();

  if (responseType !== "code") {
    return oauthError(redirectUri, "unsupported_response_type", state);
  }
  if (clientId !== config.clientId || !redirectUri || !isAllowedRedirectUri(redirectUri)) {
    return oauthError(null, "invalid_request", state);
  }
  if (scope.split(" ").some((item) => item !== "generate:ads")) {
    return oauthError(redirectUri, "invalid_scope", state);
  }
  if (codeChallenge && codeChallengeMethod !== "S256") {
    return oauthError(redirectUri, "invalid_request", state);
  }

  const code = createAuthorizationCode({ clientId, redirectUri, codeChallenge });
  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return Response.redirect(target, 302);
}
