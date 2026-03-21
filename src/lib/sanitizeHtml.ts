import sanitizeHtml from 'sanitize-html';

const BASE_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h2',
  'h3',
  'h4',
  'a',
];

export function sanitizeRichHtml(input: unknown): string {
  if (typeof input !== 'string') return '';

  return sanitizeHtml(input, {
    allowedTags: BASE_ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = typeof attribs.href === 'string' ? attribs.href : '';
        const isHttp = href.startsWith('http://') || href.startsWith('https://');
        const target = attribs.target === '_blank' ? '_blank' : undefined;
        const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            ...(isHttp && target ? { target } : {}),
            ...(isHttp && rel ? { rel } : {}),
          },
        };
      },
    },
  });
}
