import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return fullPath;
    })
  );
  return files.flat();
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(html) {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const text = withoutBlocks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|section|article|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return decodeHtmlEntities(text);
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : '';
}

function extractMetaDescription(html) {
  const m = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
  );
  return m ? decodeHtmlEntities(m[1].trim()) : '';
}

function extractImages(html) {
  const sources = new Set();

  const imgSrcRegex = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    sources.add(match[1].trim());
  }

  const srcSetRegex = /<img[^>]*\ssrcset=["']([^"']+)["'][^>]*>/gi;
  while ((match = srcSetRegex.exec(html)) !== null) {
    const candidates = match[1]
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    for (const candidate of candidates) sources.add(candidate);
  }

  return [...sources];
}

function csvEscape(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

async function main() {
  const inputDir = process.argv[2];
  const outputBase = process.argv[3] || 'site-extract';
  const includeRegexArg = process.argv[4];

  if (!inputDir) {
    console.error(
      'Usage: node scripts/extract_site_content.js <inputDir> [outputBase] [includeRegex]'
    );
    process.exit(1);
  }

  const root = path.resolve(process.cwd(), inputDir);
  await extractFromDir(root, outputBase, { includeRegex: includeRegexArg });
}

export async function extractFromDir(rootInput, outputBase = 'site-extract', options = {}) {
  const root = path.resolve(process.cwd(), rootInput);
  const includeRegex = options.includeRegex ? new RegExp(options.includeRegex, 'i') : null;

  if (!(await exists(root))) {
    console.error(`Input directory not found: ${root}`);
    process.exit(1);
  }

  const allFiles = await walk(root);
  const htmlFiles = allFiles.filter((f) => /\.(html?|xhtml)$/i.test(f));

  const pages = [];
  for (const filePath of htmlFiles) {
    const html = await fs.readFile(filePath, 'utf8');
    const relPath = path.relative(root, filePath).split(path.sep).join('/');
    if (includeRegex && !includeRegex.test(relPath)) continue;

    const images = extractImages(html);
    const text = cleanText(html);

    pages.push({
      path: relPath,
      title: extractTitle(html),
      metaDescription: extractMetaDescription(html),
      imageCount: images.length,
      images,
      text
    });
  }

  const jsonPath = path.resolve(process.cwd(), `${outputBase}.json`);
  const csvPath = path.resolve(process.cwd(), `${outputBase}.csv`);

  await fs.writeFile(jsonPath, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');

  const csvHeader = ['path', 'title', 'metaDescription', 'imageCount', 'images', 'text'];
  const csvRows = [
    csvHeader.join(','),
    ...pages.map((page) =>
      [
        csvEscape(page.path),
        csvEscape(page.title),
        csvEscape(page.metaDescription),
        csvEscape(page.imageCount),
        csvEscape(page.images.join(' | ')),
        csvEscape(page.text)
      ].join(',')
    )
  ];

  await fs.writeFile(csvPath, `${csvRows.join('\n')}\n`, 'utf8');

  console.log(`Done. Pages: ${pages.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV : ${csvPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
