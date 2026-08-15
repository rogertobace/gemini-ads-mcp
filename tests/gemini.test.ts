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
    delete process.env.GEMINI_IMAGE_MODEL;
    delete process.env.GEMINI_IMAGE_SIZE;
  });

  it("uses Gemini 3 Pro Image through the Interactions API without exposing the key", async () => {
    process.env.GEMINI_API_KEY = "private-test-key";

    const fakeFetch: typeof fetch = async (url, init) => {
      expect(String(url)).toBe(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
      );
      expect(String(url)).not.toContain("private-test-key");
      expect(new Headers(init?.headers).get("x-goog-api-key")).toBe(
        "private-test-key",
      );
      expect(new Headers(init?.headers).get("api-revision")).toBe(
        "2026-05-20",
      );

      const request = JSON.parse(String(init?.body));
      expect(request).toMatchObject({
        model: "gemini-3-pro-image",
        store: false,
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "4:5",
          image_size: "1K",
        },
      });

      return Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [
              { type: "image", mime_type: "image/jpeg", data: "aW1hZ2U=" },
            ],
          },
        ],
      });
    };

    const result = await generateAdImage(input, fakeFetch);
    expect(result.data).toBe("aW1hZ2U=");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.model).toBe("gemini-3-pro-image");
  });
});
