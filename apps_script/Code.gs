const CONFIG = {
  SPREADSHEET_ID: '1OsBaIKWDOsfz0VMQeRXtnikl1mJ6UEPf7wCVpkNmfzA',
  SHEET_NAME: 'Leads',
  KIT_PDF_URL: 'PASTE_YOUR_GITHUB_PDF_URL_HERE',
  SUBJECT: 'Your Definition-to-Outreach Kit',
  FROM_NAME: 'AccelMail',
  REPLY_TO: '',
  TOKEN: ''
};

function doPost(e) {
  try {
    const data = normalizePayload_(e);

    if (CONFIG.TOKEN && data.token !== CONFIG.TOKEN) {
      return json_({ ok: false, error: 'unauthorized' }, 401);
    }

    if (!data.fullName || !data.workEmail) {
      return json_({ ok: false, error: 'missing_fields' }, 400);
    }

    if (!isEmail_(data.workEmail)) {
      return json_({ ok: false, error: 'invalid_email' }, 400);
    }

    if (isRateLimited_(data.workEmail)) {
      return json_({ ok: false, error: 'rate_limited' }, 429);
    }

    appendLead_(data);
    sendKitEmail_(data);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

function normalizePayload_(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  return {
    fullName: (p.fullName || '').trim(),
    workEmail: (p.workEmail || '').trim(),
    company: (p.company || '').trim(),
    phone: (p.phone || '').trim(),
    source: (p.source || '').trim(),
    token: (p.token || '').trim(),
    marketCenterLat: (p.marketCenterLat || '').trim(),
    marketCenterLng: (p.marketCenterLng || '').trim(),
    audienceType: (p.audienceType || '').trim(),
    radius: (p.radius || '').trim()
  };
}

function appendLead_(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];

  sheet.appendRow([
    new Date(),
    data.fullName,
    data.workEmail,
    data.company,
    data.phone,
    data.source,
    data.audienceType,
    data.marketCenterLat,
    data.marketCenterLng,
    data.radius
  ]);
}

function sendKitEmail_(data) {
  const pdfUrl = CONFIG.KIT_PDF_URL;
  const safePdfUrl = pdfUrl && !String(pdfUrl).includes('PASTE_') ? pdfUrl : '';

  const htmlBody = [
    `<p>Hi ${escapeHtml_(data.fullName) || 'there'},</p>`,
    `<p>Here’s your Definition-to-Outreach Kit.</p>`,
    safePdfUrl ? `<p><a href="${safePdfUrl}">Download the 1-pager PDF</a></p>` : `<p>(PDF link not configured yet)</p>`,
    `<p>If you have questions, reply to this email.</p>`,
    `<p>— ${escapeHtml_(CONFIG.FROM_NAME)}</p>`
  ].join('');

  const options = {
    name: CONFIG.FROM_NAME,
    htmlBody
  };

  if (CONFIG.REPLY_TO) {
    options.replyTo = CONFIG.REPLY_TO;
  }

  MailApp.sendEmail(data.workEmail, CONFIG.SUBJECT, stripHtml_(htmlBody), options);
}

function isRateLimited_(email) {
  const cache = CacheService.getScriptCache();
  const key = `lead:${email.toLowerCase()}`;
  const existing = cache.get(key);
  if (existing) return true;

  cache.put(key, '1', 60);
  return false;
}

function isEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json_(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function stripHtml_(html) {
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function escapeHtml_(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
