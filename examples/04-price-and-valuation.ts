/**
 * Example 04 — Compose tools into a valuation workflow
 * ────────────────────────────────────────────────────────────────────────────
 * Most useful flows chain a few tools together. Here we build a deterministic
 * "how much of TOKEN can I buy for $X" helper by composing three tools:
 *
 *   TokenAddressTool        symbol  -> contract address + decimals
 *   PriceTool               address -> USD price
 *   DollarToTokenAmountTool address + USD amount -> token amount
 *
 * No model is involved, so the workflow is fully reproducible. (Needs network.)
 *
 * Run:  npm run example:04
 */
import { section } from "../shared/config";
import { DZapSDK } from "dzapai";

const CHAIN_ID = 1; // Ethereum

async function valuation(sdk: DZapSDK, symbol: string, usdAmount: number) {
  // 1. Resolve the symbol to an address (tools expect addresses, not symbols).
  const resolved = await sdk.executeTool("TokenAddressTool", { symbol, chainId: CHAIN_ID });
  if (!resolved.success) throw new Error(`Could not resolve ${symbol}`);
  const { address, decimals } = resolved.output as { address: string; decimals: number };

  // 2. Fetch the live price. PriceTool returns an address -> price map, so look
  //    the value up by our address (case-insensitively) rather than assuming
  //    position — the map can contain more than the one address you asked for.
  const priceResult = await sdk.executeTool("PriceTool", {
    tokenAddresses: address,
    chainId: CHAIN_ID,
  });
  const priceMap = priceResult.output as Record<string, string>;
  const priceKey = Object.keys(priceMap).find((k) => k.toLowerCase() === address.toLowerCase());
  const unitPrice = priceKey ? Number(priceMap[priceKey]) : NaN;

  // 3. Convert a USD amount into a token amount.
  const conversion = await sdk.executeTool("DollarToTokenAmountTool", {
    tokenAddresses: address,
    chainId: CHAIN_ID,
    amount: usdAmount,
  });
  const { tokenAmount } = conversion.output as { tokenAmount: number };

  return { symbol, address, decimals, unitPrice, usdAmount, tokenAmount };
}

async function main(): Promise<void> {
  const sdk = new DZapSDK();
  await sdk.initialize();

  section("How much can $250 buy?");
  for (const symbol of ["WETH", "USDC", "UNI"]) {
    const v = await valuation(sdk, symbol, 250);
    console.log(
      `$${v.usdAmount} of ${v.symbol.padEnd(5)} = ${v.tokenAmount.toFixed(6)} ${v.symbol}` +
        `  (unit price $${v.unitPrice})`,
    );
  }
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
