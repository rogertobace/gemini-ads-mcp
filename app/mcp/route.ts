import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { generateAdInputSchema } from "@/src/ad-schema";
import { getPublicOrigin } from "@/src/config";
import { generateAdImage } from "@/src/gemini";
import { verifySignedToken } from "@/src/oauth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "generate_ad",
      {
        title: "Generate static ad with Gemini",
        description:
          "Use this when the user asks to create one finished static advertising image with Gemini. Collect the company, offer, audience, creative angle and objective before calling it. This v1 generates exactly one image per call.",
        inputSchema: generateAdInputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      async (input) => {
        try {
          const result = await generateAdImage(input);
          return {
            structuredContent: {
              status: "generated",
              model: result.model,
              format: input.format,
              company_name: input.company_name,
            },
            content: [
              {
                type: "image",
                data: result.data,
                mimeType: result.mimeType,
              },
              {
                type: "text",
                text: `Anúncio gerado com ${result.model} no formato ${input.format}.${result.notes ? `\nObservação do modelo: ${result.notes}` : ""}`,
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown generation error";
          return {
            isError: true,
            content: [{ type: "text", text: message }],
          };
        }
      },
    );
  },
  {
    serverInfo: { name: "gemini-ads", version: "1.0.0" },
    instructions:
      "Generate static ads only through generate_ad. Before calling it, ensure company, offer, audience, angle and objective are known. The v1 returns one image per call. Never claim an image was generated unless the tool returns image content.",
    maxSubscriptions: 0,
  },
);

const authenticatedHandler = withMcpAuth(
  mcpHandler,
  async (request, bearerToken) => {
    if (!bearerToken) return undefined;
    const payload = verifySignedToken(bearerToken, "access_token");
    if (!payload) return undefined;

    const audience = `${getPublicOrigin(request)}/mcp`;
    if (payload.aud !== audience) return undefined;

    return {
      token: bearerToken,
      clientId: payload.client_id,
      scopes: payload.scope?.split(" ") || [],
      expiresAt: payload.exp,
    };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    requiredScopes: ["generate:ads"],
  },
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
