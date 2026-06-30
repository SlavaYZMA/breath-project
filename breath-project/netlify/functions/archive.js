// netlify/functions/archive.js
const { getClient, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('slots')
    .select('id, status, time_of_day, created_at, duration, envelope')
    .in('status', ['active', 'deleted'])
    .order('id', { ascending: true });

  if (error) return json(500, { error: 'internal' });

  const slots = (data || []).map(s => {
    const base = { id: s.id, status: s.status, timeOfDay: s.time_of_day, createdAt: s.created_at };
    if (s.status === 'active') { base.duration = s.duration; base.envelope = s.envelope; }
    return base;
  });

  return json(200, { slots });
};