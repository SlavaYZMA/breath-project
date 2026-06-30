// netlify/functions/admin-audio.js
const { getClient, json, isAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const supabase = getClient();
  const { data: slot, error } = await supabase
    .from('slots').select('audio_file').eq('id', id).single();

  if (error || !slot?.audio_file) return json(404, { error: 'not_found' });

  const { data: signed } = await supabase.storage
    .from('audio').createSignedUrl(slot.audio_file, 60);

  if (!signed?.signedUrl) return json(500, { error: 'internal' });

  return { statusCode: 302, headers: { Location: signed.signedUrl, 'Cache-Control': 'no-store' }, body: '' };
};