import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const OPENAI_IMAGE_API_URL = 'https://api.openai.com/v1/images/edits';
const ALLOWED_USER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_REFERENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function trimString(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function normalizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  const siteUrl = (import.meta.env.SITE_URL || 'https://www.mariagebruidsmode.nl').replace(/\/$/, '');
  if (trimmed.startsWith('/')) return `${siteUrl}${trimmed}`;
  return '';
}

function buildPrompt(params: {
  productName: string;
  productType: 'dress' | 'suit';
  brand?: string | null;
  collectionName?: string | null;
  description?: string | null;
}): string {
  const outfitLabel = params.productType === 'suit' ? 'kostuum' : 'jurk';
  const brandLine = params.brand ? `Merk: ${params.brand}. ` : '';
  const collectionLine = params.collectionName ? `Collectie: ${params.collectionName}. ` : '';
  const descriptionLine = params.description ? `Productdetails: ${params.description}. ` : '';

  return [
    'Maak een realistische, high-end fashion try-on preview.',
    `Gebruik de geüploade foto als de persoon en de referentie van de geselecteerde ${outfitLabel} om de outfit zo natuurgetrouw mogelijk op het lichaam te plaatsen.`,
    'Behoud identiteit, gezicht, haar, huidskleur en algemene lichaamsbouw van de persoon.',
    'Laat de houding natuurlijk, met correcte verhoudingen, passende belichting, realistische stofdrapering en geloofwaardige schaduwen.',
    `Output: een elegante full-body ${outfitLabel}-preview in een luxe bruidsmode-setting.`,
    `Als het een ${outfitLabel} is, houd de styling formeel en chic. `,
    'Verander de achtergrond zo min mogelijk en vermijd extra mensen of onnodige props.',
    'Als delen van het lichaam niet volledig zichtbaar zijn, maak dan een conservatieve, realistische schatting.',
    brandLine,
    collectionLine,
    descriptionLine,
  ].join(' ').replace(/\s+/g, ' ').trim();
}

async function fileToOpenAiPart(file: File, fallbackName: string): Promise<File> {
  const buffer = await file.arrayBuffer();
  return new File([buffer], file.name || fallbackName, {
    type: file.type || 'image/png',
  });
}

async function fetchRemoteImageAsFile(url: string, fallbackName: string): Promise<File | null> {
  const response = await fetch(url);
  if (!response.ok) return null;

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_REFERENCE_TYPES.has(contentType)) return null;

  const buffer = await response.arrayBuffer();
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  return new File([buffer], fallbackName.endsWith(`.${extension}`) ? fallbackName : `${fallbackName}.${extension}`, {
    type: contentType,
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return err('Te veel aanvragen. Probeer het later opnieuw.', 429);
  }

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return err('OpenAI is nog niet geconfigureerd op deze omgeving.', 503);
  }

  try {
    const formData = await request.formData();
    const photo = formData.get('photo');
    const productSlug = trimString(formData.get('product_slug'), 120);

    if (!(photo instanceof File) || photo.size === 0) {
      return err('Upload een foto om de outfit te kunnen passen.');
    }

    if (!ALLOWED_USER_TYPES.has(photo.type)) {
      return err('Gebruik een JPG, PNG of WebP-foto.');
    }

    if (photo.size > 10 * 1024 * 1024) {
      return err('Het uploadbestand is te groot. Gebruik een foto kleiner dan 10 MB.');
    }

    if (!productSlug) {
      return err('Selecteer een product voordat je een try-on start.');
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, brand, description, images, collections(title, type, slug)')
      .eq('slug', productSlug)
      .maybeSingle();

    if (productError) {
      return err('Productgegevens konden niet worden geladen.', 500);
    }

    if (!product) {
      return err('Het gekozen product is niet gevonden.', 404);
    }

    const productType = product.collections?.type === 'suit' ? 'suit' : 'dress';
    const productImageUrl = normalizeImageUrl(Array.isArray(product.images) ? product.images[0] : '');
    const prompt = buildPrompt({
      productName: product.name,
      productType,
      brand: product.brand,
      collectionName: product.collections?.title,
      description: product.description,
    });

    const userPhotoFile = await fileToOpenAiPart(photo, 'visitor-photo.png');
    const imageParts: File[] = [userPhotoFile];

    if (productImageUrl) {
      const outfitReference = await fetchRemoteImageAsFile(productImageUrl, 'outfit-reference');
      if (outfitReference) {
        imageParts.push(outfitReference);
      }
    }

    const openAiForm = new FormData();
    openAiForm.append('model', 'gpt-image-1.5');
    openAiForm.append('prompt', prompt);
    openAiForm.append('size', '1024x1536');
    openAiForm.append('quality', 'high');
    openAiForm.append('background', 'auto');

    for (const image of imageParts) {
      openAiForm.append('image', image, image.name);
    }

    const openAiResponse = await fetch(OPENAI_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiForm,
    });

    const openAiJson = await openAiResponse.json().catch(() => null);
    if (!openAiResponse.ok) {
      console.error('[virtual-try-on] OpenAI error:', openAiJson);
      return err(openAiJson?.error?.message || 'De AI-afbeelding kon niet worden gemaakt.', openAiResponse.status || 500);
    }

    const imageDataUrl =
      typeof openAiJson?.data?.[0]?.b64_json === 'string'
        ? `data:image/png;base64,${openAiJson.data[0].b64_json}`
        : typeof openAiJson?.data?.[0]?.url === 'string'
          ? openAiJson.data[0].url
          : '';

    if (!imageDataUrl) {
      return err('De AI-server gaf geen bruikbare afbeelding terug.', 502);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        imageDataUrl,
        revisedPrompt: prompt,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[virtual-try-on] Unexpected error:', error);
    return err('Er is een onverwachte fout opgetreden.', 500);
  }
};
