// netlify/functions/record.js
const crypto = require('crypto');
const { getClient, hashToken, timeOfDayKey, json } = require('./_supabase');

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — после ffmpeg.wasm файл маленький
const MIN_DURATION = 0.6;
const MAX_DURATION = 20;

// Rate limit в памяти функции (сбрасывается при cold start, но для бесплатного плана достаточно)
const rateMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60 * 60 * 1000;
  const arr = (rateMap.get(ip) || []).filter(t => now - t < window);
  arr.push(now);
  rateMap.set(ip, arr);
  return arr.length > 8;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
  if (isRateLimited(ip)) return json(429, { error: 'rate_limited' });

  // Тело приходит как base64 от Netlify для бинарных данных
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64')
    : Buffer.from(event.body || '', 'utf8');

  if (bodyBuffer.length === 0) return json(400, { error: 'empty' });
  if (bodyBuffer.length > MAX_BYTES) return json(413, { error: 'too_large' });

  // Клиент присылает duration и envelope в заголовках (вычислены на клиенте)
  const duration = parseFloat(event.headers['x-duration'] || '0');
  const envelopeRaw = event.headers['x-envelope'] || '[]';
  let envelope;
  try { envelope = JSON.parse(envelopeRaw); } catch { return json(400, { error: 'bad_request' }); }

  if (!isFinite(duration) || duration < MIN_DURATION) return json(422, { error: 'too_short' });
  if (duration > MAX_DURATION) return json(422, { error: 'too_long' });

  const hourParam = parseInt(new URL(event.rawUrl || 'http://x?' + (event.rawQuery||'')).searchParams.get('hour') || '', 10);
  const localHour = Number.isFinite(hourParam) && hourParam >= 0 && hourParam <= 23
    ? hourParam : new Date().getUTCHours();

  const token = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashToken(token);

  const supabase = getClient();

  // Сохраняем файл в Storage
  const filename = `${tokenHash.slice(0, 16)}_${Date.now()}.ogg`;
  const { error: storageErr } = await supabase.storage
    .from('audio')
    .upload(filename, bodyBuffer, { contentType: 'audio/ogg', upsert: false });

  if (storageErr) {
    console.error('Storage upload error:', storageErr);
    return json(500, { error: 'processing_failed' });
  }

  // Определяем статус: без анализа PCM на сервере — доверяем клиенту,
  // но всё равно выставляем pending_review если клиент сообщил о речи
  const speechLike = event.headers['x-speech-like'] === '1';
  const status = speechLike ? 'pending_review' : 'draft';

  const { data: slot, error: dbErr } = await supabase
    .from('slots')
    .insert({
      token_hash: tokenHash,
      status,
      time_of_day: timeOfDayKey(localHour),
      duration: Math.round(duration * 100) / 100,
      envelope,
      audio_file: filename,
      flagged_speech_like: speechLike,
    })
    .select('id, status')
    .single();

  if (dbErr) {
    console.error('DB insert error:', dbErr);
    // Откатываем файл
    await supabase.storage.from('audio').remove([filename]);
    return json(500, { error: 'processing_failed' });
  }

  return json(201, {
    id: slot.id,
    token,
    duration: Math.round(duration * 100) / 100,
    status: slot.status,
    pendingReview: slot.status === 'pending_review',
  });
};