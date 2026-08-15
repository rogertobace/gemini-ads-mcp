import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";

const port = "3210";
const mockGeminiPort = "3211";
const mockGemini = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    const payload = JSON.parse(body || "{}");
    if (!request.headers["x-goog-api-key"] || !payload.contents) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Invalid mock request" } }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { text: "Mock image generated" },
                { inlineData: { mimeType: "image/png", data: "aW1hZ2U=" } },
              ],
            },
          },
        ],
      }),
    );
  });
});
mockGemini.listen(Number(mockGeminiPort), "127.0.0.1");
await once(mockGemini, "listening");

const testEnv = {
  ...process.env,
  GEMINI_API_KEY: "dummy",
  GEMINI_API_BASE_URL: `http://127.0.0.1:${mockGeminiPort}/v1beta`,
  MCP_OAUTH_CLIENT_ID: "chatgpt-gemini-ads",
  MCP_OAUTH_CLIENT_SECRET: "c".repeat(48),
  MCP_AUTH_SECRET: "a".repeat(48),
};

const server = spawn(
  process.execPath,
  [
    "-r",
    "./scripts/sandbox-network-preload.cjs",
    "./node_modules/next/dist/bin/next",
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    port,
  ],
  { env: testEnv, stdio: ["ignore", "pipe", "pipe"] },
);

let serverOutput = "";
const recordOutput = (chunk) => {
  const text = chunk.toString();
  serverOutput += text;
  process.stderr.write(text);
};
server.stdout.on("data", recordOutput);
server.stderr.on("data", recordOutput);

try {
  const deadline = Date.now() + 10_000;
  while (!serverOutput.includes("Ready")) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited with code ${server.exitCode}`);
    }
    if (Date.now() > deadline) throw new Error("Timed out waiting for Next server");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const test = spawn(process.execPath, ["scripts/e2e.mjs"], {
    env: { ...testEnv, E2E_BASE_URL: `http://127.0.0.1:${port}` },
    stdio: "inherit",
  });
  const [code] = await once(test, "exit");
  if (code !== 0) process.exitCode = code ?? 1;
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  mockGemini.close();
  await once(mockGemini, "close");
}
