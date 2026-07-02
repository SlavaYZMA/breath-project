'use strict';
const { createClient } = require('@supabase/supabase-js');

function supabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function json(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const db = supabase();
  const { data: slot, error } = await db.from('slots').select('id, status').eq('id', id).single();
  if (error || !slot || slot.status !== 'active') return json(404, { error: 'not_found' });

  await db.from('slots').update({ status: 'pending_review', reported_at: new Date().toISOString() }).eq('id', id);
  return json(200, { ok: true });
};
