/**
 * Example 02 — Streaming tool steps
 * ────────────────────────────────────────────────────────────────────────────
 * Real agents call several tools before answering. The `onStep` callback fires
 * once per completed tool step, so you can stream progress to a UI or log while
 * the agent is still working. The same events are also returned in `result.steps`.
 *
 * Run:  npm run example:02
 * Needs: OPENAI_API_KEY
 */
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK, type AskStepEvent } from "dzapai";

async function main(): Promise<void> {
  assertModelKey();

  const sdk = new DZapSDK();
  await sdk.initialize();

  section("Streaming a multi-tool answer");

  let stepNumber = 0;
  const result = await sdk.ask({
    // A prompt that needs more than one tool: resolve a token, then price it.
    userQuery: "What is the current USD price of UNI on Ethereum?",
    metadata: buildMetadata("1"),

    // Called as soon as each tool step finishes.
    onStep: (step: AskStepEvent) => {
      stepNumber += 1;
      console.log(`\n[step ${stepNumber}] ${step.toolName}`);
      console.log("  input :", JSON.stringify(step.input));
      // `data` is a short human-readable summary the agent produced for the step.
      console.log("  note  :", step.data);
    },
  });

  section("Final answer");
  console.log(result.finalText);

  console.log(
    `\nTotal tool steps: ${result.steps.length} (${result.steps
      .map((step) => step.toolName)
      .join(" → ")})`,
  );
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
