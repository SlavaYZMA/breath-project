// netlify/functions/admin-queue.js
const { getClient, json, isAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (!isAdmin(event.headers)) return json(401, { error: 'unauthorized' });

  const supabase = getClient();
  const { data, error } = await supabase.from('slots').select('*').order('id');
  if (error) return json(500, { error: 'internal' });

  const pending = data.filter(s => s.status === 'pending_review').map(s => ({
    id: s.id, duration: s.duration, createdAt: s.created_at,
    flaggedSpeechLike: s.flagged_speech_like, reportedAt: s.reported_at,
  }));

  const count = k => data.filter(s => s.status === k).length;
  return json(200, {
    pending,
    stats: {
      total: data.length, active: count('active'), deleted: count('deleted'),
      draft: count('draft'), pending: pending.length, rejected: count('rejected'),
    },
  });
};