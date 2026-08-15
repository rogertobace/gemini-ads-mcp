import { protectedResourceHandler } from "mcp-handler";

import { getPublicOrigin } from "@/src/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = getPublicOrigin(request);
  return protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}/mcp`,
  })(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
