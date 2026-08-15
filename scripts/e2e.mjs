import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";

const baseUrl = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const clientId = process.env.MCP_OAUTH_CLIENT_ID;
const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET;

assert(clientId, "MCP_OAUTH_CLIENT_ID is required");
assert(clientSecret, "MCP_OAUTH_CLIENT_SECRET is required");

const parseMcpPayload = async (response) => {
  const body = await response.text();
  return response.headers.get("content-type")?.includes("text/event-stream")
    ? JSON.parse(
        body
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6) || "{}",
      )
    : JSON.parse(body);
};

const healthResponse = await fetch(`${baseUrl}/health`);
assert.equal(healthResponse.status, 200, "Health endpoint is not ready");

const metadataResponse = await fetch(
  `${baseUrl}/.well-known/oauth-authorization-server`,
);
assert.equal(metadataResponse.status, 200, "OAuth metadata is unavailable");

const unauthenticatedMcp = await fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
assert.equal(unauthenticatedMcp.status, 401, "MCP must reject anonymous requests");

const verifier = randomBytes(48).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const redirectUri = "https://chatgpt.com/callback";
const authorizationUrl = new URL(`${baseUrl}/oauth/authorize`);
authorizationUrl.searchParams.set("response_type", "code");
authorizationUrl.searchParams.set("client_id", clientId);
authorizationUrl.searchParams.set("redirect_uri", redirectUri);
authorizationUrl.searchParams.set("scope", "generate:ads");
authorizationUrl.searchParams.set("state", "e2e");
authorizationUrl.searchParams.set("code_challenge", challenge);
authorizationUrl.searchParams.set("code_challenge_method", "S256");

const authorizationResponse = await fetch(authorizationUrl, {
  redirect: "manual",
});
assert.equal(authorizationResponse.status, 302, "OAuth authorization failed");
const location = authorizationResponse.headers.get("location");
assert(location, "OAuth authorization returned no redirect");
const code = new URL(location).searchParams.get("code");
assert(code, "OAuth authorization returned no code");

const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
  method: "POST",
  headers: {
    authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    "content-type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }),
});
assert.equal(tokenResponse.status, 200, "OAuth token exchange failed");
const tokenPayload = await tokenResponse.json();
assert(tokenPayload.access_token, "OAuth returned no access token");

const toolsResponse = await fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${tokenPayload.access_token}`,
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }),
});
assert.equal(toolsResponse.status, 200, "Authenticated MCP tools/list failed");
const toolsPayload = await parseMcpPayload(toolsResponse);
const toolNames = toolsPayload.result?.tools?.map((tool) => tool.name) || [];
assert(toolNames.includes("generate_ad"), "generate_ad was not advertised");

const generationResponse = await fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${tokenPayload.access_token}`,
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "generate_ad",
      arguments: {
        company_name: "Nadecor",
        offer: "Móveis planejados premium",
        audience: "Proprietários de imóveis",
        angle: "Transformação",
        objective: "Geração de leads",
        format: "4:5",
        cta: "Solicite seu projeto",
        language: "Português do Brasil",
      },
    },
  }),
});
assert.equal(generationResponse.status, 200, "MCP generate_ad call failed");
const generationPayload = await parseMcpPayload(generationResponse);
const image = generationPayload.result?.content?.find(
  (content) => content.type === "image",
);
assert.equal(image?.data, "aW1hZ2U=", "MCP returned no generated image");

console.log(
  JSON.stringify({
    health: "ready",
    anonymousAccess: "blocked",
    oauth: "working",
    tools: toolNames,
    imageReturn: "working",
  }),
);
