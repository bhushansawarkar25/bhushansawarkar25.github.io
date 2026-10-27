/**
 * Google Apps Script backend for the GitHub Pages case-study access gate.
 * Deploy as a Web App: Execute as Me; access Anyone.
 *
 * Script Properties required:
 *   SPREADSHEET_ID = ID of a PRIVATE Google spreadsheet
 *   SITE_BASE_URL = https://bhushansawarkar25.github.io
 *
 * Private spreadsheet tabs:
 *   Leads: Timestamp | Name | Email | Company | Job Title | Status | Token | Token Expiry | Source
 *   CaseStudy: cell A1 contains the full HTML document to serve after verification.
 *
 * Keep the spreadsheet private. Do not place the case-study HTML in this public repo.
 */
const LEADS_SHEET = 'Leads';
const CASE_STUDY_SHEET = 'CaseStudy';
const TOKEN_TTL_HOURS = 24;
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com',
  'yopmail.com','temp-mail.org','throwawaymail.com','getnada.com',
  'dispostable.com','fakeinbox.com','maildrop.cc','sharklasers.com','trashmail.com'
]);

function doGet(e) {
  const token = (e && e.parameter && e.parameter.verify || '').trim();
  if (!token) return messagePage_('Verified access required', 'Use the verification link sent to your email address to access the case study.');
  const ss = spreadsheet_();
  const sheet = ss.getSheetByName(LEADS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return messagePage_('Link unavailable', 'This verification link is invalid or has expired. Please request access again.');
  const rows = sheet.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < rows.length; i++) {
    const storedToken = String(rows[i][6] || '');
    if (storedToken !== token) continue;
    const status = String(rows[i][5] || '');
    const expiry = rows[i][7] instanceof Date ? rows[i][7] : new Date(rows[i][7]);
    if (status !== 'PENDING' || !expiry || expiry < now) {
      return messagePage_('Link unavailable', 'This verification link has expired or has already been used. Please request access again.');
    }
    sheet.getRange(i + 1, 6).setValue('VERIFIED');
    sheet.getRange(i + 1, 7).setValue('');
    const contentSheet = ss.getSheetByName(CASE_STUDY_SHEET);
    const html = contentSheet ? String(contentSheet.getRange('A1').getValue() || '') : '';
    if (!html || !/^<!doctype html/i.test(html.trim())) {
      return messagePage_('Setup incomplete', 'Your email is verified, but the case-study content has not been configured. Please contact the portfolio owner.');
    }
    return HtmlService.createHtmlOutput(html).setTitle('Global Payments Platform Case Study').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return messagePage_('Link unavailable', 'This verification link is invalid or has expired. Please request access again.');
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'requestAccess') return messagePage_('Request not recognised', 'Please return to the portfolio and submit the access form.');
  const name = String(p.name || '').trim();
  const email = String(p.email || '').trim().toLowerCase();
  const company = String(p.company || '').trim();
  const jobTitle = String(p.jobTitle || '').trim();
  const consent = String(p.consent || '') === 'yes';
  const source = String(p.source || 'global-payments-case-study').slice(0, 100);
  const emailCheck = validateEmail_(email);
  if (name.length < 2 || name.length > 100 || company.length < 2 || company.length > 120 || jobTitle.length < 2 || jobTitle.length > 120 || !consent || !emailCheck.valid) {
    return messagePage_('Please check your details', escapeHtml_(emailCheck.reason || 'Please complete all required fields and try again.'));
  }
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(LEADS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LEADS_SHEET);
    sheet.appendRow(['Timestamp','Name','Email','Company','Job Title','Status','Token','Token Expiry','Source']);
    sheet.setFrozenRows(1);
  }
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const expiry = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  sheet.appendRow([new Date(), name, email, company, jobTitle, 'PENDING', token, expiry, source]);
  const webAppUrl = ScriptApp.getService().getUrl();
  const verifyUrl = webAppUrl + '?verify=' + encodeURIComponent(token);
  const body = 'Hello ' + name + ',\n\nPlease verify your email address to access the global payments platform case study. This link expires in ' + TOKEN_TTL_HOURS + ' hours and can be used once.\n\nVerify your email: ' + verifyUrl + '\n\nIf you did not request this, you can ignore this message.';
  MailApp.sendEmail({to: email, subject: 'Verify your email to access the case study', body: body, name: 'Bhushan Sawarkar — Product Portfolio'});
  return messagePage_('Check your inbox', 'If the address is valid, a verification email has been sent. The link expires in 24 hours. Check your spam folder if it does not arrive.');
}

function validateEmail_(email) {
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,63}$/.test(email)) return {valid:false, reason:'Enter a valid email address.'};
  const domain = email.split('@')[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain)) return {valid:false, reason:'Please use a non-disposable email address.'};
  if (domain.indexOf('.') < 1 || domain.split('.').some(function(part){ return !part || part.length > 63; })) return {valid:false, reason:'Enter a valid email domain.'};
  return {valid:true, reason:''};
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Missing SPREADSHEET_ID script property.');
  return SpreadsheetApp.openById(id);
}

function messagePage_(title, message) {
  const safeTitle = escapeHtml_(title);
  const safeMessage = escapeHtml_(message);
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + safeTitle + '</title><style>body{font:16px Arial,sans-serif;background:#f5f8fb;color:#18324a;margin:0;padding:8vh 20px}.card{max-width:620px;margin:auto;background:white;padding:32px;border:1px solid #dce5ec;border-radius:14px;line-height:1.7}h1{font-size:28px}a{color:#245f8d}</style></head><body><main class="card"><h1>' + safeTitle + '</h1><p>' + safeMessage + '</p><p><a href="' + PropertiesService.getScriptProperties().getProperty('SITE_BASE_URL') + '/case-studies/request-access.html">Return to the request page</a></p></main></body></html>').setTitle(safeTitle);
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
