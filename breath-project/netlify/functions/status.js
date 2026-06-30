// netlify/functions/status.js
const { getClient, hashToken, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const token = new URLSearchParams(event.rawQuery || '').get('token') || '';
  if (!token) return json(400, { error: 'missing_token' });

  const supabase = getClient();
  const { data: slot, error } = await supabase
    .from('slots')
    .select('id, status, duration, created_at')
    .eq('token_hash', hashToken(token))
    .single();

  if (error || !slot) return json(404, { error: 'not_found' });
  return json(200, { id: slot.id, status: slot.status, duration: slot.duration, createdAt: slot.created_at });
};