/**
 * Shared utilities: response formatting, truncation, error handling, schemas.
 */

import { z } from "zod";

export const CHARACTER_LIMIT = 25000;

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export const responseFormatField = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable");

export function truncateIfNeeded(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const truncated = text.slice(0, CHARACTER_LIMIT);
  return (
    truncated +
    `\n\n[TRUNCATED: Response was ${text.length} chars, showing first ${CHARACTER_LIMIT}. ` +
    "Use a narrower range or smaller limit to see more.]"
  );
}

export function handleHttpError(error: unknown, resourceName = "resource"): string {
  if (error instanceof Error) {
    return `Error (${resourceName}): ${error.message}`;
  }
  return `Error (${resourceName}): ${String(error)}`;
}

/**
 * Build a standard MCP tool content response with optional structured data.
 */
export function textResult(text: string, structured?: unknown) {
  const result: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: unknown;
  } = { content: [{ type: "text", text: truncateIfNeeded(text) }] };
  if (structured !== undefined) result.structuredContent = structured;
  return result;
}

export function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
