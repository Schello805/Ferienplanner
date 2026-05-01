export const SITE_NAME = 'Mein Ferienplaner';
const FALLBACK_SITE_URL = 'https://mein-ferienplaner.de';

export const getSiteUrl = () => {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '');
  }

  return FALLBACK_SITE_URL;
};

export const buildSiteUrl = (path = '/') => new URL(path, `${getSiteUrl()}/`).toString();

export const getSiteHostLabel = () => {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return FALLBACK_SITE_URL.replace(/^https?:\/\//, '');
  }
};

export const DEFAULT_SOCIAL_IMAGE = buildSiteUrl('/ferienplaner-logo-512-2026.png');
