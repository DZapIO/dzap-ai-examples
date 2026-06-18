# DZap AI — Examples

Runnable, heavily-commented examples for the **DZap AI** stack. Each example is a
single self-contained TypeScript file that demonstrates one concept end to end.

The stack ships four surfaces from one runtime:

| Surface | What it is |
| --- | --- |
| **SDK** (`DZapSDK`) | embed the agent in a Node/TS app |
| **Tools** | 21 DeFi tools (prices, balances, positions, routes, news, RAG, …) |
| **MCP server** | expose the tools to MCP clients over stdio or HTTP |
| **HTTP server** | `POST /ask_stream` Server-Sent Events endpoint |

## Examples

| # | File | Demonstrates |
| --- | --- | --- |
| 01 | [`examples/01-quickstart.ts`](examples/01-quickstart.ts) | Initialize the SDK and run your first `ask()` |
| 02 | [`examples/02-streaming-steps.ts`](examples/02-streaming-steps.ts) | Stream tool steps live with the `onStep` callback |
| 03 | [`examples/03-direct-tools.ts`](examples/03-direct-tools.ts) | Call tools directly with `executeTool()` (no LLM) |
| 04 | [`examples/04-price-and-valuation.ts`](examples/04-price-and-valuation.ts) | Compose tools: resolve a symbol → price → USD valuation |
| 05 | [`examples/05-sessions-and-history.ts`](examples/05-sessions-and-history.ts) | Multi-turn conversations and session history |
| 06 | [`examples/06-rag-over-docs.ts`](examples/06-rag-over-docs.ts) | Retrieval-augmented answers over the DZap docs |
| 07 | [`examples/07-mcp-stdio-client.ts`](examples/07-mcp-stdio-client.ts) | Connect to the DZap MCP server over stdio |
| 08 | [`examples/08-http-streaming-client.ts`](examples/08-http-streaming-client.ts) | Consume the `/ask_stream` SSE endpoint |
| 09 | [`examples/09-transaction-confirmation.ts`](examples/09-transaction-confirmation.ts) | Gate on-chain execution with a confirmation handler |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure your keys
cp .env.example .env
#   then edit .env and set OPENAI_API_KEY (the only required value)
```

> **Package source.** This repo links the local build via `"dzapai": "link:../DZapAI"`
> so the examples always run against your working copy. When the package is
> published you would instead `npm install @dzapio/ai` and change the imports from
> `dzapai` to `@dzapio/ai`. The API is identical.

## Run

Each example has its own npm script:

```bash
npm run example:01   # quickstart
npm run example:02   # streaming steps
npm run example:03   # direct tools (no API key needed for the model)
# ...
npm run example:09   # transaction confirmation
```

Or run any file directly with [`tsx`](https://github.com/privatenumber/tsx):

```bash
npx tsx examples/01-quickstart.ts
```

## Notes

- Examples **03**, **07**, and **08** do not call the LLM, so they run without an
  `OPENAI_API_KEY` (they still need network access for live market data).
- Read-only examples use a public demo wallet address; override it with
  `DEMO_WALLET_ADDRESS` in `.env`.
- Example **09** never broadcasts a transaction — its confirmation handler rejects
  every request — so it is safe to run with a throwaway key.
