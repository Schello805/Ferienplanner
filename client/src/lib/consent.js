export const COOKIE_CONSENT_STORAGE_KEY = 'ferienplaner_cookie_consent_v1';
export const COOKIE_CONSENT_ACCEPTED = 'accepted';
export const COOKIE_CONSENT_REJECTED = 'rejected';

export function getCookieConsentChoice() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return value === COOKIE_CONSENT_ACCEPTED || value === COOKIE_CONSENT_REJECTED ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsentChoice(value) {
  if (typeof window === 'undefined') return null;
  if (value !== COOKIE_CONSENT_ACCEPTED && value !== COOKIE_CONSENT_REJECTED) return null;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
  } catch {
    return null;
  }

  if (value === COOKIE_CONSENT_ACCEPTED && typeof window.loadFerienplanerMatomo === 'function') {
    window.loadFerienplanerMatomo();
  }

  return value;
}

