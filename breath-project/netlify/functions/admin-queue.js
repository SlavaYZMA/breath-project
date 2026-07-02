'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function supabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function json(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }; }
function isAdmin(headers) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const supplied = headers['x-admin-password'] || '';
  try { return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(pw)); } catch { return false; }
}

exports.handler = async (event) => {
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const db = supabase();
  const { data, error } = await db.from('slots').select('*').order('id');
  if (error) return json(500, { error: 'internal' });

  const pending = (data || []).filter(s => s.status === 'pending_review').map(s => ({
    id: s.id, duration: s.duration, createdAt: s.created_at,
    flaggedSpeechLike: s.flagged_speech_like, reportedAt: s.reported_at,
  }));
  const count = k => (data || []).filter(s => s.status === k).length;
  return json(200, { pending, stats: { total: (data||[]).length, active: count('active'), deleted: count('deleted'), draft: count('draft'), pending: pending.length, rejected: count('rejected') } });
};
