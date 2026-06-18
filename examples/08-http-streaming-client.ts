/**
 * Example 08 — Consume the HTTP /ask_stream SSE endpoint
 * ────────────────────────────────────────────────────────────────────────────
 * The Express server exposes one streaming endpoint, `POST /ask_stream`, that
 * emits Server-Sent Events: a `step` event per tool call, a final `finalText`
 * event, then `[DONE]`.
 *
 * For a self-contained demo this example boots the server as a subprocess, then
 * connects to it as a plain HTTP client. In your own app you would point the
 * client at an already-running server (local or deployed) and skip the spawn.
 *
 * Run:  npm run example:08
 * Needs: OPENAI_API_KEY
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { assertModelKey, section } from "../shared/config";

const require = createRequire(import.meta.url);
const serverEntry = join(dirname(require.resolve("dzapai")), "server", "index.js");
const PORT = 4178;
const BASE_URL = `http://localhost:${PORT}`;

/** Poll the root endpoint until the server answers (or time out). */
async function waitForServer(timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server did not start in time.");
}

/** POST to /ask_stream and parse the Server-Sent Events stream. */
async function askStream(userQuery: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/ask_stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_query: userQuery,
      session_id: "", // empty → the server creates a fresh session
      metadata: { accountInfo: [{ blockchain: "evm", chain: "1", user_account: "0x0000000000000000000000000000000000000000" }] },
    }),
  });
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // SSE frames are separated by a blank line ("\n\n"); each frame has a "data:" line.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const data = dataLine.slice("data:".length).trim();

      if (data === "[DONE]") {
        console.log("\n[stream complete]");
        return;
      }

      const event = JSON.parse(data).response;
      if (event.type === "step") {
        console.log(`  [step] ${event.tool_name}: ${event.data}`);
      } else if (event.type === "finalText") {
        console.log(`\nfinal answer:\n${event.data}`);
      }
    }
  }
}

async function main(): Promise<void> {
  assertModelKey();

  section("Starting the DZap HTTP server");
  const server = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(PORT), LOG_LEVEL: "error" },
    stdio: "ignore",
  });

  try {
    await waitForServer();
    console.log(`Server ready at ${BASE_URL}`);

    section("Streaming POST /ask_stream");
    await askStream("What are the top 2 trending tokens? Keep it brief.");
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
