import { getConfigurationStatus } from "@/src/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json({
    service: "gemini-ads-mcp",
    version: "1.0.0",
    status: "ok",
    configuration: getConfigurationStatus(),
    endpoints: {
      mcp: `${origin}/mcp`,
      health: `${origin}/health`,
      oauthMetadata: `${origin}/.well-known/oauth-authorization-server`,
      protectedResource: `${origin}/.well-known/oauth-protected-resource`,
    },
  });
}
