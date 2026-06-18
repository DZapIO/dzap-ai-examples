/**
 * Example 05 — Sessions and conversation history
 * ────────────────────────────────────────────────────────────────────────────
 * Pass the same `sessionId` across calls and the agent remembers the earlier
 * turns — so a follow-up like "and what about BTC?" works without restating
 * context. Each `ask()` returns the session id; reuse it on the next call.
 *
 * Two ways to read back a session:
 *   sdk.getChatHistory(id)     -> the raw model message list
 *   sdk.getSessionHistory(id)  -> a richer snapshot (summary, metadata, logs)
 *
 * Run:  npm run example:05
 * Needs: OPENAI_API_KEY
 */
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK } from "dzapai";

async function main(): Promise<void> {
  assertModelKey();

  const sdk = new DZapSDK();
  await sdk.initialize();
  const metadata = buildMetadata("1");

  // Turn 1 — start a new conversation (no sessionId passed → one is created).
  section("Turn 1");
  const first = await sdk.ask({
    userQuery: "What is the current price of ETH? One short sentence.",
    metadata,
  });
  const sessionId = first.sessionId;
  console.log(`[session ${sessionId}]`);
  console.log("Q: What is the current price of ETH?");
  console.log("A:", first.finalText);

  // Turn 2 — reuse the session id so the agent has the earlier context.
  section("Turn 2 (same session, follow-up)");
  const second = await sdk.ask({
    userQuery: "And what about BTC? Same format.",
    metadata,
    sessionId, // <-- carries the conversation forward
  });
  console.log("Q: And what about BTC?");
  console.log("A:", second.finalText);

  // Read back the raw conversation history.
  section("Conversation history");
  const history = sdk.getChatHistory(sessionId);
  for (const message of history) {
    const text = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
    console.log(`  ${message.role.padEnd(9)} | ${text.slice(0, 80).replace(/\s+/g, " ")}…`);
  }

  // Read back the richer session snapshot (summary + counters).
  section("Session snapshot");
  const snapshot = sdk.getSessionHistory(sessionId);
  console.log("summary:", snapshot?.summary);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
