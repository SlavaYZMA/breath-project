// netlify/functions/_supabase.js
const { createClient } = require('@supabase/supabase-js');

function getClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function timeOfDayKey(hour) {
  if (hour >= 23 || hour < 4) return 'lateNight';
  if (hour >= 4  && hour < 7) return 'dawn';
  if (hour >= 7  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'evening';
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function isAdmin(headers) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const supplied = headers['x-admin-password'] || '';
  const crypto = require('crypto');
  try {
    return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(pw));
  } catch { return false; }
}

module.exports = { getClient, hashToken, timeOfDayKey, json, isAdmin };