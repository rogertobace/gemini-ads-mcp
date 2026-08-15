import { getOAuthConfig, getPublicOrigin } from "@/src/config";
import {
  createAccessToken,
  createRefreshToken,
  readClientCredentials,
  validateClientCredentials,
  validatePkce,
  verifySignedToken,
} from "@/src/oauth";

const tokenError = (error: string, description: string, status = 400) =>
  Response.json(
    { error, error_description: description },
    { status, headers: { "cache-control": "no-store" } },
  );

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return tokenError("invalid_request", "Expected form-encoded body.");
  }

  const body = new URLSearchParams(await request.text());
  const credentials = readClientCredentials(request, body);
  if (!validateClientCredentials(credentials)) {
    return tokenError("invalid_client", "Client authentication failed.", 401);
  }

  const grantType = body.get("grant_type");
  const audience = `${getPublicOrigin(request)}/mcp`;
  const { clientId } = getOAuthConfig();

  if (grantType === "authorization_code") {
    const code = body.get("code");
    const redirectUri = body.get("redirect_uri");
    if (!code || !redirectUri) {
      return tokenError("invalid_request", "Code and redirect_uri are required.");
    }

    const payload = verifySignedToken(code, "authorization_code");
    if (
      !payload ||
      payload.client_id !== clientId ||
      payload.redirect_uri !== redirectUri
    ) {
      return tokenError("invalid_grant", "Authorization code is invalid or expired.");
    }

    if (payload.code_challenge) {
      const verifier = body.get("code_verifier");
      if (!verifier || !validatePkce(verifier, payload.code_challenge)) {
        return tokenError("invalid_grant", "PKCE verification failed.");
      }
    }

    return Response.json(
      {
        access_token: createAccessToken(clientId, audience),
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: createRefreshToken(clientId),
        scope: "generate:ads",
      },
      { headers: { "cache-control": "no-store", pragma: "no-cache" } },
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.get("refresh_token");
    const payload = refreshToken
      ? verifySignedToken(refreshToken, "refresh_token")
      : undefined;
    if (!payload || payload.client_id !== clientId) {
      return tokenError("invalid_grant", "Refresh token is invalid or expired.");
    }

    return Response.json(
      {
        access_token: createAccessToken(clientId, audience),
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: createRefreshToken(clientId),
        scope: "generate:ads",
      },
      { headers: { "cache-control": "no-store", pragma: "no-cache" } },
    );
  }

  return tokenError("unsupported_grant_type", "Grant type is not supported.");
}
