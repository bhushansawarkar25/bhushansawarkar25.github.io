# Case-study email verification setup

This repository uses GitHub Pages for the public portfolio and Google Apps Script as the server-side gate. Google Sheets stores access requests and the private case-study HTML. The script sends one-time verification links.

## Important security note

The case-study page was previously committed to this public repository. Replacing the current page does **not** remove older copies from public Git history or third-party caches. Do not treat the content as confidential until you have either made the repository private (which can affect GitHub Pages availability) or rewritten/cleaned the repository history and verified that old commits are no longer publicly accessible. This workflow protects the newly served version; it cannot undo prior publication by itself.

## 1. Create a private Google spreadsheet

Create a spreadsheet in your Google account and keep its sharing setting restricted (not “Anyone with the link”).

Create two tabs:
- `Leads`: row 1 headers exactly: `Timestamp | Name | Email | Company | Job Title | Status | Token | Token Expiry | Source`
- `CaseStudy`: paste the full case-study HTML document into cell `A1`. Do not put this HTML in the public GitHub repository. Apps Script serves this cell only after validating a one-time email token.

Use a private spreadsheet, not a published-to-web sheet. The case study should be a complete HTML document (starting with `<!doctype html>`). If it uses assets from the portfolio, use absolute public asset URLs or inline its required styling; relative paths resolve from the Apps Script domain, not GitHub Pages.

## 2. Create the Apps Script project

1. Open [script.google.com](https://script.google.com) and create a new standalone project.
2. Copy the contents of `apps-script/Code.gs` into the editor's `Code.gs`.
3. In **Project Settings → Script properties**, add:
   - `SPREADSHEET_ID`: the ID between `/d/` and `/edit` in the private spreadsheet URL.
   - `SITE_BASE_URL`: `https://bhushansawarkar25.github.io`
4. Save. Run a small test function only after adding the properties; authorize spreadsheet and email permissions when prompted.

## 3. Deploy the web app

1. Choose **Deploy → New deployment → Web app**.
2. **Execute as:** Me.
3. **Who has access:** Anyone.
4. Deploy and authorize. Copy the Web app URL ending in `/exec`.
5. In `case-studies/request-access.html`, replace `REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL` in the form's `action` with that URL. Commit the change to GitHub Pages.

The endpoint must be accessible to anyone because the public form and email verification links call it. Access to the spreadsheet is still limited to the script owner; the script only serves the article when a pending, unexpired, matching token is supplied.

## 4. Test the flow

- Submit with an invalid address; browser and server-side checks should reject it.
- Try a known disposable domain; it should be rejected. The blocklist is intentionally a small starter list and cannot catch every disposable provider.
- Submit a real address you control; confirm a row appears in `Leads` with status `PENDING`.
- Open the verification email and use the link within 24 hours. The status should change to `VERIFIED`, and the case study should load from the private `CaseStudy!A1` cell.
- Try to reuse the same link; it should fail.
- Verify that direct access to the Apps Script URL without a token does not show the article.

## Email validation and limitations

The form and server validate email syntax, allow valid top-level domains beyond `.com` and `.in`, and block a small list of common disposable domains. Syntax checks cannot prove a mailbox exists; possession is checked by requiring a one-time link. The disposable-domain list should be maintained over time. For stronger abuse protection, add rate limiting and CAPTCHA or a bot challenge before production use.

## GA4

The public request page retains GA4 measurement ID `G-Q1VPDXX73M` and records `case_study_access_request_submit` on form submission. A form submission event means the visitor submitted the request, not that the email was delivered or verified. Do not count it as a verified lead until you add a separate server-side analytics integration or import verified leads from Sheets.

## Credentials and setup you must provide

- A Google account that owns the spreadsheet and deploys the Apps Script.
- The private spreadsheet ID in Script Properties.
- The deployed Apps Script Web App `/exec` URL in the request page.
- The full case-study HTML pasted into the private spreadsheet's `CaseStudy!A1`.
- Your authorization to let Apps Script send verification emails and access that spreadsheet.

No Google API keys, OAuth client secrets, or service-account keys should be committed to this repository.
