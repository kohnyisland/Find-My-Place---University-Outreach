#!/usr/bin/env node
/**
 * FMP MCP Server (slim build for university-outreach-daily).
 *
 * Registers only the Salesmate toolset. The daily scheduled task uses
 * Claude's built-in web search for research, so no Google/Profound/Granola
 * tools are needed.
 *
 * Required env:
 *   SALESMATE_SESSION_KEY  Session key from Salesmate > My Account > Access Key
 *   SALESMATE_WORKSPACE    Workspace slug or host, e.g. 'findmyplace' or 'findmyplace.salesmate.io'
 *
 * Optional env:
 *   SALESMATE_BASE_URL     Override Salesmate base URL
 *   SALESMATE_CONFIG_PATH  Path to the Claude desktop config JSON used for
 *                          auto-refreshing the session key on auth failure.
 *                          Defaults to ~/Library/Application Support/Claude/claude_desktop_config.json
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSalesmateTools } from "./tools/salesmate.js";

const server = new McpServer({
  name: "fmp-mcp-server",
  version: "1.0.0",
});

registerSalesmateTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FMP MCP server (slim) running via stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
