'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function supabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function hashToken(token) { return crypto.createHash('sha256').update(token, 'utf8').digest('hex'); }
function json(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'invalid_json' }); }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return json(400, { error: 'missing_token' });

  const db = supabase();
  const { data: slot, error } = await db.from('slots').select('id, status').eq('token_hash', hashToken(token)).single();

  if (error || !slot) return json(404, { error: 'not_found' });
  if (slot.status === 'deleted') return json(410, { error: 'deleted' });
  if (slot.status === 'rejected') return json(410, { error: 'rejected' });
  if (slot.status === 'pending_review') return json(409, { error: 'pending_review' });
  if (slot.status === 'active') return json(200, { ok: true });

  const { error: updErr } = await db.from('slots').update({ status: 'active', published_at: new Date().toISOString() }).eq('id', slot.id);
  if (updErr) return json(500, { error: 'internal' });
  return json(200, { ok: true, status: 'active' });
};
