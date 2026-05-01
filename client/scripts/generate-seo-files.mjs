import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const fallbackSiteUrl = 'https://mein-ferienplaner.de';
const configuredSiteUrl = String(process.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
const siteUrl = configuredSiteUrl || fallbackSiteUrl;

const routes = ['/', '/hilfe', '/impressum', '/datenschutz', '/cookies'];

const publicDir = resolve(process.cwd(), 'public');
const templatePath = resolve(process.cwd(), 'index.template.html');
const indexPath = resolve(process.cwd(), 'index.html');

mkdirSync(publicDir, { recursive: true });

const robotsContent = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => `  <url>
    <loc>${siteUrl}${route}</loc>
  </url>`)
  .join('\n')}
</urlset>
`;

writeFileSync(resolve(publicDir, 'robots.txt'), robotsContent, 'utf8');
writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemapContent, 'utf8');

const htmlTemplate = readFileSync(templatePath, 'utf8');
writeFileSync(indexPath, htmlTemplate.replaceAll('__SITE_URL__', siteUrl), 'utf8');

const markerPath = resolve(publicDir, '.generated-seo-files');
mkdirSync(dirname(markerPath), { recursive: true });
writeFileSync(
  markerPath,
  `Generated with VITE_PUBLIC_SITE_URL=${configuredSiteUrl || fallbackSiteUrl}\n`,
  'utf8',
);
