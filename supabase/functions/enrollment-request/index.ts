const recipient = 'Brighthive168@gmail.com';
const validSchools = new Set([
  'Clara Barton Elementary School', 'Eastvale Elementary School', 'Harada Elementary School',
  'Ronald Reagan Elementary School', 'Rosa Parks Elementary School', 'Philistine Rondo School of Discovery',
  'VanderMolen Elementary School', 'Other elementary school / Not listed', 'Elementary school not yet assigned'
]);
const validGrades = new Set(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']);
const productionOrigin = 'https://arighthive-academic-studio.vercel.app';

function json(body: Record<string, unknown>, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Vary': 'Origin'
    }
  });
}

function permittedOrigin(origin: string) {
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return true;
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean);
  return origin === productionOrigin || configured.includes(origin);
}

function safe(value: unknown) {
  const replacements: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '—').replace(/[&<>"']/g, character => replacements[character] || character);
}

function hasText(value: unknown, min: number, max: number) {
  const text = String(value ?? '').trim();
  return text.length >= min && text.length <= max;
}

async function updateNotification(url: string, serviceKey: string, id: string, values: Record<string, string>) {
  await fetch(`${url}/rest/v1/enrollment_inquiries?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(values)
  });
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin') || '';
  if (!permittedOrigin(origin)) return new Response('Origin not allowed', { status: 403 });
  if (request.method === 'OPTIONS') return new Response('ok', { headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin'
  }});
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  let application: Record<string, any>;
  try { application = await request.json(); } catch { return json({ error: 'Invalid request' }, 400, origin); }
  if (!application || typeof application !== 'object' || Array.isArray(application)) return json({ error: 'Invalid request' }, 400, origin);
  if (String(application.company_website || '').trim()) return json({ ok: true, saved: true, notification_status: 'not_configured' }, 200, origin);

  const requestType = application.application_type === 'art' ? 'art' : 'after_school';
  const parentName = String(application.parent_name || '').trim();
  const parentEmail = String(application.parent_email || '').trim().toLowerCase();
  const parentPhone = String(application.parent_phone || '').trim();
  const numberOfChildren = Number(application.number_of_children || 0);
  const message = String(application.message || '').trim();
  const rawChildren = Array.isArray(application.children) ? application.children.slice(0, 6) : [];
  if (rawChildren.some((child: unknown) => !child || typeof child !== 'object' || Array.isArray(child))) return json({ error: 'Please enter valid student details.' }, 400, origin);
  const children = rawChildren.map((child: Record<string, unknown>) => ({
    name: String(child.name || '').trim(),
    grade: String(child.grade || '').trim(),
    school: String(child.school || '').trim(),
    dismissal_time: String(child.dismissal_time || '').trim()
  }));

  if (!hasText(parentName, 2, 80)) return json({ error: 'Please enter a valid parent name.' }, 400, origin);
  if (parentEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) return json({ error: 'Please enter a valid email.' }, 400, origin);
  if (!hasText(parentPhone, 7, 40)) return json({ error: 'Please complete the required contact fields.' }, 400, origin);
  if (!Number.isInteger(numberOfChildren) || numberOfChildren < 1 || numberOfChildren > 6 || children.length !== numberOfChildren) return json({ error: 'Please enter the number of children and their details.' }, 400, origin);
  if (children.some(child => !hasText(child.name, 2, 80) || !validGrades.has(child.grade))) return json({ error: 'Please complete each student’s name and grade.' }, 400, origin);
  if (requestType === 'after_school' && children.some(child => !validSchools.has(child.school) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(child.dismissal_time))) return json({ error: 'Please complete each child’s school and dismissal time.' }, 400, origin);
  if (requestType === 'art' && (numberOfChildren !== 1 || !['one_hour', 'two_hours'].includes(String(application.class_length)))) return json({ error: 'Please complete the art class details.' }, 400, origin);
  if (requestType === 'after_school' && application.consent !== true) return json({ error: 'Please accept the consent notice.' }, 400, origin);
  if (requestType === 'art' && application.consent !== true) return json({ error: 'Please accept the consent notice.' }, 400, origin);
  if (message.length > 1200) return json({ error: 'The message is too long.' }, 400, origin);

  const preferredDate = String(application.preferred_date || '').trim();
  const preferredTime = String(application.preferred_time || '').trim();
  if (requestType === 'art' && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return json({ error: 'Please enter a preferred class date.' }, 400, origin);
  if (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) return json({ error: 'Please enter a valid preferred class time.' }, 400, origin);

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  const legacyServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  let serviceKey = legacyServiceKey;
  try {
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    serviceKey = String(secretKeys.default || legacyServiceKey);
  } catch { serviceKey = legacyServiceKey; }
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase server credentials are unavailable.');
    return json({ error: 'Application service is not configured.' }, 503, origin);
  }

  const row = {
    request_type: requestType,
    parent_name: parentName,
    parent_email: parentEmail,
    parent_phone: parentPhone,
    number_of_children: numberOfChildren,
    children,
    preferred_start: String(application.preferred_start || 'Flexible').slice(0, 80),
    preferred_date: requestType === 'art' ? preferredDate : null,
    preferred_time: preferredTime || null,
    class_length: requestType === 'art' ? String(application.class_length) : null,
    message,
    consent: true,
    notification_status: 'not_configured'
  };

  let saved: Record<string, unknown>;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/enrollment_inquiries`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!response.ok) {
      console.error('Could not save enrollment inquiry. Supabase returned status', response.status);
      return json({ error: 'Unable to save your application right now.' }, 502, origin);
    }
    const rows = await response.json();
    saved = Array.isArray(rows) ? rows[0] : null;
    if (!saved || !saved.id) throw new Error('Supabase did not return the saved record id.');
  } catch (error) {
    console.error('Enrollment persistence failed:', error instanceof Error ? error.message : String(error));
    return json({ error: 'Unable to save your application right now.' }, 502, origin);
  }

  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('RESEND_FROM_EMAIL') || '';
  let notificationStatus = 'not_configured';
  if (apiKey && from) {
    const typeLabel = requestType === 'art' ? '美术课程报名' : '课后班报名';
    const lines: Array<[string, string]> = [
      ['报名类型 / Application', typeLabel],
      ['家长姓名 / Parent', parentName],
      ['家长邮箱 / Email', parentEmail],
      ['联系电话 / Phone', parentPhone],
      ['报名孩子人数 / Number of children', String(numberOfChildren)],
      ...children.flatMap((child, index) => [
        [`学生 ${index + 1} / Student ${index + 1}`, child.name],
        [`年级 / Grade ${index + 1}`, child.grade],
        ...(child.school ? [[`学校 / School ${index + 1}`, child.school] as [string, string]] : []),
        ...(child.dismissal_time ? [[`放学时间 / Dismissal ${index + 1}`, child.dismissal_time] as [string, string]] : [])
      ]),
      ...(requestType === 'art' ? [
        ['课程时长 / Class length', String(application.class_length)],
        ['希望日期 / Preferred date', preferredDate],
        ['方便时间 / Preferred time', preferredTime || '未指定 / Not specified']
      ] as Array<[string, string]> : [
        ['希望开始时间 / Preferred start', String(application.preferred_start || 'Flexible')]
      ]),
      ['补充说明 / Message', message || '—']
    ];
    const html = `<div style="font-family:Arial,sans-serif;color:#17324f;line-height:1.6;max-width:640px"><p style="letter-spacing:.12em;font-size:12px">BRIGHTHIVE ACADEMIC STUDIO · ENROLLMENT</p><h1 style="font-size:23px">${safe(typeLabel)}</h1><table style="width:100%;border-collapse:collapse">${lines.map(([label, value]) => `<tr><th style="padding:9px;text-align:left;border-bottom:1px solid #e5eaf0;color:#526478;vertical-align:top">${safe(label)}</th><td style="padding:9px;border-bottom:1px solid #e5eaf0;white-space:pre-wrap">${safe(value)}</td></tr>`).join('')}</table></div>`;
    const text = `BrightHive Academic Studio — ${typeLabel}\n\n${lines.map(([label, value]) => `${label}: ${value}`).join('\n')}`;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [recipient], reply_to: parentEmail, subject: `BrightHive Academic Studio 报名咨询 · ${numberOfChildren} 位学生`, html, text })
      });
      if (response.ok) {
        const result = await response.json();
        notificationStatus = 'sent';
        await updateNotification(supabaseUrl, serviceKey, String(saved.id), { notification_status: 'sent', notification_id: String(result.id || '') });
      } else {
        notificationStatus = 'failed';
        console.error('Resend could not send the enrollment notification. Status:', response.status);
        await updateNotification(supabaseUrl, serviceKey, String(saved.id), { notification_status: 'failed' });
      }
    } catch (error) {
      notificationStatus = 'failed';
      console.error('Enrollment notification failed:', error instanceof Error ? error.message : String(error));
      await updateNotification(supabaseUrl, serviceKey, String(saved.id), { notification_status: 'failed' });
    }
  }

  return json({ ok: true, saved: true, notification_status: notificationStatus }, 200, origin);
});
