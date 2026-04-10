import { useEffect } from 'react';

const SITE_NAME = 'Mein Ferienplaner';
const SITE_URL = 'https://mein-ferienplaner.de';
const DEFAULT_IMAGE = `${SITE_URL}/icon-512.png`;

const upsertMetaTag = (selector, attributes, content) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
};

const upsertLinkTag = (selector, attributes) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('link');
    document.head.appendChild(node);
  }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
};

const upsertStructuredData = (data) => {
  const selector = 'script[data-seo-structured-data="true"]';
  const existing = document.head.querySelector(selector);
  if (!data) {
    existing?.remove();
    return;
  }

  const node = existing || document.createElement('script');
  node.setAttribute('type', 'application/ld+json');
  node.setAttribute('data-seo-structured-data', 'true');
  node.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(node);
  }
};

export const SeoHead = ({
  title,
  description,
  path = '/',
  robots = 'index,follow',
  image = DEFAULT_IMAGE,
  structuredData = null,
}) => {
  useEffect(() => {
    const canonicalUrl = new URL(path, SITE_URL).toString();
    const normalizedTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const normalizedDescription = description || 'Familienkalender für Schulferien, Urlaub, Betreuung und freie Tage.';

    document.title = normalizedTitle;

    upsertMetaTag('meta[name="description"]', { name: 'description' }, normalizedDescription);
    upsertMetaTag('meta[name="robots"]', { name: 'robots' }, robots);
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, 'website');
    upsertMetaTag('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, normalizedTitle);
    upsertMetaTag('meta[property="og:description"]', { property: 'og:description' }, normalizedDescription);
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, image);
    upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary');
    upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }, normalizedTitle);
    upsertMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' }, normalizedDescription);
    upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image' }, image);
    upsertLinkTag('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
    upsertStructuredData(structuredData);
  }, [description, image, path, robots, structuredData, title]);

  return null;
};
