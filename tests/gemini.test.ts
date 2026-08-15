import { afterEach, describe, expect, it } from "vitest";

import { generateAdImage } from "@/src/gemini";

const input = {
  company_name: "Nadecor",
  offer: "Móveis planejados premium",
  audience: "Proprietários de imóveis",
  angle: "Transformação",
  objective: "Geração de leads",
  format: "4:5" as const,
  cta: "Saiba mais",
  language: "Português do Brasil",
};

describe("generateAdImage", () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("extracts inline image data without exposing the API key in the URL", async () => {
    process.env.GEMINI_API_KEY = "private-test-key";
    const fakeFetch: typeof fetch = async (url, init) => {
      expect(String(url)).not.toContain("private-test-key");
      expect(new Headers(init?.headers).get("x-goog-api-key")).toBe(
        "private-test-key",
      );
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { text: "Generated" },
                { inlineData: { mimeType: "image/png", data: "aW1hZ2U=" } },
              ],
            },
          },
        ],
      });
    };

    const result = await generateAdImage(input, fakeFetch);
    expect(result.data).toBe("aW1hZ2U=");
    expect(result.mimeType).toBe("image/png");
  });
});
