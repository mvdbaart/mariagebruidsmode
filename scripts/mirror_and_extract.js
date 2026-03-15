import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { extractFromDir } from './extract_site_content.js';

const startUrl = process.argv[2];
const mirrorDirArg = process.argv[3] || 'site-mirror';
const outputBase = process.argv[4] || 'site-extract';
const maxPagesArg = Number(process.argv[5] || 400);
const maxPages = Number.isFinite(maxPagesArg) && maxPagesArg > 0 ? maxPagesArg : 400;
const pageScopeArg = (process.argv[6] || 'all').toLowerCase();

if (!startUrl) {
  console.error(
    'Usage: node scripts/mirror_and_extract.js <url> [mirrorDir] [outputBase] [maxPages] [pageScope]'
  );
  process.exit(1);
}

const scopeToRegex = {
  all: null,
  nl: '(^|/)nl(/|$)|(^|/)nl-|/(nl)\\.|\\bnederlands\\b',
  products: 'product|producten|collectie|collection|jurk|jurken|dress|dresses'
};

if (!(pageScopeArg in scopeToRegex)) {
  console.error('Invalid pageScope. Use one of: all, nl, products');
  process.exit(1);
}

const includeRegex = scopeToRegex[pageScopeArg];

const start = new URL(startUrl);
const origin = start.origin;
const mirrorDir = path.resolve(process.cwd(), mirrorDirArg);

const pageQueue = [start.href];
const seenPages = new Set();
const seenAssets = new Set();
const downloadedAssets = new Set();

function shouldSkipUrl(urlString) {
  return (
    urlString.startsWith('mailto:') ||
    urlString.startsWith('tel:') ||
    urlString.startsWith('javascript:') ||
    urlString.startsWith('#')
  );
}

function toAbsUrl(base, maybeRelative) {
  try {
    if (shouldSkipUrl(maybeRelative)) return null;
    return new URL(maybeRelative, base).href;
  } catch {
    return null;
  }
}

function stripHash(url) {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

function isLikelyHtmlPage(url) {
  const u = new URL(url);
  const pathname = u.pathname.toLowerCase();
  if (pathname.endsWith('/')) return true;
  const last = pathname.split('/').pop() || '';
  if (!last.includes('.')) return true;
  return last.endsWith('.html') || last.endsWith('.htm');
}

function normalizePathPart(part) {
  return part.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

function pagePathForUrl(url) {
  const u = new URL(url);
  const segments = u.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => normalizePathPart(decodeURIComponent(s)));

  if (segments.length === 0) return path.join(mirrorDir, 'index.html');

  const last = segments[segments.length - 1];
  if (last.includes('.') && /\.(html?|xhtml)$/i.test(last)) {
    return path.join(mirrorDir, ...segments);
  }

  return path.join(mirrorDir, ...segments, 'index.html');
}

function assetPathForUrl(url) {
  const u = new URL(url);
  const hostDir = u.origin === origin ? '' : path.join('_external', normalizePathPart(u.host));
  const segments = u.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => normalizePathPart(decodeURIComponent(s)));

  let filename = segments.pop() || 'asset';
  const ext = path.extname(filename);
  if (!ext) filename = `${filename}.bin`;

  if (u.search) {
    const hash = crypto.createHash('sha1').update(u.search).digest('hex').slice(0, 10);
    const base = path.basename(filename, path.extname(filename));
    filename = `${base}.${hash}${path.extname(filename)}`;
  }

  return path.join(mirrorDir, hostDir, ...segments, filename);
}

function extractAttrValues(html, attrName, tagName = null) {
  const values = [];
  const tagPart = tagName ? tagName : '[a-zA-Z]+';
  const regex = new RegExp(`<${tagPart}[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, 'gi');
  let match;
  while ((match = regex.exec(html)) !== null) values.push(match[1].trim());
  return values;
}

function extractSrcsetUrls(html) {
  const srcsetValues = extractAttrValues(html, 'srcset', 'img');
  const urls = [];
  for (const srcset of srcsetValues) {
    const candidates = srcset
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    urls.push(...candidates);
  }
  return urls;
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; site-mirror-bot/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html')) {
    throw new Error(`Expected HTML but got "${contentType}" for ${url}`);
  }
  return { html: await res.text(), finalUrl: res.url };
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; site-mirror-bot/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function crawl() {
  await fs.mkdir(mirrorDir, { recursive: true });

  while (pageQueue.length > 0 && seenPages.size < maxPages) {
    const current = pageQueue.shift();
    if (!current) continue;
    if (seenPages.has(current)) continue;
    seenPages.add(current);

    try {
      const { html, finalUrl } = await fetchText(current);
      const normalizedFinal = stripHash(finalUrl);
      const pageFile = pagePathForUrl(normalizedFinal);
      await ensureDirForFile(pageFile);
      await fs.writeFile(pageFile, html, 'utf8');

      const links = extractAttrValues(html, 'href', 'a');
      for (const link of links) {
        const abs = toAbsUrl(normalizedFinal, link);
        if (!abs) continue;
        const clean = stripHash(abs);
        const u = new URL(clean);
        if (u.origin !== origin) continue;
        if (!isLikelyHtmlPage(clean)) continue;
        if (!seenPages.has(clean)) pageQueue.push(clean);
      }

      const imageLike = [
        ...extractAttrValues(html, 'src', 'img'),
        ...extractSrcsetUrls(html),
        ...extractAttrValues(html, 'href', 'link')
      ];

      for (const ref of imageLike) {
        const abs = toAbsUrl(normalizedFinal, ref);
        if (!abs) continue;
        const clean = stripHash(abs);
        const lower = clean.toLowerCase();
        const looksLikeImage =
          /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?|$)/i.test(lower) ||
          lower.includes('/image') ||
          lower.includes('/images/');
        if (looksLikeImage) seenAssets.add(clean);
      }

      console.log(`Page ${seenPages.size}: ${normalizedFinal}`);
    } catch (err) {
      console.warn(`Skip page ${current}: ${err.message}`);
    }
  }

  for (const assetUrl of seenAssets) {
    if (downloadedAssets.has(assetUrl)) continue;
    downloadedAssets.add(assetUrl);
    try {
      const data = await fetchBinary(assetUrl);
      const filePath = assetPathForUrl(assetUrl);
      await ensureDirForFile(filePath);
      await fs.writeFile(filePath, data);
      console.log(`Asset: ${assetUrl}`);
    } catch (err) {
      console.warn(`Skip asset ${assetUrl}: ${err.message}`);
    }
  }
}

async function main() {
  console.log(`Mirror start: ${start.href}`);
  console.log(`Output dir  : ${mirrorDir}`);
  console.log(`Max pages   : ${maxPages}`);
  console.log(`Page scope  : ${pageScopeArg}`);

  await crawl();

  console.log(`Mirror done. Pages: ${seenPages.size}, assets: ${downloadedAssets.size}`);
  await extractFromDir(mirrorDir, outputBase, { includeRegex });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
