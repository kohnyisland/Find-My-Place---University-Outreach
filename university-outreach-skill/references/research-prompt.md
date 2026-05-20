# University Research Prompt

This is the prompt used in Step 3 of the skill to research each university. Use Claude's native WebSearch tool while running it.

## Inputs to substitute

- `{deal_name}`: the university name (from the deal title)
- `{website}`: the university's primary website (from `textCustomField5`)
- `{tier}`: Find My Place's priority tier (from `intCustomField1`)

## The prompt

```
Research this university for a student housing outreach campaign. Perform a maximum of 6 web searches total. Be efficient and do not read entire pages.

University: {deal_name}
Website: {website}
Tier: {tier}

1. Identify the OFFICIAL off-campus housing partner. The official partner is the platform that powers the university's own off-campus housing portal, not whichever vendor happens to rank in Google.

   Procedure:
   a. Find the university's own off-campus housing page by searching "{deal_name} off-campus housing" or by visiting their website directly. The URL will typically be on the .edu domain (e.g. offcampushousing.{school}.edu, housing.{school}.edu/off-campus, dos.{school}.edu/off-campus, or similar).
   b. Open that .edu page and identify who powers it. Tells:
      - Footer logo or copyright like "Powered by Off Campus Partners," "Powered by CollegePads," "Powered by Apartments.com."
      - The URL the .edu page links to or embeds (e.g. a frame/iframe to *.offcampuspartners.com, *.rentcollegepads.com, or apartments.com/{school}).
      - Branded language on the .edu page itself.
   c. Only call a vendor the "official partner" if the .edu page surfaces it as such. A standalone vendor landing page (e.g. rentcollegepads.com/off-campus-housing/{school}) is NOT evidence of an official partnership. CollegePads, Off Campus Partners, and Apartments.com all auto-generate per-university landing pages for SEO; those pages exist whether or not a real partnership does.
   d. If the .edu page lists rentals but does not appear to be powered by a third-party platform, return "None."
   e. If you cannot find a .edu off-campus housing page at all, return "Unknown" and note that in partner_evidence.

   Common signals to map (note: apartments.com IS Off Campus Partners, same company under CoStar — always map both to "Off Campus Partners"):
   - URL contains/embeds offcampuspartners.com → "Off Campus Partners"
   - URL contains/embeds apartments.com (or any apartments.com subdomain like {school}.apartments.com) → "Off Campus Partners"
   - URL contains/embeds rentcollegepads.com → "College Pads"
   - Page is a plain static list of properties on the .edu domain → "None"
   - Anything else → "Other"

   partner_evidence must cite the .edu URL and the specific tell (e.g. "offcampushousing.uoregon.edu is powered by Off Campus Partners; the listings load from offcampuspartners.com").

2. Search "{deal_name} director of housing and residential life" and work through this list in order until you find a current person: Director of Housing, Director of Residence Life, Assistant Director of Housing, Housing Coordinator. Stop as soon as you find a confirmed current person. Do not continue down the list.

3. Search "{deal_name} VP student affairs" and work through this list in order until you find a current person: VP of Student Affairs, AVP of Student Affairs, EVP of Student Affairs, Dean of Students. Stop as soon as you find a confirmed current person.

Rules for both contacts:
- Only return someone currently in their role. If results indicate they are leaving and a replacement has been chosen, use the replacement. If no replacement can be found, keep the previous person.
- Prioritize results from 2025 or 2026.
- Do not infer from outdated pages.
- If no confirmed current contact is found for a role, return null for all their fields.
- For email: once a contact's name is confirmed, you MUST fetch at least one of the following before returning a value:
  1. The department's staff or "meet the team" directory page (e.g. housing.{school}.edu/about/staff, housing.{school}.edu/staff, studentaffairs.{school}.edu/staff, ssem.{school}.edu/leadership). This is usually the highest-yield source because most universities publish mailto: links for the entire team on one page.
  2. The contact's individual bio page on the .edu domain (the page that came up in your name search).
  3. If the role is held ex officio (e.g. "VP of Student Affairs"), also fetch the office's landing page (e.g. studentlife.{school}.edu/vp, studentaffairs.{school}.edu) — the office often publishes a role-based email like vpsl@{school}.edu in the contact block at the top of that page.

  Where to look on the page:
  - mailto: links anywhere in the page (the most common pattern; staff directories almost always use these).
  - An "Email:" label followed by an address, usually in a contact info sidebar or info card next to the bio photo.
  - A contact block at the top or bottom of an office's landing page (often a role-based address like vpsl@, housing@, deanofstudents@).
  - An inline mention in the body of the bio paragraph.

  Acceptance rules:
  - Only return an email if you actually saw it on a fetched .edu page. Search snippets, ZoomInfo, RocketReach, LinkedIn, and similar are NOT acceptable sources. Pattern-matching (first.last@school.edu) is NOT acceptable.
  - A role-based address (vpsl@, housing@) IS acceptable as long as it's the published contact for the office that contact runs. Note this in contact_notes.
  - Capture the source URL of the page you found the email on into the contact_notes field, e.g. "email confirmed via housing.uoregon.edu/about/staff". This makes the research auditable.
  - If you cannot find a confirmed email after fetching the directory page AND the bio page (and the office page for VP roles), return null with confidence "unknown" and note in contact_notes which pages you checked.

Return only this JSON structure wrapped in <json></json> tags. No citations, no footnotes, no explanatory text:

<json>
{
  "off_campus_partner": "Off Campus Partners" | "College Pads" | "None" | "Other" | "Unknown",
  "partner_evidence": "one sentence",
  "housing_contact_first_name": string | null,
  "housing_contact_last_name": string | null,
  "housing_contact_title": string | null,
  "housing_contact_email": string | null,
  "housing_email_confidence": "confirmed" | "unknown",
  "housing_contact_notes": "one sentence",
  "vp_first_name": string | null,
  "vp_last_name": string | null,
  "vp_title": string | null,
  "vp_email": string | null,
  "vp_email_confidence": "confirmed" | "unknown",
  "vp_contact_notes": "one sentence",
  "university_summary": "2 sentences max"
}
</json>
```

## Why it's structured this way

- The 6-search cap keeps cost and time under control. Without it, the model wanders.
- The "stop as soon as you find a confirmed current person" rule prevents the model from over-searching once it has an answer.
- The "2025 or 2026" recency bias is critical. Higher ed staff turnover is high, and outdated contacts create real damage when we send emails to people who no longer work there.
- The "do not guess emails" rule exists because pattern-matched emails (first.last@school.edu) get flagged as spam and destroy sender reputation. We only send to emails we've literally seen on an official page.
- JSON wrapped in `<json></json>` tags makes parsing robust against stray commentary the model sometimes adds.

## Parsing the response

Extract the JSON between `<json>` and `</json>` tags. Parse it. If parsing fails, retry the research call once. If it still fails, skip the deal.
