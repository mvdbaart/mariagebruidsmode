import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../../lib/serverAuth';
import { ALL_BLOCKS } from './availability';

export const GET: APIRoute = async ({ url }) => {
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');

  if (!yearParam || !monthParam || !/^\d{4}$/.test(yearParam) || !/^\d{1,2}$/.test(monthParam)) {
    return json({ error: 'Ongeldige jaar of maand parameter.' }, 400);
  }

  const year = parseInt(yearParam, 10);
  const month = parseInt(monthParam, 10); // 1-based

  if (month < 1 || month > 12) {
    return json({ error: 'Maand moet tussen 1 en 12 liggen.' }, 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build date range strings for the month
  const monthStr = String(month).padStart(2, '0');
  const firstDate = `${year}-${monthStr}-01`;
  const lastDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const supabase = getServiceRoleClient();

  // Fetch all non-cancelled appointments for this month in one query
  const { data: bookedRows } = await supabase
    .from('appointments')
    .select('preferred_date, start_time')
    .gte('preferred_date', firstDate)
    .lte('preferred_date', lastDate)
    .neq('status', 'cancelled');

  // Build a map: date → Set of booked start times
  const bookedByDate = new Map<string, Set<string>>();
  for (const row of bookedRows || []) {
    if (!row.preferred_date) continue;
    const d = row.preferred_date as string;
    if (!bookedByDate.has(d)) bookedByDate.set(d, new Set());
    bookedByDate.get(d)!.add((row.start_time as string)?.slice(0, 5));
  }

  // Fetch all opening exceptions for this month (for Sundays)
  const { data: exceptions } = await supabase
    .from('opening_exceptions')
    .select('date')
    .gte('date', firstDate)
    .lte('date', lastDate);

  const exceptionDates = new Set((exceptions || []).map((e) => e.date as string));

  const days: Array<{ date: string; status: 'available' | 'closed' | 'full' | 'past' }> = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon … 6=Sat

    // Past day
    if (date < today) {
      days.push({ date: dateStr, status: 'past' });
      continue;
    }

    // Monday: always closed
    if (dayOfWeek === 1) {
      days.push({ date: dateStr, status: 'closed' });
      continue;
    }

    // Sunday: only open if in exceptions
    if (dayOfWeek === 0) {
      if (!exceptionDates.has(dateStr)) {
        days.push({ date: dateStr, status: 'closed' });
      } else {
        // Sunday with exception: check if fully booked
        const booked = bookedByDate.get(dateStr) || new Set();
        const allFull = ALL_BLOCKS.every((b) => booked.has(b.start));
        days.push({ date: dateStr, status: allFull ? 'full' : 'available' });
      }
      continue;
    }

    // Tuesday–Saturday
    const booked = bookedByDate.get(dateStr) || new Set();
    const allFull = ALL_BLOCKS.every((b) => booked.has(b.start));
    days.push({ date: dateStr, status: allFull ? 'full' : 'available' });
  }

  return json({ year, month, days });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
