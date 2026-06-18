/**
 * Example 07 — Connect to the DZap MCP server (stdio)
 * ────────────────────────────────────────────────────────────────────────────
 * The same tool catalog is exposed over the Model Context Protocol. This example
 * uses the official MCP client to spawn the DZap stdio server (`dzap-mcp`),
 * list its tools, read a resource, and call a tool — exactly how an MCP host
 * (Claude Desktop, Cursor, your own agent) would.
 *
 * No model is involved here (the client calls tools directly), so OPENAI_API_KEY
 * is not required — but network access is needed for live tool data.
 *
 * Run:  npm run example:07
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { section } from "../shared/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Resolve the dzap-mcp entry point from the installed package, independent of cwd.
// `require.resolve("dzapai")` returns the package main (dist/src/index.js); the
// MCP entry sits next to it under the same dist/src directory.
const require = createRequire(import.meta.url);
const mcpEntry = join(dirname(require.resolve("dzapai")), "mcp", "index.js");

async function main(): Promise<void> {
  // Launch the server as a subprocess and speak JSON-RPC over its stdio.
  const transport = new StdioClientTransport({
    command: process.execPath, // the current node binary
    args: [mcpEntry],
    env: {
      ...process.env,
      LOG_LEVEL: "error",
      // Skip docs/provider warm-up so the server starts quickly for the demo.
      DZAP_MCP_INIT_RETRIEVAL: "false",
      DZAP_MCP_SYNC_PROVIDERS: "false",
    },
  });

  const client = new Client({ name: "dzap-ai-examples", version: "1.0.0" });
  await client.connect(transport);

  try {
    // 1. List the exposed tools (with their read-only hints).
    section("tools/list");
    const { tools } = await client.listTools();
    console.log(`${tools.length} tools exposed. First five:`);
    for (const tool of tools.slice(0, 5)) {
      const readOnly = tool.annotations?.readOnlyHint;
      console.log(`  • ${tool.name}${readOnly === false ? "  [execution]" : ""}`);
    }

    // 2. List resources.
    section("resources/list");
    const { resources } = await client.listResources();
    console.log(resources.map((r) => r.uri).join("\n"));

    // 3. Call a tool and read the text content back.
    section("tools/call — TrendingTokenTool");
    const response = await client.callTool({ name: "TrendingTokenTool", arguments: {} });
    const content = response.content as Array<{ type: string; text?: string }>;
    const text = content.find((part) => part.type === "text")?.text ?? "(no text content)";
    console.log(text.slice(0, 300), "…");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
