import type { GenerateAdInput } from "@/src/ad-schema";
import { buildAdPrompt } from "@/src/ad-prompt";
import { getGeminiConfig } from "@/src/config";

type InteractionContent = {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
};

type GeminiResponse = {
  status?: string;
  steps?: Array<{
    type?: string;
    content?: InteractionContent[];
  }>;
  error?: { code?: number; message?: string; status?: string };
};

export type GeneratedAd = {
  data: string;
  mimeType: string;
  model: string;
  prompt: string;
  notes?: string;
};

const MAX_IMAGE_BASE64_CHARS = 3_500_000;

export async function generateAdImage(
  input: GenerateAdInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<GeneratedAd> {
  const config = getGeminiConfig();
  const prompt = buildAdPrompt(input);
  const endpoint = `${config.baseUrl}/interactions`;

  const response = await fetchImplementation(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": config.apiKey,
      "api-revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt,
      store: false,
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: input.format,
        image_size: config.imageSize,
      },
    }),
    signal: AbortSignal.timeout(110_000),
  });

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const detail = payload.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini image generation failed: ${detail}`);
  }

  const outputContent = payload.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || []);

  const imagePart = outputContent?.find(
    (part) => part.type === "image" && part.data,
  );
  const notes = outputContent
    ?.filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!imagePart?.data) {
    throw new Error(
      `Gemini returned no image. Interaction status: ${payload.status || "unknown"}.${notes ? ` Detail: ${notes}` : ""}`,
    );
  }

  if (imagePart.data.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error(
      "Generated image exceeded the safe inline MCP response size. Configure object storage before retrying this output size.",
    );
  }

  return {
    data: imagePart.data,
    mimeType: imagePart.mime_type || "image/jpeg",
    model: config.model,
    prompt,
    notes: notes || undefined,
  };
}
