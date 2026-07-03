// Load a local-only Matomo snippet only after consent.
// The actual tracking code lives in matomo.local.js and stays out of git.
(function setupLocalMatomoLoader() {
  var STORAGE_KEY = 'ferienplaner_cookie_consent_v1';
  var ACCEPTED = 'accepted';
  var MATOMO_SRC = '/matomo.local.js';

  function canLoadMatomo() {
    return fetch(MATOMO_SRC, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/javascript,text/javascript,*/*;q=0.1' }
    })
      .then(function (response) {
        if (!response.ok) return false;
        var contentType = String(response.headers.get('content-type') || '').toLowerCase();
        return contentType.includes('javascript') || contentType.includes('ecmascript') || contentType.includes('text/plain');
      })
      .catch(function () {
        return false;
      });
  }

  function injectMatomo() {
    if (window.__ferienplanerMatomoLoaded) return;
    window.__ferienplanerMatomoLoaded = true;

    canLoadMatomo().then(function (available) {
      if (!available) {
        window.__ferienplanerMatomoLoaded = false;
        return;
      }

      var script = document.createElement('script');
      script.src = MATOMO_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        // Ignore missing local analytics file in environments where it is not installed.
        window.__ferienplanerMatomoLoaded = false;
      };
      document.head.appendChild(script);
    });
  }

  window.loadFerienplanerMatomo = injectMatomo;

  try {
    if (window.localStorage.getItem(STORAGE_KEY) === ACCEPTED) {
      injectMatomo();
    }
  } catch {
    // Ignore storage access errors.
  }
})();
