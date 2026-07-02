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
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const db = supabase();
  const { data: slot } = await db.from('slots').select('audio_file').eq('id', id).single();
  if (slot?.audio_file) await db.storage.from('audio').remove([slot.audio_file]);

  const { error } = await db.from('slots').update({ status: 'rejected', audio_file: null, envelope: null }).eq('id', id);
  if (error) return json(500, { error: 'internal' });
  return json(200, { ok: true });
};
