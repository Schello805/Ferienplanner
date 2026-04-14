// Load a local-only Matomo snippet only after consent.
// The actual tracking code lives in matomo.local.js and stays out of git.
(function setupLocalMatomoLoader() {
  var STORAGE_KEY = 'ferienplaner_cookie_consent_v1';
  var ACCEPTED = 'accepted';

  function injectMatomo() {
    if (window.__ferienplanerMatomoLoaded) return;
    window.__ferienplanerMatomoLoaded = true;

    var script = document.createElement('script');
    script.src = '/matomo.local.js';
    script.async = true;
    script.defer = true;
    script.onerror = function () {
      // Ignore missing local analytics file in environments where it is not installed.
      window.__ferienplanerMatomoLoaded = false;
    };
    document.head.appendChild(script);
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
