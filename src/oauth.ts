import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getOAuthConfig } from "@/src/config";

type TokenType = "authorization_code" | "access_token" | "refresh_token";

type SignedPayload = {
  typ: TokenType;
  client_id: string;
  iat: number;
  exp: number;
  scope?: string;
  aud?: string;
  redirect_uri?: string;
  code_challenge?: string;
};

const base64url = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromBase64url = (value: string) =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );

function sign(data: string, secret: string) {
  return base64url(createHmac("sha256", secret).update(data).digest());
}

export function issueSignedToken(payload: SignedPayload) {
  const { authSecret } = getOAuthConfig();
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned, authSecret)}`;
}

export function verifySignedToken(token: string, expectedType: TokenType) {
  const { authSecret } = getOAuthConfig();
  const [header, body, providedSignature, extra] = token.split(".");
  if (!header || !body || !providedSignature || extra) return undefined;

  const expectedSignature = sign(`${header}.${body}`, authSecret);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(fromBase64url(body)) as SignedPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.typ !== expectedType || payload.exp <= now || payload.iat > now + 30) {
      return undefined;
    }
    return payload;
  } catch {
    return undefined;
  }
}

export function createAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return issueSignedToken({
    typ: "authorization_code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    iat: now,
    exp: now + 120,
  });
}

export function createAccessToken(clientId: string, audience: string) {
  const now = Math.floor(Date.now() / 1000);
  return issueSignedToken({
    typ: "access_token",
    client_id: clientId,
    scope: "generate:ads",
    aud: audience,
    iat: now,
    exp: now + 3600,
  });
}

export function createRefreshToken(clientId: string) {
  const now = Math.floor(Date.now() / 1000);
  return issueSignedToken({
    typ: "refresh_token",
    client_id: clientId,
    scope: "generate:ads",
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
  });
}

export function validatePkce(codeVerifier: string, codeChallenge: string) {
  const derived = base64url(createHash("sha256").update(codeVerifier).digest());
  const provided = Buffer.from(derived);
  const expected = Buffer.from(codeChallenge);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function isAllowedRedirectUri(uri: string) {
  const { allowedRedirectOrigins } = getOAuthConfig();
  try {
    const parsed = new URL(uri);
    return allowedRedirectOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

export function readClientCredentials(request: Request, body: URLSearchParams) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, separator)),
          clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
        };
      }
    } catch {
      return undefined;
    }
  }

  const clientId = body.get("client_id");
  const clientSecret = body.get("client_secret");
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

export function validateClientCredentials(credentials?: {
  clientId: string;
  clientSecret: string;
}) {
  if (!credentials) return false;
  const { clientId, clientSecret } = getOAuthConfig();
  const suppliedSecret = Buffer.from(credentials.clientSecret);
  const expectedSecret = Buffer.from(clientSecret);
  return (
    credentials.clientId === clientId &&
    suppliedSecret.length === expectedSecret.length &&
    timingSafeEqual(suppliedSecret, expectedSecret)
  );
}
