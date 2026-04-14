// Load a local-only Matomo snippet when it is present on the host.
// The actual tracking code lives in matomo.local.js and stays out of git.
(function loadLocalMatomo() {
  var script = document.createElement('script');
  script.src = '/matomo.local.js';
  script.async = true;
  script.defer = true;
  script.onerror = function () {
    // Ignore missing local analytics file in environments where it is not installed.
  };
  document.head.appendChild(script);
})();
