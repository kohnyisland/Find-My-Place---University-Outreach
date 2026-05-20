# Salesmate Write Sequence

This is the ordered write-back sequence used in Step 5 of the skill. Order matters. The stage advance is intentionally last so a failure earlier in the sequence leaves the deal in Email Automation for tomorrow's retry.

## Inputs this step expects

From prior steps, you should have:

- `deal_id`, `deal_name`, `property_id` (from the deal)
- Research output object (housing contact, VP contact, partner info, summary)
- Drafted email (`subject`, `body`)

## Order

### 1. Create housing contact

Tool: `salesmate_create_contact`

```
firstName: {housing_contact_first_name}
lastName: {housing_contact_last_name}
email: {housing_contact_email}          # may be null, that's OK
designation: {housing_contact_title}
description: "{housing_contact_notes} | confidence: {housing_email_confidence}"
owner: 19
```

Capture the returned contact ID as `housing_contact_id`. If the API call fails, abort this deal.

If the housing contact fields are all null (research found nothing), skip this step. Set `housing_contact_id = null`.

### 2. Create VP contact

Tool: `salesmate_create_contact`

```
firstName: {vp_first_name}
lastName: {vp_last_name}
email: {vp_email}                        # may be null, that's OK
company: {property_id}                   # attaches VP to the deal's company
owner: 19
```

If the VP contact fields are all null, skip this step.

Capture the returned contact ID as `vp_contact_id`.

### 2b. Verify the VP shows up on the company

There is no separate write needed here. In Salesmate v4, companies do NOT have a `primaryContact` field that can be written via API. The "Associated Contacts" panel on the company page is derived automatically from contacts whose `company` field points at that company. Setting `company: {property_id}` on the VP contact in step 2 is what links them.

If you tried to PUT to `/company/v4/{id}` with `primaryContact: <id>`, the call would silently succeed (return Status: success) but the field is dropped because it isn't part of the company schema. Don't bother.

If the VP doesn't appear on the company page despite the link being set, the most likely cause is that the contact was created via the v3 wrapper and the v4 UI isn't reading the v3-only relationship. Re-create the VP contact via the v4 POST endpoint:

```
method: POST
path: /contact/v4
body: {
  "firstName": <vp_first_name>,
  "lastName": <vp_last_name>,
  "email": <vp_email>,
  "designation": <vp_title>,
  "company": <property_id>,
  "owner": 19,
  "description": <vp_contact_notes>
}
```

Or update an existing contact via the v4 PUT (note: `lastName` and `owner` are REQUIRED on every PUT, otherwise you get a misleading "The contact does not exist" error):

```
method: PUT
path: /contact/v4/<contact_id>
body: { "lastName": <last_name>, "owner": 19, "company": <property_id> }
```

The VP is the right primary contact for the property because the housing director rolls up to them and the property record persists across multiple deals. The deal still gets the housing director as its `primaryContact` (step 3) since they are the operational owner of the outreach.

If `vp_contact_id` is null (we skipped step 2), skip this step too. Don't overwrite an existing company primary contact with nothing.

If this call fails, log a warning but continue — the VP contact is still attached to the company via the `company` field set in step 2, so they're discoverable on the company record. The primaryContact field is a nice-to-have for the property view, not a blocker.

### 3. Update the deal

Tool: `salesmate_update_deal`

```
id: {deal_id}
primaryContact: {housing_contact_id}     # only if we created a housing contact
textCustomField3: {off_campus_partner}
description: "{vp_title}\n{vp_first_name} {vp_last_name} {vp_email} {vp_email_confidence}\n{vp_contact_notes}"
stage: "Outreach Started"
```

If `housing_contact_id` is null (no housing contact found), omit `primaryContact` from the update so we don't overwrite an existing primary with nothing.

If both contacts were null, do not update the stage. Instead, add a note on the deal explaining why it was skipped and leave it in Email Automation.

### 4. Log the email

Tool: `salesmate_log_email`

```
dealId: {deal_id}
contactId: {housing_contact_id}          # or vp_contact_id if falling back
to: {housing_contact_email}              # or vp_email if falling back
subject: {drafted_subject}
body: {drafted_body}
ownerId: 1
```

If the `to` field would be null (no confirmed email for either contact), skip `log_email` and instead call `salesmate_log_activity` with type `Note` and the drafted subject and body in the notes. This preserves the draft on the deal timeline even when we don't have a sendable address.

### 5. Mark the queue row as processed

Tool: `sheets_write_values`

```
spreadsheet_id: 1C-w_Ad4NviquPyiqoPTmeBjlgiRMVXT0ixhOss98puc
range: Queue!D{row_number}:F{row_number}
values: [["processed", "{current_timestamp_iso}", ""]]
```

`{row_number}` is the 1-indexed row number captured when you read the queue in Step 1. First data row is 2.

If any earlier step failed and you aborted this deal, write `["error", "{timestamp}", "{short_reason}"]` instead. That way the row is not picked up again on tomorrow's run, but stays visible for human review.

Full schema and error-note conventions live in `references/queue-sheet.md`.

## Why this order

- Housing contact first because the deal update needs its ID for `primaryContact`.
- VP contact before deal update because the VP contact gets linked via `company` to the same `property_id`. The order doesn't strictly matter between them, but housing first mirrors the existing Make flow.
- Setting the VP as the company's primary contact (step 2b) happens after VP creation but before the deal update because we want both writes pointing at the same VP record by the time the deal-level info goes in.
- Deal update before email log because the email log is the last artifact we want to see on the timeline, and we want the deal to already be in "Outreach Started" when the email appears.
- Stage advance happens inside the deal update, not as a separate call. This is intentional: one atomic write either succeeds or fails, rather than leaving the deal in an inconsistent state.

## Two different "primary contact" concepts

There are two primaryContact fields in this flow and they hold different people on purpose:

- **Deal.primaryContact** = housing director (operational owner of outreach, set in step 3)
- **Company.primaryContact** = VP (institutional owner of the relationship, set in step 2b)

The deal cycles through stages and can close-won/lost. The company persists across multiple deals (renewal, expansion, new program). Anchoring the company to the VP gives us the right long-lived contact for the property record; the deal stays anchored to the person actually working the email thread.

## Retry safety

If step 1 fails: nothing written, deal stays in Email Automation, retry tomorrow.
If step 2 fails: housing contact exists but is orphaned until the deal update. Tomorrow's retry will create a duplicate housing contact. To avoid that, we accept the duplicate risk as a rare edge case. If it becomes a pattern, add a pre-check: before step 1, search contacts by `email` and reuse if found.
If step 2b fails: housing contact and VP contact both exist, VP is attached to the company but not set as primary. Log a warning and continue. The deal flow still works.
If step 3 fails: housing and VP contacts exist, deal stays in Email Automation. Tomorrow's retry will create duplicates.
If step 4 fails: everything else written. Deal is already advanced to Outreach Started. Timeline is missing the email log. Log a warning, do not retry automatically.

The most important invariant: **never advance the stage unless the contacts and deal update succeeded.** That's the dedupe mechanism. If we violate that, we lose visibility into failed runs.

## When to change this file

- Adding a new write (e.g., tagging the deal with a campaign label): add a numbered step and explain why.
- Changing the owner ID for a step: update `references/field-map.md` and reference it from here instead of hardcoding.
- Removing a step: think twice. The current sequence is the minimum viable output for a useful outreach record.
