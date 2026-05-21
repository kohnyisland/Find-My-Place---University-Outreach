/**
 * Salesmate CRM tools.
 *
 * Requires env:
 *   SALESMATE_SESSION_KEY  Salesmate session token (My Account > Access Key)
 *   SALESMATE_WORKSPACE    Workspace slug or full host (e.g. 'findmyplace' or 'findmyplace.salesmate.io')
 *
 * Optional env:
 *   SALESMATE_BASE_URL     Override the computed base URL
 *   SALESMATE_CONFIG_PATH  Path to the Claude desktop config used for hot-refresh
 *                          of an expired session key. Defaults to the standard
 *                          Claude Desktop config location on macOS.
 *
 * Auth: accessToken header + x-linkname header against https://{workspace}/apis
 *
 * API versions: single-record CRUD (get, create, update, delete) uses v4 paths
 * like /contact/v4/{id}, /deal/v4/{id}, /company/v4/{id}, /activity/v4. Search
 * still uses /v3/{module}/search because v4 has no search endpoint — every
 * /{module}/v4/<word> path is interpreted as a record-id lookup.
 *
 * Auto-refresh: if a request returns a 401/4002 auth error, the server re-reads
 * the config file for an updated SALESMATE_SESSION_KEY and retries once. This
 * means you only need to paste a fresh Session Key into the config when it
 * expires — no restart required.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import {
  ResponseFormat,
  responseFormatField,
  handleHttpError,
  textResult,
  errorResult,
} from "../utils.js";

const WORKSPACE = process.env.SALESMATE_WORKSPACE ?? "";
const WORKSPACE_HOST = WORKSPACE.includes(".") ? WORKSPACE : `${WORKSPACE}.salesmate.io`;
const BASE_URL = process.env.SALESMATE_BASE_URL ?? `https://${WORKSPACE_HOST}/apis`;

// In-memory session key cache — starts from env, can be refreshed from config file.
let cachedSessionKey = process.env.SALESMATE_SESSION_KEY ?? "";

// Path to the desktop config we re-read on auth failure.
// Defaults to the standard Claude Desktop config location on macOS.
const CONFIG_PATH =
  process.env.SALESMATE_CONFIG_PATH ??
  path.join(
    process.env.HOME ?? "",
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json"
  );

function readSessionKeyFromConfig(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const cfg = JSON.parse(raw);
    return cfg?.mcpServers?.fmp?.env?.SALESMATE_SESSION_KEY ?? "";
  } catch {
    return "";
  }
}

function isAuthError(text: string): boolean {
  try {
    const body = JSON.parse(text);
    const code = body?.Error?.Code ?? body?.error?.code ?? "";
    return code === "4002" || code === 401;
  } catch {
    return false;
  }
}

async function smFetchWithToken(
  sessionKey: string,
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; text: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accessToken: sessionKey,
    "x-linkname": WORKSPACE_HOST,
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function smFetch(urlPath: string, init: RequestInit = {}): Promise<any> {
  if (!WORKSPACE) {
    throw new Error("Salesmate env not set. Need SALESMATE_WORKSPACE.");
  }
  if (!cachedSessionKey) {
    cachedSessionKey = readSessionKeyFromConfig();
  }
  if (!cachedSessionKey) {
    throw new Error(
      `No Salesmate session key found. Add SALESMATE_SESSION_KEY to ${CONFIG_PATH}.`
    );
  }

  const url = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath}`;

  // First attempt with cached key.
  let result = await smFetchWithToken(cachedSessionKey, url, init);

  // On auth failure, try reloading the key from the config file and retry once.
  if (!result.ok && isAuthError(result.text)) {
    const freshKey = readSessionKeyFromConfig();
    if (freshKey && freshKey !== cachedSessionKey) {
      cachedSessionKey = freshKey;
      result = await smFetchWithToken(cachedSessionKey, url, init);
    }
  }

  if (!result.ok) {
    if (isAuthError(result.text)) {
      throw new Error(
        `Salesmate ${result.status}: Session key expired. Go to Salesmate > My Account > Access Key, copy the Session Key, and paste it as SALESMATE_SESSION_KEY in ${CONFIG_PATH}. No restart needed.`
      );
    }
    throw new Error(`Salesmate ${result.status}: ${result.text.slice(0, 800)}`);
  }

  try {
    return JSON.parse(result.text);
  } catch {
    return { raw: result.text };
  }
}

export function registerSalesmateTools(server: McpServer) {
  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  server.registerTool(
    "salesmate_search_contacts",
    {
      title: "Salesmate: Search Contacts",
      description:
        "Search Salesmate contacts by a query string (searches name, email, phone). Returns top matches with id, name, email. Uses /v3/contacts/search since v4 has no search endpoint.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, limit, response_format }) => {
      try {
        const body = {
          query: {
            group: {
              operator: "AND",
              rules: [
                {
                  condition: "CONTAINS",
                  moduleName: "Contact",
                  field: { fieldName: "name" },
                  data: query,
                },
              ],
            },
          },
          fields: ["name", "email", "mobile", "owner", "lastActivityAt"],
          pagination: { rowsPerPage: limit, pageNumber: 1 },
        };
        const data = await smFetch("/v3/contacts/search", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Salesmate Contacts Search\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_get_contact",
    {
      title: "Salesmate: Get Contact",
      description: "Get a single contact by ID.",
      inputSchema: z.object({
        contact_id: z.number().int().min(1),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contact_id, response_format }) => {
      try {
        const data = await smFetch(`/contact/v4/${contact_id}`);
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Contact ${contact_id}\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_create_contact",
    {
      title: "Salesmate: Create Contact",
      description:
        "Create a new contact in Salesmate. Pass standard fields as top-level keys (name, email, mobile, etc). Custom fields follow the same pattern.",
      inputSchema: z.object({
        fields: z.record(z.any()).describe("Contact fields: { name: 'Jane Doe', email: 'jane@x.com', ... }"),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fields, response_format }) => {
      try {
        const data = await smFetch("/contact/v4", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Contact Created\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_update_contact",
    {
      title: "Salesmate: Update Contact",
      description: "Update fields on an existing contact.",
      inputSchema: z.object({
        contact_id: z.number().int().min(1),
        fields: z.record(z.any()),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ contact_id, fields, response_format }) => {
      try {
        const data = await smFetch(`/contact/v4/${contact_id}`, {
          method: "PUT",
          body: JSON.stringify(fields),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Contact Updated\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Deals
  // ---------------------------------------------------------------------------

  server.registerTool(
    "salesmate_search_deals",
    {
      title: "Salesmate: Search Deals",
      description: "Search deals by a text query (matches on title). Uses /v3/deals/search since v4 has no search endpoint.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, limit, response_format }) => {
      try {
        const body = {
          query: {
            group: {
              operator: "AND",
              rules: [
                {
                  condition: "CONTAINS",
                  moduleName: "Deal",
                  field: { fieldName: "title" },
                  data: query,
                },
              ],
            },
          },
          fields: ["title", "primaryContact", "stage", "owner", "dealValue", "pipeline"],
          pagination: { rowsPerPage: limit, pageNumber: 1 },
        };
        const data = await smFetch("/v3/deals/search", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Deals Search\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_get_deal",
    {
      title: "Salesmate: Get Deal",
      description: "Get a deal by ID.",
      inputSchema: z.object({
        deal_id: z.number().int().min(1),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ deal_id, response_format }) => {
      try {
        const data = await smFetch(`/deal/v4/${deal_id}`);
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Deal ${deal_id}\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_create_deal",
    {
      title: "Salesmate: Create Deal",
      description: "Create a new deal. Must include title and (usually) pipeline + stage.",
      inputSchema: z.object({
        fields: z.record(z.any()),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fields, response_format }) => {
      try {
        const data = await smFetch("/deal/v4", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Deal Created\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_update_deal",
    {
      title: "Salesmate: Update Deal",
      description: "Update fields on an existing deal. Use to move deals between stages, change owners, etc.",
      inputSchema: z.object({
        deal_id: z.number().int().min(1),
        fields: z.record(z.any()),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ deal_id, fields, response_format }) => {
      try {
        const data = await smFetch(`/deal/v4/${deal_id}`, {
          method: "PUT",
          body: JSON.stringify(fields),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Deal Updated\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------

  server.registerTool(
    "salesmate_log_activity",
    {
      title: "Salesmate: Log Activity",
      description:
        "Log a call, meeting, task, or email activity against a contact or deal. Pass the activity type and linked entity in fields.",
      inputSchema: z.object({
        fields: z
          .record(z.any())
          .describe(
            "Fields like: { title, type: 'Call'|'Meeting'|'Task'|'Email', startDate, endDate, isCompleted, primaryContact: <id>, primaryDeal: <id>, description }"
          ),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fields, response_format }) => {
      try {
        const data = await smFetch("/activity/v4", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Activity Logged\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------------

  // Salesmate built-in module ID map. Used for the notes endpoint:
  //   POST /{module}/v4/modules/{moduleId}/object/{recordId}/notes
  // The base prefix in the path is stylistic; what matters is moduleId.
  // "property" is an FMP-internal alias for the Company module.
  const MODULE_ID_MAP: Record<string, { moduleId: number; basePath: string }> = {
    contact: { moduleId: 1, basePath: "contact" },
    task: { moduleId: 2, basePath: "task" },
    activity: { moduleId: 2, basePath: "task" },
    email: { moduleId: 3, basePath: "email" },
    deal: { moduleId: 4, basePath: "deal" },
    company: { moduleId: 5, basePath: "company" },
    property: { moduleId: 5, basePath: "company" },
  };

  server.registerTool(
    "salesmate_add_note",
    {
      title: "Salesmate: Add Note",
      description:
        "Add a note to a deal, contact, or company/property record. The note appears in Salesmate's built-in Notes section on that record (NOT as an activity). Note content can be plain text or HTML. Returns the noteId.",
      inputSchema: z.object({
        module: z
          .enum(["deal", "contact", "company", "property"])
          .describe("Which record type the note attaches to. 'property' is an alias for 'company'."),
        record_id: z
          .number()
          .int()
          .min(1)
          .describe("The id of the deal, contact, or company to attach the note to."),
        note: z
          .string()
          .min(1)
          .describe("Note body. Plain text or HTML. HTML is rendered in the Salesmate UI."),
        type: z
          .string()
          .default("Note")
          .describe("Note type. Defaults to 'Note'."),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ module, record_id, note, type, response_format }) => {
      try {
        const mapping = MODULE_ID_MAP[module];
        if (!mapping) {
          return errorResult(`Unsupported module: ${module}`);
        }
        const path = `/${mapping.basePath}/v4/modules/${mapping.moduleId}/object/${record_id}/notes`;
        const data = await smFetch(path, {
          method: "POST",
          body: JSON.stringify({ note, type }),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Note Added\n\nmodule=${module} record_id=${record_id}\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_update_note",
    {
      title: "Salesmate: Update Note",
      description: "Update an existing note on a deal, contact, or company/property record.",
      inputSchema: z.object({
        module: z.enum(["deal", "contact", "company", "property"]),
        record_id: z.number().int().min(1),
        note_id: z.number().int().min(1),
        note: z.string().min(1),
        type: z.string().default("Note"),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ module, record_id, note_id, note, type, response_format }) => {
      try {
        const mapping = MODULE_ID_MAP[module];
        if (!mapping) {
          return errorResult(`Unsupported module: ${module}`);
        }
        const path = `/${mapping.basePath}/v4/modules/${mapping.moduleId}/object/${record_id}/notes/${note_id}`;
        const data = await smFetch(path, {
          method: "PUT",
          body: JSON.stringify({ note, type }),
        });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Note Updated\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  server.registerTool(
    "salesmate_delete_note",
    {
      title: "Salesmate: Delete Note",
      description: "Delete a note from a deal, contact, or company/property record.",
      inputSchema: z.object({
        module: z.enum(["deal", "contact", "company", "property"]),
        record_id: z.number().int().min(1),
        note_id: z.number().int().min(1),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ module, record_id, note_id, response_format }) => {
      try {
        const mapping = MODULE_ID_MAP[module];
        if (!mapping) {
          return errorResult(`Unsupported module: ${module}`);
        }
        const path = `/${mapping.basePath}/v4/modules/${mapping.moduleId}/object/${record_id}/notes/${note_id}`;
        const data = await smFetch(path, { method: "DELETE" });
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Note Deleted\n\n${JSON.stringify(data?.Data ?? data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Raw escape hatch
  // ---------------------------------------------------------------------------

  server.registerTool(
    "salesmate_execute",
    {
      title: "Salesmate: Raw Request",
      description:
        "Execute an arbitrary Salesmate API request. Provide method, path (v4 single-record uses '/{module}/v4/{id}' e.g. '/contact/v4/123', '/deal/v4/15637', '/company/v4/14949', '/activity/v4'; search still uses v3 e.g. '/v3/deals/search'), and optional body. Advanced.",
      inputSchema: z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
        path: z.string().min(1),
        body: z.record(z.any()).optional(),
        response_format: responseFormatField,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ method, path, body, response_format }) => {
      try {
        const init: RequestInit = { method };
        if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
          init.body = JSON.stringify(body);
        }
        const data = await smFetch(path, init);
        const out =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(data, null, 2)
            : `# Salesmate: ${method} ${path}\n\n${JSON.stringify(data, null, 2)}`;
        return textResult(out, data);
      } catch (error) {
        return errorResult(handleHttpError(error, "Salesmate"));
      }
    }
  );
}
