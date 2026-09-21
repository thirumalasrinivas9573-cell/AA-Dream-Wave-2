/**
 * Lightweight UA parsing for session display (no heavy deps).
 */
function parseUserAgent(ua = '') {
  const s = String(ua || '');
  let browser = 'Unknown browser';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = 'Safari';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = 'Opera';

  let device = 'Desktop';
  if (/iPhone|iPad|iPod/i.test(s)) device = 'iOS';
  else if (/Android/i.test(s)) device = 'Android';
  else if (/Mobile/i.test(s)) device = 'Mobile';
  else if (/Macintosh|Mac OS/i.test(s)) device = 'Mac';
  else if (/Windows/i.test(s)) device = 'Windows';
  else if (/Linux/i.test(s)) device = 'Linux';

  return { device, browser };
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

module.exports = { parseUserAgent, clientIp };
