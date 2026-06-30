// netlify/functions/admin-reject.js
const { getClient, json, isAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const supabase = getClient();
  const { data: slot } = await supabase.from('slots').select('audio_file').eq('id', id).single();
  if (slot?.audio_file) await supabase.storage.from('audio').remove([slot.audio_file]);

  const { error } = await supabase.from('slots')
    .update({ status: 'rejected', audio_file: null, envelope: null }).eq('id', id);

  if (error) return json(500, { error: 'internal' });
  return json(200, { ok: true });
};