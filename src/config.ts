const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image";
const DEFAULT_GEMINI_IMAGE_SIZE = "1K";
const GEMINI_IMAGE_SIZES = ["1K", "2K", "4K"] as const;

type GeminiImageSize = (typeof GEMINI_IMAGE_SIZES)[number];

function getGeminiImageSize(): GeminiImageSize {
  const value = (
    process.env.GEMINI_IMAGE_SIZE?.trim() || DEFAULT_GEMINI_IMAGE_SIZE
  ).toUpperCase();

  if (!GEMINI_IMAGE_SIZES.includes(value as GeminiImageSize)) {
    throw new Error("GEMINI_IMAGE_SIZE must be 1K, 2K or 4K.");
  }

  return value as GeminiImageSize;
}

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return {
    apiKey,
    model:
      process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL,
    imageSize: getGeminiImageSize(),
    baseUrl: trimTrailingSlash(
      process.env.GEMINI_API_BASE_URL?.trim() ||
        "https://generativelanguage.googleapis.com/v1beta",
    ),
  };
}

export function getOAuthConfig() {
  const clientId = process.env.MCP_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET?.trim();
  const authSecret = process.env.MCP_AUTH_SECRET?.trim();

  if (!clientId || !clientSecret || !authSecret) {
    throw new Error(
      "MCP_OAUTH_CLIENT_ID, MCP_OAUTH_CLIENT_SECRET and MCP_AUTH_SECRET must be configured.",
    );
  }

  if (clientSecret.length < 32 || authSecret.length < 32) {
    throw new Error("OAuth secrets must contain at least 32 characters.");
  }

  const allowedRedirectOrigins = (
    process.env.MCP_ALLOWED_REDIRECT_ORIGINS ||
    "https://chatgpt.com,https://platform.openai.com"
  )
    .split(",")
    .map((origin) => trimTrailingSlash(origin.trim()))
    .filter(Boolean);

  return { clientId, clientSecret, authSecret, allowedRedirectOrigins };
}

export function getPublicOrigin(request?: Request) {
  const explicit = process.env.MCP_PUBLIC_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return `https://${trimTrailingSlash(productionUrl)}`;

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
    return new URL(request.url).origin;
  }

  const deploymentUrl = process.env.VERCEL_URL?.trim();
  if (deploymentUrl) return `https://${trimTrailingSlash(deploymentUrl)}`;

  return "http://localhost:3000";
}

export function getConfigurationStatus() {
  return {
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    oauthConfigured: Boolean(
      process.env.MCP_OAUTH_CLIENT_ID?.trim() &&
        process.env.MCP_OAUTH_CLIENT_SECRET?.trim() &&
        process.env.MCP_AUTH_SECRET?.trim(),
    ),
    model:
      process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL,
    imageSize: getGeminiImageSize(),
  };
}
