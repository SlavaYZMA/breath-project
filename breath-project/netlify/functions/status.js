'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function supabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function hashToken(token) { return crypto.createHash('sha256').update(token, 'utf8').digest('hex'); }
function json(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const token = new URLSearchParams(event.rawQuery || '').get('token') || '';
  if (!token) return json(400, { error: 'missing_token' });

  const db = supabase();
  const { data: slot, error } = await db.from('slots').select('id, status, duration, created_at').eq('token_hash', hashToken(token)).single();

  if (error || !slot) return json(404, { error: 'not_found' });
  return json(200, { id: slot.id, status: slot.status, duration: slot.duration, createdAt: slot.created_at });
};
