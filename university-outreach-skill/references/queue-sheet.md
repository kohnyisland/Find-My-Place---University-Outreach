# Queue Sheet

The Google Sheet that holds the daily queue of deals to process. Populated by a Make scenario that subscribes to Salesmate's SmartFlow webhook when a deal enters the "Email Automation" stage.

## Spreadsheet details

- **Spreadsheet name**: University Outreach Queue
- **Spreadsheet ID**: `1C-w_Ad4NviquPyiqoPTmeBjlgiRMVXT0ixhOss98puc`
- **URL**: https://docs.google.com/spreadsheets/d/1C-w_Ad4NviquPyiqoPTmeBjlgiRMVXT0ixhOss98puc/edit
- **Tab name**: `Queue`

## Schema

| Column | Purpose | Populated by |
|---|---|---|
| A: `timestamp` | When the deal entered Email Automation | Make scenario |
| B: `deal_id` | Salesmate deal ID, used to fetch the live record | Make scenario |
| C: `deal_name` | University name, purely for human readability | Make scenario |
| D: `status` | `queued`, `processed`, or `error` | Make sets `queued`, the skill overwrites |
| E: `processed_at` | When the skill finished processing | Skill |
| F: `notes` | Error reason or any flags | Skill |

## Reading the queue

Use `sheets_read_values` on `Queue!A2:F` (skip the header row, read all data rows). For each row, check column D. Process only rows where `status = queued`.

Capture the row number for each queued row. Row numbers are 1-indexed with the header as row 1, so the first data row is row 2. You need the row number to write the status update later.

## Marking a row processed

After all the Salesmate writes for a deal succeed, call `sheets_write_values` on `Queue!D{row}:F{row}` with the values:

```
["processed", "{current_timestamp}", ""]
```

Example: if the deal was on row 5, the range is `Queue!D5:F5`.

## Marking a row errored

If the deal fails at any step, call `sheets_write_values` on `Queue!D{row}:F{row}` with:

```
["error", "{current_timestamp}", "{short_note}"]
```

Short note examples: `no housing or vp contact confirmed`, `salesmate update_deal failed`, `research returned malformed json`.

The error status keeps the row in the sheet for visibility. It is not retried automatically. A human should review errored rows weekly and decide whether to re-queue them.

## Retry semantics

- A `queued` row means: the deal entered Email Automation and has not yet been processed. The skill picks it up on the next run.
- A `processed` row means: the skill handled it successfully. It will not be picked up again.
- An `error` row means: the skill tried and failed. It will not be picked up again until a human clears the row or changes the status back to `queued`.

This means the sheet is the source of truth for "what needs doing," not the Salesmate pipeline stage. That's important because if Salesmate SmartFlow ever misfires (rare but possible), the sheet won't have the row and the deal will just sit in Email Automation until someone notices.

## Why the sheet, not a direct Salesmate query

The Salesmate MCP's `search_deals` tool does not currently expose a `pipelineId` parameter, and filtering by stage name alone returns a 400 because "Email Automation" is specific to the Universities pipeline. Until the MCP exposes pipeline filtering, the sheet is the queue.

If the Salesmate MCP is updated to expose `pipelineId`, the skill can switch to querying Salesmate directly and the sheet becomes optional. Until then, the sheet is the source of truth for queued work.
