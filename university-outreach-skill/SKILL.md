---
name: university-outreach
description: Run the daily Find My Place university outreach pipeline. Claude pulls Universities-pipeline deals in the "Email Automation" stage from Salesmate, researches the school, drafts a cold outreach email, creates the housing and VP contacts, logs the email to the deal, and advances the stage to "Outreach Started". Use this whenever the user asks to "run university outreach", "process email automation deals", "run the morning outreach", "send university outreach", or any request about drafting outreach to universities from the Salesmate pipeline. Also triggers when a scheduled task named "university-outreach-daily" fires.
---

# University Outreach

You are running Find My Place's university outreach pipeline. Every morning (or on-demand), this skill processes any deals sitting in the "Email Automation" stage of the Universities pipeline in Salesmate. For each deal, you research the school, draft a personalized cold email on Colton's behalf, write the results back to Salesmate, and move the deal forward so it doesn't get processed again tomorrow.

The skill is built to be edited. The research prompt, drafting prompt, Salesmate field map, and write sequence each live in their own reference file so Colton can update one piece without breaking the others.

## When to run this

Trigger this skill when:
- A scheduled task named `university-outreach-daily` fires (default: 7:30 AM ET, Monday through Friday).
- The user asks you to run it manually ("run university outreach", "process today's outreach", "run the morning outreach", etc.).

Do not run it on a deal that is not in the Email Automation stage. The stage is the queue, and deals leave the queue once processed.

## High-level flow

1. **Pull the queue** from Salesmate.
2. **For each deal in parallel (or serially if rate-limited)**:
   a. Extract inputs from the deal.
   b. Research the university with web search.
   c. Draft the email.
   d. Write results back to Salesmate in the correct order.
   e. Advance the deal stage last.
3. **Summarize** what happened and share the result with the user.

Each of these steps has a dedicated reference file. Read the one you need when you need it, rather than trying to hold everything in context at once.

## Step 1: Pull the queue

Read the queue sheet. Full details in `references/queue-sheet.md`.

Read the rows where `status = queued` using `sheets_read_values` on the Queue tab. For each queued row, capture `deal_id`, `deal_name`, and the row number (you'll need the row number to mark the row as processed later).

If zero queued rows are returned, stop and report: "Nothing in the queue this morning. Nothing to process."

If more than 10 queued rows are returned, process them but throttle web searches so you don't hit API rate limits. A short pause between deals is fine.

## Step 2: Extract inputs

For each queued deal, call `salesmate_get_deal(deal_id)` to pull the live record, then read these fields. The exact field map is in `references/field-map.md`, consult it when in doubt or when fields change.

- `deal_id` ← `id`
- `deal_name` ← `title` (the university name)
- `website` ← `textCustomField5`
- `tier` ← `intCustomField1`
- `property_id` ← `primaryCompany.id`

If any of these are empty, note the deal and skip it. Do not guess.

## Step 3: Research the university

Read `references/research-prompt.md` and run the prompt as written, with the inputs substituted. Use Claude's native web search. Keep searches tight: 6 max per university.

The research returns a JSON object with the off-campus partner, housing contact, VP contact, and a short university summary. Parse it carefully. If the research fails or returns malformed JSON, retry once. If it still fails, skip the deal and flag it for manual follow-up.

## Step 4: Draft the email

Read `references/drafting-prompt.md` and follow it exactly. The drafting prompt encodes Colton's voice, the messaging angles by off-campus partner, and the word-count rules by contact role.

If the `fmp-brand-guidelines` skill is available, reference it for voice and tone guardrails while drafting.

Primary email recipient: **housing contact**. If housing contact is null, fall back to VP. If both are null, skip the draft and flag the deal.

## Step 5: Write back to Salesmate

Read `references/write-sequence.md` and follow the order exactly. Order matters because the stage advance is the last write. If anything fails before that, the deal stays in Email Automation and gets retried tomorrow.

Summary of the sequence:
1. Create housing contact
2. Create VP contact (attached to the deal's associated company)
3. Update deal (primary contact, partner field, VP notes, stage → Outreach Started)
4. Log email on the deal
5. Mark the queue row as processed

## Step 6: Summarize

After all deals are processed, output a plain-English summary:

```
Processed N university deal(s).

University of X
  Housing contact: Jane Doe (email confirmed)
  VP: John Smith (linked to company)
  Partner: College Pads
  Draft logged, stage moved to Outreach Started.

University of Y
  Skipped. No housing or VP contact could be confirmed. Deal stayed in Email Automation.
```

Keep the summary factual and scannable. No marketing fluff.

## Error handling

- **Research fails**: retry once, then mark the queue row `status=error` with a short note and move on.
- **No contacts found**: leave the deal in Email Automation, mark the queue row `status=error` with note "no contacts confirmed", and continue.
- **One contact found, the other null**: proceed with what you have, skip the other create call.
- **Housing contact has no email**: still create the contact (email field empty), still draft the email for reference, but skip `log_email` because the `to` field is required. Instead, log a Note on the deal with the draft so it's still visible on the timeline.
- **Any create or update call fails**: abort this deal, do not advance the stage, mark the queue row `status=error` with the failing step in notes, continue to the next deal.

## Guardrails

- Never advance the stage before the writes succeed. The stage is the retry mechanism.
- Never fabricate contact emails. If the research prompt returns null for an email, respect that.
- Never name competitors Off Campus Partners, CoStar, or apartments.com in the drafted email. CollegePads is only named when confirmed. Details are in the drafting prompt.
- Only contacts whose current role is confirmed in 2025 or 2026 should be written. Outdated contacts create damage.

## Files in this skill

- `references/research-prompt.md`: the web-search research prompt, returns structured JSON
- `references/drafting-prompt.md`: the email drafting system prompt with voice rules and angles by partner
- `references/field-map.md`: Salesmate field IDs, owner IDs, pipeline and stage names
- `references/write-sequence.md`: ordered write-back steps with exact MCP calls
- `references/queue-sheet.md`: Google Sheet schema, read/write conventions, retry semantics

## How to improve this skill

The whole point of packaging this as a skill is that Colton can teach it over time. When something is off, here's where to edit:

- Research quality issues → `references/research-prompt.md`
- Email voice or angle issues → `references/drafting-prompt.md`
- Wrong Salesmate field or stage → `references/field-map.md`
- Changes to the contact or deal write flow → `references/write-sequence.md`
- Changes to when the skill triggers, the error handling philosophy, or the queue logic → this file (SKILL.md)

Keep reference files focused. If one starts exceeding 300 lines, split it.
