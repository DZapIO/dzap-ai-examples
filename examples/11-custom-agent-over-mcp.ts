/**
 * Example 11 — Build your own agent over the DZap MCP server
 * ════════════════════════════════════════════════════════════════════════════
 * The DZap tools are exposed over MCP, which means ANY host can drive them — not
 * just Claude Desktop or Cursor. This example builds a small but complete agent
 * from scratch:
 *
 *   1. Connect to the dzap-mcp server (stdio) with the official MCP client.
 *   2. Read the server's own system prompt from a RESOURCE (dzap://prompts/system)
 *      and use it to steer the model.
 *   3. Bridge MCP tool definitions → OpenAI function-calling tools.
 *      (Only read-only tools are exposed, so the agent can never execute a swap.)
 *   4. Run a transparent multi-step agent loop: the model requests tool calls,
 *      we execute them over MCP, feed results back, and repeat until it answers.
 *
 * This is the "bring your own model / framework" pattern — the DZap tools plug
 * into whatever orchestration you already use.
 *
 * Run:  npm run example:11
 * Needs: OPENAI_API_KEY
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { assertModelKey, section } from "../shared/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

const require = createRequire(import.meta.url);
const mcpEntry = join(dirname(require.resolve("dzapai")), "mcp", "index.js");

const MODEL = process.env.DZAP_OPENAI_MODEL?.trim() || "gpt-4o-mini";
const MAX_STEPS = 8;

async function main(): Promise<void> {
  assertModelKey();
  const openai = new OpenAI();

  // 1. Spawn the DZap MCP server and connect.
  section("Connecting to dzap-mcp");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpEntry],
    env: { ...process.env, LOG_LEVEL: "error", DZAP_MCP_INIT_RETRIEVAL: "false", DZAP_MCP_SYNC_PROVIDERS: "false" },
  });
  const mcp = new Client({ name: "byo-agent", version: "1.0.0" });
  await mcp.connect(transport);

  try {
    // 2. Use the server's published system prompt (a RESOURCE) to steer the model.
    const promptResource = await mcp.readResource({ uri: "dzap://prompts/system" });
    const systemPrompt =
      (promptResource.contents[0]?.text as string | undefined)?.slice(0, 4000) ??
      "You are a helpful DeFi assistant.";

    // 3. Bridge MCP tools → OpenAI tools. Expose read-only tools only.
    const { tools: mcpTools } = await mcp.listTools();
    const readOnly = mcpTools.filter((t) => t.annotations?.readOnlyHint !== false);
    const openaiTools: ChatCompletionTool[] = readOnly.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      },
    }));
    console.log(`Exposed ${openaiTools.length} read-only tools to the model.`);

    // 4. The agent loop.
    section("Agent loop");
    const userGoal =
      "I have $500 to invest on Ethereum. Compare UNI and LINK: fetch the current price of each, " +
      "say which one is trending right now, and how much of each $500 would buy. Then recommend one. " +
      "Be concise.";

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userGoal },
    ];
    console.log(`USER: ${userGoal}\n`);

    for (let step = 1; step <= MAX_STEPS; step++) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: openaiTools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const choice = completion.choices[0].message;
      messages.push(choice);

      // No tool calls → the model produced the final answer.
      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        section("Final answer");
        console.log(choice.content);
        return;
      }

      // Execute each requested tool over MCP and feed the result back.
      for (const call of choice.tool_calls) {
        if (call.type !== "function") continue;
        const args = safeParse(call.function.arguments);
        console.log(`[step ${step}] → ${call.function.name}(${JSON.stringify(args)})`);

        const toolResult = await mcp.callTool({ name: call.function.name, arguments: args });
        const text =
          (toolResult.content as Array<{ type: string; text?: string }>)
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n") || "(no content)";
        console.log(`           ↳ ${text.replace(/\s+/g, " ").slice(0, 120)}…`);

        messages.push({ role: "tool", tool_call_id: call.id, content: text });
      }
    }

    console.log(`\nStopped after ${MAX_STEPS} steps without a final answer.`);
  } finally {
    await mcp.close();
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
