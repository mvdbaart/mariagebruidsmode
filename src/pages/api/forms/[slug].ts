import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../../lib/serverAuth';
import type { FieldDefinition } from '../../../lib/forms';

function trim(value: unknown, max = 1000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  const { slug } = params;
  if (!slug) return json({ error: 'Formulier niet gevonden.' }, 404);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Ongeldig verzoek.' }, 400);

  // Honeypot check
  if (body._hp) return json({ ok: true }, 200); // silently accept bot submissions

  const supabase = getServiceRoleClient();

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, fields, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (formError || !form) return json({ error: 'Formulier niet gevonden.' }, 404);
  if (!form.is_active) return json({ error: 'Dit formulier is niet actief.' }, 403);

  const fields: FieldDefinition[] = form.fields ?? [];
  const submissionData: Record<string, string | string[]> = {};
  const errors: string[] = [];

  for (const field of fields) {
    const rawValue = body[field.id];

    if (field.type === 'checkbox' && Array.isArray(rawValue)) {
      submissionData[field.id] = rawValue.map(v => trim(v));
    } else {
      const value = trim(rawValue);
      if (field.required && !value) {
        errors.push(`"${field.label}" is verplicht.`);
      }
      submissionData[field.id] = value;
    }
  }

  if (errors.length > 0) return json({ error: errors[0] }, 400);

  const { error: insertError } = await supabase
    .from('form_submissions')
    .insert([{ form_id: form.id, data: submissionData, ip_address: clientAddress ?? null }]);

  if (insertError) return json({ error: 'Opslaan mislukt. Probeer opnieuw.' }, 500);

  // Update submission count and last_submission_at
  await supabase
    .from('forms')
    .update({
      submission_count: (form as any).submission_count + 1,
      last_submission_at: new Date().toISOString(),
    })
    .eq('id', form.id);

  return json({ ok: true }, 200);
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
