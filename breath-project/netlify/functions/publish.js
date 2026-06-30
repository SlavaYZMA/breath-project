// netlify/functions/publish.js
const { getClient, hashToken, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'invalid_json' }); }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return json(400, { error: 'missing_token' });

  const supabase = getClient();
  const { data: slot, error } = await supabase
    .from('slots')
    .select('id, status')
    .eq('token_hash', hashToken(token))
    .single();

  if (error || !slot) return json(404, { error: 'not_found' });

  const s = slot.status;
  if (s === 'deleted')        return json(410, { error: 'deleted' });
  if (s === 'rejected')       return json(410, { error: 'rejected' });
  if (s === 'pending_review') return json(409, { error: 'pending_review' });
  if (s === 'active')         return json(200, { ok: true });

  const { error: updErr } = await supabase
    .from('slots')
    .update({ status: 'active', published_at: new Date().toISOString() })
    .eq('id', slot.id);

  if (updErr) return json(500, { error: 'internal' });
  return json(200, { ok: true, status: 'active' });
};