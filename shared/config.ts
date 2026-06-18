/**
 * Shared helpers used by every example.
 *
 * Keeps the individual examples focused on the DZap AI concept they demonstrate
 * rather than on boilerplate (env loading, building wallet metadata, pretty
 * logging).
 */
import "dotenv/config";
import type { Metadata } from "dzapai";

// Keep example output focused on the DZap concepts. The SDK logs through winston
// at the level named by LOG_LEVEL, read once when the runtime is first imported —
// so this default must be set before `dzapai` is imported. That is why every
// example imports this module *before* `dzapai`. Set LOG_LEVEL=info (or debug)
// in your environment to watch the agent's internal tool calls.
process.env.LOG_LEVEL ??= "error";

/** A well-known public address, used by read-only examples (Vitalik's wallet). */
export const DEMO_WALLET_ADDRESS =
  process.env.DEMO_WALLET_ADDRESS?.trim() ||
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/** Read an env var or throw a helpful error pointing at `.env`. */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set it (see the README).`,
    );
  }
  return value;
}

/** Fail fast with a clear message if the model key is not configured. */
export function assertModelKey(): void {
  requireEnv("OPENAI_API_KEY");
}

/**
 * Build the `metadata.accountInfo[]` that every `ask()` call requires.
 *
 * @param chainId  numeric chain id as a string (e.g. "1" for Ethereum)
 * @param account  wallet address (defaults to the demo address)
 * @param privateKey optional key — ONLY used by the execution example
 */
export function buildMetadata(
  chainId: string,
  account: string = DEMO_WALLET_ADDRESS,
  privateKey?: string,
): Metadata {
  return {
    accountInfo: [
      {
        blockchain: "evm",
        chain: chainId,
        user_account: account,
        ...(privateKey ? { private_key: privateKey } : {}),
      },
    ],
  };
}

/** Print a titled section header so example output is easy to scan. */
export function section(title: string): void {
  console.log(`\n${"─".repeat(60)}\n${title}\n${"─".repeat(60)}`);
}
