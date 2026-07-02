'use strict';
const { createClient } = require('@supabase/supabase-js');

function supabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function json(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const db = supabase();
  const { data: slot, error } = await db.from('slots').select('status, audio_file').eq('id', id).single();

  if (error || !slot || slot.status !== 'active' || !slot.audio_file) return json(404, { error: 'not_found' });

  const { data: signed, error: signErr } = await db.storage.from('audio').createSignedUrl(slot.audio_file, 60);
  if (signErr || !signed?.signedUrl) return json(500, { error: 'internal' });

  return { statusCode: 302, headers: { Location: signed.signedUrl, 'Cache-Control': 'no-store' }, body: '' };
};
