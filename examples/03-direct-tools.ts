/**
 * Example 03 — Direct tool execution (no LLM)
 * ────────────────────────────────────────────────────────────────────────────
 * Sometimes you do not want a model in the loop — you want a deterministic,
 * typed call to a specific tool. `sdk.listTools()` enumerates the catalog and
 * `sdk.executeTool(name, input)` runs one tool directly and returns a structured
 * result (success flag, parsed output, duration, and error details).
 *
 * Because there is no model call, this example does NOT require OPENAI_API_KEY
 * (it still needs network access for live market data).
 *
 * Run:  npm run example:03
 */
import { section } from "../shared/config";
import { DZapSDK } from "dzapai";

async function main(): Promise<void> {
  const sdk = new DZapSDK();
  await sdk.initialize();

  // 1. Discover the available tools.
  section("Tool catalog");
  const tools = sdk.listTools();
  console.log(`${tools.length} tools available:`);
  for (const tool of tools) {
    console.log(`  • ${tool.name}${tool.isInteractive ? "  [interactive]" : ""}`);
  }

  // 2. Resolve a symbol to its contract address + decimals.
  section("TokenAddressTool — resolve USDC on Ethereum");
  const usdc = await sdk.executeTool("TokenAddressTool", {
    symbol: "USDC",
    chainId: 1,
  });
  console.log("success :", usdc.success, `(${usdc.durationMs}ms)`);
  console.log("output  :", usdc.output);

  // 3. Look up a live price using the address we just resolved.
  const usdcAddress = (usdc.output as { address: string }).address;
  section("PriceTool — price of USDC");
  const price = await sdk.executeTool("PriceTool", {
    tokenAddresses: usdcAddress,
    chainId: 1,
  });
  console.log("success :", price.success, `(${price.durationMs}ms)`);
  console.log("output  :", price.output);

  // 4. A no-input tool: current trending tokens.
  section("TrendingTokenTool — trending tokens");
  const trending = await sdk.executeTool("TrendingTokenTool");
  const coins = (trending.output as Array<{ symbol: string }>).slice(0, 5);
  console.log("top symbols :", coins.map((c) => c.symbol).join(", "));

  // Every execution returns the same typed envelope — handy for backends.
  section("Result envelope shape");
  console.log(Object.keys(price).join(", "));
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
