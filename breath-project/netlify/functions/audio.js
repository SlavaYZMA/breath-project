// netlify/functions/audio.js
const { getClient, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const id = parseInt((event.path.match(/\/(\d+)$/) || [])[1] || '', 10);
  if (!id) return json(404, { error: 'not_found' });

  const supabase = getClient();
  const { data: slot, error } = await supabase
    .from('slots')
    .select('status, audio_file')
    .eq('id', id)
    .single();

  if (error || !slot || slot.status !== 'active' || !slot.audio_file) {
    return json(404, { error: 'not_found' });
  }

  // Создаём signed URL на 60 секунд и редиректим на него
  const { data: signed, error: signErr } = await supabase.storage
    .from('audio')
    .createSignedUrl(slot.audio_file, 60);

  if (signErr || !signed?.signedUrl) return json(500, { error: 'internal' });

  return {
    statusCode: 302,
    headers: { Location: signed.signedUrl, 'Cache-Control': 'no-store' },
    body: '',
  };
};