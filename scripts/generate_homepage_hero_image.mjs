import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const firstEq = line.indexOf('=');
        return [line.slice(0, firstEq).trim(), line.slice(firstEq + 1).trim()];
      }),
  );
}

function extractImageBase64(payload) {
  const items = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of items) {
    if (item?.type === 'image_generation_call' && typeof item?.result === 'string' && item.result.trim()) {
      return item.result.trim();
    }
  }
  return '';
}

const env = loadEnvLocal();
const apiKey = env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY ontbreekt in .env.local');
}

const prompt = [
  'Create a premium bridal fitting room hero image for a boutique wedding website.',
  'Style: elegant, romantic, soft editorial realism, warm ivory and champagne tones with blush accents.',
  'Scene: a luxurious fitting room interior with a full-length mirror, soft drapery, subtle side light, refined textiles, and a bridal gown on a mannequin or dress form.',
  'Composition: vertical portrait composition that feels high-end and spacious, with clean negative space for webpage layout.',
  'Lighting: soft natural daylight, gentle highlights, no harsh shadows.',
  'Avoid: text, logos, watermark, extra people, clutter, exaggerated fashion pose, cropped head, or busy background.',
  'The image should feel inviting, sophisticated, and clearly inspired by a bridal try-on experience.',
].join(' ');

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-5',
    input: prompt,
    tools: [{ type: 'image_generation' }],
  }),
});

const payload = await response.json();

if (!response.ok) {
  throw new Error(`OpenAI image generation failed (${response.status}): ${JSON.stringify(payload).slice(0, 800)}`);
}

const base64 = extractImageBase64(payload);

if (!base64) {
  throw new Error('OpenAI response bevat geen image_generation_call resultaat.');
}

const outPath = path.resolve(process.cwd(), 'public/images/homepage/virtual-try-on-hero.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));

console.log(outPath);
