# Salesmate Field Map

All the Salesmate field IDs, owner IDs, pipeline and stage names that this skill reads or writes. Keep this file accurate. If any of these change in Salesmate, update here and the rest of the skill will follow.

## Pipeline and stages

- **Pipeline name**: Universities
- **Queue stage** (deals to process): `Email Automation`
- **Next stage** (where deals go after processing): `Outreach Started`

## Deal field IDs

| Purpose | Salesmate field | Direction |
|---|---|---|
| University name | `title` | read |
| University website | `textCustomField5` | read |
| Priority tier | `intCustomField1` | read |
| Associated company (property) | `primaryCompany.id` | read |
| Off-campus partner (research output) | `textCustomField3` | write |
| Primary contact | `primaryContact` | write |
| Deal description (VP info block) | `description` | write |
| Stage | `stage` | write (last) |

### VP description format

When writing the VP info block to the deal's `description` field, use this exact format (matches existing Make scenario):

```
{vp_title}
{vp_first_name} {vp_last_name} {vp_email} {vp_email_confidence}
{vp_contact_notes}
```

## Contact field IDs

### Housing contact (associated with the deal as primary)

| Purpose | Salesmate field |
|---|---|
| First name | `firstName` |
| Last name | `lastName` |
| Email | `email` |
| Title | `designation` |
| Notes | `description` (contact field) |
| Owner | `owner` = `19` |
| Company | not set (this contact is attached to the deal, not the company) |

Write the email confidence into the `description` along with notes: `"{housing_contact_notes} | confidence: {housing_email_confidence}"`.

### VP contact (associated with the deal's company AND set as company primary)

| Purpose | Salesmate field |
|---|---|
| First name | `firstName` |
| Last name | `lastName` |
| Email | `email` |
| Company | `company` = `property_id` (links VP to the deal's associated company) |
| Owner | `owner` = `19` |

Setting `company: <property_id>` on the contact is what associates them to the company in the v4 API. There is no separate `primaryContact` field on companies that can be written; the "Associated Contacts" panel in the UI is derived from contacts whose `company` field points at the company.

## Contact-to-record anchoring

| Record | Field on the record | Who | How it's set |
|---|---|---|---|
| Deal | `primaryContact` | Housing director | Set on the deal directly via `PUT /deal/v4/{id}` |
| Company (property) | (no field — derived) | VP appears in Associated Contacts | Set `company` on the VP's contact record |

## Email log

When calling `salesmate_log_email`:

| Field | Value |
|---|---|
| `dealId` | the processed deal's ID |
| `contactId` | the housing contact ID we just created |
| `to` | `housing_contact_email` |
| `subject` | from drafting output |
| `body` | from drafting output |
| `ownerId` | `1` (Colton, the MCP default) |

## Owner IDs

- **`19`**: used for contacts to match the existing Make scenario behavior.
- **`1`**: Colton, used as the email sender in `log_email`.

If this should standardize on a single owner, change both here and the skill will follow.

## Custom field cheat sheet

Salesmate custom fields are numbered and not self-documenting. Always verify against Salesmate before editing logic that touches a new field.

| Field ID | What it stores | Notes |
|---|---|---|
| `textCustomField3` | Off-campus partner | Written after research. Read downstream by reporting. |
| `textCustomField5` | University website | Source of truth for the domain. |
| `intCustomField1` | Tier | 1 = top priority, increasing numbers = lower priority. |
