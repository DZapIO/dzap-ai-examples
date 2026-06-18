/**
 * Example 06 — Retrieval-augmented answers over the DZap docs
 * ────────────────────────────────────────────────────────────────────────────
 * The SDK can build a small in-memory BM25 index over the DZap documentation and
 * answer questions grounded in it. Enable it with `initialize({ initializeRetrieval: true })`.
 *
 * This example shows both layers:
 *   1. RagOverDocsTool directly — the raw retrieved chunks (no model).
 *   2. ask() — the agent uses retrieval to answer a docs question.
 *
 * The first run fetches and indexes the docs, so it takes a few extra seconds.
 *
 * Run:  npm run example:06
 * Needs: OPENAI_API_KEY (for the ask() step), network access (to fetch docs)
 */
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK } from "dzapai";

async function main(): Promise<void> {
  assertModelKey();

  const sdk = new DZapSDK();

  // Build the retrieval index up front.
  console.log("Indexing DZap docs (first run only, please wait)…");
  await sdk.initialize({ initializeRetrieval: true });

  // 1. Inspect what retrieval returns on its own — useful for debugging or for
  //    building your own answer layer.
  section("RagOverDocsTool — raw retrieved chunks");
  const retrieval = await sdk.executeTool("RagOverDocsTool", {
    query: "What is DZap and what does the SDK do?",
  });
  const documents = (retrieval.output as { documents: Array<{ source: string; score: number; text: string }> })
    .documents;
  documents.slice(0, 3).forEach((doc, i) => {
    console.log(`\n#${i + 1}  score=${doc.score.toFixed(3)}  ${doc.source}`);
    console.log("   ", doc.text.replace(/\s+/g, " ").slice(0, 160), "…");
  });

  // 2. Let the agent answer a question grounded in those docs.
  section("ask() — grounded answer");
  const result = await sdk.ask({
    userQuery: "Using the DZap docs, briefly explain what DZap offers. 2-3 sentences.",
    metadata: buildMetadata("1"),
  });
  console.log(result.finalText);
  console.log("\ntools used:", result.steps.map((s) => s.toolName).join(", ") || "(none)");
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
