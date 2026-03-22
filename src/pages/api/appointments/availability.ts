import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../../lib/serverAuth';

// 2-hour blocks — same for all open days
export const ALL_BLOCKS = [
  { start: '10:00', end: '12:00', label: '10:00 – 12:00' },
  { start: '13:00', end: '15:00', label: '13:00 – 15:00' },
  { start: '15:00', end: '17:00', label: '15:00 – 17:00' },
];

export const GET: APIRoute = async ({ url }) => {
  const dateParam = url.searchParams.get('date');

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return json({ error: 'Ongeldige datum.' }, 400);
  }

  // Parse as local date (avoid UTC offset issues)
  const [year, month, day] = dateParam.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon … 6=Sat

  // Monday: always closed
  if (dayOfWeek === 1) {
    return json({ status: 'closed', message: 'We zijn op maandag gesloten.', blocks: [] });
  }

  const supabase = getServiceRoleClient();

  // Sunday: check opening_exceptions table
  if (dayOfWeek === 0) {
    const { data: exception } = await supabase
      .from('opening_exceptions')
      .select('date')
      .eq('date', dateParam)
      .maybeSingle();

    if (!exception) {
      return json({
        status: 'sunday_closed',
        message: 'Wij zijn op zondag alleen open op persoonlijk verzoek. Neem contact met ons op via 0183-123456.',
        blocks: [],
      });
    }
  }

  const blocks = ALL_BLOCKS;

  // Fetch non-cancelled appointments for this date
  const { data: booked } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('preferred_date', dateParam)
    .neq('status', 'cancelled');

  const bookedTimes = new Set((booked || []).map((a) => a.start_time?.slice(0, 5)));

  const result = blocks.map((block) => ({
    start: block.start,
    end: block.end,
    label: block.label,
    available: !bookedTimes.has(block.start),
  }));

  return json({ status: 'open', blocks: result });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
