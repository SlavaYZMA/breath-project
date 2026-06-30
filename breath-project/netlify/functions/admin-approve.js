// netlify/functions/admin-approve.js
const { getClient, json, isAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const supabase = getClient();
  const { error } = await supabase.from('slots')
    .update({ status: 'active', published_at: new Date().toISOString() }).eq('id', id);

  if (error) return json(500, { error: 'internal' });
  return json(200, { ok: true });
};