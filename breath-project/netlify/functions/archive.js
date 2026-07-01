'use strict';
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Диагностика: проверяем переменные окружения
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'missing_env',
        hasUrl: !!url,
        hasKey: !!key,
      }),
    };
  }

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });

    const { data, error } = await db
      .from('slots')
      .select('id, status, time_of_day, created_at, duration, envelope')
      .in('status', ['active', 'deleted'])
      .order('id', { ascending: true });

    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'db_error', detail: error.message, code: error.code }),
      };
    }

    const slots = (data || []).map(s => {
      const base = { id: s.id, status: s.status, timeOfDay: s.time_of_day, createdAt: s.created_at };
      if (s.status === 'active') { base.duration = s.duration; base.envelope = s.envelope; }
      return base;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ slots }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'exception', detail: e.message }),
    };
  }
};
