---
name: university-outreach-daily
description: Daily 2:00 AM weekdays university outreach (Salesmate v4) — pull Universities/Email Automation deals, research, draft email to VP inside the Email Activity description, link VP as Associated Contact, advance stage.
---

Run the daily Find My Place university outreach pipeline.

You are processing deals in the "Email Automation" stage of the Universities pipeline in Salesmate. For each one, research the school, draft a cold email on Colton's behalf addressed to the VP, write the results back to Salesmate, and advance the stage to "Outreach Started" so the deal is not reprocessed tomorrow.

The full workflow lives in the `university-outreach` skill. Read the skill files as you go (SKILL.md, references/research-prompt.md, references/drafting-prompt.md, references/field-map.md, references/write-sequence.md, references/queue-sheet.md). Follow them, except where this prompt overrides them — the API has moved to v4 and several conventions in the skill are out of date.

# Salesmate API path map (v4 + v3 search hybrid)

Single-record CRUD uses v4. Search uses v3 because v4 has no search route.

- Single-record CRUD (use the dedicated MCP tools when available, otherwise `salesmate_execute`):
  - GET    /contact/v4/{id}
  - POST   /contact/v4               (create contact)
  - PUT    /contact/v4/{id}          (update contact)
  - GET    /deal/v4/{id}
  - POST   /deal/v4                  (create deal)
  - PUT    /deal/v4/{id}             (update deal)
  - GET    /company/v4/{id}
  - PUT    /company/v4/{id}          (update company / set custom lookup fields)
  - POST   /activity/v4              (log activity — the email draft body goes in the activity's description)
- Search (v3):
  - POST /v3/deals/search
  - POST /v3/contacts/search
  - POST /v3/companies/search

# Important behaviors that override the skill

- Company `primaryContact` field is dead. Do not write it. Instead, populate `companyMultipleLookupCustomField1` (Associated Contacts) on the property with the VP.
- The email draft body goes in the **description field of the Email activity**, not as a separate Note. The activity is the single source of truth for the draft.
- The email's intended recipient is the **VP**, not the housing director. The housing director is still created as a contact on the deal, but the email is addressed to the VP.

# Step 1: Pull the queue

Use `salesmate_execute` POST `/v3/deals/search` paginating in pages of 100. Client-side filter by `pipeline == "Universities"` and `stage == "Email Automation"`. The dedicated MCP search tool only filters on title, so this raw call is required.

If zero queued deals, stop and report: "Nothing in the queue this morning. Nothing to process."

# Step 2: For each queued deal

a. Call `salesmate_get_deal(deal_id)`. Extract title, textCustomField5 (website), intCustomField1 (tier), primaryCompany.id (property_id).

b. **Dedupe check before research.** Search existing contacts attached to the property using `salesmate_execute` POST `/v3/contacts/search` with rules `Company.id EQUALS {property_id}`. If you find an existing housing director or VP, reuse their ID instead of creating a duplicate.

c. Run the research prompt from `references/research-prompt.md` with web search. Cap at 6 searches. Output: structured JSON with off-campus partner, housing contact, VP contact, summary.

d. Draft the email per `references/drafting-prompt.md`, addressed to the VP (not the housing contact). Use `fmp-brand-guidelines` if available.

e. Write back in this order:

   1. **Create housing contact** via `salesmate_create_contact` if research returned one AND no existing match was found in step 2b. Set firstName, lastName, email, designation, owner=19, description (notes + email confidence), and **company: {property_id}**. If all housing fields are null, skip.

   2. **Create VP contact** via `salesmate_create_contact` if research returned one AND no existing match was found in step 2b. Set firstName, lastName, email, owner=19, and **company: {property_id}**. If all VP fields are null, skip.

   3. **Add VP as Associated Contact on the property.** Skip if no VP contact ID.
      - GET the property via `salesmate_execute` GET `/company/v4/{property_id}`.
      - Read existing `companyMultipleLookupCustomField1`. If it already contains `relatedObjectId == vp_contact_id`, skip (idempotent).
      - Otherwise build a merged array: existing entries mapped as `{id: relatedObjectId, name: relatedObjectValue}`, plus the new `{id: vp_contact_id, name: "{vp_first_name} {vp_last_name}"}`.
      - PUT `salesmate_execute` PUT `/company/v4/{property_id}` with body `{"companyMultipleLookupCustomField1": <merged_array>}`.
      - On any failure, log a warning and continue. Do not abort the deal.

   4. **Update the deal** via `salesmate_update_deal`:
      - primaryContact: housing_contact_id (still the housing director — they remain the operational anchor)
      - textCustomField3: off_campus_partner
      - description: VP info block per the format in `references/field-map.md`
      - stage: "Outreach Started"  ← dedupe; must be the last write on the deal
      If `housing_contact_id` is null, omit primaryContact.
      If both contacts are null, do not advance the stage. Leave it in Email Automation and continue.

   5. **Log the email as an Email Activity with the full draft in its description.** This activity is the deliverable — when Colton opens it, he sees the entire email ready to send.
      - `salesmate_log_activity` (POST /activity/v4)
      - Fields:
        - title: `"Email #1: {university_name} to {vp_first_name} {vp_last_name}"`
        - type: `"Email"`
        - owner: 1 (Colton)
        - primaryContact: vp_contact_id  (the VP, intended recipient)
        - primaryCompany: property_id
        - relatedTo: deal_id  (links to the deal)
        - description: HTML-formatted email draft using this exact structure:
          ```
          <div>
            <p><b>To:</b> {vp_first_name} {vp_last_name} &lt;{vp_email}&gt;</p>
            <p><b>Subject:</b> {drafted_subject}</p>
            <hr>
            {drafted_body_html}
          </div>
          ```
          where `{drafted_body_html}` is the body with paragraph breaks wrapped in `<p>...</p>` and line breaks as `<br>`. Preserve Colton's signature exactly.
        - dueDate: ISO 8601 timestamp for today + 1 hour, so the activity appears in Upcoming.
      - If the VP has no confirmed email, set the activity description to note that fact at the top, and use the housing contact email if available, but still set primaryContact to the VP record so the linkage is correct.

# Step 3: Summarize

Plain English, scannable. For each deal report: school, housing contact (with email status), VP (with email status), partner, whether VP was added to Associated Contacts on the property, activity ID created. Note any deals skipped or errored.

# Guardrails

- Never advance the stage before all earlier writes succeed. Stage is the retry mechanism.
- Never fabricate contact emails. If research returns null, respect it.
- Do not name competitors (Off Campus Partners, CoStar, apartments.com) in drafts. CollegePads is only named when confirmed.
- Only contacts whose role is confirmed in 2025 or 2026 should be written.
- Do NOT write the company `primaryContact` field, it is dead.
- Always dedupe contacts before creating: search by name on the property's company id first.
- The email draft lives in the **Email Activity's description field**. There is no separate deal Note for the draft.

Run now.
