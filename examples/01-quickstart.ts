/**
 * Example 01 — Quickstart
 * ────────────────────────────────────────────────────────────────────────────
 * The smallest possible DZap AI program: create the SDK, initialize it, and ask
 * one natural-language question. The agent decides which tool(s) to call and
 * returns a final natural-language answer.
 *
 * Run:  npm run example:01
 * Needs: OPENAI_API_KEY  (the agent's model)
 */
// Import the shared setup first: it loads `.env` and quiets the SDK logs before
// the `dzapai` runtime is loaded (see the note in shared/config.ts).
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK } from "dzapai";

async function main(): Promise<void> {
  // Fail early with a clear message if the model key is missing.
  assertModelKey();

  // 1. Construct the SDK. No constructor options are required.
  const sdk = new DZapSDK();

  // 2. Initialize the runtime. With no options it is ready immediately;
  //    pass { initializeRetrieval: true } to also warm up docs RAG (example 06).
  await sdk.initialize();

  // 3. Ask a question. Every ask() call requires `metadata.accountInfo[]`
  //    describing the connected wallet(s) — here a read-only Ethereum context.
  section("Ask: top trending tokens");
  const result = await sdk.ask({
    userQuery: "What are the top 3 trending tokens right now? Keep it short.",
    metadata: buildMetadata("1"), // chainId "1" = Ethereum
  });

  // 4. The result carries the final text plus useful metadata.
  console.log(result.finalText);
  console.log("\nsession id :", result.sessionId);
  console.log("chain id   :", result.chainId);
  console.log(
    "tools used :",
    result.steps.map((step) => step.toolName).join(", ") || "(none)",
  );
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
