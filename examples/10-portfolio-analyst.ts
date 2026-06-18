/**
 * Example 10 — Autonomous Portfolio Analyst (SDK, multi-step)
 * ════════════════════════════════════════════════════════════════════════════
 * A realistic, multi-phase workflow that shows how to build a higher-level agent
 * on top of `DZapSDK`. It combines BOTH styles of tool use:
 *
 *   • Deterministic data gathering with executeTool() (run in parallel)
 *   • LLM synthesis + planning with ask() (multi-turn, streamed)
 *
 * Phases
 *   1. Gather    — pull balances, DeFi positions, trending tokens, and BTC/ETH
 *                  price predictions concurrently (fault-tolerant).
 *   2. Brief     — hand the snapshot to the agent for a portfolio briefing.
 *   3. Strategize— same session follow-up: propose ONE rebalancing swap. The
 *                  transaction is gated by a confirmation handler that rejects
 *                  it, so this stays a dry run (nothing is broadcast).
 *   4. Audit     — export the full session snapshot (conversation + tool logs).
 *
 * Run:  npm run example:10
 * Needs: OPENAI_API_KEY
 */
import { assertModelKey, buildMetadata, section } from "../shared/config";
import { DZapSDK, type SDKToolExecutionResult, type TransactionConfirmationRequest } from "dzapai";

const CHAIN_ID = "1"; // Ethereum
// A public wallet with on-chain history, used read-only for the demo.
const WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/** Run a tool and never throw — return a labeled result for the snapshot. */
async function safeTool(
  sdk: DZapSDK,
  label: string,
  name: string,
  input: Record<string, unknown>,
): Promise<{ label: string; ok: boolean; output: unknown }> {
  try {
    const result: SDKToolExecutionResult = await sdk.executeTool(name, input);
    return { label, ok: result.success, output: result.success ? result.output : result.error };
  } catch (error) {
    return { label, ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  assertModelKey();

  const sdk = new DZapSDK();
  await sdk.initialize();
  const metadata = buildMetadata(CHAIN_ID, WALLET);

  // ── Phase 1: gather a market + wallet snapshot (concurrently) ──────────────
  section("Phase 1 — Gathering wallet & market data (parallel)");
  const snapshot = await Promise.all([
    safeTool(sdk, "balances", "BalanceTool", { chainId: 1, account: WALLET, for_user: true }),
    safeTool(sdk, "aave_positions", "DefiPositionsTool", { address: WALLET, chain: 1, provider: "aave" }),
    safeTool(sdk, "trending", "TrendingTokenTool", {}),
    safeTool(sdk, "btc_forecast", "PricePredictionTool", { tokenSymbol: "BTC" }),
    safeTool(sdk, "eth_forecast", "PricePredictionTool", { tokenSymbol: "ETH" }),
  ]);

  for (const item of snapshot) {
    const preview = JSON.stringify(item.output).slice(0, 90);
    console.log(`  ${item.ok ? "✓" : "✗"} ${item.label.padEnd(15)} ${preview}…`);
  }

  // Compact the snapshot into something the model can reason over.
  const snapshotForPrompt = snapshot
    .map((item) => `${item.label}: ${JSON.stringify(item.output)}`)
    .join("\n")
    .slice(0, 6000);

  // ── Phase 2: agent synthesizes a briefing from the snapshot ────────────────
  section("Phase 2 — Portfolio briefing (agent synthesis, streamed)");
  const briefing = await sdk.ask({
    userQuery:
      "You are a DeFi portfolio analyst. Using ONLY the snapshot below, write a concise briefing: " +
      "(1) what the wallet holds, (2) one notable market trend, (3) the BTC vs ETH short-term outlook. " +
      "Keep it under 120 words.\n\nSNAPSHOT:\n" +
      snapshotForPrompt,
    metadata,
    onStep: (step) => console.log(`  …called ${step.toolName}`),
  });
  const sessionId = briefing.sessionId;
  console.log(`\n${briefing.finalText}`);

  // ── Phase 3: same-session follow-up — propose & gate a rebalance swap ──────
  section("Phase 3 — Strategy + dry-run swap (confirmation gated)");
  const strategy = await sdk.ask({
    sessionId, // continue the same conversation
    userQuery:
      "Based on your briefing, propose ONE concrete rebalancing swap on Ethereum " +
      "(for example swapping a small amount of WETH to USDC). Build the route and attempt it.",
    metadata,
    transactionConfirmationMode: "on",
    onStep: (step) => console.log(`  …called ${step.toolName}`),
    onTransactionConfirmation: async (req: TransactionConfirmationRequest) => {
      console.log(
        `\n  [gate] proposed ${req.type}: ${req.srcTokenSymbol} → ${req.destTokenSymbol} ` +
          `via ${req.provider} (amountIn=${req.amountIn})`,
      );
      console.log("  [gate] DRY RUN — rejecting, nothing is broadcast.");
      return false;
    },
  });
  console.log(`\n${strategy.finalText}`);

  // ── Phase 4: export the audit trail ────────────────────────────────────────
  section("Phase 4 — Session audit trail");
  const history = sdk.getSessionHistory(sessionId);
  console.log("summary:", history?.summary);
  console.log(`conversation turns: ${history?.conversation.length}`);
  console.log(`tool log entries  : ${history?.logs.length}`);
  console.log(
    "tools used across session:",
    [...briefing.steps, ...strategy.steps].map((s) => s.toolName).join(", ") || "(none)",
  );
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
