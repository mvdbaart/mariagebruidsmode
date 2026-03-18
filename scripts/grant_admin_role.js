import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const firstEqual = line.indexOf('=');
      if (firstEqual === -1) return null;
      const key = line.substring(0, firstEqual).trim();
      const value = line.substring(firstEqual + 1).trim();
      return [key, value];
    })
    .filter(Boolean)
);

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAILS = ['mvdbaart@gmail.com', 'maarten@frissestart.nl'];

async function grantAdminRole() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Fout bij ophalen gebruikers:', error.message);
    process.exit(1);
  }

  for (const email of ADMIN_EMAILS) {
    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.warn(`Gebruiker niet gevonden: ${email}`);
      continue;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, role: 'admin' },
    });

    if (updateError) {
      console.error(`Fout bij updaten ${email}:`, updateError.message);
    } else {
      console.log(`Admin-rol toegekend aan: ${email}`);
    }
  }
}

grantAdminRole();
