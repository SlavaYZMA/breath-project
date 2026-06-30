// netlify/functions/report.js
const { getClient, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const supabase = getClient();
  const { data: slot, error } = await supabase
    .from('slots').select('id, status').eq('id', id).single();

  if (error || !slot || slot.status !== 'active') return json(404, { error: 'not_found' });

  await supabase.from('slots').update({ status: 'pending_review', reported_at: new Date().toISOString() }).eq('id', id);
  return json(200, { ok: true });
};