import { getConfigurationStatus } from "@/src/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuration = getConfigurationStatus();
  const ready = configuration.geminiConfigured && configuration.oauthConfigured;
  return Response.json(
    { status: ready ? "ready" : "configuration_required", configuration },
    { status: ready ? 200 : 503 },
  );
}
