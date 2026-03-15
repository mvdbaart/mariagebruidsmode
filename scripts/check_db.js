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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: products, error } = await supabase.from('products').select('name, images');
  if (error) console.error(error);
  else {
    console.log(`Found ${products.length} products:`);
    products.forEach(p => console.log(`- ${p.name}: ${p.images?.[0]}`));
  }
}

check();
