/**
 * Example 09 — Gate on-chain execution with a confirmation handler
 * ────────────────────────────────────────────────────────────────────────────
 * The agent can PLAN a transaction (resolve tokens, build a route), but a write
 * to the chain only happens after your `onTransactionConfirmation` handler
 * approves it. This is the safety boundary between "the model decided" and
 * "the wallet signed".
 *
 * This example asks for a swap with `transactionConfirmationMode: "on"` and a
 * handler that inspects the request and ALWAYS returns false — so nothing is
 * ever broadcast. (The handler runs before any key is used, so no private key
 * is required to run this example.)
 *
 * Run:  npm run example:09
 * Needs: OPENAI_API_KEY
 */
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK, type TransactionConfirmationRequest } from "dzapai";

async function main(): Promise<void> {
  assertModelKey();

  const sdk = new DZapSDK();
  await sdk.initialize();

  section("Ask for a swap with confirmation required");

  const result = await sdk.ask({
    userQuery: "Swap 0.01 WETH to USDC on Ethereum.",
    metadata: buildMetadata("1"),

    // Require explicit approval before any on-chain write.
    transactionConfirmationMode: "on",

    // Your approval UX lives here. Return true to execute, false to cancel.
    // We inspect the proposed transaction and reject it — nothing is broadcast.
    onTransactionConfirmation: async (request: TransactionConfirmationRequest) => {
      section("Confirmation requested (handler)");
      console.log("type        :", request.type);
      console.log("from         :", request.srcTokenSymbol, `(chain ${request.srcChainId})`);
      console.log("to           :", request.destTokenSymbol, `(chain ${request.destChainId})`);
      console.log("amount in    :", request.amountIn);
      console.log("amount out   :", request.amountOut);
      console.log("provider     :", request.provider);
      console.log("\nDECISION: rejecting (this example never broadcasts).");
      return false; // ← deny. Return true in a real app once the user approves.
    },
  });

  section("Final answer");
  console.log(result.finalText);
  console.log("\ntools used:", result.steps.map((s) => s.toolName).join(", ") || "(none)");
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
