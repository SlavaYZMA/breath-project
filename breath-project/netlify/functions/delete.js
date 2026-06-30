// netlify/functions/delete.js
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
    .select('id, status, audio_file')
    .eq('token_hash', hashToken(token))
    .single();

  if (error || !slot) return json(404, { error: 'not_found' });
  if (slot.status === 'deleted') return json(200, { ok: true });

  // Удаляем файл из Storage
  if (slot.audio_file) {
    await supabase.storage.from('audio').remove([slot.audio_file]);
  }

  const { error: updErr } = await supabase
    .from('slots')
    .update({
      status: 'deleted',
      audio_file: null,
      envelope: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', slot.id);

  if (updErr) return json(500, { error: 'internal' });
  return json(200, { ok: true });
};