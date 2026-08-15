import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  createAccessToken,
  createAuthorizationCode,
  validatePkce,
  verifySignedToken,
} from "@/src/oauth";

describe("single-tenant OAuth tokens", () => {
  beforeEach(() => {
    process.env.MCP_OAUTH_CLIENT_ID = "chatgpt-gemini-ads";
    process.env.MCP_OAUTH_CLIENT_SECRET = "c".repeat(48);
    process.env.MCP_AUTH_SECRET = "a".repeat(48);
  });

  it("issues short-lived authorization codes", () => {
    const token = createAuthorizationCode({
      clientId: "chatgpt-gemini-ads",
      redirectUri: "https://chatgpt.com/callback",
    });
    const payload = verifySignedToken(token, "authorization_code");
    expect(payload?.redirect_uri).toBe("https://chatgpt.com/callback");
  });

  it("rejects a token when its expected type does not match", () => {
    const token = createAccessToken(
      "chatgpt-gemini-ads",
      "https://example.com/mcp",
    );
    expect(verifySignedToken(token, "refresh_token")).toBeUndefined();
  });

  it("validates S256 PKCE", () => {
    const verifier = "a-secure-pkce-verifier-with-enough-entropy-123456789";
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    expect(validatePkce(verifier, challenge)).toBe(true);
  });
});
